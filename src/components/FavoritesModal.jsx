import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addFavorite, deleteFavorite } from '../services/favoriteService';
import {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, categoryIcon,
} from '../utils/categories';
import { formatCurrency } from '../utils/format';

export default function FavoritesModal({ type, onClose }) {
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const { favorites } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const saved = favorites.filter((f) => f.type === type);

  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState(cats[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[1]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!description.trim()) return setError('Dê um nome ao favorito.');
    if (amount <= 0) return setError('Informe um valor.');
    setError('');
    setSaving(true);
    try {
      await addFavorite(user.uid, {
        type, description: description.trim(), amount, category,
        paymentMethod: isIncome ? null : paymentMethod,
      });
      notify('Favorito criado ⭐');
      setDescription(''); setAmount(0); setAdding(false);
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (f) => {
    try {
      await deleteFavorite(f.id);
      notify('Favorito removido.');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  return (
    <Modal title={`Favoritos · ${isIncome ? 'Receitas' : 'Despesas'}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.6 }}>
        Favoritos são atalhos para lançamentos que se repetem. Ao tocar num favorito, o formulário
        abre já preenchido — você só confere e salva.
      </p>

      {saved.length > 0 && !adding && (
        <div className="col gap-sm" style={{ marginBottom: 16 }}>
          {saved.map((f) => (
            <div key={f.id} className="between card" style={{ padding: '12px 14px' }}>
              <div className="row gap-sm" style={{ minWidth: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{categoryIcon(f.category)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{f.description}</div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>
                    {formatCurrency(f.amount)} · {f.category}
                    {f.paymentMethod ? ` · ${f.paymentMethod}` : ''}
                  </div>
                </div>
              </div>
              <button className="mini-btn danger" onClick={() => remove(f)} aria-label="Remover"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div className="field">
            <label className="label">Nome</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isIncome ? 'Ex: Salário' : 'Ex: Almoço'} autoFocus />
          </div>
          <div className="field">
            <label className="label">Valor (R$)</label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>
          <div className="field">
            <label className="label">Categoria</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {!isIncome && (
            <div className="field">
              <label className="label">Forma de pagamento</label>
              <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {error && <p className="expense" style={{ marginBottom: 12, fontSize: '0.85rem' }}>{error}</p>}
          <div className="row gap">
            <button className="btn btn-ghost grow" onClick={() => { setAdding(false); setError(''); }}>Cancelar</button>
            <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar favorito'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
          <Plus size={18} /> Criar favorito
        </button>
      )}
    </Modal>
  );
}
