import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeTransactions } from '../services/transactionService';
import { subscribeGoals } from '../services/goalService';
import { subscribeInvestments, subscribeSnapshots } from '../services/investmentService';
import { subscribeRecurring, generateDueRecurring } from '../services/recurringService';
import { subscribeCards } from '../services/cardService';
import { subscribeFavorites } from '../services/favoriteService';
import { subscribeBudgets } from '../services/budgetService';
import { subscribeCategories } from '../services/categoryService';
import { subscribeUserDoc } from '../services/profileService';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEFAULT_ICONS,
} from '../utils/categories';
import { currentMonthKey, monthKey } from '../utils/format';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [cards, setCards] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);
  const generatedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setInvestments([]);
      setSnapshots([]);
      setRecurring([]);
      setCards([]);
      setFavorites([]);
      setBudgets([]);
      setCategories([]);
      setInitialBalance(0);
      setLoading(false);
      generatedRef.current = false;
      return;
    }
    setLoading(true);
    const done = { tx: false, goals: false };
    const settle = () => {
      if (done.tx && done.goals) setLoading(false);
    };

    const unsubT = subscribeTransactions(
      user.uid,
      (list) => { setTransactions(list); done.tx = true; settle(); },
      () => { setIndexError(true); done.tx = true; settle(); }
    );
    const unsubG = subscribeGoals(
      user.uid,
      (list) => { setGoals(list); done.goals = true; settle(); },
      () => { setIndexError(true); done.goals = true; settle(); }
    );
    const unsubI = subscribeInvestments(
      user.uid,
      (list) => setInvestments(list),
      () => {}
    );
    const unsubS = subscribeSnapshots(
      user.uid,
      (list) => setSnapshots(list),
      () => {}
    );
    const unsubR = subscribeRecurring(
      user.uid,
      (list) => {
        setRecurring(list);
        // Caminho B: ao abrir o app, gera as contas fixas pendentes (uma vez por sessão).
        if (!generatedRef.current && list.length > 0) {
          generatedRef.current = true;
          generateDueRecurring(user.uid, list).catch((e) =>
            console.error('falha ao gerar contas fixas:', e)
          );
        }
      },
      () => {}
    );
    const unsubC = subscribeCards(user.uid, (list) => setCards(list), () => {});
    const unsubF = subscribeFavorites(user.uid, (list) => setFavorites(list), () => {});
    const unsubB = subscribeBudgets(user.uid, (list) => setBudgets(list), () => {});
    const unsubCat = subscribeCategories(user.uid, (list) => setCategories(list), () => {});
    const unsubU = subscribeUserDoc(user.uid, (d) => setInitialBalance(d?.initialBalance || 0), () => {});

    return () => { unsubT(); unsubG(); unsubI(); unsubS(); unsubR(); unsubC(); unsubF(); unsubB(); unsubCat(); unsubU(); };
  }, [user]);

  const summary = useMemo(() => {
    const mk = currentMonthKey();
    let income = 0, expense = 0, monthIncome = 0, monthExpense = 0;
    let applications = 0, redemptions = 0, transfers = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amt;
        if (monthKey(t.date) === mk) monthIncome += amt;
      } else if (t.type === 'application') {
        applications += amt;      // conta -> investimento
      } else if (t.type === 'redemption') {
        redemptions += amt;       // investimento -> conta
      } else if (t.type === 'transfer') {
        transfers += amt;         // conta -> meta
      } else {
        expense += amt;
        if (monthKey(t.date) === mk) monthExpense += amt;
      }
    }
    const init = Number(initialBalance) || 0;
    return {
      income,
      expense,
      applications,
      redemptions,
      transfers,
      balance: income - expense,
      initialBalance: init,
      // saldo em conta (bate com o banco)
      realBalance: init + income - expense - applications + redemptions - transfers,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      savings: Math.max(income - expense, 0),
    };
  }, [transactions, initialBalance]);

  // Totais da carteira de investimentos
  const portfolio = useMemo(() => {
    let invested = 0, current = 0;
    for (const p of investments) {
      invested += Number(p.invested) || 0;
      current += Number(p.currentValue) || 0;
    }
    const profit = current - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
    return { invested, current, profit, profitPct };
  }, [investments]);

  // Patrimônio total = saldo em conta + investimentos + guardado em metas
  const netWorth = useMemo(() => {
    const inGoals = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
    return {
      account: summary.realBalance,
      invested: portfolio.current,
      goals: inGoals,
      total: summary.realBalance + portfolio.current + inGoals,
    };
  }, [summary.realBalance, portfolio.current, goals]);

  // Orçamento do mês: gasto por categoria (pela data da compra) vs limite
  const budgetStatus = useMemo(() => {
    const mk = currentMonthKey();
    const spentByCat = {};
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (monthKey(t.date) !== mk) continue;
      spentByCat[t.category] = (spentByCat[t.category] || 0) + (Number(t.amount) || 0);
    }
    const items = budgets
      .map((b) => {
        const spent = spentByCat[b.category] || 0;
        const limit = Number(b.limit) || 0;
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const status = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
        return { id: b.id, category: b.category, limit, spent, pct, status };
      })
      .sort((a, b) => b.pct - a.pct);

    const totalLimit = items.reduce((s, i) => s + i.limit, 0);
    const totalSpent = items.reduce((s, i) => s + i.spent, 0);
    const totalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    const overCount = items.filter((i) => i.status === 'over').length;

    return { items, totalLimit, totalSpent, totalPct, overCount };
  }, [transactions, budgets]);

  // Categorias: padrão + personalizadas (separadas por tipo)
  const categoryData = useMemo(() => {
    const customExpense = categories.filter((c) => c.type === 'expense');
    const customIncome = categories.filter((c) => c.type === 'income');

    const dedupe = (defaults, custom) => {
      const seen = new Set(defaults.map((n) => n.toLowerCase()));
      const extra = custom.map((c) => c.name).filter((n) => !seen.has(n.toLowerCase()));
      return [...defaults, ...extra];
    };

    const iconMap = { ...DEFAULT_ICONS };
    categories.forEach((c) => { iconMap[c.name] = c.icon || '✨'; });

    return {
      expenseCategoryNames: dedupe(EXPENSE_CATEGORIES, customExpense),
      incomeCategoryNames: dedupe(INCOME_CATEGORIES, customIncome),
      categoryIcon: (name) => iconMap[name] || '✨',
    };
  }, [categories]);

  return (
    <DataContext.Provider
      value={{
        transactions, goals, investments, snapshots, recurring, cards, favorites, budgets, categories,
        loading, indexError, summary, portfolio, budgetStatus, netWorth,
        ...categoryData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
