import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import ExtraPaymentModal from './ExtraPaymentModal';
import { useToast } from '../contexts/ToastContext';
import { computeFinancingSchedule } from '../utils/amortization';
import { formatCurrency, formatDate } from '../utils/format';
import {
  setInstallmentPaid, addExtraPayment, removeExtraPayment,
} from '../services/financingService';

export default function FinancingScheduleModal({ financing, onClose }) {
  const { notify } = useToast();
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => computeFinancingSchedule(financing), [financing]);

  const togglePaid = async (row) => {
    try {
      await setInstallmentPaid(financing, row.number, !row.paid);
    } catch {
      notify('Não foi possível atualizar a parcela.', 'err');
    }
  };

  const handleAddExtra = async (extra) => {
    setSaving(true);
    try {
      await addExtraPayment(financing, extra);
      notify('Abatimento registrado. A tabela abaixo já foi recalculada.');
      setShowExtra(false);
    } catch {
      notify('Não foi possível registrar o abatimento.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExtra = async (idx) => {
    try {
      await removeExtraPayment(financing, idx);
      notify('Abatimento removido.');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  const lastPaidNumber = Math.max(0, ...(financing.paidInstallments || []), 0);

  return (
    <>
      <Modal title={`Parcelas — ${financing.name}`} onClose={onClose}>
        <div className="between" style={{ marginBottom: 14 }}>
          <p className="muted" style={{ fontSize: '0.84rem' }}>
            {rows.length} parcela{rows.length === 1 ? '' : 's'} · {financing.system === 'sac' ? 'SAC' : 'Price'}
          </p>
          <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '7px 12px' }} onClick={() => setShowExtra(true)}>
            <Plus size={15} /> Abatimento extra
          </button>
        </div>

        {(financing.extraPayments || []).length > 0 && (
          <div className="col gap-sm" style={{ marginBottom: 16 }}>
            {(financing.extraPayments || []).map((ex, idx) => (
              <div key={idx} className="between card" style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: '0.84rem' }}>
                  {formatCurrency(ex.amount)} após a parcela {ex.afterInstallment} ·{' '}
                  {ex.mode === 'reduceInstallment' ? 'reduziu parcela' : 'reduziu prazo'}
                </span>
                <button className="mini-btn danger" onClick={() => handleRemoveExtra(idx)} aria-label="Remover abatimento">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="col gap-sm" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {rows.map((r) => (
            <label
              key={r.number}
              className="between card"
              style={{ padding: '10px 12px', cursor: 'pointer', opacity: r.paid ? 0.7 : 1 }}
            >
              <div className="row gap-sm">
                <input type="checkbox" checked={r.paid} onChange={() => togglePaid(r)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    Parcela {r.number}/{rows.length}
                  </div>
                  <div className="muted" style={{ fontSize: '0.76rem' }}>
                    vence {formatDate(r.dueDate)} · juros {formatCurrency(r.interest)} · amort. {formatCurrency(r.amortization)}
                    {r.extraPayment > 0 && ` · +${formatCurrency(r.extraPayment)} extra`}
                  </div>
                </div>
              </div>
              <div className="num" style={{ fontWeight: 700 }}>{formatCurrency(r.installmentValue)}</div>
            </label>
          ))}
        </div>
      </Modal>

      {showExtra && (
        <ExtraPaymentModal
          maxInstallment={lastPaidNumber}
          saving={saving}
          onSave={handleAddExtra}
          onClose={() => setShowExtra(false)}
        />
      )}
    </>
  );
}
