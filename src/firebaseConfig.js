import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Configuração do Firebase — projeto: controle-financeiro-rf
 * (As mesmas credenciais do app mobile. Os dados são compartilhados:
 *  o que você cadastra aqui aparece no app e vice-versa.)
 *
 * Na web, a sessão é mantida automaticamente no navegador
 * (browserLocalPersistence), então não precisa de AsyncStorage.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAqanm9d6eHJaUuqrXHoiDPf3aB0oLtkTs',
  authDomain: 'controle-financeiro-rf.firebaseapp.com',
  projectId: 'controle-financeiro-rf',
  storageBucket: 'controle-financeiro-rf.firebasestorage.app',
  messagingSenderId: '71079645781',
  appId: '1:71079645781:web:e8f60c68623b7d6bac7adc',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
