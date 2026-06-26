import { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useData } from '../contexts/DataContext';
import { formatCurrency, MONTH_NAMES } from '../utils/format';
import { categoryColor } from '../utils/categories';

export default function Reports() {
  const { transactions, loading } = useData();

  const years = useMemo(() => {
    const set = new Set(transactions.map((t) => (t.date || '').slice(0, 4)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [transactions]);

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all'); // 'all' | '01'..'12'

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const [y, m] = (t.date || '').split('-');
      if (y !== year) return false;
      if (month !== 'all' && m !== month) return false;
      return true;
    });
  }, [transactions, year, month]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    }
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = {};
    for (const t of filtered) {
      if (t.type !== 'expense') continue;
      map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  if (loading) {
    return <div className="empty"><div className="spinner" style={{ margin: '40px auto' }} /></div>;
  }

  return (
    <>
      {/* filtros */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>Ano</label>
        <div className="chips" style={{ marginBottom: 16 }}>
          {years.map((y) => (
            <button key={y} className={`chip ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>Mês</label>
        <div className="chips">
          <button className={`chip ${month === 'all' ? 'active' : ''}`} onClick={() => setMonth('all')}>
            Ano todo
          </button>
          {MONTH_NAMES.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            return (
              <button key={m} className={`chip ${month === m ? 'active' : ''}`} onClick={() => setMonth(m)}>
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* totais */}
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="card stat">
          <div className="cap">Receitas</div>
          <div className="val income">{formatCurrency(totals.income)}</div>
        </div>
        <div className="card stat">
          <div className="cap">Despesas</div>
          <div className="val expense">{formatCurrency(totals.expense)}</div>
        </div>
        <div className="card stat">
          <div className="cap">Saldo</div>
          <div className="val" style={{ color: totals.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {formatCurrency(totals.balance)}
          </div>
        </div>
      </div>

      {/* despesas por categoria */}
      <h2 className="section-title">Despesas por categoria</h2>
      <div className="card card-pad">
        {byCategory.length === 0 ? (
          <div className="empty" style={{ padding: '28px 0' }}>
            <div className="emoji">🥧</div>
            <div className="t">Sem despesas no período</div>
            <p>Escolha outro mês ou registre despesas para ver a divisão.</p>
          </div>
        ) : (
          <div className="row gap-lg wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 220, height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {byCategory.map((entry) => (
                      <Cell key={entry.name} fill={categoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, fontSize: 13, color: 'var(--text)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col gap-sm grow" style={{ minWidth: 200 }}>
              {byCategory.map((c) => {
                const pct = Math.round((c.value / totals.expense) * 100);
                return (
                  <div className="between" key={c.name} style={{ gap: 12 }}>
                    <span className="row gap-sm">
                      <i style={{ width: 11, height: 11, borderRadius: 3, background: categoryColor(c.name) }} />
                      {c.name}
                    </span>
                    <span className="num muted" style={{ fontWeight: 600 }}>
                      {formatCurrency(c.value)} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
