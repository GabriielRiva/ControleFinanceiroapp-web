// Categorias, formas de pagamento e cores

export const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Outros'];

export const EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Lazer', 'Educação', 'Compras', 'Outros',
];

export const PAYMENT_METHODS = [
  'Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Outros',
];

// emoji por categoria (leve, sem dependência de assets)
const ICONS = {
  Salário: '💼', Freelance: '🧑‍💻', Investimentos: '📈',
  Alimentação: '🍽️', Transporte: '🚗', Moradia: '🏠', Saúde: '💊',
  Lazer: '🎮', Educação: '📚', Compras: '🛍️', Outros: '✨',
};

export function categoryIcon(cat) {
  return ICONS[cat] || '✨';
}

// cores estáveis para os gráficos de categoria
const PALETTE = [
  '#0d9488', '#f59e0b', '#6366f1', '#ec4899',
  '#14b8a6', '#ef4444', '#8b5cf6', '#10b981',
  '#f97316', '#3b82f6',
];

export function categoryColor(cat) {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const i = all.indexOf(cat);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

// Cor estável por posição na lista (usada nos investimentos, que têm nomes livres)
export function colorByIndex(i) {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
