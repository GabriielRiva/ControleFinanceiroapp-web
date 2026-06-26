import { useState } from 'react';
import Modal from './Modal';
import { parseAmount } from '../utils/format';

export default function GoalModal({ initial, onSave, onClose, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [targetAmount, setTargetAmount] = useState(
    initial?.targetAmount != null ? String(initial.targetAmount).replace('.', ',') : ''
  );
  const [currentAmount, setCurrentAmount] = useState(
    initial?.currentAmount != null ? String(initial.currentAmount).replace('.', ',') : '0'
  );
  const [deadline, setDeadline] = useState(initial?.deadline || '');
  const [error, setError] = useState('');

  const submit = () => {
    const target = parseAmount(targetAmount);
    const current = parseAmount(currentAmount);
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
          <input
            className="input num"
            inputMode="decimal"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="field grow">
          <label className="label">Já guardado (R$)</label>
          <input
            className="input num"
            inputMode="decimal"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="0,00"
          />
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
