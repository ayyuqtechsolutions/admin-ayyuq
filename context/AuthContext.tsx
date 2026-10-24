'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

// Sign-in only. There is intentionally no sign-up code: users are added by hand in
// Firebase Console > Authentication > Users.
interface Ctx {
  user: User | null;
  loading: boolean; // true until Firebase has told us whether someone is signed in
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => { const v = useContext(AuthCtx); if (!v) throw new Error('Wrap in AuthProvider'); return v; };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  const signIn: Ctx['signIn'] = async (email, password) => {
    if (!auth) throw new Error('not-configured');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };
  const logout: Ctx['logout'] = async () => { if (auth) await signOut(auth); };

  return <AuthCtx.Provider value={{ user, loading, signIn, logout }}>{children}</AuthCtx.Provider>;
}
