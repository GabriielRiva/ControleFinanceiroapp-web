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
import { addTransaction } from './transactionService';
import { currentMonthKey, nextMonthKey, isoFromMonthAndDay } from '../utils/format';

const col = collection(db, 'recurringExpenses');

export function subscribeRecurring(uid, onData, onError) {
  const q = query(col, where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.description || '').localeCompare(b.description || ''));
      onData(list);
    },
    (err) => {
      console.error('recurring snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export async function addRecurring(uid, data) {
  // lastPosted vazio: a geração cuida de lançar a partir do mês de início.
  return addDoc(col, {
    userId: uid,
    description: data.description,
    amount: Number(data.amount) || 0,
    category: data.category,
    dayOfMonth: Number(data.dayOfMonth) || 1,
    active: true,
    startMonth: currentMonthKey(),
    lastPosted: '',
    createdAt: serverTimestamp(),
  });
}

export async function updateRecurring(id, data) {
  return updateDoc(doc(db, 'recurringExpenses', id), {
    description: data.description,
    amount: Number(data.amount) || 0,
    category: data.category,
    dayOfMonth: Number(data.dayOfMonth) || 1,
  });
}

export async function setRecurringActive(id, active) {
  return updateDoc(doc(db, 'recurringExpenses', id), { active });
}

export async function deleteRecurring(id) {
  return deleteDoc(doc(db, 'recurringExpenses', id));
}

/**
 * Caminho B: gera os lançamentos das contas fixas que estão pendentes,
 * do mês de início (ou do último lançado) até o mês atual.
 * Chamado quando o app abre. Idempotente graças ao campo lastPosted.
 */
export async function generateDueRecurring(uid, list) {
  const current = currentMonthKey();
  let created = 0;

  for (const r of list) {
    if (!r.active) continue;

    // primeiro mês a lançar
    let m = r.lastPosted ? nextMonthKey(r.lastPosted) : (r.startMonth || current);

    // evita loop infinito caso algo esteja inconsistente
    let guard = 0;
    let lastPosted = r.lastPosted;

    while (m <= current && guard < 240) {
      // eslint-disable-next-line no-await-in-loop
      await addTransaction(uid, {
        type: 'expense',
        description: r.description,
        amount: Number(r.amount) || 0,
        category: r.category,
        date: isoFromMonthAndDay(m, r.dayOfMonth || 1),
        paymentMethod: 'Conta fixa',
      });
      created += 1;
      lastPosted = m;
      m = nextMonthKey(m);
      guard += 1;
    }

    if (lastPosted && lastPosted !== r.lastPosted) {
      // eslint-disable-next-line no-await-in-loop
      await updateDoc(doc(db, 'recurringExpenses', r.id), { lastPosted });
    }
  }

  return created;
}
