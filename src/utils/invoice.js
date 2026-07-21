// Lógica de fatura do cartão de crédito.
// Dada a data da compra e o cartão (dia de fechamento e de vencimento),
// descobre em qual fatura a compra entra e qual a data de vencimento.

import { MONTH_NAMES } from './format';

/**
 * Retorna a "chave do mês da fatura" (YYYY-MM) baseada no mês de VENCIMENTO.
 * Ex: Nubank fecha dia 18, vence dia 24.
 *  - compra em 17/01 -> fecha 18/01 -> vence 24/01 -> "2026-01"
 *  - compra em 19/01 -> fecha 18/02 -> vence 24/02 -> "2026-02"
 *
 * card.closingDayRollsToNext (opcional, por cartão): quando true, uma compra
 * feita NO PRÓPRIO dia do fechamento já entra na fatura seguinte (comum em
 * vários bancos — "fecha dia 17" quer dizer que o dia 17 já é o início do
 * próximo ciclo). Quando false/ausente (padrão), só dias APÓS o fechamento
 * rolam pra fatura seguinte.
 */
export function invoiceMonthForDate(isoDate, card) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const C = Number(card.closingDay) || 1;
  const D = Number(card.dueDay) || 1;
  const rollsOnClosingDay = card.closingDayRollsToNext
    ? d >= C
    : d > C;

  // mês de fechamento que captura a compra
  let closeY = y;
  let closeM = m;
  if (rollsOnClosingDay) {
    closeM += 1;
    if (closeM > 12) { closeM = 1; closeY += 1; }
  }

  // mês de vencimento (se o vencimento é antes do fechamento, vence no mês seguinte)
  let dueY = closeY;
  let dueM = closeM;
  if (D < C) {
    dueM += 1;
    if (dueM > 12) { dueM = 1; dueY += 1; }
  }

  return `${dueY}-${String(dueM).padStart(2, '0')}`;
}

// Data de vencimento (ISO) de uma fatura, respeitando o último dia do mês.
export function dueDateForInvoice(invoiceMonth, card) {
  const [y, m] = invoiceMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(Number(card.dueDay) || 1, lastDay);
  return `${invoiceMonth}-${String(day).padStart(2, '0')}`;
}

// "2026-01" -> "Janeiro/2026"
export function invoiceLabel(invoiceMonth) {
  const [y, m] = invoiceMonth.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
}

/**
 * "Mês efetivo" de uma transação: pra compras no cartão, é o mês da FATURA
 * (respeitando o fechamento), não o mês da data da compra. Pra qualquer
 * outra forma de pagamento, é o mês da própria data. Isso mantém Despesas,
 * Dashboard, Relatórios e Orçamento consistentes com o que a aba Faturas
 * já mostra.
 */
export function effectiveMonthKey(transaction, cardsById) {
  const card = transaction.cardId ? cardsById?.[transaction.cardId] : null;
  if (card) return invoiceMonthForDate(transaction.date, card);
  return (transaction.date || '').slice(0, 7);
}

// Helper pra montar o mapa { cardId: card } usado por effectiveMonthKey.
export function indexCardsById(cards) {
  return Object.fromEntries((cards || []).map((c) => [c.id, c]));
}
