import { useState } from 'react';
import { Plus, Trash2, Pause, Play, Pencil } from 'lucide-react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addRecurring, updateRecurring, setRecurringActive, deleteRecurring, generateDueRecurring,
} from '../services/recurringService';
import { EXPENSE_CATEGORIES, categoryIcon } from '../utils/categories';
import { formatCurrency } from '../utils/format';

export default function RecurringModal({ onClose }) {
  const { recurring } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('Moradia');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openEdit = (r) => {
    setEditingId(r.id);
    setDescription(r.description);
    setAmount(Number(r.amount) || 0);
    setCategory(r.category);
    setDayOfMonth(String(r.dayOfMonth));
    setError('');
    setAdding(true);
  };

  const resetForm = () => {
    setDescription(''); setAmount(0); setCategory('Moradia'); setDayOfMonth('5');
    setEditingId(null); setAdding(false); setError('');
  };

  const submit = async () => {
    const value = amount;
    if (!description.trim()) return setError('Dê um nome para a conta.');
    if (value <= 0) return setError('Informe o valor.');
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await updateRecurring(editingId, {
          description: description.trim(), amount: value,
          category, dayOfMonth: Number(dayOfMonth) || 1,
        });
        notify('Conta fixa atualizada. (Vale para os próximos meses.)');
      } else {
        const ref = await addRecurring(user.uid, {
          description: description.trim(),
          amount: value,
          category,
          dayOfMonth: Number(dayOfMonth) || 1,
        });
        // lança imediatamente o(s) mês(es) pendente(s) desta nova conta
        await generateDueRecurring(user.uid, [{
          id: ref.id, active: true, description: description.trim(),
          amount: value, category, dayOfMonth: Number(dayOfMonth) || 1,
          startMonth: undefined, lastPosted: '',
        }]);
        notify('Conta fixa criada e lançada neste mês.');
      }
      resetForm();
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r) => {
    try {
      await setRecurringActive(r.id, !r.active);
      notify(r.active ? 'Conta pausada.' : 'Conta reativada.');
    } catch {
      notify('Não foi possível alterar.', 'err');
    }
  };

  const remove = async (r) => {
    try {
      await deleteRecurring(r.id);
      notify('Conta fixa removida. (Os lançamentos já feitos permanecem.)');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  return (
    <Modal title="Contas fixas" onClose={onClose}>
      <p className="muted" style={{ fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.6 }}>
        Cadastre contas que se repetem todo mês (aluguel, internet, academia…). Elas são lançadas
        automaticamente nas suas despesas sempre que você abre o app num novo mês.
      </p>

      {recurring.length > 0 && (
        <div className="col gap-sm" style={{ marginBottom: 16 }}>
          {recurring.map((r) => (
            <div key={r.id} className="between card" style={{ padding: '12px 14px', opacity: r.active ? 1 : 0.55 }}>
              <div className="row gap-sm" style={{ minWidth: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{categoryIcon(r.category)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{r.description}</div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>
                    {formatCurrency(r.amount)} · todo dia {r.dayOfMonth}
                    {!r.active && ' · pausada'}
                  </div>
                </div>
              </div>
              <div className="row gap-sm">
                <button className="mini-btn" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil size={15} />
                </button>
                <button className="mini-btn" onClick={() => toggle(r)} aria-label={r.active ? 'Pausar' : 'Reativar'}>
                  {r.active ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button className="mini-btn danger" onClick={() => remove(r)} aria-label="Remover">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div className="field">
            <label className="label">Nome da conta</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Academia" autoFocus />
          </div>
          <div className="row gap" style={{ gap: 12 }}>
            <div className="field grow">
              <label className="label">Valor (R$)</label>
              <CurrencyInput value={amount} onChange={setAmount} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">Dia</label>
              <input className="input num" inputMode="numeric" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="5" />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="label">Categoria</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="expense" style={{ marginBottom: 12, fontSize: '0.85rem' }}>{error}</p>}
          <div className="row gap">
            <button className="btn btn-ghost grow" onClick={resetForm}>Cancelar</button>
            <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Salvar conta'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => setAdding(true)}>
          <Plus size={18} /> Adicionar conta fixa
        </button>
      )}
    </Modal>
  );
}
