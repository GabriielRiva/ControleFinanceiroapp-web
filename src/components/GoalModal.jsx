import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { formatCurrency } from '../utils/format';

export default function GoalModal({ initial, onSave, onClose, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [targetAmount, setTargetAmount] = useState(Number(initial?.targetAmount) || 0);
  const [currentAmount, setCurrentAmount] = useState(Number(initial?.currentAmount) || 0);
  const [deadline, setDeadline] = useState(initial?.deadline || '');
  const [error, setError] = useState('');

  const submit = () => {
    const target = targetAmount;
    const current = currentAmount;
    if (!name.trim()) return setError('Dê um nome para a meta.');
    if (target <= 0) return setError('O valor-alvo precisa ser maior que zero.');
    if (!deadline) return setError('Escolha uma data-limite.');
    if (current > target) return setError('O valor guardado não pode ser maior que o alvo.');
    setError('');
    onSave({ name: name.trim(), targetAmount: target, currentAmount: current, deadline });
  };

  return (
    <Modal
      title={initial ? 'Editar meta' : 'Nova meta'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar meta'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Nome da meta</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Reserva de emergência"
          autoFocus
        />
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Valor-alvo (R$)</label>
          <CurrencyInput value={targetAmount} onChange={setTargetAmount} />
        </div>
        <div className="field grow">
          <label className="label">Já guardado (R$)</label>
          <CurrencyInput value={currentAmount} onChange={setCurrentAmount} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Data-limite</label>
        <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
