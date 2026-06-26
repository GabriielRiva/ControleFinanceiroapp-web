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

const col = collection(db, 'goals');

export function subscribeGoals(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid), orderBy('deadline', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(list);
    },
    (err) => {
      console.error('goals snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addGoal(uid, data) {
  return addDoc(col, {
    userId: uid,
    name: data.name,
    targetAmount: Number(data.targetAmount),
    currentAmount: Number(data.currentAmount) || 0,
    deadline: data.deadline,
    createdAt: serverTimestamp(),
  });
}

export async function updateGoal(id, data) {
  return updateDoc(doc(db, 'goals', id), {
    name: data.name,
    targetAmount: Number(data.targetAmount),
    currentAmount: Number(data.currentAmount) || 0,
    deadline: data.deadline,
  });
}

export async function deleteGoal(id) {
  return deleteDoc(doc(db, 'goals', id));
}
