import { useMemo, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { setBudget, deleteBudget } from '../services/budgetService';
import { EXPENSE_CATEGORIES, categoryIcon } from '../utils/categories';
import { formatCurrency } from '../utils/format';

export default function BudgetModal({ onClose }) {
  const { budgets, budgetStatus } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [saving, setSaving] = useState('');

  // mapa categoria -> {id, limit}
  const byCat = useMemo(() => {
    const m = {};
    budgets.forEach((b) => { m[b.category] = b; });
    return m;
  }, [budgets]);

  const spentByCat = useMemo(() => {
    const m = {};
    budgetStatus.items.forEach((i) => { m[i.category] = i; });
    return m;
  }, [budgetStatus]);

  // valores em edição (locais)
  const [edits, setEdits] = useState({});

  const valueFor = (cat) =>
    edits[cat] != null ? edits[cat] : (byCat[cat] ? byCat[cat].limit : 0);

  const save = async (cat) => {
    const limit = valueFor(cat);
    setSaving(cat);
    try {
      if (limit <= 0 && byCat[cat]) {
        await deleteBudget(byCat[cat].id);
        notify(`Limite de ${cat} removido.`);
      } else if (limit > 0) {
        await setBudget(user.uid, cat, limit, byCat[cat]?.id);
        notify(`Limite de ${cat} salvo.`);
      }
      setEdits((e) => { const n = { ...e }; delete n[cat]; return n; });
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving('');
    }
  };

  return (
    <Modal title="Orçamento mensal" onClose={onClose}>
      <p className="muted" style={{ fontSize: '0.88rem', marginBottom: 18, lineHeight: 1.6 }}>
        Defina quanto pretende gastar por categoria a cada mês. Deixe em branco (R$ 0,00) para não
        controlar uma categoria. O acompanhamento zera todo mês.
      </p>

      <div className="col gap-lg">
        {EXPENSE_CATEGORIES.map((cat) => {
          const info = spentByCat[cat];
          const spent = info?.spent || 0;
          const limit = valueFor(cat);
          const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const status = limit > 0 ? (spent / limit >= 1 ? 'over' : spent / limit >= 0.8 ? 'warn' : 'ok') : 'ok';
          const dirty = edits[cat] != null && edits[cat] !== (byCat[cat]?.limit || 0);

          return (
            <div key={cat}>
              <div className="between" style={{ marginBottom: 8, gap: 12 }}>
                <span className="budget-name">{categoryIcon(cat)} {cat}</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  gasto: {formatCurrency(spent)}
                </span>
              </div>
              <div className="row gap" style={{ gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <CurrencyInput value={limit} onChange={(v) => setEdits((e) => ({ ...e, [cat]: v }))} />
                </div>
                <button
                  className={`btn ${dirty ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '10px 14px' }}
                  onClick={() => save(cat)}
                  disabled={saving === cat}
                >
                  {saving === cat ? '...' : <Check size={17} />}
                </button>
              </div>
              {limit > 0 && (
                <>
                  <div className={`bar bar-${status}`} style={{ marginTop: 10 }}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  {status === 'over' && (
                    <div className="row gap-sm" style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--expense)', fontWeight: 600 }}>
                      <AlertTriangle size={13} /> passou {formatCurrency(spent - limit)}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
