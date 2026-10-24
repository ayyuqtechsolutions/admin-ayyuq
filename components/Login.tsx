'use client';
import { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Lock, Mail, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { btnPrimary, Field, inputCls, OLIVE } from './ui';

const friendly = (code?: string) => {
  switch (code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': case 'auth/invalid-email':
      return 'Invalid email or password.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed': return 'Email/Password sign-in is not enabled in Firebase Authentication.';
    default: return 'Could not sign in. Please try again.';
  }
};

export default function Login() {
  const { signIn } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try { await signIn(email, password); } // on success the auth listener swaps this page for the app
    catch (ex: any) { setErr(friendly(ex?.code)); setBusy(false); }
  };

  return (
    <main className="relative grid min-h-screen place-items-center p-4">
      <button onClick={toggle} aria-label="Toggle theme"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-[#DDE5C8] bg-white transition hover:bg-[#F6F8EE]">
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <form onSubmit={submit} className="card fade-up w-full max-w-md space-y-5 p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl font-extrabold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg,#FF7A45,#EA580C)' }}>A</div>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight" style={{ color: OLIVE }}>Ayyuq Admin</h1>
            <p className="text-sm text-gray-500">Sign in to continue</p>
          </div>
        </div>

        {!isFirebaseConfigured && (
          <div className="flex gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFEDD5] p-4 text-sm text-[#C2410C]">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <p>Firebase is not connected. Add your keys to <b>.env.local</b> and restart the dev server to enable sign-in.</p>
          </div>
        )}

        <Field label="Email">
          <div className="relative">
            <Mail size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus required value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="Email" className={inputCls + ' pl-12'} />
          </div>
        </Field>

        <Field label="Password">
          <div className="relative">
            <Lock size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
              onChange={(e) => { setPassword(e.target.value); setErr(''); }} placeholder="Password" className={inputCls + ' pl-12 pr-12'} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:bg-[#F3F6E8]">
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </Field>

        {err && <p role="alert" className="text-sm font-medium text-[#EA580C]">{err}</p>}

        <button disabled={busy || !isFirebaseConfigured} className={btnPrimary + ' w-full disabled:cursor-not-allowed disabled:opacity-60'}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
