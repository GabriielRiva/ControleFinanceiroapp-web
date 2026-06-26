import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  addTransaction, updateTransaction, deleteTransaction,
} from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/format';
import { categoryIcon } from '../utils/categories';
import TransactionModal from './TransactionModal';
import ConfirmDialog from './ConfirmDialog';

export default function TransactionListView({ type }) {
  const isIncome = type === 'income';
  const { transactions, loading } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {edit?: tx}
  const [confirm, setConfirm] = useState(null); // tx
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => {
    const list = transactions.filter((t) => t.type === type);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [transactions, type, search]);

  const total = items.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateTransaction(modal.edit.id, data);
        notify('Lançamento atualizado.');
      } else {
        await addTransaction(user.uid, data);
        notify(isIncome ? 'Receita adicionada.' : 'Despesa adicionada.');
      }
      setModal(null);
    } catch (e) {
      notify('Não foi possível salvar. Tente novamente.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx) => {
    try {
      await deleteTransaction(tx.id);
      notify('Lançamento excluído.');
    } catch {
      notify('Não foi possível excluir.', 'err');
    }
  };

  const accent = isIncome ? 'var(--income)' : 'var(--expense)';

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="between">
          <div>
            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isIncome ? 'Total de receitas' : 'Total de despesas'}
              {search && ' (filtrado)'}
            </div>
            <div className="num" style={{ fontSize: '1.8rem', fontWeight: 700, color: accent, marginTop: 4 }}>
              {formatCurrency(total)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={18} />
            <span className="add-label">Adicionar</span>
          </button>
        </div>
      </div>

      <div className="search" style={{ marginBottom: 16 }}>
        <Search size={18} className="faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descrição ou categoria"
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="emoji">{isIncome ? '💰' : '🧾'}</div>
            <div className="t">{search ? 'Nada encontrado' : isIncome ? 'Nenhuma receita ainda' : 'Nenhuma despesa ainda'}</div>
            <p>{search ? 'Tente outro termo de busca.' : 'Toque em Adicionar para registrar o primeiro lançamento.'}</p>
          </div>
        ) : (
          items.map((t) => (
            <div className="list-item" key={t.id}>
              <div className="emoji">{categoryIcon(t.category)}</div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="ttl">{t.description}</div>
                <div className="sub">
                  {t.category} · {formatDate(t.date)}
                  {t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
                </div>
              </div>
              <div className="amt" style={{ color: accent }}>
                {isIncome ? '+' : '−'} {formatCurrency(t.amount)}
              </div>
              <div className="row-actions">
                <button className="mini-btn" onClick={() => setModal({ edit: t })} aria-label="Editar">
                  <Pencil size={16} />
                </button>
                <button className="mini-btn danger" onClick={() => setConfirm(t)} aria-label="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <TransactionModal
          type={type}
          initial={modal.edit}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="Excluir lançamento"
          message={`Tem certeza que deseja excluir "${confirm.description}"? Essa ação não pode ser desfeita.`}
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
