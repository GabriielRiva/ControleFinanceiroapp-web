// Categorias padrão, formas de pagamento e cores.
// As categorias personalizadas do usuário são adicionadas por cima destas
// (ver DataContext: expenseCategoryNames / incomeCategoryNames / categoryIcon).

export const INCOME_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Outros'];

export const EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Lazer', 'Educação', 'Compras', 'Outros',
];

export const PAYMENT_METHODS = [
  'Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Outros',
];

// emoji das categorias padrão
export const DEFAULT_ICONS = {
  Salário: '💼', Freelance: '🧑‍💻', Investimentos: '📈',
  Alimentação: '🍽️', Transporte: '🚗', Moradia: '🏠', Saúde: '💊',
  Lazer: '🎮', Educação: '📚', Compras: '🛍️', Outros: '✨',
};

// fallback estático (categorias padrão). Personalizadas usam o resolvedor do DataContext.
export function categoryIcon(cat) {
  return DEFAULT_ICONS[cat] || '✨';
}

// emojis sugeridos ao criar categoria
export const EMOJI_CHOICES = [
  '🍽️', '🛒', '🚗', '⛽', '🏠', '💡', '💧', '📶', '📱', '💊',
  '🏥', '🎮', '🎬', '🎵', '📚', '✈️', '🐶', '🐱', '👕', '💇',
  '🏋️', '🎁', '☕', '🍺', '🧾', '💳', '💰', '📈', '🎓', '🔧',
  '👶', '💄', '⚽', '🎨', '🌱', '✨',
];

// paleta de cores para gráficos
const PALETTE = [
  '#0d9488', '#f59e0b', '#6366f1', '#ec4899',
  '#14b8a6', '#ef4444', '#8b5cf6', '#10b981',
  '#f97316', '#3b82f6',
];

function hashIndex(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

export function categoryColor(cat) {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const i = all.indexOf(cat);
  if (i >= 0) return PALETTE[i % PALETTE.length];
  return PALETTE[hashIndex(cat || '')];
}

export function colorByIndex(i) {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
