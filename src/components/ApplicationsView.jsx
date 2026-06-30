import { useMemo, useState } from 'react';
import { Trash2, Info } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';

// Lista as movimentações do tipo "aplicação" (neutras: saem do saldo,
// mas não contam como despesa nos relatórios).
export default function ApplicationsView({ onDelete, categoryIcon }) {
  const { transactions } = useData();
  const [confirm, setConfirm] = useState(null);

  const items = useMemo(
    () => transactions
      .filter((t) => t.type === 'application')
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions]
  );

  const total = items.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
        <Info size={18} className="faint" style={{ flexShrink: 0, marginTop: 2 }} />
        <p className="muted" style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          Aplicações são transferências para investimentos. Elas <strong>saem do seu saldo em conta</strong>,
          mas <strong>não entram nos relatórios de despesa</strong> — afinal você não gastou, só moveu o
          dinheiro de lugar.
        </p>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty">
            <div className="emoji">📥</div>
            <div className="t">Nenhuma aplicação ainda</div>
            <p style={{ maxWidth: 320, margin: '0 auto' }}>
              Ao registrar um aporte em Investimentos, marque "descontar do meu saldo" para criar uma
              aplicação aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="list-item" style={{ fontWeight: 600 }}>
              <div className="grow">Total aplicado</div>
              <div className="num" style={{ color: 'var(--brand-strong)' }}>{formatCurrency(total)}</div>
            </div>
            {items.map((t) => (
              <div className="list-item" key={t.id}>
                <div className="emoji">{categoryIcon(t.category)}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="ttl">{t.description}</div>
                  <div className="sub">{formatDate(t.date)}</div>
                </div>
                <div className="amt" style={{ color: 'var(--brand-strong)' }}>
                  {formatCurrency(t.amount)}
                </div>
                <div className="row-actions">
                  <button className="mini-btn danger" onClick={() => setConfirm(t)} aria-label="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Excluir aplicação"
          message={`Excluir "${confirm.description}"? O valor volta a contar no seu saldo em conta. (Isso não altera o aporte na carteira de investimentos.)`}
          onConfirm={() => onDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
