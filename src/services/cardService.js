import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const col = collection(db, 'cards');

export function subscribeCards(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (err) => {
      console.error('cards snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addCard(uid, data) {
  return addDoc(col, {
    userId: uid,
    name: data.name,
    closingDay: Number(data.closingDay) || 1,
    dueDay: Number(data.dueDay) || 1,
    closingDayRollsToNext: !!data.closingDayRollsToNext,
    colorIndex: Number(data.colorIndex) || 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateCard(id, data) {
  return updateDoc(doc(db, 'cards', id), {
    name: data.name,
    closingDay: Number(data.closingDay) || 1,
    dueDay: Number(data.dueDay) || 1,
    closingDayRollsToNext: !!data.closingDayRollsToNext,
    colorIndex: Number(data.colorIndex) || 0,
  });
}

export async function deleteCard(id) {
  return deleteDoc(doc(db, 'cards', id));
}
