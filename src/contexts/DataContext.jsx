import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeTransactions } from '../services/transactionService';
import { subscribeGoals } from '../services/goalService';
import { subscribeInvestments, subscribeSnapshots } from '../services/investmentService';
import { subscribeRecurring, generateDueRecurring } from '../services/recurringService';
import { subscribeCards } from '../services/cardService';
import { subscribeFavorites } from '../services/favoriteService';
import { subscribeBudgets } from '../services/budgetService';
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

    return () => { unsubT(); unsubG(); unsubI(); unsubS(); unsubR(); unsubC(); unsubF(); unsubB(); };
  }, [user]);

  const summary = useMemo(() => {
    const mk = currentMonthKey();
    let income = 0, expense = 0, monthIncome = 0, monthExpense = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amt;
        if (monthKey(t.date) === mk) monthIncome += amt;
      } else {
        expense += amt;
        if (monthKey(t.date) === mk) monthExpense += amt;
      }
    }
    return {
      income,
      expense,
      balance: income - expense,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      savings: Math.max(income - expense, 0),
    };
  }, [transactions]);

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

  return (
    <DataContext.Provider
      value={{
        transactions, goals, investments, snapshots, recurring, cards, favorites, budgets,
        loading, indexError, summary, portfolio, budgetStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
