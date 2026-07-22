// Parser do "Relatório de Performance" da EQI (PDF) — usa a tabela
// "detalhamento das movimentações e da rentabilidade em 12 meses" pra
// preencher automaticamente o histórico de evolução do patrimônio
// (a mesma coisa que "Registrar mês" salva, um por um, na mão).
//
// IMPORTANTE: esse relatório usa uma contabilidade de "aportado" diferente
// da que o Zeno usa por posição — aqui, "Movimentações" é o fluxo de caixa
// LÍQUIDO externo (dinheiro que entrou/saiu da conta de investimento vindo
// de fora, ex: Pix do banco). Reaplicações internas (ex: resgate de um CDB
// reinvestido no mesmo mês em outro fundo) são líquidas entre si e não
// aparecem separadamente. Por isso o "Investido acumulado" calculado aqui
// pode diferir um pouco (tipicamente pelo valor de juros reinvestidos) do
// total que a tela de Investimentos mostra ao vivo — isso é esperado, não
// é um erro de leitura.

const MONTHS = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function toAmount(raw) {
  return Number((raw || '').replace(/\./g, '').replace(',', '.')) || 0;
}

// remove espaços que a extração do PDF às vezes injeta no meio de números
// (ex: "4 .288,55" -> "4.288,55", "0,74 %" -> "0,74%")
function normalizeLine(line) {
  return line
    .replace(/(\d)\s+([.,]\d)/g, '$1$2')
    .replace(/(\d)\s+%/g, '$1%');
}

const ROW_RE = /^([A-Za-zç]{3})\s*\/(\d{2})\s+R\$\s*([\d.,]+)\s+(-?)R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+([\d.,]+)%\s+([\d.,]+)%/;

export function parsePerformanceReport(text) {
  const idx = text.indexOf('detalhamento das movimentações');
  if (idx < 0) return [];
  // a tabela tem no máximo ~12 linhas; corta um pedaço generoso do texto
  const chunk = text.slice(idx, idx + 2000);
  const lines = chunk.split('\n');

  const rows = [];
  for (const raw of lines) {
    const line = normalizeLine(raw.trim());
    const m = line.match(ROW_RE);
    if (!m) continue;
    const [, mon, yy, , sign, mov, , final_] = m;
    const monthNum = MONTHS[mon.toLowerCase()];
    if (!monthNum) continue;
    rows.push({
      monthKey: `20${yy}-${String(monthNum).padStart(2, '0')}`,
      patrimonioFinal: toAmount(final_),
      movimentacoes: (sign === '-' ? -1 : 1) * toAmount(mov),
    });
  }

  rows.sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));

  // acumula o "investido" mês a mês, a partir do fluxo líquido externo
  let invested = 0;
  return rows.map((r) => {
    invested += r.movimentacoes;
    return { monthKey: r.monthKey, totalValue: r.patrimonioFinal, totalInvested: invested };
  });
}
