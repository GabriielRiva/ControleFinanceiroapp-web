import { useState } from 'react';
import { Plus, Pencil, Trash2, PiggyBank, ArrowDownRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addGoal, updateGoal, deleteGoal } from '../services/goalService';
import { addTransaction } from '../services/transactionService';
import { formatCurrency, formatDate, daysUntil, todayISO } from '../utils/format';
import GoalModal from '../components/GoalModal';
import QuickAmountModal from '../components/QuickAmountModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Goals() {
  const { goals, loading } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [modal, setModal] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [retirar, setRetirar] = useState(null);
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
        // descontar o já guardado do saldo (movimentação neutra: transferência)
        if (data.deductFromBalance && Number(data.currentAmount) > 0) {
          await addTransaction(user.uid, {
            type: 'transfer',
            description: `Transferência: ${data.name}`,
            amount: Number(data.currentAmount),
            category: 'Metas',
            date: todayISO(),
            paymentMethod: 'Pix',
          });
          notify('Meta criada e valor descontado do saldo.');
        } else {
          notify('Meta criada.');
        }
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

  const handleAporte = async (amount, opts = {}) => {
    setSaving(true);
    try {
      const novo = (Number(aporte.currentAmount) || 0) + amount;
      await updateGoal(aporte.id, {
        name: aporte.name,
        targetAmount: Number(aporte.targetAmount) || 0,
        currentAmount: novo,
        deadline: aporte.deadline,
      });
      // descontar do saldo: registra como TRANSFERÊNCIA (neutra)
      if (opts.checked) {
        await addTransaction(user.uid, {
          type: 'transfer',
          description: `Transferência: ${aporte.name}`,
          amount,
          category: 'Metas',
          date: todayISO(),
          paymentMethod: 'Pix',
        });
        notify('Guardado e descontado do saldo! 🎉');
      } else {
        notify('Valor adicionado à meta! 🎉');
      }
      setAporte(null);
    } catch {
      notify('Não foi possível adicionar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleRetirar = async (amount, opts = {}) => {
    setSaving(true);
    try {
      const atual = Number(retirar.currentAmount) || 0;
      const take = Math.min(amount, atual); // não retira mais do que tem guardado
      await updateGoal(retirar.id, {
        name: retirar.name,
        targetAmount: Number(retirar.targetAmount) || 0,
        currentAmount: Math.max(0, atual - take),
        deadline: retirar.deadline,
      });
      // creditar de volta no saldo (movimentação neutra que volta pra conta)
      if (opts.checked) {
        await addTransaction(user.uid, {
          type: 'redemption',
          description: `Retirada de meta: ${retirar.name}`,
          amount: take,
          category: 'Metas',
          date: todayISO(),
          paymentMethod: 'Pix',
        });
        notify('Valor retirado e devolvido ao saldo.');
      } else {
        notify('Valor retirado da meta.');
      }
      setRetirar(null);
    } catch {
      notify('Não foi possível retirar.', 'err');
    } finally {
      setSaving(false);
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
          <div className="t">Defina seu primeiro objetivo</div>
          <p style={{ maxWidth: 320, margin: '0 auto 16px' }}>
            Reserva de emergência, uma viagem, um celular novo… crie uma meta e acompanhe o progresso
            até lá.
          </p>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} /> Criar primeira meta
          </button>
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
                    {!done && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                        onClick={() => setAporte(g)}
                        aria-label="Adicionar valor guardado"
                      >
                        <PiggyBank size={15} /> Guardar
                      </button>
                    )}
                    {current > 0 && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                        onClick={() => setRetirar(g)}
                        aria-label="Retirar valor da meta"
                      >
                        <ArrowDownRight size={15} /> Retirar
                      </button>
                    )}
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

      {aporte && (
        <QuickAmountModal
          title={`Guardar em "${aporte.name}"`}
          label="Quanto você guardou agora? (R$)"
          hint={`Atual: ${formatCurrency(aporte.currentAmount)} de ${formatCurrency(aporte.targetAmount)}. O valor abaixo será somado.`}
          cta="Adicionar à meta"
          checkboxLabel="Descontar do meu saldo (registra como transferência)"
          checkboxDefault
          saving={saving}
          onConfirm={handleAporte}
          onClose={() => setAporte(null)}
        />
      )}

      {retirar && (
        <QuickAmountModal
          title={`Retirar de "${retirar.name}"`}
          label="Quanto você retirou? (R$)"
          hint={`Guardado: ${formatCurrency(retirar.currentAmount)}. O valor sai da meta.`}
          cta="Retirar da meta"
          checkboxLabel="Creditar no meu saldo (volta pra conta)"
          checkboxDefault
          saving={saving}
          onConfirm={handleRetirar}
          onClose={() => setRetirar(null)}
        />
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
