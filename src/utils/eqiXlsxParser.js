// Parser do relatório da EQI em formato XLSX (planilha "Extrato/Posição",
// com abas Fundos e Renda Fixa) — lido por CÉLULA/COLUNA em vez de regex
// sobre texto solto de PDF. Muito mais confiável: nada de coluna que some,
// rodapé repetido, ou fonte com bug de codificação.

// 'COMPRA DEFINITIVA' também é uma aplicação (compra de título) — startsWith
// cobre isso automaticamente, diferente do parser de PDF antigo.
const APLICACAO_KEYWORDS = ['APLICAÇÃO', 'COMPRA'];

function isAplicacao(transacao) {
  return APLICACAO_KEYWORDS.some((k) => (transacao || '').startsWith(k));
}

function toISODate(cellValue) {
  if (cellValue instanceof Date) {
    const y = cellValue.getFullYear();
    const m = String(cellValue.getMonth() + 1).padStart(2, '0');
    const d = String(cellValue.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function toAmount(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw || '').trim();
  if (s === '-' || s === '') return 0;
  const neg = s.startsWith('-');
  const digits = s.replace(/^-/, '').trim();
  return (neg ? -1 : 1) * (Number(digits.replace(/\./g, '').replace(',', '.')) || 0);
}

// Converte uma planilha (via XLSX.utils.sheet_to_json com header:1) numa
// matriz de linhas, cada uma já "limpa" (sem célula undefined vira '').
function sheetToRows(sheet, XLSX) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  // a planilha da EQI sempre começa na coluna B (a coluna A vem vazia) —
  // descarta essa primeira coluna pra os índices baterem com os headers
  return rows.map((r) => r.slice(1).map((c) => (c === undefined || c === null ? '' : c)));
}

function findColIndex(headerRow, exactLabel) {
  return headerRow.findIndex((c) => String(c).trim() === exactLabel);
}

// Extrai eventos de movimentação de um bloco "Movimentação > <ativo>":
// linha de cabeçalho da tabela, seguida de 0+ linhas de dado, até a linha
// "Total de Aplicações".
function parseMovementBlock(rows, startIdx, assetKey, kind) {
  const events = [];
  const headerRow = rows[startIdx + 1] || [];
  const idxData = findColIndex(headerRow, 'Data');
  const idxTransacao = findColIndex(headerRow, 'Transação');
  const idxBruto = findColIndex(headerRow, 'Valor Bruto R$');
  const idxLiquido = headerRow.findLastIndex
    ? headerRow.findLastIndex((c) => String(c).trim().startsWith('Valor L') && String(c).includes('quido'))
    : (() => {
      let idx = -1;
      headerRow.forEach((c, i) => { if (String(c).trim().startsWith('Valor L') && String(c).includes('quido')) idx = i; });
      return idx;
    })();
  if (idxData < 0 || idxTransacao < 0 || idxBruto < 0 || idxLiquido < 0) return { events, nextIdx: startIdx + 1 };

  let i = startIdx + 2;
  while (i < rows.length) {
    const row = rows[i];
    const first = String(row[0] || '').trim();
    if (first.startsWith('Total de') || first.startsWith('Movimentação >') || first.startsWith('Posição >') || first === '') {
      if (first === '' && row.every((c) => c === '')) { i++; continue; }
      break;
    }
    const date = toISODate(row[idxData]);
    const transacao = String(row[idxTransacao] || '').trim();
    if (date && transacao) {
      events.push({
        asset: assetKey,
        kind,
        date,
        transacao,
        // Bruto = quanto entrou/saiu do ativo de verdade (custo da posição).
        // Líquido = quanto entrou/saiu da CONTA (já com IOF/IR). Propositalmente
        // diferentes — ver nota em investmentService sobre por que usar o bruto
        // como base de custo.
        positionAmount: toAmount(row[idxBruto]),
        cashAmount: toAmount(row[idxLiquido]),
        isComeCotas: /\(COME COTAS\)/.test(transacao),
      });
    }
    i++;
  }
  return { events, nextIdx: i };
}

// Extrai, pra cada fundo, o total "Valor de Compra Ajustado" do bloco
// "Detalhamento > <fundo>" — é o custo (aportado) das cotas AINDA em
// carteira, já descontando pró-rata qualquer resgate parcial. Ler esse
// total pronto evita ter que recalcular resgate parcial nós mesmos.
function parseFundosDetalhamento(rows) {
  const totals = {};
  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i][0] || '').trim();
    if (!first.startsWith('Detalhamento > ')) continue;
    const name = first.replace('Detalhamento > ', '').replace(/ - Classe CNPJ:.*$/, '').replace(/\*+$/, '').trim();
    const headerRow = rows[i + 1] || [];
    const idxValorAjustado = headerRow.findIndex((c) => String(c).replace(/\s+/g, ' ').trim() === 'Valor de Compra Ajustado R$');
    let j = i + 2;
    let sum = 0;
    while (j < rows.length) {
      const cellFirst = String(rows[j][0] || '').trim();
      if (cellFirst === 'Total') break; // a linha Total NÃO soma essa coluna — soma-se abaixo, das linhas de dado
      if (cellFirst.startsWith('Detalhamento >') || cellFirst.startsWith('Rentabilidade') || cellFirst === '') break;
      if (idxValorAjustado >= 0) sum += toAmount(rows[j][idxValorAjustado]);
      j++;
    }
    if (idxValorAjustado >= 0) totals[name] = sum;
  }
  return totals;
}

// Mesma ideia pra renda fixa: total "Valor Compra R$" do bloco
// "Detalhamento > TIPO | EMISSOR", usando o código do ativo da própria
// primeira linha de dado (bate com a chave usada nos eventos de movimento).
function parseRendaFixaDetalhamento(rows) {
  const totals = {};
  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i][0] || '').trim();
    if (!first.startsWith('Detalhamento > ')) continue;
    const rest = first.replace('Detalhamento > ', '');
    const emissor = (rows[i][1] && String(rows[i][1]).trim()) || (rest.split('|')[1] || '').trim();
    const headerRow = rows[i + 1] || [];
    const idxAtivo = findColIndex(headerRow, 'Ativo');
    const idxValorCompra = findColIndex(headerRow, 'Valor Compra R$');
    const firstDataRow = rows[i + 2] || [];
    const ativoCode = String(firstDataRow[idxAtivo] || '').trim().replace(/\*+$/, '').trim();
    let j = i + 2;
    while (j < rows.length) {
      const cellFirst = String(rows[j][0] || '').trim();
      if (cellFirst === 'Total') {
        if (idxValorCompra >= 0 && emissor && ativoCode) {
          totals[`${emissor} / ${ativoCode}`] = toAmount(rows[j][idxValorCompra]);
        }
        break;
      }
      if (cellFirst.startsWith('Detalhamento >') || cellFirst.startsWith('Posição Consolidada') || cellFirst === '') break;
      j++;
    }
  }
  return totals;
}

function parseFundosSheet(rows) {
  const events = [];
  const positions = {};

  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i][0] || '').trim();

    if (first.startsWith('Posição > Portfólio de fundos')) {
      let h = i + 1;
      while (h < rows.length && rows[h].every((c) => c === '')) h++;
      const headerRow = rows[h] || [];
      const idxSaldoLiq = findColIndex(headerRow, 'Saldo Líquido R$'); // match exato — não pega "Saldo Líquido R$ 24/09/25"
      let j = h + 1;
      while (j < rows.length) {
        while (j < rows.length && rows[j].every((c) => c === '')) j++;
        const name = String(rows[j][0] || '').trim();
        if (!name || name.startsWith('Total em fundos') || name.startsWith('Detalhamento')) break;
        const dataRow = rows[j + 1] || [];
        if (idxSaldoLiq >= 0) {
          const cleanName = name.replace(/ - Classe CNPJ:.*$/, '').replace(/\*+$/, '').trim();
          positions[cleanName] = toAmount(dataRow[idxSaldoLiq]);
        }
        j += 2;
      }
      i = j;
      continue;
    }

    if (first.startsWith('Movimentação > ')) {
      const assetName = first.replace('Movimentação > ', '').trim();
      const { events: evs, nextIdx } = parseMovementBlock(rows, i, assetName, 'fundo');
      events.push(...evs);
      i = nextIdx - 1;
    }
  }

  return { events, positions, investedTotals: parseFundosDetalhamento(rows) };
}

function parseRendaFixaSheet(rows) {
  const events = [];
  const positions = {};

  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i][0] || '').trim();

    // "Posição > LCA" ou "Posição > TESOURO DIRETO - LTN" — cabeçalho da
    // tabela na linha seguinte, 1 linha de dado, depois "Total".
    if (first.startsWith('Posição > ')) {
      const headerRow = rows[i + 1] || [];
      const idxEmissor = findColIndex(headerRow, 'Emissor');
      const idxAtivo = findColIndex(headerRow, 'Ativo');
      const idxSaldoLiq = findColIndex(headerRow, 'Saldo Líquido R$');
      let j = i + 2;
      while (j < rows.length) {
        const row = rows[j];
        const cellEmissor = String(row[idxEmissor] || '').trim();
        if (!cellEmissor || cellEmissor === 'Total') break;
        const ativo = String(row[idxAtivo] || '').trim().replace(/\*+$/, '').trim();
        const key = `${cellEmissor} / ${ativo}`;
        positions[key] = toAmount(row[idxSaldoLiq]);
        j++;
      }
      i = j;
      continue;
    }

    if (first.startsWith('Movimentação > ')) {
      const label = first.replace('Movimentação > ', '').trim();
      const headerRow = rows[i + 1] || [];
      const idxData = findColIndex(headerRow, 'Data');
      const idxEmissorAtivo = findColIndex(headerRow, 'Emissor / Ativo');
      const idxTransacao = findColIndex(headerRow, 'Transação');
      const idxBruto = findColIndex(headerRow, 'Valor Bruto R$');
      let idxLiquido = -1;
      headerRow.forEach((c, idx) => { if (String(c).trim().startsWith('Valor Liquido') || String(c).trim().startsWith('Valor Líquido')) idxLiquido = idx; });

      let j = i + 2;
      while (j < rows.length) {
        const row = rows[j];
        const cellFirst = String(row[0] || '').trim();
        if (cellFirst.startsWith('Total de') || cellFirst.startsWith('Movimentação >') || cellFirst.startsWith('Posição')) break;
        const date = toISODate(row[idxData]);
        const asset = String(row[idxEmissorAtivo] || '').trim();
        const transacao = String(row[idxTransacao] || '').trim();
        if (date && asset && transacao) {
          events.push({
            asset,
            kind: 'renda_fixa',
            date,
            transacao,
            positionAmount: toAmount(row[idxBruto]),
            cashAmount: idxLiquido >= 0 ? toAmount(row[idxLiquido]) : toAmount(row[idxBruto]),
            isComeCotas: false,
          });
        }
        j++;
      }
      i = j - 1;
      // eslint-disable-next-line no-unused-vars
      void label;
    }
  }

  return { events, positions, investedTotals: parseRendaFixaDetalhamento(rows) };
}

// A aba "Sumario" tem uma linha "Mercados | Saldo Bruto R$ <data início> |
// Saldo Líquido R$ <data início> | Saldo Bruto R$ <data fim> | Saldo Líquido
// R$ <data fim>" — usamos só a DATA FIM (embutida no próprio texto do
// cabeçalho) pra saber a qual mês esse relatório se refere.
function parseSumarioMonthKey(rows) {
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() !== 'Mercados') continue;
    const lastHeader = String(rows[i][rows[i].length - 1] || '');
    const m = lastHeader.match(/(\d{2})\/(\d{2})\/(\d{2})\s*$/);
    if (m) {
      const [, dd, mm, yy] = m;
      void dd;
      return `20${yy}-${mm}`;
    }
    return null;
  }
  return null;
}

/**
 * @param {ArrayBuffer|Uint8Array} data - conteúdo bruto do arquivo .xlsx/.xls
 * @param {*} XLSX - o módulo 'xlsx' (SheetJS), injetado pra não acoplar esse
 *   arquivo a como ele foi importado (import estático vs. lazy).
 */
export function parseEqiWorkbook(data, XLSX) {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });

  let events = [];
  let positions = {};
  let investedTotals = {};
  let monthKey = null;

  if (wb.Sheets['Sumario']) {
    monthKey = parseSumarioMonthKey(sheetToRows(wb.Sheets['Sumario'], XLSX));
  }

  if (wb.Sheets['Fundos']) {
    const rows = sheetToRows(wb.Sheets['Fundos'], XLSX);
    const r = parseFundosSheet(rows);
    events = events.concat(r.events);
    positions = { ...positions, ...r.positions };
    investedTotals = { ...investedTotals, ...r.investedTotals };
  }
  if (wb.Sheets['Renda Fixa']) {
    const rows = sheetToRows(wb.Sheets['Renda Fixa'], XLSX);
    const r = parseRendaFixaSheet(rows);
    events = events.concat(r.events);
    positions = { ...positions, ...r.positions };
    investedTotals = { ...investedTotals, ...r.investedTotals };
  }

  // agrupa por ativo+data+tipo (mesmo padrão do parser antigo) — usado só
  // pra criar as transações individuais, não mais pra calcular
  // aportado/saldo atual (isso agora vem pronto de investedTotals/positions)
  const grouped = {};
  for (const e of events) {
    if (e.isComeCotas) continue;
    const type = isAplicacao(e.transacao) ? 'application' : 'redemption';
    const key = `${e.asset}|${e.date}|${type}`;
    grouped[key] = grouped[key] || {
      asset: e.asset, date: e.date, type, positionAmount: 0, cashAmount: 0, kind: e.kind,
    };
    grouped[key].positionAmount += e.positionAmount;
    grouped[key].cashAmount += e.cashAmount;
  }

  return {
    events: Object.values(grouped).sort((a, b) => (a.date < b.date ? -1 : 1)),
    positions,
    investedTotals,
    monthKey,
  };
}
