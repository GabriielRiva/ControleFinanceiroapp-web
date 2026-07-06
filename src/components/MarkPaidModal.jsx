import { useState } from 'react';
import Modal from './Modal';
import { todayISO } from '../utils/format';
import { PAYMENT_METHODS } from '../utils/categories';

export default function MarkPaidModal({ transaction, onSave, onClose, saving }) {
  const [paidDate, setPaidDate] = useState(transaction.paidDate || todayISO());
  const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || PAYMENT_METHODS[1]);

  const submit = () => onSave({ paid: true, paidDate, paymentMethod });

  return (
    <Modal
      title={`Marcar "${transaction.description}" como paga`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary grow" onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Confirmar pagamento'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Paga em</label>
        <input className="input" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} autoFocus />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">Forma de pagamento</label>
        <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </Modal>
  );
}
