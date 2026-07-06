import { useState } from 'react';
import { Plus, Pencil, Trash2, List, Landmark } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addFinancing, updateFinancing, deleteFinancing } from '../services/financingService';
import { financingSummary } from '../utils/amortization';
import { formatCurrency, formatDate } from '../utils/format';
import FinancingModal from './FinancingModal';
import FinancingScheduleModal from './FinancingScheduleModal';
import ConfirmDialog from './ConfirmDialog';

export default function FinancingsPanel() {
  const { financings, loading } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [modal, setModal] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  // busca a versão mais recente do doc (o listener em tempo real atualiza `financings`
  // quando marcamos parcela como paga / adicionamos abatimento dentro do modal)
  const scheduleFinancing = scheduleId ? financings.find((f) => f.id === scheduleId) : null;

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateFinancing(modal.edit.id, data);
        notify('Financiamento atualizado.');
      } else {
        await addFinancing(user.uid, data);
        notify('Financiamento criado.');
      }
      setModal(null);
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f) => {
    try {
      await deleteFinancing(f.id);
      notify('Financiamento excluído.');
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
          {financings.length} {financings.length === 1 ? 'financiamento' : 'financiamentos'}
        </p>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={18} /> <span className="add-label">Novo</span>
        </button>
      </div>

      {financings.length === 0 ? (
        <div className="card empty">
          <div className="emoji">🏦</div>
          <div className="t">Nenhum financiamento cadastrado</div>
          <p style={{ maxWidth: 340, margin: '0 auto 16px' }}>
            Cadastre um financiamento ou empréstimo com a taxa de juros e o sistema (Price ou SAC) e
            o Zeno calcula a tabela de parcelas pra você.
          </p>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} /> Cadastrar financiamento
          </button>
        </div>
      ) : (
        <div className="col gap">
          {financings.map((f) => {
            const s = financingSummary(f);
            return (
              <div className="card goal-card" key={f.id}>
                <div className="goal-top">
                  <div>
                    <div className="goal-name">
                      <Landmark size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                      {f.name}
                    </div>
                    <div className="muted" style={{ fontSize: '0.82rem', marginTop: 3 }}>
                      {f.system === 'sac' ? 'SAC' : 'Price'} · {f.monthlyRatePct}% a.m. ·{' '}
                      {s.nextDue ? `próxima em ${formatDate(s.nextDue.dueDate)}` : 'quitado 🎉'}
                    </div>
                  </div>
                  <div className="row gap-sm">
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '7px 12px', fontSize: '0.84rem' }}
                      onClick={() => setScheduleId(f.id)}
                    >
                      <List size={15} /> Parcelas
                    </button>
                    <button className="mini-btn" onClick={() => setModal({ edit: f })} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button className="mini-btn danger" onClick={() => setConfirm(f)} aria-label="Excluir">
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
        <FinancingModal initial={modal.edit} saving={saving} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {scheduleFinancing && (
        <FinancingScheduleModal financing={scheduleFinancing} onClose={() => setScheduleId(null)} />
      )}
      {confirm && (
        <ConfirmDialog
          title="Excluir financiamento"
          message={`Tem certeza que deseja excluir "${confirm.name}"? A tabela de parcelas será perdida.`}
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
