import { useState } from 'react';
import Modal from './Modal';
import { parseAmount, formatCurrency } from '../utils/format';

// Modal genérico para somar um valor (usado no aporte das metas).
export default function QuickAmountModal({
  title, label, hint, cta = 'Adicionar', defaultValue, onConfirm, onClose, saving,
}) {
  const [amount, setAmount] = useState(
    defaultValue != null ? String(defaultValue).replace('.', ',') : ''
  );
  const [error, setError] = useState('');

  const submit = () => {
    const value = parseAmount(amount);
    if (value <= 0) return setError('Informe um valor maior que zero.');
    setError('');
    onConfirm(value);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : cta}
          </button>
        </>
      }
    >
      {hint && <p className="muted" style={{ marginBottom: 16, fontSize: '0.9rem' }}>{hint}</p>}
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">{label || 'Valor (R$)'}</label>
        <input
          className="input num"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          autoFocus
        />
      </div>
      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
