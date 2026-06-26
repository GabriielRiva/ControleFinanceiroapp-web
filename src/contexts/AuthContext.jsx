import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  fetchUserProfile,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await fetchUserProfile(u.uid);
          setProfile(p || { name: u.displayName, email: u.email });
        } catch {
          setProfile({ name: u.displayName, email: u.email });
        }
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  const value = {
    user,
    profile,
    initializing,
    signUp: async (name, email, password) => {
      const u = await registerUser(name, email, password);
      setProfile({ name, email });
      return u;
    },
    signIn: (email, password) => loginUser(email, password),
    signInWithGoogle: () => loginWithGoogle(),
    signOut: () => logoutUser(),
    forgotPassword: (email) => resetPassword(email),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
