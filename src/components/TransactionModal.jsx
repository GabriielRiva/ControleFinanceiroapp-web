import { useState } from 'react';
import Modal from './Modal';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, categoryIcon } from '../utils/categories';
import { parseAmount, todayISO } from '../utils/format';

export default function TransactionModal({ type, initial, onSave, onClose, saving }) {
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const [description, setDescription] = useState(initial?.description || '');
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount).replace('.', ',') : ''
  );
  const [category, setCategory] = useState(initial?.category || cats[0]);
  const [date, setDate] = useState(initial?.date || todayISO());
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || PAYMENT_METHODS[1]);
  const [error, setError] = useState('');

  const submit = () => {
    const value = parseAmount(amount);
    if (!description.trim()) return setError('Dê uma descrição para o lançamento.');
    if (value <= 0) return setError('Informe um valor maior que zero.');
    setError('');
    onSave({
      type,
      description: description.trim(),
      amount: value,
      category,
      date,
      paymentMethod: isIncome ? null : paymentMethod,
    });
  };

  const verb = initial ? 'Salvar alterações' : isIncome ? 'Adicionar receita' : 'Adicionar despesa';

  return (
    <Modal
      title={initial ? 'Editar lançamento' : isIncome ? 'Nova receita' : 'Nova despesa'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : verb}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Descrição</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isIncome ? 'Ex: Salário de junho' : 'Ex: Mercado'}
          autoFocus
        />
      </div>

      <div className="field">
        <label className="label">Valor (R$)</label>
        <input
          className="input num"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="field">
        <label className="label">Categoria</label>
        <div className="chips">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {categoryIcon(c)} {c}
            </button>
          ))}
        </div>
      </div>

      {!isIncome && (
        <div className="field">
          <label className="label">Forma de pagamento</label>
          <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Data</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
