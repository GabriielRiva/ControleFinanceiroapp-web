import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const col = collection(db, 'budgets');

export function subscribeBudgets(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(list);
    },
    (err) => {
      console.error('budgets snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Define (cria ou atualiza) o limite de uma categoria.
export async function setBudget(uid, category, limit, existingId) {
  const value = Number(limit) || 0;
  if (existingId) {
    return updateDoc(doc(db, 'budgets', existingId), { limit: value });
  }
  return addDoc(col, {
    userId: uid,
    category,
    limit: value,
    createdAt: serverTimestamp(),
  });
}

export async function deleteBudget(id) {
  return deleteDoc(doc(db, 'budgets', id));
}
