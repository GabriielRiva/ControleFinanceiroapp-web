import { useState } from 'react';
import { Plus, Pencil, Trash2, List, Ticket, Trophy } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addConsortium, updateConsortium, deleteConsortium } from '../services/consortiumService';
import { consortiumSummary } from '../utils/amortization';
import { formatCurrency, formatDate } from '../utils/format';
import ConsortiumModal from './ConsortiumModal';
import ConsortiumScheduleModal from './ConsortiumScheduleModal';
import ConfirmDialog from './ConfirmDialog';

export default function ConsortiumsPanel() {
  const { consortiums, loading } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [modal, setModal] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const scheduleConsortium = scheduleId ? consortiums.find((c) => c.id === scheduleId) : null;

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateConsortium(modal.edit.id, data);
        notify('Consórcio atualizado.');
      } else {
        await addConsortium(user.uid, data);
        notify('Consórcio criado.');
      }
      setModal(null);
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    try {
      await deleteConsortium(c.id);
      notify('Consórcio excluído.');
    } catch {
      notify('Não foi possível excluir.', 'err');
    }
  };

  if (loading) {
    return <div className="empty"><div className="spinner" style={{ margin: '30px auto' }} /></div>;
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: '0.95rem' }}>
          {consortiums.length} {consortiums.length === 1 ? 'consórcio' : 'consórcios'}
        </p>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={18} /> <span className="add-label">Novo</span>
        </button>
      </div>

      {consortiums.length === 0 ? (
        <div className="card empty">
          <div className="emoji">🎟️</div>
          <div className="t">Nenhum consórcio cadastrado</div>
          <p style={{ maxWidth: 340, margin: '0 auto 16px' }}>
            Cadastre uma cota de consórcio pra acompanhar as parcelas, registrar correções mensais e
            a contemplação (sorteio ou lance) quando acontecer.
          </p>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} /> Cadastrar consórcio
          </button>
        </div>
      ) : (
        <div className="col gap">
          {consortiums.map((c) => {
            const s = consortiumSummary(c);
            return (
              <div className="card goal-card" key={c.id}>
                <div className="goal-top">
                  <div>
                    <div className="goal-name">
                      <Ticket size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                      {c.name}
                      {s.contemplated && <Trophy size={14} style={{ marginLeft: 6, color: 'var(--income)', verticalAlign: -1 }} />}
                    </div>
                    <div className="muted" style={{ fontSize: '0.82rem', marginTop: 3 }}>
                      {s.nextDue ? `próxima em ${formatDate(s.nextDue.dueDate)}` : 'quitado 🎉'}
                      {s.contemplated ? ' · contemplado' : ' · aguardando contemplação'}
                    </div>
                  </div>
                  <div className="row gap-sm">
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                      onClick={() => setScheduleId(c.id)}
                    >
                      <List size={15} /> Parcelas
                    </button>
                    <button className="mini-btn" onClick={() => setModal({ edit: c })} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button className="mini-btn danger" onClick={() => setConfirm(c)} aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="progress" style={{ marginTop: 14 }}>
                  <span style={{ width: `${s.progressPct}%`, background: 'var(--goal)' }} />
                </div>

                <div className="goal-meta">
                  <span>{s.paidCount} de {s.totalInstallments} parcelas pagas</span>
                  <span>saldo devedor: {formatCurrency(s.outstandingBalance)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ConsortiumModal initial={modal.edit} saving={saving} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {scheduleConsortium && (
        <ConsortiumScheduleModal consortium={scheduleConsortium} onClose={() => setScheduleId(null)} />
      )}
      {confirm && (
        <ConfirmDialog
          title="Excluir consórcio"
          message={`Tem certeza que deseja excluir "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
