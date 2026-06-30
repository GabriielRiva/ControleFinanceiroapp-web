import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, ArrowRight, LineChart, Landmark } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, MONTH_SHORT, MONTH_NAMES, greeting, daysUntil } from '../utils/format';
import BudgetSummary from '../components/BudgetSummary';

function lastMonths(transactions, count = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: MONTH_SHORT[d.getMonth()], income: 0, expense: 0 });
  }
  const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  for (const t of transactions) {
    const k = (t.date || '').slice(0, 7);
    if (k in idx) {
      const b = buckets[idx[k]];
      if (t.type === 'income') b.income += Number(t.amount) || 0;
      else b.expense += Number(t.amount) || 0;
    }
  }
  return buckets;
}

export default function Dashboard() {
  const { summary, transactions, goals, loading, indexError, portfolio } = useData();
  const { profile, user } = useAuth();

  const chart = useMemo(() => lastMonths(transactions, 6), [transactions]);
  const hasChart = chart.some((b) => b.income > 0 || b.expense > 0);
  const firstName = (profile?.name || user?.displayName || '').split(' ')[0] || '';

  const upcomingGoals = useMemo(
    () => [...goals].filter((g) => Number(g.currentAmount) < Number(g.targetAmount)).slice(0, 3),
    [goals]
  );

  if (loading) {
    return <div className="empty"><div className="spinner" style={{ margin: '40px auto' }} /></div>;
  }

  return (
    <>
      <p className="muted" style={{ fontSize: '0.95rem', marginBottom: 14 }}>
        {greeting()}{firstName ? `, ${firstName}` : ''} 👋
      </p>

      {indexError && (
        <div
          className="card card-pad"
          style={{ marginBottom: 16, background: 'var(--goal-soft)', borderColor: 'transparent' }}
        >
          <strong>Quase lá:</strong> o Firestore está criando os índices necessários. Isso leva cerca de 1 minuto na
          primeira vez. Se algum dado não aparecer, recarregue a página em instantes.
        </div>
      )}

      {/* HERO — assinatura do painel */}
      <div className="balance-hero" style={{ marginBottom: 16 }}>
        <div className="ledger-line" />
        <div className="label">Saldo do mês · {MONTH_NAMES[new Date().getMonth()]}</div>
        <div className="big">{formatCurrency(summary.monthBalance)}</div>
        <div className="row gap" style={{ gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="row gap-sm" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem' }}>
            <TrendingUp size={16} /> {formatCurrency(summary.monthIncome)} entraram
          </span>
          <span className="row gap-sm" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem' }}>
            <TrendingDown size={16} /> {formatCurrency(summary.monthExpense)} saíram
          </span>
        </div>
        <div
          className="row gap-sm"
          style={{
            marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', fontWeight: 600,
          }}
        >
          <Landmark size={16} /> Saldo em conta: {formatCurrency(summary.realBalance)}
        </div>
      </div>

      {/* STATS — do mês atual */}
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <Link to="/receitas" className="card stat stat-link">
          <div className="cap"><Wallet size={15} /> Receitas (mês)</div>
          <div className="val income">{formatCurrency(summary.monthIncome)}</div>
        </Link>
        <Link to="/despesas" className="card stat stat-link">
          <div className="cap"><TrendingDown size={15} /> Despesas (mês)</div>
          <div className="val expense">{formatCurrency(summary.monthExpense)}</div>
        </Link>
        <Link to="/relatorios" className="card stat stat-link">
          <div className="cap"><PiggyBank size={15} /> Economizado (mês)</div>
          <div className="val" style={{ color: 'var(--brand-strong)' }}>
            {formatCurrency(Math.max(summary.monthBalance, 0))}
          </div>
        </Link>
      </div>

      {/* card de investimentos (só aparece se houver carteira) */}
      {portfolio.current > 0 && (
        <Link to="/investimentos" className="card card-pad between" style={{ marginBottom: 22, textDecoration: 'none', color: 'inherit' }}>
          <div>
            <div className="cap muted row gap-sm" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              <LineChart size={15} /> Patrimônio investido
            </div>
            <div className="num" style={{ fontWeight: 700, fontSize: '1.5rem', marginTop: 6 }}>
              {formatCurrency(portfolio.current)}
            </div>
            <div className="num" style={{ color: portfolio.profit >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600, fontSize: '0.85rem', marginTop: 2 }}>
              {portfolio.profit >= 0 ? '+' : ''}{formatCurrency(portfolio.profit)} ({portfolio.profitPct.toFixed(2)}%)
            </div>
          </div>
          <ArrowRight size={20} className="muted" />
        </Link>
      )}

      {/* CHART */}
      <h2 className="section-title">Últimos 6 meses</h2>
      <div className="card card-pad" style={{ marginBottom: 22 }}>
        {hasChart ? (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={chart} barGap={4} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  formatter={(v, n) => [formatCurrency(v), n === 'income' ? 'Receitas' : 'Despesas']}
                  contentStyle={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, fontSize: 13, color: 'var(--text)',
                  }}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                />
                <Bar dataKey="income" radius={[5, 5, 0, 0]} fill="var(--income)" />
                <Bar dataKey="expense" radius={[5, 5, 0, 0]} fill="var(--expense)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty" style={{ padding: '28px 0' }}>
            <div className="emoji">📊</div>
            <div className="t">Sem dados ainda</div>
            <p>Adicione receitas e despesas para ver a evolução aqui.</p>
          </div>
        )}
        <div className="row gap-lg" style={{ justifyContent: 'center', marginTop: 12, fontSize: '0.82rem' }}>
          <span className="row gap-sm"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--income)' }} /> Receitas</span>
          <span className="row gap-sm"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--expense)' }} /> Despesas</span>
        </div>
      </div>

      {/* ORÇAMENTO */}
      <BudgetSummary />

      {/* GOALS */}
      <div className="between" style={{ marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Metas em andamento</h2>
        <Link to="/metas" className="link-btn row gap-sm">Ver todas <ArrowRight size={15} /></Link>
      </div>
      {upcomingGoals.length === 0 ? (
        <div className="card empty">
          <div className="emoji">🎯</div>
          <div className="t">Nenhuma meta ativa</div>
          <p>Crie uma meta para acompanhar seu progresso.</p>
        </div>
      ) : (
        <div className="col gap">
          {upcomingGoals.map((g) => {
            const pct = Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100));
            const days = daysUntil(g.deadline);
            return (
              <div className="card goal-card" key={g.id}>
                <div className="goal-top">
                  <div className="goal-name">{g.name}</div>
                  <div className="goal-pct">{pct}%</div>
                </div>
                <div className="progress" style={{ marginTop: 12 }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-meta">
                  <span>{formatCurrency(g.currentAmount)} de {formatCurrency(g.targetAmount)}</span>
                  <span>{days >= 0 ? `${days} dias restantes` : 'prazo vencido'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
