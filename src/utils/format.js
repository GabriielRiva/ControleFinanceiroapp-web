// Utilitários de formatação (pt-BR)

export function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Aceita "1.234,56" (BR), "1,234.56" (US), "10.50" e "10,50" e devolve número.
// Corrige o bug do celular em que o teclado insere ponto como separador decimal.
export function parseAmount(text) {
  if (typeof text === 'number') return text;
  if (!text) return 0;

  let s = String(text).replace(/\s/g, '').replace(/R\$/gi, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // o separador que vem por último é o decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // padrão BR: 1.234,56
    } else {
      s = s.replace(/,/g, ''); // padrão US: 1,234.56
    }
  } else if (hasComma) {
    s = s.replace(',', '.'); // só vírgula → decimal
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2) {
      s = s.replace(/\./g, ''); // vários pontos → separador de milhar
    } else if (parts[1] && parts[1].length === 3) {
      s = parts[0] + parts[1]; // ex: "1.500" → milhar (1500)
    }
    // senão: ponto é decimal (ex: "10.50"), mantém como está
  }

  const n = parseFloat(s);
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

// "2026-12" -> "2027-01"
export function nextMonthKey(key) {
  let [y, m] = key.split('-').map(Number);
  m += 1;
  if (m > 12) { m = 1; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// soma N meses a uma data ISO, ajustando o dia ao último dia válido do mês
export function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// monta uma data ISO a partir de mês-chave + dia, respeitando o último dia do mês
export function isoFromMonthAndDay(monthKey, day) {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${monthKey}-${String(d).padStart(2, '0')}`;
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
