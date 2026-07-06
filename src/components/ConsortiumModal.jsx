import { useState } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { todayISO } from '../utils/format';

export default function ConsortiumModal({ initial, onSave, onClose, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [assetValue, setAssetValue] = useState(Number(initial?.assetValue) || 0);
  const [adminFeePct, setAdminFeePct] = useState(String(initial?.adminFeePct ?? ''));
  const [reserveFundPct, setReserveFundPct] = useState(String(initial?.reserveFundPct ?? ''));
  const [installmentsTotal, setInstallmentsTotal] = useState(String(initial?.installmentsTotal ?? ''));
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Dê um nome (ex: Consórcio do imóvel).');
    if (assetValue <= 0) return setError('Informe o valor do bem/crédito.');
    const n = Number(installmentsTotal);
    if (!n || n <= 0) return setError('Informe o prazo (número de parcelas).');
    if (!startDate) return setError('Informe a data da 1ª parcela.');
    setError('');
    onSave({
      name: name.trim(),
      assetValue,
      adminFeePct: Number(String(adminFeePct).replace(',', '.')) || 0,
      reserveFundPct: Number(String(reserveFundPct).replace(',', '.')) || 0,
      installmentsTotal: n,
      startDate,
    });
  };

  return (
    <Modal
      title={initial ? 'Editar consórcio' : 'Novo consórcio'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar consórcio'}
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
          placeholder="Ex: Consórcio do imóvel, do carro..."
          autoFocus
        />
      </div>

      <div className="field">
        <label className="label">Valor do bem / crédito (R$)</label>
        <CurrencyInput value={assetValue} onChange={setAssetValue} />
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Taxa de administração total (%)</label>
          <input
            className="input num"
            inputMode="decimal"
            value={adminFeePct}
            onChange={(e) => setAdminFeePct(e.target.value)}
            placeholder="Ex: 18"
          />
        </div>
        <div className="field grow">
          <label className="label">Fundo de reserva (%)</label>
          <input
            className="input num"
            inputMode="decimal"
            value={reserveFundPct}
            onChange={(e) => setReserveFundPct(e.target.value)}
            placeholder="Ex: 2"
          />
        </div>
      </div>

      <div className="row gap" style={{ gap: 12 }}>
        <div className="field grow">
          <label className="label">Prazo (nº de parcelas)</label>
          <input
            className="input num"
            inputMode="numeric"
            value={installmentsTotal}
            onChange={(e) => setInstallmentsTotal(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex: 180"
          />
        </div>
        <div className="field grow">
          <label className="label">Vencimento da 1ª parcela</label>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>

      <p className="muted" style={{ fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 0 }}>
        A parcela inicial é calculada por (valor do bem + taxas) ÷ prazo. Correções mensais e
        contemplação você registra depois, na tela do consórcio — a administradora não avisa o app
        automaticamente.
      </p>

      {error && <p className="expense" style={{ marginTop: 14, fontSize: '0.88rem' }}>{error}</p>}
    </Modal>
  );
}
