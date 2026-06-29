import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';
import { categoryIcon } from '../utils/categories';

export default function BudgetSummary() {
  const { budgetStatus } = useData();
  const { items, totalLimit, totalSpent, totalPct, overCount } = budgetStatus;

  if (items.length === 0) return null; // só aparece quando há orçamento definido

  const totalStatus = totalPct >= 100 ? 'over' : totalPct >= 80 ? 'warn' : 'ok';
  const top = items.slice(0, 4); // mostra as categorias mais "quentes"

  return (
    <>
      <div className="between" style={{ marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Orçamento do mês</h2>
        <Link to="/despesas" className="link-btn row gap-sm">Gerenciar <ArrowRight size={15} /></Link>
      </div>

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        {/* total */}
        <div className="between" style={{ marginBottom: 8 }}>
          <span className="row gap-sm" style={{ fontWeight: 600 }}>
            <Wallet size={16} /> Total
          </span>
          <span className="num muted" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            {formatCurrency(totalSpent)} de {formatCurrency(totalLimit)}
          </span>
        </div>
        <div className={`bar bar-${totalStatus}`}>
          <span style={{ width: `${Math.min(100, totalPct)}%` }} />
        </div>

        {overCount > 0 && (
          <div className="row gap-sm" style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--expense)', fontWeight: 600 }}>
            <AlertTriangle size={14} /> {overCount} categoria{overCount > 1 ? 's' : ''} acima do limite
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {top.map((i) => {
            const pct = Math.min(100, Math.round(i.pct));
            return (
              <div className="budget-item" key={i.category}>
                <div className="budget-top">
                  <span className="budget-name">{categoryIcon(i.category)} {i.category}</span>
                  <span className={`budget-tag tag-${i.status}`}>{Math.round(i.pct)}%</span>
                </div>
                <div className={`bar bar-${i.status}`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="budget-vals" style={{ marginTop: 6 }}>
                  {formatCurrency(i.spent)} de {formatCurrency(i.limit)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
