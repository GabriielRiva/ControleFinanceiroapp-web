import { useMemo, useState } from 'react';
import { Plus, Trash2, Trophy } from 'lucide-react';
import Modal from './Modal';
import CorrectionModal from './CorrectionModal';
import ContemplationModal from './ContemplationModal';
import { useToast } from '../contexts/ToastContext';
import { computeConsortiumSchedule } from '../utils/amortization';
import { formatCurrency, formatDate } from '../utils/format';
import {
  setConsortiumInstallmentPaid, addCorrectionEvent, removeCorrectionEvent,
  setContemplation, clearContemplation,
} from '../services/consortiumService';

export default function ConsortiumScheduleModal({ consortium, onClose }) {
  const { notify } = useToast();
  const [showCorrection, setShowCorrection] = useState(false);
  const [showContemplation, setShowContemplation] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => computeConsortiumSchedule(consortium), [consortium]);

  const togglePaid = async (row) => {
    try {
      await setConsortiumInstallmentPaid(consortium, row.number, !row.paid);
    } catch {
      notify('Não foi possível atualizar a parcela.', 'err');
    }
  };

  const handleAddCorrection = async (event) => {
    setSaving(true);
    try {
      await addCorrectionEvent(consortium, event);
      notify('Correção registrada e projeção recalculada.');
      setShowCorrection(false);
    } catch {
      notify('Não foi possível registrar a correção.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCorrection = async (idx) => {
    try {
      await removeCorrectionEvent(consortium, idx);
      notify('Correção removida.');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  const handleContemplation = async (data) => {
    setSaving(true);
    try {
      await setContemplation(consortium.id, data);
      notify('Contemplação registrada! 🎉');
      setShowContemplation(false);
    } catch {
      notify('Não foi possível registrar a contemplação.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleClearContemplation = async () => {
    try {
      await clearContemplation(consortium.id);
      notify('Contemplação removida.');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  return (
    <>
      <Modal title={`Parcelas — ${consortium.name}`} onClose={onClose}>
        <div className="row gap wrap" style={{ marginBottom: 14 }}>
          <button className="btn btn-ghost grow" style={{ fontSize: '0.82rem', padding: '8px 12px' }} onClick={() => setShowCorrection(true)}>
            <Plus size={15} /> Correção mensal
          </button>
          <button className="btn btn-ghost grow" style={{ fontSize: '0.82rem', padding: '8px 12px' }} onClick={() => setShowContemplation(true)}>
            <Trophy size={15} /> {consortium.contemplation ? 'Editar contemplação' : 'Registrar contemplação'}
          </button>
        </div>

        {consortium.contemplation && (
          <div className="between card" style={{ padding: '10px 12px', marginBottom: 14, borderColor: 'var(--income)' }}>
            <span style={{ fontSize: '0.84rem' }}>
              🏆 Contemplado em {formatDate(consortium.contemplation.date)} ({consortium.contemplation.method === 'lance' ? 'lance' : 'sorteio'})
              {' '}· crédito de {formatCurrency(consortium.contemplation.creditValue)}
              {consortium.contemplation.method === 'lance' && ` · lance de ${formatCurrency(consortium.contemplation.bidValue)}`}
            </span>
            <button className="mini-btn danger" onClick={handleClearContemplation} aria-label="Remover contemplação">
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {(consortium.correctionEvents || []).length > 0 && (
          <div className="col gap-sm" style={{ marginBottom: 16 }}>
            {(consortium.correctionEvents || []).map((ev, idx) => (
              <div key={idx} className="between card" style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: '0.84rem' }}>
                  {formatDate(ev.date)} · índice de {ev.indexPct}%
                </span>
                <button className="mini-btn danger" onClick={() => handleRemoveCorrection(idx)} aria-label="Remover correção">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="col gap-sm" style={{ maxHeight: 380, overflowY: 'auto' }}>
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
                    vence {formatDate(r.dueDate)}
                    {r.contemplationBid > 0 && ` · lance de ${formatCurrency(r.contemplationBid)} aplicado aqui`}
                  </div>
                </div>
              </div>
              <div className="num" style={{ fontWeight: 700 }}>{formatCurrency(r.installmentValue)}</div>
            </label>
          ))}
        </div>
      </Modal>

      {showCorrection && (
        <CorrectionModal saving={saving} onSave={handleAddCorrection} onClose={() => setShowCorrection(false)} />
      )}
      {showContemplation && (
        <ContemplationModal
          initial={consortium.contemplation}
          saving={saving}
          onSave={handleContemplation}
          onClose={() => setShowContemplation(false)}
        />
      )}
    </>
  );
}
