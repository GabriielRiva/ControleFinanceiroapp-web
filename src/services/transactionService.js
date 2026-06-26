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
