import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';

// Modal genérico para informar um valor (aporte de metas/investimentos).
export default function QuickAmountModal({
  title, label, hint, cta = 'Adicionar', defaultValue, onConfirm, onClose, saving,
}) {
  const [amount, setAmount] = useState(Number(defaultValue) || 0);
  const [error, setError] = useState('');

  const submit = () => {
    if (amount <= 0) return setError('Informe um valor maior que zero.');
    setError('');
    onConfirm(amount);
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
        <CurrencyInput value={amount} onChange={setAmount} autoFocus />
      </div>
      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
