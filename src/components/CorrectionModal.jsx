import { useState } from 'react';
import Modal from './Modal';
import { todayISO } from '../utils/format';

export default function CorrectionModal({ onSave, onClose, saving }) {
  const [date, setDate] = useState(todayISO());
  const [indexPct, setIndexPct] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!date) return setError('Informe a data da correção.');
    if (indexPct === '') return setError('Informe o percentual do índice (pode ser negativo).');
    setError('');
    onSave({ date, indexPct: Number(String(indexPct).replace(',', '.')) || 0 });
  };

  return (
    <Modal
      title="Registrar correção mensal"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: '0.84rem', marginBottom: 16, lineHeight: 1.6 }}>
        Digite o índice divulgado pela administradora neste mês (INCC, IPCA, IGPM...). Ele é aplicado
        sobre a parcela e o saldo devedor a partir desta data.
      </p>
      <div className="field">
        <label className="label">Data</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Índice do mês (%)</label>
        <input
          className="input num"
          inputMode="decimal"
          value={indexPct}
          onChange={(e) => setIndexPct(e.target.value)}
          placeholder="Ex: 0,45"
          autoFocus
        />
      </div>
      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
