import { useMemo, useState } from 'react';
import { CreditCard, ChevronDown, ChevronRight, CalendarClock } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/format';
import { invoiceMonthForDate, dueDateForInvoice, invoiceLabel } from '../utils/invoice';
import { colorByIndex, categoryIcon } from '../utils/categories';

export default function InvoicesView() {
  const { transactions, cards } = useData();
  const [openKey, setOpenKey] = useState(null);

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

  if (cards.length === 0) {
    return (
      <div className="card empty">
        <div className="emoji">💳</div>
        <div className="t">Nenhum cartão cadastrado</div>
        <p>Cadastre seus cartões no botão "Cartões" para ver as compras organizadas por fatura.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="col gap-lg">
      {cards.map((card) => {
        const invoices = invoicesByCard[card.id] || {};
        const months = Object.keys(invoices).sort((a, b) => (a < b ? 1 : -1)); // mais recente primeiro
        const color = colorByIndex(card.colorIndex || 0);

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
              <div className="col gap-sm">
                {months.map((im) => {
                  const inv = invoices[im];
                  const due = dueDateForInvoice(im, card);
                  const key = `${card.id}-${im}`;
                  const isOpen = openKey === key;
                  const paid = due < today;
                  return (
                    <div key={key} className="card" style={{ overflow: 'hidden' }}>
                      <button
                        className="between"
                        style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: 'var(--text)' }}
                        onClick={() => setOpenKey(isOpen ? null : key)}
                      >
                        <div className="row gap-sm" style={{ minWidth: 0 }}>
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{invoiceLabel(im)}</div>
                            <div className="muted row gap-sm" style={{ fontSize: '0.78rem' }}>
                              <CalendarClock size={13} /> vence {formatDate(due)}
                              {paid && ' · vencida'}
                            </div>
                          </div>
                        </div>
                        <div className="num" style={{ fontWeight: 700, color: 'var(--expense)' }}>
                          {formatCurrency(inv.total)}
                        </div>
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
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
