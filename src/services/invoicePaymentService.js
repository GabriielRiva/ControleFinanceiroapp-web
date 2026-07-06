import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const col = collection(db, 'invoicePayments');

// id determinístico: uma fatura é sempre a mesma combinação cartão+mês
function invoicePaymentId(cardId, invoiceMonth) {
  return `${cardId}_${invoiceMonth}`;
}

export function subscribeInvoicePayments(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(list);
    },
    (err) => {
      console.error('invoicePayments snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function markInvoicePaid(uid, cardId, invoiceMonth, { paidDate, paymentMethod }) {
  const id = invoicePaymentId(cardId, invoiceMonth);
  return setDoc(doc(db, 'invoicePayments', id), {
    userId: uid,
    cardId,
    invoiceMonth,
    paid: true,
    paidDate,
    paymentMethod: paymentMethod || null,
    updatedAt: serverTimestamp(),
  });
}

export async function markInvoiceUnpaid(cardId, invoiceMonth) {
  const id = invoicePaymentId(cardId, invoiceMonth);
  return deleteDoc(doc(db, 'invoicePayments', id));
}
