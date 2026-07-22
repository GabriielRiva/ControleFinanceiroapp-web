import { useMemo, useState, lazy, Suspense } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, CalendarPlus, Wallet, ArrowUpRight, ArrowDownRight,
  Upload, Loader2, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  addInvestment, updateInvestment, deleteInvestment, saveSnapshot, applyAporte, applyResgate,
} from '../services/investmentService';
import { addTransaction } from '../services/transactionService';
import {
  formatCurrency, formatDate, currentMonthKey, monthLabelFromKey, todayISO,
} from '../utils/format';
import { colorByIndex } from '../utils/categories';
import InvestmentModal from '../components/InvestmentModal';
import QuickAmountModal from '../components/QuickAmountModal';
import ConfirmDialog from '../components/ConfirmDialog';
// carregados só quando o modal é aberto — pdfjs-dist é pesado e a maioria
// das visitas nunca importa um extrato
const EqiImportModal = lazy(() => import('../components/EqiImportModal'));
const EqiPerformanceImportModal = lazy(() => import('../components/EqiPerformanceImportModal'));

export default function Investments() {
  const { investments, snapshots, portfolio, transactions } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [modal, setModal] = useState(null);      // {edit?}
  const [aporte, setAporte] = useState(null);    // position
  const [resgate, setResgate] = useState(null);  // position
  const [updateBal, setUpdateBal] = useState(null); // position
  const [confirm, setConfirm] = useState(null);  // position
  const [allocView, setAllocView] = useState('class'); // 'class' | 'asset'
  const [saving, setSaving] = useState(false);
  const [showEqiImport, setShowEqiImport] = useState(false);
  const [showEqiPerfImport, setShowEqiPerfImport] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

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

  // Rentabilidade do mês: (valor atual − valor do último registro) menos os
  // fluxos de caixa da carteira no período. Os fluxos vêm das MOVIMENTAÇÕES
  // reais (aplicação/resgate) — assim aportes e resgates são descontados
  // corretamente, sem o clamp Math.max que zerava resgates, e o cálculo
  // continua certo mesmo com resgate parcial (pro-rata) na posição.
  const monthlyReturn = useMemo(() => {
    if (snapshots.length === 0) return null;
    const mk = currentMonthKey();
    const sorted = [...snapshots].sort((a, b) => (a.date < b.date ? -1 : 1));
    // último registro anterior ao mês atual
    const prev = [...sorted].reverse().find((s) => s.date < mk) || null;
    if (!prev) return null;

    // aporte positivo, resgate negativo — somente movimentações de investimento
    // ocorridas DEPOIS do mês do último registro.
    let netContrib = 0;
    for (const t of transactions) {
      const tmk = (t.date || '').slice(0, 7);
      if (tmk <= prev.date) continue;
      if (t.category !== 'Investimentos') continue;
      if (t.type === 'application') netContrib += Number(t.amount) || 0;
      else if (t.type === 'redemption') netContrib -= Number(t.amount) || 0;
    }

    const base = Number(prev.totalValue) || 0;
    const rend = (portfolio.current - base) - netContrib;
    const pct = base > 0 ? (rend / base) * 100 : 0;
    return { rend, pct, fromLabel: monthLabelFromKey(prev.date) };
  }, [snapshots, portfolio, transactions]);

  const evolution = useMemo(
    () => snapshots.map((s) => ({
      label: monthLabelFromKey(s.date),
      Investido: Number(s.totalInvested) || 0,
      Patrimônio: Number(s.totalValue) || 0,
    })),
    [snapshots]
  );

  // separa posições ainda ativas das que já fecharam de vez (aportado e
  // valor atual zerados) — encerradas ficam recolhidas por padrão
  const activeInvestments = useMemo(
    () => investments.filter((p) => (Number(p.invested) || 0) > 0 || (Number(p.currentValue) || 0) > 0),
    [investments]
  );
  const closedInvestments = useMemo(
    () => investments.filter((p) => (Number(p.invested) || 0) === 0 && (Number(p.currentValue) || 0) === 0),
    [investments]
  );

  function renderInvestmentCard(p) {
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
                {p.date ? ` · desde ${formatDate(p.date)}` : ''}
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
  }

  /* ---------- ações ---------- */
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateInvestment(modal.edit.id, data);
        notify('Investimento atualizado.');
      } else {
        await addInvestment(user.uid, data);
        // descontar o aportado do saldo (movimentação neutra: aplicação)
        if (data.deductFromBalance && Number(data.invested) > 0) {
          await addTransaction(user.uid, {
            type: 'application',
            description: `Aplicação: ${data.name}`,
            amount: Number(data.invested),
            category: 'Investimentos',
            date: todayISO(),
            paymentMethod: 'Pix',
          });
          notify('Investimento adicionado e descontado do saldo.');
        } else {
          notify('Investimento adicionado.');
        }
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
      const { invested, currentValue } = applyAporte(aporte, amount);
      await updateInvestment(aporte.id, {
        name: aporte.name,
        assetClass: aporte.assetClass,
        date: aporte.date,
        invested,
        currentValue,
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
      const { invested, currentValue, take } = applyResgate(resgate, amount);
      await updateInvestment(resgate.id, {
        name: resgate.name,
        assetClass: resgate.assetClass,
        date: resgate.date,
        invested,
        currentValue,
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
        date: updateBal.date,
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

      <div className="between" style={{ marginBottom: 18, gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={registerMonth} title="Salva o valor de hoje no histórico de evolução">
          <CalendarPlus size={17} /> <span className="add-label">Registrar mês</span>
        </button>
        <div className="row gap-sm">
          <button className="btn btn-ghost" onClick={() => setShowEqiImport(true)}>
            <Upload size={17} /> <span className="add-label">Importar extrato</span>
          </button>
          <button className="btn btn-ghost" onClick={() => setShowEqiPerfImport(true)}>
            <History size={17} /> <span className="add-label">Importar histórico</span>
          </button>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} /> <span className="add-label">Novo investimento</span>
          </button>
        </div>
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
        <>
          {activeInvestments.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.86rem' }}>Nenhum investimento ativo no momento.</p>
          ) : (
            <div className="col gap">
              {activeInvestments.map((p) => renderInvestmentCard(p))}
            </div>
          )}

          {closedInvestments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.84rem', padding: '8px 12px' }}
                onClick={() => setShowClosed((v) => !v)}
              >
                {showClosed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {showClosed ? 'Ocultar' : 'Mostrar'} encerrados ({closedInvestments.length})
              </button>
              {showClosed && (
                <div className="col gap" style={{ marginTop: 12 }}>
                  {closedInvestments.map((p) => renderInvestmentCard(p, true))}
                </div>
              )}
            </div>
          )}
        </>
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
      {showEqiImport && (
        <Suspense fallback={
          <div className="overlay">
            <div className="card card-pad" style={{ margin: 'auto', textAlign: 'center' }}>
              <Loader2 size={22} className="spin" />
            </div>
          </div>
        }>
          <EqiImportModal onClose={() => setShowEqiImport(false)} />
        </Suspense>
      )}
      {showEqiPerfImport && (
        <Suspense fallback={
          <div className="overlay">
            <div className="card card-pad" style={{ margin: 'auto', textAlign: 'center' }}>
              <Loader2 size={22} className="spin" />
            </div>
          </div>
        }>
          <EqiPerformanceImportModal onClose={() => setShowEqiPerfImport(false)} />
        </Suspense>
      )}
    </>
  );
}
