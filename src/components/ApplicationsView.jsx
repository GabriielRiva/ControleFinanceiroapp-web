import { useMemo, useState } from 'react';
import { Trash2, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';

const META = {
  application: { label: 'Aplicação', dir: 'out' },
  transfer: { label: 'Transferência', dir: 'out' },
  redemption: { label: 'Resgate', dir: 'in' },
};

// rótulo considerando o destino (meta vs investimento)
function movementLabel(t) {
  if (t.type === 'redemption' && t.category === 'Metas') return 'Retirada de meta';
  return META[t.type].label;
}

// Movimentações neutras: saem/entram na conta, mas NÃO são receita nem despesa.
export default function ApplicationsView({ onDelete, categoryIcon }) {
  const { transactions } = useData();
  const [confirm, setConfirm] = useState(null);

  const items = useMemo(
    () => transactions
      .filter((t) => t.type === 'application' || t.type === 'transfer' || t.type === 'redemption')
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );

  const totalOut = items.filter((t) => META[t.type].dir === 'out').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalIn = items.filter((t) => META[t.type].dir === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
        <Info size={18} className="faint" style={{ flexShrink: 0, marginTop: 2 }} />
        <p className="muted" style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          Movimentações são transferências do seu dinheiro entre a conta, os investimentos e as metas.
          Elas <strong>afetam o seu saldo em conta</strong>, mas <strong>não entram nos relatórios de
          despesa</strong> — você não gastou, só moveu o dinheiro de lugar.
        </p>
      </div>

      {items.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="card stat">
            <div className="cap"><ArrowDownRight size={15} /> Saiu da conta</div>
            <div className="val" style={{ color: 'var(--brand-strong)' }}>{formatCurrency(totalOut)}</div>
          </div>
          <div className="card stat">
            <div className="cap"><ArrowUpRight size={15} /> Voltou pra conta</div>
            <div className="val income">{formatCurrency(totalIn)}</div>
          </div>
        </div>
      )}

      <div className="card">
        {items.length === 0 ? (
          <div className="empty">
            <div className="emoji">🔄</div>
            <div className="t">Nenhuma movimentação ainda</div>
            <p style={{ maxWidth: 340, margin: '0 auto' }}>
              Aplicações (aportes), resgates e transferências para metas aparecem aqui quando você marca
              "descontar/creditar no saldo".
            </p>
          </div>
        ) : (
          items.map((t) => {
            const m = META[t.type];
            const isIn = m.dir === 'in';
            return (
              <div className="list-item" key={t.id}>
                <div className="emoji">{categoryIcon(t.category)}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="ttl">{t.description}</div>
                  <div className="sub">
                    <span className="pill" style={{ fontSize: '0.7rem', padding: '1px 7px', marginRight: 6 }}>{movementLabel(t)}</span>
                    {formatDate(t.date)}
                  </div>
                </div>
                <div className="amt" style={{ color: isIn ? 'var(--income)' : 'var(--brand-strong)' }}>
                  {isIn ? '+' : '−'} {formatCurrency(t.amount)}
                </div>
                <div className="row-actions">
                  <button className="mini-btn danger" onClick={() => setConfirm(t)} aria-label="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={`Excluir ${movementLabel(confirm).toLowerCase()}`}
          message={`Excluir "${confirm.description}"? O valor volta a ajustar o seu saldo em conta. (Isso não altera a carteira de investimentos nem a meta.)`}
          onConfirm={() => onDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
