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

const col = collection(db, 'consortiums');

export function subscribeConsortiums(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (err) => {
      console.error('consortiums snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addConsortium(uid, data) {
  return addDoc(col, {
    userId: uid,
    name: data.name,
    assetValue: Number(data.assetValue) || 0,
    adminFeePct: Number(data.adminFeePct) || 0,
    reserveFundPct: Number(data.reserveFundPct) || 0,
    installmentsTotal: Number(data.installmentsTotal) || 1,
    startDate: data.startDate,
    paidInstallments: [],
    correctionEvents: [],
    contemplation: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateConsortium(id, data) {
  return updateDoc(doc(db, 'consortiums', id), {
    name: data.name,
    assetValue: Number(data.assetValue) || 0,
    adminFeePct: Number(data.adminFeePct) || 0,
    reserveFundPct: Number(data.reserveFundPct) || 0,
    installmentsTotal: Number(data.installmentsTotal) || 1,
    startDate: data.startDate,
  });
}

export async function deleteConsortium(id) {
  return deleteDoc(doc(db, 'consortiums', id));
}

export async function setConsortiumInstallmentPaid(consortium, installmentNumber, paid) {
  const current = new Set(consortium.paidInstallments || []);
  if (paid) current.add(installmentNumber);
  else current.delete(installmentNumber);
  return updateDoc(doc(db, 'consortiums', consortium.id), {
    paidInstallments: [...current].sort((a, b) => a - b),
  });
}

export async function addCorrectionEvent(consortium, event) {
  const list = [...(consortium.correctionEvents || []), event];
  return updateDoc(doc(db, 'consortiums', consortium.id), { correctionEvents: list });
}

export async function removeCorrectionEvent(consortium, index) {
  const list = (consortium.correctionEvents || []).filter((_, i) => i !== index);
  return updateDoc(doc(db, 'consortiums', consortium.id), { correctionEvents: list });
}

export async function setContemplation(consortiumId, contemplation) {
  return updateDoc(doc(db, 'consortiums', consortiumId), { contemplation });
}

export async function clearContemplation(consortiumId) {
  return updateDoc(doc(db, 'consortiums', consortiumId), { contemplation: null });
}
