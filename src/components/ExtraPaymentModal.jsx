import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';

// afterOptions: lista de números de parcela já pagas ou a pagar, pra escolher
// depois de qual parcela o abatimento entra.
export default function ExtraPaymentModal({ maxInstallment, onSave, onClose, saving }) {
  const [afterInstallment, setAfterInstallment] = useState(String(maxInstallment || 1));
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState('reduceTerm');
  const [error, setError] = useState('');

  const submit = () => {
    const n = Number(afterInstallment);
    if (!n || n < 0) return setError('Informe depois de qual parcela o abatimento entra (0 = antes da 1ª).');
    if (amount <= 0) return setError('Informe o valor do abatimento.');
    setError('');
    onSave({ afterInstallment: n, amount, mode });
  };

  return (
    <Modal
      title="Registrar amortização extraordinária"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Registrar abatimento'}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: '0.86rem', marginBottom: 16, lineHeight: 1.6 }}>
        Um pagamento extra que reduz o saldo devedor antes do previsto. Escolha se ele reduz o
        <strong> prazo</strong> (mantém a parcela, termina mais cedo) ou a <strong>parcela</strong>
        {' '}(mantém o prazo, parcela menor).
      </p>

      <div className="field">
        <label className="label">Valor do abatimento (R$)</label>
        <CurrencyInput value={amount} onChange={setAmount} autoFocus />
      </div>

      <div className="field">
        <label className="label">Depois de qual parcela? (0 = antes da 1ª)</label>
        <input
          className="input num"
          inputMode="numeric"
          value={afterInstallment}
          onChange={(e) => setAfterInstallment(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">O que o abatimento reduz?</label>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="reduceTerm">Reduzir prazo (parcela igual, termina antes)</option>
          <option value="reduceInstallment">Reduzir parcela (prazo igual, parcela menor)</option>
        </select>
      </div>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
