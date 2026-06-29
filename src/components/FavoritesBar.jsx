import { useMemo } from 'react';
import { Star, Plus, Settings2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addFavorite } from '../services/favoriteService';
import { formatCurrency } from '../utils/format';


// sugere lançamentos frequentes ainda não favoritados
function buildSuggestions(transactions, type, savedKeys) {
  const map = new Map();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const desc = (t.description || '').trim();
    if (!desc) continue;
    const key = `${desc.toLowerCase()}__${t.category}`;
    const cur = map.get(key) || { count: 0, description: desc, category: t.category, amount: t.amount, paymentMethod: t.paymentMethod || null };
    cur.count += 1;
    cur.amount = t.amount; // usa o valor mais recente
    map.set(key, cur);
  }
  return [...map.values()]
    .filter((s) => s.count >= 2) // repetiu ao menos 2x
    .filter((s) => !savedKeys.has(`${s.description.toLowerCase()}__${s.category}`))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export default function FavoritesBar({ type, onUse, onManage }) {
  const { transactions, favorites, categoryIcon } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const saved = useMemo(
    () => favorites.filter((f) => f.type === type),
    [favorites, type]
  );

  const savedKeys = useMemo(
    () => new Set(saved.map((f) => `${(f.description || '').toLowerCase()}__${f.category}`)),
    [saved]
  );

  const suggestions = useMemo(
    () => buildSuggestions(transactions, type, savedKeys),
    [transactions, type, savedKeys]
  );

  if (saved.length === 0 && suggestions.length === 0) return null;

  const saveSuggestion = async (s) => {
    try {
      await addFavorite(user.uid, {
        type, description: s.description, amount: s.amount,
        category: s.category, paymentMethod: s.paymentMethod,
      });
      notify('Adicionado aos favoritos ⭐');
    } catch {
      notify('Não foi possível favoritar.', 'err');
    }
  };

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <span className="row gap-sm" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
          <Star size={16} className="goal" style={{ color: 'var(--goal)' }} /> Lançamento rápido
        </span>
        <button className="mini-btn" onClick={onManage} aria-label="Gerenciar favoritos" title="Gerenciar">
          <Settings2 size={16} />
        </button>
      </div>

      <div className="fav-row">
        {saved.map((f) => (
          <button key={f.id} className="fav-chip" onClick={() => onUse(f)}>
            <span className="fav-emoji">{categoryIcon(f.category)}</span>
            <span className="fav-txt">
              <span className="fav-desc">{f.description}</span>
              <span className="fav-amt num">{formatCurrency(f.amount)}</span>
            </span>
          </button>
        ))}

        {suggestions.map((s) => (
          <div key={`${s.description}-${s.category}`} className="fav-chip sug">
            <button className="fav-inner" onClick={() => onUse(s)}>
              <span className="fav-emoji">{categoryIcon(s.category)}</span>
              <span className="fav-txt">
                <span className="fav-desc">{s.description}</span>
                <span className="fav-amt num muted">{formatCurrency(s.amount)} · sugestão</span>
              </span>
            </button>
            <button className="fav-star" onClick={() => saveSuggestion(s)} aria-label="Salvar favorito" title="Salvar nos favoritos">
              <Plus size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
