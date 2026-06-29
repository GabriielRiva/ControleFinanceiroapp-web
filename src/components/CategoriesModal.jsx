import { useState } from 'react';
import { Plus, Trash2, Lock } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addCategory, deleteCategory } from '../services/categoryService';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEFAULT_ICONS, EMOJI_CHOICES,
} from '../utils/categories';

export default function CategoriesModal({ onClose }) {
  const { categories } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState('expense');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaults = tab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const custom = categories.filter((c) => c.type === tab);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Dê um nome à categoria.');
    const exists = [
      ...defaults.map((n) => n.toLowerCase()),
      ...custom.map((c) => c.name.toLowerCase()),
    ].includes(trimmed.toLowerCase());
    if (exists) return setError('Já existe uma categoria com esse nome.');
    setError('');
    setSaving(true);
    try {
      await addCategory(user.uid, { type: tab, name: trimmed, icon });
      notify('Categoria criada.');
      setName(''); setIcon('✨'); setAdding(false);
    } catch {
      notify('Não foi possível criar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    try {
      await deleteCategory(c.id);
      notify('Categoria removida. (Os lançamentos antigos continuam intactos.)');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  return (
    <Modal title="Categorias" onClose={onClose}>
      <div className="row gap-sm" style={{ marginBottom: 16 }}>
        <button className={`chip ${tab === 'expense' ? 'active' : ''}`} onClick={() => { setTab('expense'); setAdding(false); }}>Despesas</button>
        <button className={`chip ${tab === 'income' ? 'active' : ''}`} onClick={() => { setTab('income'); setAdding(false); }}>Receitas</button>
      </div>

      {/* padrão */}
      <div className="label" style={{ marginBottom: 8 }}>Padrão</div>
      <div className="chips" style={{ marginBottom: 18 }}>
        {defaults.map((n) => (
          <span key={n} className="pill" style={{ padding: '6px 11px' }}>
            {DEFAULT_ICONS[n] || '✨'} {n} <Lock size={11} style={{ opacity: 0.5 }} />
          </span>
        ))}
      </div>

      {/* personalizadas */}
      <div className="label" style={{ marginBottom: 8 }}>Minhas categorias</div>
      {custom.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
          Você ainda não criou categorias próprias para {tab === 'expense' ? 'despesas' : 'receitas'}.
        </p>
      ) : (
        <div className="col gap-sm" style={{ marginBottom: 16 }}>
          {custom.map((c) => (
            <div key={c.id} className="between card" style={{ padding: '10px 14px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{c.icon} {c.name}</span>
              <button className="mini-btn danger" onClick={() => remove(c)} aria-label="Remover"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div className="field">
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tab === 'expense' ? 'Ex: Pets' : 'Ex: Dividendos'} autoFocus />
          </div>
          <div className="field">
            <label className="label">Ícone <span style={{ fontSize: '1.1rem' }}>{icon}</span></label>
            <div className="emoji-grid">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-pick ${icon === e ? 'active' : ''}`}
                  onClick={() => setIcon(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="expense" style={{ marginBottom: 12, fontSize: '0.85rem' }}>{error}</p>}
          <div className="row gap">
            <button className="btn btn-ghost grow" onClick={() => { setAdding(false); setError(''); setName(''); setIcon('✨'); }}>Cancelar</button>
            <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
              {saving ? 'Salvando…' : 'Criar categoria'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
          <Plus size={18} /> Nova categoria de {tab === 'expense' ? 'despesa' : 'receita'}
        </button>
      )}
    </Modal>
  );
}
