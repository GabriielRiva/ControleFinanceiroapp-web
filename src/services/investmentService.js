import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const investmentsCol = collection(db, 'investments');
const snapshotsCol = collection(db, 'portfolioSnapshots');

/* ----------------- Posições (carteiras) ----------------- */
// Sem orderBy de propósito: ordenamos no cliente para NÃO exigir índice composto.
export function subscribeInvestments(uid, onData, onError) {
  const q = query(investmentsCol, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (err) => {
      console.error('investments snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addInvestment(uid, data) {
  return addDoc(investmentsCol, {
    userId: uid,
    name: data.name,
    invested: Number(data.invested) || 0,
    currentValue: Number(data.currentValue) || 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateInvestment(id, data) {
  return updateDoc(doc(db, 'investments', id), {
    name: data.name,
    invested: Number(data.invested) || 0,
    currentValue: Number(data.currentValue) || 0,
  });
}

export async function deleteInvestment(id) {
  return deleteDoc(doc(db, 'investments', id));
}

/* ----------------- Histórico mensal do patrimônio ----------------- */
export function subscribeSnapshots(uid, onData, onError) {
  const q = query(snapshotsCol, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.date < b.date ? -1 : 1)); // cronológico
      onData(list);
    },
    (err) => {
      console.error('snapshots snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Salva (ou substitui) o ponto de um mês. monthKey = "2026-06".
export async function saveSnapshot(uid, monthKey, totalInvested, totalValue, existingId) {
  const payload = {
    userId: uid,
    date: monthKey,
    totalInvested: Number(totalInvested) || 0,
    totalValue: Number(totalValue) || 0,
    createdAt: serverTimestamp(),
  };
  if (existingId) {
    return updateDoc(doc(db, 'portfolioSnapshots', existingId), payload);
  }
  return addDoc(snapshotsCol, payload);
}

export async function deleteSnapshot(id) {
  return deleteDoc(doc(db, 'portfolioSnapshots', id));
}
