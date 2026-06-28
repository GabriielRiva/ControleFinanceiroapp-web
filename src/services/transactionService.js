import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { addMonthsISO } from '../utils/format';

const col = collection(db, 'transactions');

// Assina as transações do usuário em tempo real.
// onError evita travar caso o índice composto ainda esteja sendo criado.
export function subscribeTransactions(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(list);
    },
    (err) => {
      console.error('transactions snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addTransaction(uid, data) {
  return addDoc(col, {
    userId: uid,
    type: data.type,
    description: data.description,
    amount: Number(data.amount),
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod || null,
    createdAt: serverTimestamp(),
  });
}

// Cria N parcelas a partir do valor TOTAL, uma por mês.
// Ex: R$ 1.000 em 10x -> 10 despesas de R$ 100 ("desc (1/10)", "desc (2/10)"...).
export async function addInstallments(uid, data, installments) {
  const n = Math.max(2, Math.floor(installments));
  const total = Number(data.amount) || 0;
  const base = Math.floor((total / n) * 100) / 100; // arredonda p/ baixo
  const groupId = `${uid}-${Date.now()}`;

  const tasks = [];
  for (let i = 0; i < n; i++) {
    // última parcela absorve a diferença de centavos do arredondamento
    const amount = i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
    tasks.push(
      addDoc(col, {
        userId: uid,
        type: 'expense',
        description: `${data.description} (${i + 1}/${n})`,
        amount,
        category: data.category,
        date: addMonthsISO(data.date, i),
        paymentMethod: data.paymentMethod || 'Cartão de crédito',
        installmentGroup: groupId,
        installmentIndex: i + 1,
        installmentTotal: n,
        createdAt: serverTimestamp(),
      })
    );
  }
  return Promise.all(tasks);
}

export async function updateTransaction(id, data) {
  return updateDoc(doc(db, 'transactions', id), {
    description: data.description,
    amount: Number(data.amount),
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod || null,
  });
}

export async function deleteTransaction(id) {
  return deleteDoc(doc(db, 'transactions', id));
}
