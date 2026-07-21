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
    assetClass: data.assetClass || "Outros",
    invested: Number(data.invested) || 0,
    currentValue: Number(data.currentValue) || 0,
    date: data.date || null, // data em que o investimento foi realizado
    createdAt: serverTimestamp(),
  });
}

export async function updateInvestment(id, data) {
  return updateDoc(doc(db, 'investments', id), {
    name: data.name,
    assetClass: data.assetClass || "Outros",
    invested: Number(data.invested) || 0,
    currentValue: Number(data.currentValue) || 0,
    date: data.date || null,
  });
}

export async function deleteInvestment(id) {
  return deleteDoc(doc(db, 'investments', id));
}

/* ----------------- Matemática de aporte/resgate (compartilhada) -----------------
 * Extraída pra cá pra ser usada tanto pela tela de Investimentos (aporte/resgate
 * manual) quanto pelo importador de extrato — mesma fórmula, sem duplicar.
 */

// Aporte: soma igualmente ao custo e ao valor atual (assume que o dinheiro
// entrou "ao par" — o rendimento futuro é capturado depois, via resgate
// pró-rata ou "atualizar saldo").
export function applyAporte(position, amount) {
  return {
    invested: (Number(position.invested) || 0) + amount,
    currentValue: (Number(position.currentValue) || 0) + amount,
  };
}

// Resgate PRO-RATA: reduz custo e valor na mesma proporção, preservando o %
// de lucro da posição após resgates parciais.
export function applyResgate(position, amount) {
  const curVal = Number(position.currentValue) || 0;
  const curInv = Number(position.invested) || 0;
  const take = Math.min(amount, curVal); // não resgata mais que o valor atual
  const frac = curVal > 0 ? take / curVal : 0;
  return {
    invested: Math.max(0, curInv * (1 - frac)),
    currentValue: Math.max(0, curVal - take),
    take,
  };
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
