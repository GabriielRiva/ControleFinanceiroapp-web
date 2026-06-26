import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addGoal, updateGoal, deleteGoal } from '../services/goalService';
import { formatCurrency, formatDate, daysUntil } from '../utils/format';
import GoalModal from '../components/GoalModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Goals() {
  const { goals, loading } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateGoal(modal.edit.id, data);
        notify('Meta atualizada.');
      } else {
        await addGoal(user.uid, data);
        notify('Meta criada.');
      }
      setModal(null);
    } catch {
      notify('Não foi possível salvar a meta.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g) => {
    try {
      await deleteGoal(g.id);
      notify('Meta excluída.');
    } catch {
      notify('Não foi possível excluir.', 'err');
    }
  };

  return (
    <>
      <div className="between" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ fontSize: '0.95rem' }}>
          {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
        </p>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={18} /> <span className="add-label">Nova meta</span>
        </button>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: '30px auto' }} /></div>
      ) : goals.length === 0 ? (
        <div className="card empty">
          <div className="emoji">🎯</div>
          <div className="t">Nenhuma meta ainda</div>
          <p>Defina objetivos como uma reserva de emergência ou uma viagem, e acompanhe o progresso.</p>
        </div>
      ) : (
        <div className="col gap">
          {goals.map((g) => {
            const target = Number(g.targetAmount) || 0;
            const current = Number(g.currentAmount) || 0;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const remaining = Math.max(target - current, 0);
            const days = daysUntil(g.deadline);
            const done = current >= target;
            return (
              <div className="card goal-card" key={g.id}>
                <div className="goal-top">
                  <div>
                    <div className="goal-name">
                      {done ? '✅ ' : ''}{g.name}
                    </div>
                    <div className="muted" style={{ fontSize: '0.82rem', marginTop: 3 }}>
                      Prazo: {formatDate(g.deadline)}
                      {' · '}
                      {done ? 'concluída' : days >= 0 ? `${days} dias restantes` : 'prazo vencido'}
                    </div>
                  </div>
                  <div className="row gap-sm">
                    <div className="goal-pct" style={{ marginRight: 4 }}>{pct}%</div>
                    <button className="mini-btn" onClick={() => setModal({ edit: g })} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button className="mini-btn danger" onClick={() => setConfirm(g)} aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="progress" style={{ marginTop: 14 }}>
                  <span style={{ width: `${pct}%`, background: done ? 'var(--income)' : 'var(--goal)' }} />
                </div>

                <div className="goal-meta">
                  <span>{formatCurrency(current)} de {formatCurrency(target)}</span>
                  <span>{done ? 'Meta atingida 🎉' : `Faltam ${formatCurrency(remaining)}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <GoalModal
          initial={modal.edit}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Excluir meta"
          message={`Tem certeza que deseja excluir a meta "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
