// Parser do "Extrato da Conta Investimento" da EQI (PDF).
//
// IMPORTANTE: esse PDF específico tem uma fonte com bug de codificação nos
// TÍTULOS de seção e cabeçalhos de tabela — certas letras "a" e o par "fi"
// viram caractere nulo (\u0000) na extração (ex: "Confiança" vira
// "Con\u0000anz\u0000"). Isso NÃO afeta as linhas de dado em si (datas, valores),
// só os títulos/nomes. Por isso o nome do ativo extraído pode vir com falhas
// — é só um rótulo de conferência; o usuário confirma/ajusta na importação.
//
// Testado e validado contra um extrato real (12 aportes + 2 resgates,
// batendo exatamente com os totais declarados pela EQI).

const RENDA_FIXA_TYPES = new Set(['CDB', 'LCA', 'LCI', 'CRI', 'CRA', 'LC', 'DEBENTURE']);
const TRANSACAO_KEYWORDS = ['VENCIMENTO DE TÍTULO', 'COMPRA', 'VENDA', 'JUROS', 'AMORTIZAÇÃO'];
const APLICACAO_KEYWORDS = ['APLICAÇÃO', 'COMPRA'];

function cleanName(s) {
  return s.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
}

function toAmount(raw) {
  const s = (raw || '').trim();
  if (s === '-' || s === '') return 0;
  const neg = s.startsWith('-');
  const digits = s.replace(/^-/, '').trim();
  return (neg ? -1 : 1) * (Number(digits.replace(/\./g, '').replace(',', '.')) || 0);
}

function toISODate(dd, mm, yy) {
  return `20${yy}-${mm}-${dd}`;
}

function isAplicacao(transacao) {
  return APLICACAO_KEYWORDS.some((k) => transacao.startsWith(k));
}

/**
 * Extrai os eventos de movimentação (aportes/resgates), já agrupados por
 * ativo+data+tipo e com os eventos de "come-cotas" (IR semestral automático,
 * sem movimento de caixa real) removidos.
 */
function parseMovements(text) {
  const HEADER_RE = /Movimenta[cç][aã\u0000]o - ([^\n]+)/g;
  const headers = [];
  let m;
  while ((m = HEADER_RE.exec(text))) {
    headers.push({ start: m.index, end: m.index + m[0].length, label: m[1].trim() });
  }

  const events = [];

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const bodyEnd = i + 1 < headers.length ? headers[i + 1].start : text.length;
    const body = text.slice(h.end, bodyEnd);
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const isRendaFixa = RENDA_FIXA_TYPES.has(h.label.trim());

    if (!isRendaFixa) {
      const assetName = cleanName(h.label);
      for (const line of lines) {
        const tokens = line.split(/\s+/);
        if (tokens.length < 8) continue;
        const dateMatch = tokens[0].match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
        if (!dateMatch) continue;
        const numTokens = tokens.slice(-6);
        if (!numTokens.every((t) => /^-?[\d.,]+$/.test(t) || t === '-')) continue;
        const transacao = tokens.slice(1, -6).join(' ');
        const [, dd, mm, yy] = dateMatch;
        events.push({
          asset: assetName,
          kind: 'fundo',
          date: toISODate(dd, mm, yy),
          transacao,
          valorLiquido: toAmount(numTokens[5]),
          isComeCotas: /\(COME COTAS\)/.test(transacao),
        });
      }
    } else {
      // linhas de renda fixa às vezes quebram em 2 (coluna Emissor/Ativo longa)
      const merged = [];
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (/^\d{2}\/\d{2}\/\d{2}\s/.test(line)) {
          const hasKeyword = TRANSACAO_KEYWORDS.some((k) => line.includes(k));
          if (!hasKeyword && li + 1 < lines.length) {
            merged.push(`${line} ${lines[li + 1]}`);
            li += 1;
            continue;
          }
        }
        merged.push(line);
      }

      for (const line of merged) {
        const tokens = line.split(/\s+/);
        if (tokens.length < 8) continue;
        const dateMatch = tokens[0].match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
        if (!dateMatch) continue;
        const numTokens = tokens.slice(-6);
        if (!numTokens.every((t) => /^-?[\d.,]+$/.test(t) || t === '-')) continue;
        const middleTokens = tokens.slice(1, -6).join(' ');
        let transacao = null;
        let emissorAtivo = middleTokens;
        for (const kw of TRANSACAO_KEYWORDS) {
          if (middleTokens.endsWith(kw)) {
            transacao = kw;
            emissorAtivo = middleTokens.slice(0, -kw.length).trim();
            break;
          }
        }
        if (!transacao) continue;
        const [, dd, mm, yy] = dateMatch;
        events.push({
          asset: emissorAtivo,
          kind: 'renda_fixa',
          date: toISODate(dd, mm, yy),
          transacao,
          valorLiquido: toAmount(numTokens[5]),
          isComeCotas: false,
        });
      }
    }
  }

  // agrupa por ativo+data+tipo, somando valor líquido (ex: 3 aportes no
  // mesmo dia no mesmo fundo viram 1 evento só)
  const grouped = {};
  for (const e of events) {
    if (e.isComeCotas) continue;
    const type = isAplicacao(e.transacao) ? 'application' : 'redemption';
    const key = `${e.asset}|${e.date}|${type}`;
    grouped[key] = grouped[key] || { asset: e.asset, date: e.date, type, amount: 0, kind: e.kind };
    grouped[key].amount += e.valorLiquido;
  }

  return Object.values(grouped).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Extrai o saldo líquido ATUAL (na data do extrato) de cada fundo, a partir
 * da tabela "Fundo de Investimento - Posição - Portfólio de fundos".
 */
function parseFundPositions(text) {
  const re = /([^\n]+?) - Classe CNPJ:[^\n]*\n(\d{2}\/\d{2}\/\d{2}) ([\d.,]+) ([\d.,]+) ([\d.,]+) (-|[\d.,]+) (-|[\d.,]+) ([\d.,]+) (-?[\d.,]+)/g;
  const positions = {};
  let m;
  while ((m = re.exec(text))) {
    positions[cleanName(m[1])] = toAmount(m[8]);
  }
  return positions;
}

/**
 * Extrai o saldo líquido ATUAL de cada título de renda fixa ainda em
 * carteira, a partir das seções "Renda fixa - Detalhamento - TIPO | EMISSOR".
 * A chave gerada ("EMISSOR / CÓDIGO-DO-ATIVO") é a mesma usada nos eventos
 * de movimentação de renda fixa, então casam automaticamente.
 */
function parseRendaFixaPositions(text) {
  const re = /Detalhamento - (CDB|LCA|LCI|CRI|CRA|LC|DEBENTURE) \| ([^\n]+)/g;
  const positions = {};
  let m;
  while ((m = re.exec(text))) {
    const type = m[1];
    const emissor = cleanName(m[2]);
    const bodyStart = m.index + m[0].length;
    const disclaimerIdx = text.indexOf('Disclaimers', bodyStart);
    const body = text.slice(bodyStart, disclaimerIdx > 0 ? disclaimerIdx : bodyStart + 800);
    const flatBody = body.replace(/\n/g, ' ');
    const codeMatch = flatBody.match(new RegExp(`${type}-\\s*([A-Z0-9]+)`));
    const ativoCode = codeMatch ? `${type}-${codeMatch[1].replace(/\s+/g, '')}` : type;
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const nums = lastLine.match(/-?[\d.,]+/g) || [];
    if (nums.length === 0) continue;
    const key = `${emissor} / ${ativoCode}`;
    positions[key] = (positions[key] || 0) + toAmount(nums[nums.length - 1]);
  }
  return positions;
}

export function parseEqiStatement(text) {
  const events = parseMovements(text);
  const positions = { ...parseFundPositions(text), ...parseRendaFixaPositions(text) };
  return { events, positions };
}
