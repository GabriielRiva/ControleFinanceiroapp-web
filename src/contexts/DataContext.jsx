import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeTransactions } from '../services/transactionService';
import { subscribeGoals } from '../services/goalService';
import { subscribeInvestments, subscribeSnapshots } from '../services/investmentService';
import { subscribeRecurring, generateDueRecurring } from '../services/recurringService';
import { currentMonthKey, monthKey } from '../utils/format';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [recurring, setRecurring] = useState([]);
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

    return () => { unsubT(); unsubG(); unsubI(); unsubS(); unsubR(); };
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

  return (
    <DataContext.Provider
      value={{
        transactions, goals, investments, snapshots, recurring,
        loading, indexError, summary, portfolio,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
