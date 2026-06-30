import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, MONTH_NAMES, MONTH_SHORT } from '../utils/format';
import { categoryColor, colorByIndex } from '../utils/categories';

export default function Reports() {
  const { transactions, loading } = useData();

  // série dos últimos 6 meses (receitas e despesas) para o comparativo
  const series = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: MONTH_SHORT[d.getMonth()], Receitas: 0, Despesas: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const t of transactions) {
      const k = (t.date || '').slice(0, 7);
      if (k in idx) {
        const b = buckets[idx[k]];
        if (t.type === 'income') b.Receitas += Number(t.amount) || 0;
        else if (t.type === 'expense') b.Despesas += Number(t.amount) || 0;
      }
    }
    return buckets;
  }, [transactions]);

  // variação do mês atual vs anterior
  const delta = useMemo(() => {
    const cur = series[series.length - 1];
    const prev = series[series.length - 2];
    const calc = (a, b) => {
      const diff = a - b;
      const pct = b > 0 ? (diff / b) * 100 : (a > 0 ? 100 : 0);
      return { diff, pct };
    };
    return {
      cur, prev,
      expense: calc(cur?.Despesas || 0, prev?.Despesas || 0),
      income: calc(cur?.Receitas || 0, prev?.Receitas || 0),
    };
  }, [series]);

  const hasComparison = series.some((b) => b.Receitas > 0 || b.Despesas > 0);

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
      else if (t.type === 'expense') expense += Number(t.amount) || 0;
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

  const DeltaPill = ({ d }) => {
    const up = d.diff > 0.005;
    const down = d.diff < -0.005;
    const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
    const color = up ? 'var(--expense)' : down ? 'var(--income)' : 'var(--muted)';
    return (
      <span className="row gap-sm num" style={{ color, fontWeight: 700, fontSize: '0.85rem' }}>
        <Icon size={15} /> {up ? '+' : ''}{d.pct.toFixed(0)}%
      </span>
    );
  };

  return (
    <>
      {/* COMPARATIVO ENTRE MESES */}
      {hasComparison && (
        <>
          <h2 className="section-title">Comparativo entre meses</h2>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div>
                <div className="cap muted row gap-sm" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TrendingUp size={14} /> Receitas
                </div>
                <div className="num" style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                  {formatCurrency(delta.cur?.Receitas || 0)}
                </div>
                <div className="row gap-sm" style={{ marginTop: 2 }}>
                  {/* para receitas, subir é bom: invertemos a cor */}
                  <span className="row gap-sm num" style={{
                    color: delta.income.diff > 0.005 ? 'var(--income)' : delta.income.diff < -0.005 ? 'var(--expense)' : 'var(--muted)',
                    fontWeight: 700, fontSize: '0.85rem',
                  }}>
                    {delta.income.diff > 0.005 ? <ArrowUpRight size={15} /> : delta.income.diff < -0.005 ? <ArrowDownRight size={15} /> : <Minus size={15} />}
                    {delta.income.diff > 0.005 ? '+' : ''}{delta.income.pct.toFixed(0)}%
                  </span>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>vs mês anterior</span>
                </div>
              </div>
              <div>
                <div className="cap muted row gap-sm" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <TrendingDown size={14} /> Despesas
                </div>
                <div className="num" style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                  {formatCurrency(delta.cur?.Despesas || 0)}
                </div>
                <div className="row gap-sm" style={{ marginTop: 2 }}>
                  {/* para despesas, subir é ruim (vermelho) e cair é bom (verde) */}
                  <DeltaPill d={delta.expense} />
                  <span className="muted" style={{ fontSize: '0.78rem' }}>vs mês anterior</span>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer>
                <BarChart data={series} barGap={4} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    formatter={(v, n) => [formatCurrency(v), n]}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--text)' }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  />
                  <Bar dataKey="Receitas" radius={[5, 5, 0, 0]} fill="var(--income)" />
                  <Bar dataKey="Despesas" radius={[5, 5, 0, 0]} fill="var(--expense)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="row gap-lg" style={{ justifyContent: 'center', marginTop: 8, fontSize: '0.82rem' }}>
              <span className="row gap-sm"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--income)' }} /> Receitas</span>
              <span className="row gap-sm"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--expense)' }} /> Despesas</span>
            </div>
          </div>
        </>
      )}

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
                    {byCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={colorByIndex(i)} />
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
              {byCategory.map((c, i) => {
                const pct = Math.round((c.value / totals.expense) * 100);
                return (
                  <div className="between" key={c.name} style={{ gap: 12 }}>
                    <span className="row gap-sm">
                      <i style={{ width: 11, height: 11, borderRadius: 3, background: colorByIndex(i) }} />
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
