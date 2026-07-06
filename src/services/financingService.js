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

const col = collection(db, 'financings');

export function subscribeFinancings(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onData(list);
    },
    (err) => {
      console.error('financings snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addFinancing(uid, data) {
  return addDoc(col, {
    userId: uid,
    name: data.name,
    principal: Number(data.principal) || 0,
    monthlyRatePct: Number(data.monthlyRatePct) || 0,
    system: data.system === 'sac' ? 'sac' : 'price',
    installmentsTotal: Number(data.installmentsTotal) || 1,
    startDate: data.startDate,
    kind: data.kind || 'financiamento', // rótulo livre: financiamento, empréstimo...
    paidInstallments: [],
    extraPayments: [],
    createdAt: serverTimestamp(),
  });
}

export async function updateFinancing(id, data) {
  return updateDoc(doc(db, 'financings', id), {
    name: data.name,
    principal: Number(data.principal) || 0,
    monthlyRatePct: Number(data.monthlyRatePct) || 0,
    system: data.system === 'sac' ? 'sac' : 'price',
    installmentsTotal: Number(data.installmentsTotal) || 1,
    startDate: data.startDate,
    kind: data.kind || 'financiamento',
  });
}

export async function deleteFinancing(id) {
  return deleteDoc(doc(db, 'financings', id));
}

export async function setInstallmentPaid(financing, installmentNumber, paid) {
  const current = new Set(financing.paidInstallments || []);
  if (paid) current.add(installmentNumber);
  else current.delete(installmentNumber);
  return updateDoc(doc(db, 'financings', financing.id), {
    paidInstallments: [...current].sort((a, b) => a - b),
  });
}

export async function addExtraPayment(financing, extra) {
  const list = [...(financing.extraPayments || []), extra];
  return updateDoc(doc(db, 'financings', financing.id), { extraPayments: list });
}

export async function removeExtraPayment(financing, index) {
  const list = (financing.extraPayments || []).filter((_, i) => i !== index);
  return updateDoc(doc(db, 'financings', financing.id), { extraPayments: list });
}
