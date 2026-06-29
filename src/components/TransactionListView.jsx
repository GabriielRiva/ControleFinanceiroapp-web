import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Repeat, CreditCard, FileText, Star, PieChart, Tag } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  addTransaction, addInstallments, updateTransaction, deleteTransaction, restoreTransaction,
} from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/format';

import TransactionModal from './TransactionModal';
import ConfirmDialog from './ConfirmDialog';
import RecurringModal from './RecurringModal';
import CardsModal from './CardsModal';
import InvoicesView from './InvoicesView';
import FilterBar, { emptyFilters, isFilterActive } from './FilterBar';
import FavoritesBar from './FavoritesBar';
import FavoritesModal from './FavoritesModal';
import BudgetModal from './BudgetModal';
import CategoriesModal from './CategoriesModal';

export default function TransactionListView({ type }) {
  const isIncome = type === 'income';
  const { transactions, loading, categoryIcon } = useData();
  const { user } = useAuth();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    return {
      ...emptyFilters,
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  });
  const [tab, setTab] = useState('list'); // 'list' | 'invoices'
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // anos disponíveis para o filtro
  const years = useMemo(() => {
    const set = new Set(
      transactions.filter((t) => t.type === type)
        .map((t) => (t.date || '').slice(0, 4)).filter(Boolean)
    );
    set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [transactions, type]);

  const items = useMemo(() => {
    let list = transactions.filter((t) => t.type === type);

    // busca textual
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.description?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)
      );
    }

    // filtros
    const f = filters;
    if (f.from || f.to) {
      if (f.from) list = list.filter((t) => t.date >= f.from);
      if (f.to) list = list.filter((t) => t.date <= f.to);
    } else {
      if (f.year !== 'all') list = list.filter((t) => (t.date || '').slice(0, 4) === f.year);
      if (f.month !== 'all') list = list.filter((t) => (t.date || '').slice(5, 7) === f.month);
    }
    if (f.category !== 'all') list = list.filter((t) => t.category === f.category);
    if (!isIncome && f.payment !== 'all') list = list.filter((t) => (t.paymentMethod || '') === f.payment);

    return list;
  }, [transactions, type, search, filters, isIncome]);

  const total = items.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const filtered = search || isFilterActive(filters);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.edit) {
        await updateTransaction(modal.edit.id, data);
        // aplicar a todas as parcelas do grupo (campos compartilhados)
        if (data.applyToGroup && modal.edit.installmentGroup) {
          const base = (data.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '');
          const group = transactions.filter((t) => t.installmentGroup === modal.edit.installmentGroup);
          await Promise.all(group.map((t) => updateTransaction(t.id, {
            description: t.installmentIndex && t.installmentTotal
              ? `${base} (${t.installmentIndex}/${t.installmentTotal})`
              : base,
            amount: t.amount,
            category: data.category,
            date: t.date,
            paymentMethod: data.paymentMethod,
            cardId: data.cardId,
          })));
          notify('Todas as parcelas foram atualizadas.');
        } else {
          notify('Lançamento atualizado.');
        }
      } else if (data.installments && data.installments > 1) {
        await addInstallments(user.uid, data, data.installments);
        notify(`Compra parcelada em ${data.installments}x criada.`);
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

  // exclusão com opção de desfazer
  const handleDelete = async (tx, deleteGroup) => {
    try {
      if (deleteGroup && tx.installmentGroup) {
        const group = transactions.filter((t) => t.installmentGroup === tx.installmentGroup);
        const backup = group.map((t) => ({ ...t }));
        await Promise.all(group.map((t) => deleteTransaction(t.id)));
        notify(`${group.length} parcelas excluídas.`, 'ok', {
          label: 'Desfazer',
          onClick: () => Promise.all(backup.map((b) => restoreTransaction(user.uid, b)))
            .then(() => notify('Parcelas restauradas.'))
            .catch(() => notify('Não foi possível desfazer.', 'err')),
        });
      } else {
        const backup = { ...tx };
        await deleteTransaction(tx.id);
        notify('Lançamento excluído.', 'ok', {
          label: 'Desfazer',
          onClick: () => restoreTransaction(user.uid, backup)
            .then(() => notify('Lançamento restaurado.'))
            .catch(() => notify('Não foi possível desfazer.', 'err')),
        });
      }
    } catch {
      notify('Não foi possível excluir.', 'err');
    }
  };

  const accent = isIncome ? 'var(--income)' : 'var(--expense)';

  return (
    <>
      {/* total + adicionar */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="between">
          <div>
            <div className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isIncome ? 'Total de receitas' : 'Total de despesas'}
              {filtered && ' (filtrado)'}
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

      {/* botões de gestão (só despesas) */}
      {!isIncome && (
        <div className="row gap wrap" style={{ marginBottom: 16 }}>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowRecurring(true)}>
            <Repeat size={17} /> Contas fixas
          </button>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowCards(true)}>
            <CreditCard size={17} /> Cartões
          </button>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowFavorites(true)}>
            <Star size={17} /> Favoritos
          </button>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowBudget(true)}>
            <PieChart size={17} /> Orçamento
          </button>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowCategories(true)}>
            <Tag size={17} /> Categorias
          </button>
        </div>
      )}

      {/* gestão de favoritos (receitas) */}
      {isIncome && (
        <div className="row gap wrap" style={{ marginBottom: 16 }}>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowFavorites(true)}>
            <Star size={17} /> Favoritos
          </button>
          <button className="btn btn-ghost grow" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => setShowCategories(true)}>
            <Tag size={17} /> Categorias
          </button>
        </div>
      )}

      {/* abas Lançamentos / Faturas (só despesas) */}
      {!isIncome && (
        <div className="row gap-sm" style={{ marginBottom: 16 }}>
          <button className={`chip ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
            <FileText size={14} style={{ marginRight: 4 }} /> Lançamentos
          </button>
          <button className={`chip ${tab === 'invoices' ? 'active' : ''}`} onClick={() => setTab('invoices')}>
            <CreditCard size={14} style={{ marginRight: 4 }} /> Faturas
          </button>
        </div>
      )}

      {tab === 'invoices' && !isIncome ? (
        <InvoicesView />
      ) : (
        <>
          {/* busca */}
          <div className="search" style={{ marginBottom: 16 }}>
            <Search size={18} className="faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição ou categoria"
            />
          </div>

          {/* lançamento rápido / favoritos */}
          <FavoritesBar
            type={type}
            onUse={(fav) => setModal({ prefill: {
              description: fav.description,
              amount: fav.amount,
              category: fav.category,
              paymentMethod: fav.paymentMethod || undefined,
            } })}
            onManage={() => setShowFavorites(true)}
          />

          {/* filtros */}
          <FilterBar value={filters} onChange={setFilters} type={type} years={years} />

          <div className="card">
            {loading ? (
              <div className="empty"><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : items.length === 0 ? (
              filtered ? (
                <div className="empty">
                  <div className="emoji">🔍</div>
                  <div className="t">Nada encontrado</div>
                  <p>Tente ajustar a busca ou os filtros.</p>
                </div>
              ) : (
                <div className="empty">
                  <div className="emoji">{isIncome ? '💰' : '🧾'}</div>
                  <div className="t">{isIncome ? 'Bora registrar o que entra!' : 'Bora registrar seus gastos!'}</div>
                  <p style={{ maxWidth: 320, margin: '0 auto 16px' }}>
                    {isIncome
                      ? 'Adicione seu salário, freelances e outras entradas para acompanhar quanto você recebe.'
                      : 'Adicione suas compras e contas para ver pra onde seu dinheiro está indo.'}
                  </p>
                  <button className="btn btn-primary" onClick={() => setModal({})}>
                    <Plus size={18} /> {isIncome ? 'Adicionar primeira receita' : 'Adicionar primeira despesa'}
                  </button>
                </div>
              )
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
        </>
      )}

      {modal && (
        <TransactionModal
          type={type}
          initial={modal.edit || modal.prefill}
          isEdit={!!modal.edit}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Excluir lançamento"
          message={
            confirm.installmentGroup && confirm.installmentTotal > 1
              ? `Excluir "${confirm.description}"? Você pode excluir só esta parcela ou todas as ${confirm.installmentTotal}.`
              : `Tem certeza que deseja excluir "${confirm.description}"?`
          }
          checkboxLabel={
            confirm.installmentGroup && confirm.installmentTotal > 1
              ? `Excluir todas as ${confirm.installmentTotal} parcelas`
              : undefined
          }
          onConfirm={(checked) => handleDelete(confirm, checked)}
          onClose={() => setConfirm(null)}
        />
      )}
      {showRecurring && <RecurringModal onClose={() => setShowRecurring(false)} />}
      {showCards && <CardsModal onClose={() => setShowCards(false)} />}
      {showFavorites && <FavoritesModal type={type} onClose={() => setShowFavorites(false)} />}
      {showBudget && <BudgetModal onClose={() => setShowBudget(false)} />}
      {showCategories && <CategoriesModal onClose={() => setShowCategories(false)} />}
    </>
  );
}
