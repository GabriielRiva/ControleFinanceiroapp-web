import { useMemo, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addTransaction } from '../services/transactionService';
import { parseCardCsv } from '../utils/cardCsvParser';
import { invoiceMonthForDate, invoiceLabel } from '../utils/invoice';
import { formatCurrency, formatDate } from '../utils/format';

export default function CardCsvImportModal({ onClose }) {
  const { cards, transactions, expenseCategoryNames } = useData();
  const { user } = useAuth();
  const { notify } = useToast();
  const fileRef = useRef(null);

  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [status, setStatus] = useState('idle'); // idle | parsed
  const [rows, setRows] = useState([]);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [invoiceMonth, setInvoiceMonth] = useState(null);
  const [importing, setImporting] = useState(false);

  const card = cards.find((c) => c.id === cardId);

  const handleFile = (file) => {
    if (!file || !card) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { purchases, payments } = parseCardCsv(String(reader.result));
      if (purchases.length === 0) {
        notify('Não encontrei compras nesse CSV. É uma fatura exportada do Nubank?', 'err');
        return;
      }

      // detecta o mês da fatura: o mais frequente entre as compras, dado o
      // fechamento/vencimento do cartão selecionado
      const counts = {};
      for (const p of purchases) {
        const im = invoiceMonthForDate(p.date, card);
        counts[im] = (counts[im] || 0) + 1;
      }
      const detected = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // duplicata: mesmo cartão, mesma fatura, valor exatamente igual
      const existing = transactions.filter(
        (t) => t.cardId === cardId && t.type === 'expense' && invoiceMonthForDate(t.date, card) === detected
      );

      const built = purchases.map((p, i) => {
        const dup = existing.find((t) => Math.abs(Number(t.amount) - p.amount) < 0.005);
        return {
          key: i,
          date: p.date,
          amount: p.amount,
          description: p.suggestedDescription,
          category: expenseCategoryNames[0] || 'Outros',
          checked: !dup,
          duplicateOf: dup || null,
        };
      });

      setInvoiceMonth(detected);
      setPaymentsCount(payments.length);
      setRows(built);
      setStatus('parsed');
    };
    reader.readAsText(file, 'utf-8');
  };

  const toggleAll = (value) => setRows((rs) => rs.map((r) => (r.duplicateOf ? r : { ...r, checked: value })));

  const updateRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selectedCount = rows.filter((r) => r.checked).length;

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.checked);
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await Promise.all(toImport.map((r) => addTransaction(user.uid, {
        type: 'expense',
        description: r.description.trim() || 'Compra no cartão',
        amount: r.amount,
        category: r.category,
        date: r.date,
        paymentMethod: 'Cartão de crédito',
        cardId,
      })));
      notify(`${toImport.length} lançamento${toImport.length === 1 ? '' : 's'} importado${toImport.length === 1 ? '' : 's'}.`);
      onClose();
    } catch {
      notify('Não foi possível importar. Tente novamente.', 'err');
    } finally {
      setImporting(false);
    }
  };

  const totalSelected = rows.filter((r) => r.checked).reduce((s, r) => s + r.amount, 0);

  return (
    <Modal title="Importar fatura de cartão (CSV)" onClose={onClose}>
      {cards.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.86rem' }}>Cadastre um cartão antes de importar uma fatura.</p>
      ) : (
        <div className="col gap">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Cartão</label>
            <select className="select" value={cardId} onChange={(e) => { setCardId(e.target.value); setStatus('idle'); setRows([]); }}>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {status === 'idle' && (
            <div
              className="card"
              style={{ padding: 28, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={26} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Selecionar CSV da fatura</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Formato exportado pelo Nubank (date, title, amount)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {status === 'parsed' && (
            <>
              <div className="card card-pad">
                <div className="row gap-sm" style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: 4 }}>
                  Fatura detectada: {invoiceMonth ? invoiceLabel(invoiceMonth) : 'não identificada'}
                </div>
                <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 0 }}>
                  {rows.length} compra{rows.length === 1 ? '' : 's'} no CSV
                  {paymentsCount > 0 && ` · ${paymentsCount} pagamento${paymentsCount === 1 ? '' : 's'} recebido${paymentsCount === 1 ? '' : 's'} ignorado${paymentsCount === 1 ? '' : 's'} (não são compra)`}
                </p>
              </div>

              <div className="row gap-sm">
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => toggleAll(true)}>
                  Marcar não lançados
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => toggleAll(false)}>
                  Desmarcar todos
                </button>
              </div>

              <div className="col gap-sm" style={{ maxHeight: 420, overflowY: 'auto' }}>
                {rows.map((r) => (
                  <div className="card" key={r.key} style={{ padding: '10px 12px', opacity: r.duplicateOf && !r.checked ? 0.65 : 1 }}>
                    <div className="row gap-sm" style={{ marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={r.checked}
                        onChange={(e) => updateRow(r.key, { checked: e.target.checked })}
                      />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="muted" style={{ fontSize: '0.74rem' }}>{formatDate(r.date)}</div>
                        {r.duplicateOf ? (
                          <div className="row gap-sm" style={{ fontSize: '0.76rem', color: 'var(--income)' }}>
                            <CheckCircle2 size={13} /> já lançado: "{r.duplicateOf.description}" em {formatDate(r.duplicateOf.date)}
                          </div>
                        ) : (
                          <div className="row gap-sm" style={{ fontSize: '0.76rem', color: 'var(--expense)' }}>
                            <AlertTriangle size={13} /> ainda não lançado
                          </div>
                        )}
                      </div>
                      <div className="num" style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</div>
                    </div>
                    <div className="row gap-sm wrap">
                      <input
                        className="input grow"
                        style={{ fontSize: '0.84rem' }}
                        value={r.description}
                        onChange={(e) => updateRow(r.key, { description: e.target.value })}
                        placeholder="Nome do lançamento"
                      />
                      <select
                        className="select"
                        style={{ fontSize: '0.84rem', maxWidth: 160 }}
                        value={r.category}
                        onChange={(e) => updateRow(r.key, { category: e.target.value })}
                      >
                        {expenseCategoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="between card card-pad">
                <span className="muted" style={{ fontSize: '0.84rem' }}>{selectedCount} selecionado{selectedCount === 1 ? '' : 's'}</span>
                <span className="num" style={{ fontWeight: 700 }}>{formatCurrency(totalSelected)}</span>
              </div>

              <button className="btn btn-primary btn-block" onClick={handleImport} disabled={importing || selectedCount === 0}>
                {importing ? <><Loader2 size={16} className="spin" /> Importando…</> : `Importar ${selectedCount} lançamento${selectedCount === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
