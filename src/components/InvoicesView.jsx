import { useMemo, useState } from 'react';
import { CreditCard, ChevronLeft, ChevronRight, CalendarClock, CheckCircle2, Undo2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, currentMonthKey, todayISO } from '../utils/format';
import { invoiceMonthForDate, dueDateForInvoice, invoiceLabel } from '../utils/invoice';
import { colorByIndex, PAYMENT_METHODS } from '../utils/categories';
import { markInvoicePaid, markInvoiceUnpaid } from '../services/invoicePaymentService';

export default function InvoicesView() {
  const { transactions, cards, categoryIcon, invoicePayments } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const [openCardId, setOpenCardId] = useState(null);
  // mês selecionado por cartão (cardId -> "YYYY-MM")
  const [selectedMonth, setSelectedMonth] = useState({});

  // monta faturas: para cada cartão, agrupa as despesas por mês de fatura
  const invoicesByCard = useMemo(() => {
    const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
    const groups = {}; // cardId -> { invoiceMonth -> {items, total} }

    for (const t of transactions) {
      if (t.type !== 'expense' || !t.cardId) continue;
      const card = cardMap[t.cardId];
      if (!card) continue;
      const im = invoiceMonthForDate(t.date, card);
      groups[t.cardId] = groups[t.cardId] || {};
      groups[t.cardId][im] = groups[t.cardId][im] || { items: [], total: 0 };
      groups[t.cardId][im].items.push(t);
      groups[t.cardId][im].total += Number(t.amount) || 0;
    }
    return groups;
  }, [transactions, cards]);

  const paymentByKey = useMemo(() => {
    const map = {};
    for (const p of invoicePayments) map[`${p.cardId}_${p.invoiceMonth}`] = p;
    return map;
  }, [invoicePayments]);

  if (cards.length === 0) {
    return (
      <div className="card empty">
        <div className="emoji">💳</div>
        <div className="t">Nenhum cartão cadastrado</div>
        <p>Cadastre seus cartões no botão "Cartões" para ver as compras organizadas por fatura.</p>
      </div>
    );
  }

  const today = todayISO();
  const thisMonth = currentMonthKey();

  return (
    <div className="col gap-lg">
      {cards.map((card) => {
        const invoices = invoicesByCard[card.id] || {};
        const months = Object.keys(invoices).sort(); // ordem cronológica (mais antigo primeiro)
        const color = colorByIndex(card.colorIndex || 0);

        // mês ativo: o escolhido, senão o mês atual (se existir fatura), senão o mais próximo do hoje
        const active = selectedMonth[card.id] || (
          months.includes(thisMonth)
            ? thisMonth
            : months.find((m) => m >= thisMonth) || months[months.length - 1] || thisMonth
        );
        const activeIdx = months.indexOf(active);
        const inv = invoices[active];
        const due = inv ? dueDateForInvoice(active, card) : null;
        const isVencida = due && due < today;
        const payKey = `${card.id}_${active}`;
        const payment = paymentByKey[payKey];
        const isOpen = openCardId === card.id;

        const goTo = (idx) => {
          if (idx < 0 || idx >= months.length) return;
          setSelectedMonth((s) => ({ ...s, [card.id]: months[idx] }));
        };

        const handleMarkPaid = async () => {
          try {
            await markInvoicePaid(user.uid, card.id, active, {
              paidDate: today,
              paymentMethod: PAYMENT_METHODS[1] || 'Pix',
            });
            notify('Fatura marcada como paga.');
          } catch {
            notify('Não foi possível marcar a fatura como paga.', 'err');
          }
        };

        const handleMarkUnpaid = async () => {
          try {
            await markInvoiceUnpaid(card.id, active);
            notify('Fatura marcada como pendente novamente.');
          } catch {
            notify('Não foi possível atualizar.', 'err');
          }
        };

        return (
          <div key={card.id}>
            <div className="row gap-sm" style={{ marginBottom: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: color, display: 'grid', placeItems: 'center', color: '#fff' }}>
                <CreditCard size={16} />
              </span>
              <strong>{card.name}</strong>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                fecha dia {card.closingDay} · vence dia {card.dueDay}
              </span>
            </div>

            {months.length === 0 ? (
              <div className="card card-pad muted" style={{ fontSize: '0.88rem' }}>
                Nenhuma compra neste cartão ainda.
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* navegação: seta anterior / mês ativo / seta próxima + ir-para-mês */}
                <div className="between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                  <button className="mini-btn" onClick={() => goTo(activeIdx - 1)} disabled={activeIdx <= 0} aria-label="Fatura anterior">
                    <ChevronLeft size={17} />
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{invoiceLabel(active)}</div>
                    {due && (
                      <div className="muted row gap-sm" style={{ fontSize: '0.76rem', justifyContent: 'center' }}>
                        <CalendarClock size={12} /> vence {formatDate(due)}
                        {isVencida && !payment?.paid && ' · vencida'}
                        {payment?.paid && ` · paga em ${formatDate(payment.paidDate)}${payment.paymentMethod ? ` (${payment.paymentMethod})` : ''}`}
                      </div>
                    )}
                  </div>

                  <button className="mini-btn" onClick={() => goTo(activeIdx + 1)} disabled={activeIdx >= months.length - 1} aria-label="Próxima fatura">
                    <ChevronRight size={17} />
                  </button>
                </div>

                <div className="row gap-sm wrap" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <select
                    className="select"
                    style={{ maxWidth: 200 }}
                    value={active}
                    onChange={(e) => setSelectedMonth((s) => ({ ...s, [card.id]: e.target.value }))}
                  >
                    {months.map((m) => <option key={m} value={m}>{invoiceLabel(m)}</option>)}
                  </select>
                  {months.includes(thisMonth) && active !== thisMonth && (
                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => goTo(months.indexOf(thisMonth))}>
                      Ir para mês atual
                    </button>
                  )}
                  <div className="grow" />
                  {payment?.paid ? (
                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={handleMarkUnpaid}>
                      <Undo2 size={14} /> Desmarcar
                    </button>
                  ) : (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={handleMarkPaid}>
                      <CheckCircle2 size={14} /> Marcar como paga
                    </button>
                  )}
                </div>

                <button
                  className="between"
                  style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: 'var(--text)' }}
                  onClick={() => setOpenCardId(isOpen ? null : card.id)}
                >
                  <span className="muted" style={{ fontSize: '0.84rem' }}>
                    {isOpen ? 'Ocultar compras desta fatura' : `Ver ${inv.items.length} compra${inv.items.length === 1 ? '' : 's'}`}
                  </span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--expense)' }}>
                    {formatCurrency(inv.total)}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {inv.items
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((t) => (
                        <div className="list-item" key={t.id}>
                          <div className="emoji">{categoryIcon(t.category)}</div>
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div className="ttl">{t.description}</div>
                            <div className="sub">{t.category} · {formatDate(t.date)}</div>
                          </div>
                          <div className="amt expense">{formatCurrency(t.amount)}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
