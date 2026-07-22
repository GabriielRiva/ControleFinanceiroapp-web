// Parser do "Relatório de Performance" da EQI (PDF) — usa a tabela
// "detalhamento das movimentações e da rentabilidade em 12 meses" pra
// preencher automaticamente o histórico de evolução do patrimônio
// (a mesma coisa que "Registrar mês" salva, um por um, na mão).
//
// IMPORTANTE 1: esse relatório usa uma contabilidade de "aportado" diferente
// da que o Zeno usa por posição — aqui, "Movimentações" é o fluxo de caixa
// LÍQUIDO externo (dinheiro que entrou/saiu da conta de investimento vindo
// de fora, ex: Pix do banco). Reaplicações internas (ex: resgate de um CDB
// reinvestido no mesmo mês em outro fundo) são líquidas entre si e não
// aparecem separadamente. Por isso o "Investido acumulado" calculado pode
// diferir um pouco (tipicamente pelo valor de juros reinvestidos) do total
// que a tela de Investimentos mostra ao vivo — isso é esperado.
//
// IMPORTANTE 2: esse PDF pode cobrir só um período parcial (ex: só o mês
// atual, se exportado no meio do mês) — por isso esse parser NÃO calcula
// mais o "investido acumulado" sozinho (faria isso partir de zero, ficando
// errado se o período não cobrir o histórico inteiro). Quem chama essa
// função deve somar `movimentacoes` em cima do snapshot existente mais
// recente anterior ao primeiro mês retornado, se houver.

const MONTHS = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function toAmount(raw) {
  // remove QUALQUER espaço (a extração do PDF injeta espaços soltos no meio
  // de números de formas imprevisíveis: "4 .288,55", "4 5,39" etc.) antes
  // de interpretar ponto como milhar e vírgula como decimal.
  const clean = (raw || '').replace(/\s+/g, '');
  return Number(clean.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseRow(line) {
  const dateMatch = line.match(/^([A-Za-zç]{3})\s*\/(\d{2})\s+(.*)$/);
  if (!dateMatch) return null;
  const [, mon, yy, rest] = dateMatch;
  const monthNum = MONTHS[mon.toLowerCase()];
  if (!monthNum) return null;

  // divide pelos "R$" (marcador confiável) em vez de tentar casar cada
  // número com regex direto — mais resistente aos espaços soltos
  const segments = rest.split('R$');
  if (segments.length < 6) return null;

  // o sinal de "-" de uma Movimentação negativa fica grudado no FIM do
  // segmento anterior (ex: "7.180,79 -R$ 3.505,63"), não no início do
  // valor seguinte
  const negMov = segments[1].trim().endsWith('-');
  const movimentacoes = (negMov ? -1 : 1) * toAmount(segments[2]);
  const patrimonioFinal = toAmount(segments[4]);

  return {
    monthKey: `20${yy}-${String(monthNum).padStart(2, '0')}`,
    patrimonioFinal,
    movimentacoes,
  };
}

export function parsePerformanceReport(text) {
  const idx = text.indexOf('detalhamento das movimentações');
  if (idx < 0) return [];
  // a tabela tem no máximo ~12 linhas; corta um pedaço generoso do texto
  const chunk = text.slice(idx, idx + 2000);
  const lines = chunk.split('\n');

  const rows = [];
  for (const raw of lines) {
    const r = parseRow(raw.trim());
    if (r) rows.push(r);
  }

  rows.sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));
  return rows;
}
