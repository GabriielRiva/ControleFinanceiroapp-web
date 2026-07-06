import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { todayISO } from '../utils/format';

const KINDS = ['Financiamento', 'Empréstimo', 'Outro'];

export default function FinancingModal({ initial, onSave, onClose, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [kind, setKind] = useState(initial?.kind || 'Financiamento');
  const [principal, setPrincipal] = useState(Number(initial?.principal) || 0);
  const [monthlyRatePct, setMonthlyRatePct] = useState(String(initial?.monthlyRatePct ?? ''));
  const [system, setSystem] = useState(initial?.system || 'price');
  const [installmentsTotal, setInstallmentsTotal] = useState(String(initial?.installmentsTotal ?? ''));
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Dê um nome (ex: Financiamento do carro).');
    if (principal <= 0) return setError('Informe o valor financiado (principal).');
    const n = Number(installmentsTotal);
    if (!n || n <= 0) return setError('Informe o número de parcelas.');
    if (!startDate) return setError('Informe a data da 1ª parcela.');
    setError('');
    onSave({
      name: name.trim(),
      kind,
      principal,
      monthlyRatePct: Number(String(monthlyRatePct).replace(',', '.')) || 0,
      system,
      installmentsTotal: n,
      startDate,
    });
  };

  return (
    <Modal
      title={initial ? 'Editar financiamento' : 'Novo financiamento'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar financiamento'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Nome</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Financiamento do carro, Empréstimo pessoal..."
          autoFocus
        />
      </div>

      <div className="field">
        <label className="label">Tipo</label>
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Valor financiado (R$)</label>
          <CurrencyInput value={principal} onChange={setPrincipal} />
        </div>
        <div className="field" style={{ width: 140 }}>
          <label className="label">Juros ao mês (%)</label>
          <input
            className="input num"
            inputMode="decimal"
            value={monthlyRatePct}
            onChange={(e) => setMonthlyRatePct(e.target.value)}
            placeholder="Ex: 1,29"
          />
        </div>
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Sistema de amortização</label>
          <select className="select" value={system} onChange={(e) => setSystem(e.target.value)}>
            <option value="price">Price (parcela fixa)</option>
            <option value="sac">SAC (parcela decrescente)</option>
          </select>
        </div>
        <div className="field" style={{ width: 120 }}>
          <label className="label">Nº de parcelas</label>
          <input
            className="input num"
            inputMode="numeric"
            value={installmentsTotal}
            onChange={(e) => setInstallmentsTotal(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 48"
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Vencimento da 1ª parcela</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
