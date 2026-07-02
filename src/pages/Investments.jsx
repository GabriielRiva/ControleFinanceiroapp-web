import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, CalendarPlus, Wallet, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addInvestment, updateInvestment, deleteInvestment, saveSnapshot,
} from '../services/investmentService';
import { addTransaction } from '../services/transactionService';
import {
  formatCurrency, currentMonthKey, monthLabelFromKey, todayISO,
} from '../utils/format';
import { colorByIndex } from '../utils/categories';
import InvestmentModal from '../components/InvestmentModal';
import QuickAmountModal from '../components/QuickAmountModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Investments() {
  const { investments, snapshots, portfolio } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [modal, setModal] = useState(null);      // {edit?}
  const [aporte, setAporte] = useState(null);    // position
  const [resgate, setResgate] = useState(null);  // position
  const [updateBal, setUpdateBal] = useState(null); // position
  const [confirm, setConfirm] = useState(null);  // position
  const [allocView, setAllocView] = useState('class'); // 'class' | 'asset'
  const [saving, setSaving] = useState(false);

  const allocation = useMemo(
    () => investments
      .filter((p) => Number(p.currentValue) > 0)
      .map((p) => ({ name: p.name, value: Number(p.currentValue) })),
    [investments]
  );

  // divisão por classe de ativo
  const allocationByClass = useMemo(() => {
    const m = {};
    for (const p of investments) {
      const v = Number(p.currentValue) || 0;
      if (v <= 0) continue;
      const cls = p.assetClass || 'Outros';
      m[cls] = (m[cls] || 0) + v;
    }
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  // rentabilidade do mês (desconta aportes feitos desde o último registro)
  const monthlyReturn = useMemo(() => {
    if (snapshots.length === 0) return null;
    const mk = currentMonthKey();
    const sorted = [...snapshots].sort((a, b) => (a.date < b.date ? -1 : 1));
    // último registro anterior ao mês atual
    const prev = [...sorted].reverse().find((s) => s.date < mk) || null;
    if (!prev) return null;
    const aportesMes = Math.max(0, portfolio.invested - (Number(prev.totalInvested) || 0));
    const rend = (portfolio.current - (Number(prev.totalValue) || 0)) - aportesMes;
    const base = Number(prev.totalValue) || 0;
    const pct = base > 0 ? (rend / base) * 100 : 0;
    return { rend, pct, fromLabel: monthLabelFromKey(prev.date) };
  }, [snapshots, portfolio]);

  const evolution = useMemo(
    () => snapshots.map((s) => ({
      label: monthLabelFromKey(s.date),
      Investido: Number(s.totalInvested) || 0,
      Patrimônio: Number(s.totalValue) || 0,
    })),
    [snapshots]
  );

  /* ---------- ações ---------- */
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateInvestment(modal.edit.id, data);
        notify('Investimento atualizado.');
      } else {
        await addInvestment(user.uid, data);
        notify('Investimento adicionado.');
      }
      setModal(null);
    } catch {
      notify('Não foi possível salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleAporte = async (amount, opts = {}) => {
    setSaving(true);
    try {
      await updateInvestment(aporte.id, {
        name: aporte.name,
        assetClass: aporte.assetClass,
        invested: (Number(aporte.invested) || 0) + amount,
        currentValue: (Number(aporte.currentValue) || 0) + amount,
      });
      // descontar do saldo: registra como APLICAÇÃO (neutra, não é despesa)
      if (opts.checked) {
        await addTransaction(user.uid, {
          type: 'application',
          description: `Aplicação: ${aporte.name}`,
          amount,
          category: 'Investimentos',
          date: todayISO(),
          paymentMethod: 'Pix',
        });
        notify('Aporte registrado e descontado do saldo.');
      } else {
        notify('Aporte registrado.');
      }
      setAporte(null);
    } catch {
      notify('Não foi possível registrar o aporte.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleResgate = async (amount, opts = {}) => {
    setSaving(true);
    try {
      const curVal = Number(resgate.currentValue) || 0;
      const curInv = Number(resgate.invested) || 0;
      const take = Math.min(amount, curVal); // não resgata mais que o valor atual
      await updateInvestment(resgate.id, {
        name: resgate.name,
        assetClass: resgate.assetClass,
        invested: Math.max(0, curInv - take),
        currentValue: Math.max(0, curVal - take),
      });
      if (opts.checked) {
        await addTransaction(user.uid, {
          type: 'redemption',
          description: `Resgate: ${resgate.name}`,
          amount: take,
          category: 'Investimentos',
          date: todayISO(),
          paymentMethod: 'Pix',
        });
        notify('Resgate registrado e creditado no saldo.');
      } else {
        notify('Resgate registrado.');
      }
      setResgate(null);
    } catch {
      notify('Não foi possível registrar o resgate.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBalance = async (newValue) => {
    setSaving(true);
    try {
      await updateInvestment(updateBal.id, {
        name: updateBal.name,
        assetClass: updateBal.assetClass,
        invested: Number(updateBal.invested) || 0,
        currentValue: newValue,
      });
      notify('Saldo atualizado.');
      setUpdateBal(null);
    } catch {
      notify('Não foi possível atualizar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    try {
      await deleteInvestment(p.id);
      notify('Investimento removido.');
    } catch {
      notify('Não foi possível remover.', 'err');
    }
  };

  const registerMonth = async () => {
    try {
      const mk = currentMonthKey();
      const existing = snapshots.find((s) => s.date === mk);
      await saveSnapshot(user.uid, mk, portfolio.invested, portfolio.current, existing?.id);
      notify(existing ? 'Mês atualizado no histórico.' : 'Mês registrado no histórico.');
    } catch {
      notify('Não foi possível registrar o mês.', 'err');
    }
  };

  const profitColor = portfolio.profit >= 0 ? 'var(--income)' : 'var(--expense)';

  return (
    <>
      {/* resumo da carteira */}
      <div className="balance-hero" style={{ marginBottom: 16 }}>
        <div className="ledger-line" />
        <div className="label">Patrimônio investido</div>
        <div className="big">{formatCurrency(portfolio.current)}</div>
        <div className="row gap" style={{ gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="row gap-sm" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem' }}>
            <Wallet size={16} /> {formatCurrency(portfolio.invested)} aportado
          </span>
          <span className="row gap-sm" style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.88rem', fontWeight: 600 }}>
            <ArrowUpRight size={16} />
            {portfolio.profit >= 0 ? '+' : ''}{formatCurrency(portfolio.profit)} ({portfolio.profitPct.toFixed(2)}%) no total
          </span>
        </div>
        {monthlyReturn && (
          <div
            className="row gap-sm"
            style={{
              marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            {monthlyReturn.rend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            Este mês: {monthlyReturn.rend >= 0 ? '+' : ''}{formatCurrency(monthlyReturn.rend)} ({monthlyReturn.pct.toFixed(2)}%)
          </div>
        )}
      </div>

      <div className="between" style={{ marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={registerMonth} title="Salva o valor de hoje no histórico de evolução">
          <CalendarPlus size={17} /> <span className="add-label">Registrar mês</span>
        </button>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={18} /> <span className="add-label">Novo investimento</span>
        </button>
      </div>

      {/* evolução do patrimônio */}
      {evolution.length >= 2 && (
        <>
          <h2 className="section-title row gap-sm"><TrendingUp size={18} /> Evolução do patrimônio</h2>
          <div className="card card-pad" style={{ marginBottom: 22 }}>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={evolution} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, fontSize: 13, color: 'var(--text)',
                    }}
                  />
                  <Line type="monotone" dataKey="Investido" stroke="var(--muted)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Patrimônio" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="row gap-lg" style={{ justifyContent: 'center', marginTop: 8, fontSize: '0.82rem' }}>
              <span className="row gap-sm"><i style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--brand)' }} /> Patrimônio</span>
              <span className="row gap-sm"><i style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--muted)' }} /> Aportado</span>
            </div>
          </div>
        </>
      )}

      {/* divisão da carteira */}
      {allocation.length > 0 && (
        <>
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Divisão da carteira</h2>
            <div className="row gap-sm">
              <button className={`chip ${allocView === 'class' ? 'active' : ''}`} onClick={() => setAllocView('class')}>Por classe</button>
              <button className={`chip ${allocView === 'asset' ? 'active' : ''}`} onClick={() => setAllocView('asset')}>Por ativo</button>
            </div>
          </div>
          <div className="card card-pad" style={{ marginBottom: 22 }}>
            {(() => {
              const data = allocView === 'class' ? allocationByClass : allocation;
              return (
                <div className="row gap-lg wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2} stroke="none">
                          {data.map((e, i) => <Cell key={e.name} fill={colorByIndex(i)} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatCurrency(v)}
                          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--text)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col gap-sm grow" style={{ minWidth: 180 }}>
                    {data.map((c, i) => {
                      const pct = portfolio.current > 0 ? Math.round((c.value / portfolio.current) * 100) : 0;
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
              );
            })()}
          </div>
        </>
      )}

      {/* lista de posições */}
      <h2 className="section-title">Meus investimentos</h2>
      {investments.length === 0 ? (
        <div className="card empty">
          <div className="emoji">📈</div>
          <div className="t">Acompanhe seus investimentos</div>
          <p style={{ maxWidth: 330, margin: '0 auto 16px' }}>
            Cadastre suas posições (Renda Fixa, Fundos…), informe o valor atual e veja quanto rendem
            ao longo do tempo.
          </p>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} /> Adicionar investimento
          </button>
        </div>
      ) : (
        <div className="col gap">
          {investments.map((p) => {
            const inv = Number(p.invested) || 0;
            const cur = Number(p.currentValue) || 0;
            const profit = cur - inv;
            const pct = inv > 0 ? (profit / inv) * 100 : 0;
            const color = profit >= 0 ? 'var(--income)' : 'var(--expense)';
            return (
              <div className="card goal-card" key={p.id}>
                <div className="goal-top">
                  <div>
                    <div className="goal-name">{p.name}</div>
                    <div className="row gap-sm" style={{ marginTop: 3, alignItems: 'center' }}>
                      <span className="pill" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {p.assetClass || 'Outros'}
                      </span>
                      <span className="muted" style={{ fontSize: '0.82rem' }}>
                        Aportado: {formatCurrency(inv)}
                      </span>
                    </div>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <div className="num" style={{ fontWeight: 700, fontSize: '1.12rem' }}>{formatCurrency(cur)}</div>
                    <div className="num" style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({pct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="row gap-sm wrap" style={{ marginTop: 14 }}>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setAporte(p)}>
                    <Plus size={15} /> Aporte
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setResgate(p)}>
                    <ArrowDownRight size={15} /> Resgatar
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setUpdateBal(p)}>
                    Atualizar saldo
                  </button>
                  <div className="grow" />
                  <button className="mini-btn" onClick={() => setModal({ edit: p })} aria-label="Editar"><Pencil size={16} /></button>
                  <button className="mini-btn danger" onClick={() => setConfirm(p)} aria-label="Remover"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 18, lineHeight: 1.6 }}>
        💡 No fim do mês, abra o app do seu banco, atualize o saldo de cada investimento aqui e toque em
        <strong> "Registrar mês"</strong> para guardar um ponto na evolução do patrimônio.
      </p>

      {/* modais */}
      {modal && (
        <InvestmentModal initial={modal.edit} saving={saving} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {aporte && (
        <QuickAmountModal
          title={`Aporte em ${aporte.name}`}
          label="Quanto você investiu agora? (R$)"
          hint="Esse valor entra no total aportado e no valor atual."
          cta="Registrar aporte"
          checkboxLabel="Descontar do meu saldo (registra como aplicação)"
          checkboxDefault
          saving={saving}
          onConfirm={handleAporte}
          onClose={() => setAporte(null)}
        />
      )}

      {resgate && (
        <QuickAmountModal
          title={`Resgatar de ${resgate.name}`}
          label="Quanto você resgatou? (R$)"
          hint={`Valor disponível: ${formatCurrency(resgate.currentValue)}. O valor sai do investimento.`}
          cta="Registrar resgate"
          checkboxLabel="Creditar no meu saldo (entra na conta)"
          checkboxDefault
          saving={saving}
          onConfirm={handleResgate}
          onClose={() => setResgate(null)}
        />
      )}
      {updateBal && (
        <QuickAmountModal
          title={`Atualizar ${updateBal.name}`}
          label="Valor atual na carteira (R$)"
          hint="Digite quanto essa posição vale hoje, segundo o app do seu banco."
          cta="Salvar saldo"
          defaultValue={updateBal.currentValue}
          saving={saving}
          onConfirm={handleUpdateBalance}
          onClose={() => setUpdateBal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Remover investimento"
          message={`Remover "${confirm.name}" da sua carteira?`}
          confirmLabel="Remover"
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
