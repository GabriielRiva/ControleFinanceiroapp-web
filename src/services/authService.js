import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const googleProvider = new GoogleAuthProvider();

// Login com a conta Google. Cria o perfil no Firestore na primeira vez.
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const ref = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: cred.user.displayName || 'Usuário',
      email: cred.user.email,
      createdAt: serverTimestamp(),
    });
  }
  return cred.user;
}

export async function registerUser(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// traduz códigos de erro do Firebase para mensagens em pt-BR
export function authErrorMessage(code) {
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'A senha precisa ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'auth/missing-password': 'Digite sua senha.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/cancelled-popup-request': 'Login cancelado.',
    'auth/popup-blocked': 'O navegador bloqueou a janela. Permita pop-ups e tente de novo.',
    'auth/account-exists-with-different-credential':
      'Este e-mail já tem conta com outro método de login. Entre com e-mail e senha.',
    'auth/unauthorized-domain': 'Este site ainda não está autorizado no Firebase.',
  };
  return map[code] || 'Algo deu errado. Tente novamente.';
}
