import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { todayISO } from '../utils/format';

export default function ContemplationModal({ initial, onSave, onClose, saving }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [method, setMethod] = useState(initial?.method || 'sorteio');
  const [creditValue, setCreditValue] = useState(Number(initial?.creditValue) || 0);
  const [bidValue, setBidValue] = useState(Number(initial?.bidValue) || 0);
  const [mode, setMode] = useState(initial?.mode || 'reduceTerm');
  const [error, setError] = useState('');

  const submit = () => {
    if (!date) return setError('Informe a data da contemplação.');
    if (creditValue <= 0) return setError('Informe o valor da carta de crédito liberada.');
    if (method === 'lance' && bidValue <= 0) return setError('Informe o valor do lance ofertado.');
    setError('');
    onSave({
      date,
      method,
      creditValue,
      bidValue: method === 'lance' ? bidValue : 0,
      mode: method === 'lance' ? mode : null,
    });
  };

  return (
    <Modal
      title="Registrar contemplação"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Registrar contemplação'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Como foi contemplado?</label>
        <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="sorteio">Sorteio</option>
          <option value="lance">Lance</option>
        </select>
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field grow">
          <label className="label">Carta de crédito (R$)</label>
          <CurrencyInput value={creditValue} onChange={setCreditValue} />
        </div>
      </div>

      {method === 'lance' && (
        <>
          <div className="field">
            <label className="label">Valor do lance ofertado (R$)</label>
            <CurrencyInput value={bidValue} onChange={setBidValue} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">O lance reduz...</label>
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="reduceTerm">Prazo (parcela igual, termina antes)</option>
              <option value="reduceInstallment">Parcela (prazo igual, parcela menor)</option>
            </select>
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
        A carta de crédito é o valor liberado pra você usar — não altera o quanto falta pagar. Só o
        lance (se houver) abate do saldo devedor futuro.
      </p>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
