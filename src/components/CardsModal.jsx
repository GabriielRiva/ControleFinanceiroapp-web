import { useState } from 'react';
import { Plus, Trash2, Pencil, CreditCard } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addCard, updateCard, deleteCard } from '../services/cardService';
import { colorByIndex } from '../utils/categories';

const emptyForm = { name: '', closingDay: '18', dueDay: '24' };

export default function CardsModal({ onClose }) {
  const { cards } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [form, setForm] = useState(null); // {id?, name, closingDay, dueDay}
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const open = (card) => {
    setError('');
    setForm(card
      ? { id: card.id, name: card.name, closingDay: String(card.closingDay), dueDay: String(card.dueDay), colorIndex: card.colorIndex }
      : { ...emptyForm, colorIndex: cards.length });
  };

  const submit = async () => {
    const close = Number(form.closingDay);
    const due = Number(form.dueDay);
    if (!form.name.trim()) return setError('Dê um nome ao cartão.');
    if (!(close >= 1 && close <= 31)) return setError('Dia de fechamento inválido (1 a 31).');
    if (!(due >= 1 && due <= 31)) return setError('Dia de vencimento inválido (1 a 31).');
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), closingDay: close, dueDay: due,
        colorIndex: form.colorIndex ?? cards.length,
      };
      if (form.id) {
        await updateCard(form.id, payload);
        notify('Cartão atualizado.');
      } else {
        await addCard(user.uid, payload);
        notify('Cartão cadastrado.');
      }
      setForm(null);
    } catch {
      notify('Não foi possível salvar o cartão.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    try {
      await deleteCard(c.id);
      notify('Cartão removido. (As despesas lançadas permanecem.)');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  return (
    <Modal title="Cartões de crédito" onClose={onClose}>
      <p className="muted" style={{ fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.6 }}>
        Cadastre seus cartões com o dia que a fatura <strong>fecha</strong> e o dia que <strong>vence</strong>.
        Assim o app coloca cada compra na fatura certa.
      </p>

      {cards.length > 0 && !form && (
        <div className="col gap-sm" style={{ marginBottom: 16 }}>
          {cards.map((c) => (
            <div key={c.id} className="between card" style={{ padding: '12px 14px' }}>
              <div className="row gap-sm" style={{ minWidth: 0 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: colorByIndex(c.colorIndex || 0), display: 'grid', placeItems: 'center', color: '#fff',
                }}>
                  <CreditCard size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{c.name}</div>
                  <div className="muted" style={{ fontSize: '0.78rem' }}>
                    Fecha dia {c.closingDay} · vence dia {c.dueDay}
                  </div>
                </div>
              </div>
              <div className="row gap-sm">
                <button className="mini-btn" onClick={() => open(c)} aria-label="Editar"><Pencil size={15} /></button>
                <button className="mini-btn danger" onClick={() => remove(c)} aria-label="Remover"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form ? (
        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div className="field">
            <label className="label">Nome do cartão</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank" autoFocus />
          </div>
          <div className="row gap" style={{ gap: 12 }}>
            <div className="field grow">
              <label className="label">Fecha dia</label>
              <input className="input num" inputMode="numeric" value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: e.target.value })} placeholder="18" />
            </div>
            <div className="field grow">
              <label className="label">Vence dia</label>
              <input className="input num" inputMode="numeric" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="24" />
            </div>
          </div>
          {error && <p className="expense" style={{ marginBottom: 12, fontSize: '0.85rem' }}>{error}</p>}
          <div className="row gap">
            <button className="btn btn-ghost grow" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar cartão'}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => open(null)}>
          <Plus size={18} /> Adicionar cartão
        </button>
      )}
    </Modal>
  );
}
