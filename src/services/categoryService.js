import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const col = collection(db, 'categories');

export function subscribeCategories(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (err) => {
      console.error('categories snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addCategory(uid, data) {
  return addDoc(col, {
    userId: uid,
    type: data.type,           // 'income' | 'expense'
    name: data.name,
    icon: data.icon || '✨',
    createdAt: serverTimestamp(),
  });
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id));
}
