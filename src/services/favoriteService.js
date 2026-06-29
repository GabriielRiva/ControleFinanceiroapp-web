import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const col = collection(db, 'favorites');

export function subscribeFavorites(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.description || '').localeCompare(b.description || ''));
      onData(list);
    },
    (err) => {
      console.error('favorites snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addFavorite(uid, data) {
  return addDoc(col, {
    userId: uid,
    type: data.type,
    description: data.description,
    amount: Number(data.amount) || 0,
    category: data.category,
    paymentMethod: data.paymentMethod || null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteFavorite(id) {
  return deleteDoc(doc(db, 'favorites', id));
}
