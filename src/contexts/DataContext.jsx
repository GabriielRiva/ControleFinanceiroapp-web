import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeTransactions } from '../services/transactionService';
import { subscribeGoals } from '../services/goalService';
import { currentMonthKey, monthKey } from '../utils/format';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let gotTx = false;
    let gotGoals = false;
    const settle = () => {
      if (gotTx && gotGoals) setLoading(false);
    };

    const unsubT = subscribeTransactions(
      user.uid,
      (list) => { setTransactions(list); gotTx = true; settle(); },
      () => { setIndexError(true); gotTx = true; settle(); }
    );
    const unsubG = subscribeGoals(
      user.uid,
      (list) => { setGoals(list); gotGoals = true; settle(); },
      () => { setIndexError(true); gotGoals = true; settle(); }
    );

    return () => { unsubT(); unsubG(); };
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

  return (
    <DataContext.Provider value={{ transactions, goals, loading, indexError, summary }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
