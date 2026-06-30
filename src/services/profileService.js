import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Observa o documento do usuário (onde guardamos o saldo inicial).
export function subscribeUserDoc(uid, onData, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => {
      console.error('user doc snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Define/atualiza o saldo inicial da conta (mescla no doc do usuário).
export async function setInitialBalance(uid, value, date) {
  return setDoc(
    doc(db, 'users', uid),
    { initialBalance: Number(value) || 0, initialBalanceDate: date || null },
    { merge: true }
  );
}
