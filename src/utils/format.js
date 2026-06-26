// Utilitários de formatação (pt-BR)

export function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Aceita "1.234,56" ou "1234.56" e devolve número
export function parseAmount(text) {
  if (typeof text === 'number') return text;
  if (!text) return 0;
  const clean = String(text)
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// "2026-06-26" -> "26/06/2026"
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

// "2026-06-26" -> "2026-06"
export function monthKey(iso) {
  return (iso || '').slice(0, 7);
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

// "2026-06" -> "Jun/26"
export function monthLabelFromKey(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const idx = (parseInt(m, 10) || 1) - 1;
  return `${MONTH_SHORT[idx]}/${(y || '').slice(2)}`;
}

// dias entre hoje e uma data ISO (negativo = já passou)
export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
