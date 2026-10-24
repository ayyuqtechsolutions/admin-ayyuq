'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Client, IncomeRecord, ExpenseRecord, Note, Project, CollectionName } from '@/types';

export interface Settings { phase: number; achieved: Record<string, string>; }
const DEFAULT: Settings = { phase: 1, achieved: {} };
const LS = 'ayyuq-admin-v1';

interface Ctx {
  clients: Client[]; income: IncomeRecord[]; expenses: ExpenseRecord[]; notes: Note[]; projects: Project[];
  settings: Settings; updateSettings: (fn: (s: Settings) => Settings) => void; ready: boolean;
  add: (c: CollectionName, data: Record<string, any>) => Promise<void>;
  update: (c: CollectionName, id: string, data: Record<string, any>) => Promise<void>;
  remove: (c: CollectionName, id: string) => Promise<void>;
  importAll: (d: { clients?: Client[]; income?: IncomeRecord[]; expenses?: ExpenseRecord[]; notes?: Note[]; projects?: Project[]; settings?: Partial<Settings> }) => Promise<void>;
  resetAll: () => Promise<void>;
  isMock: boolean; // true = Firebase not connected, data lives in this browser
}
const DataCtx = createContext<Ctx | null>(null);
export const useData = () => { const v = useContext(DataCtx); if (!v) throw new Error('Wrap in DataProvider'); return v; };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef<Settings>(DEFAULT);

  const setters: Record<CollectionName, React.Dispatch<React.SetStateAction<any[]>>> = {
    clients: setClients, income: setIncome, expenses: setExpenses, notes: setNotes, projects: setProjects,
  };

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      // Listen only while signed in: Firestore rules require auth, and a listener opened
      // before login would be rejected and never retried.
      if (!user) {
        setClients([]); setIncome([]); setExpenses([]); setNotes([]); setProjects([]);
        settingsRef.current = DEFAULT; setSettings(DEFAULT); setReady(false);
        return;
      }
      const fail = (name: string) => (e: Error) => console.error(`Firestore "${name}" listener failed:`, e.message);
      const unsubs = (['clients', 'income', 'expenses', 'notes', 'projects'] as CollectionName[]).map((name) =>
        onSnapshot(collection(db!, name), (snap) => setters[name](snap.docs.map((d) => ({ ...d.data(), id: d.id }))), fail(name)));
      unsubs.push(onSnapshot(doc(db, 'settings', 'main'), (snap) => {
        const s = { ...DEFAULT, ...(snap.data() as Partial<Settings> | undefined) };
        settingsRef.current = s; setSettings(s); setReady(true);
      }, (e) => { console.error('Firestore "settings" listener failed:', e.message); setReady(true); }));
      return () => unsubs.forEach((u) => u());
    }
    try {
      const raw = localStorage.getItem(LS);
      if (raw) {
        const d = JSON.parse(raw);
        setClients(d.clients ?? []); setIncome(d.income ?? []); setExpenses(d.expenses ?? []); setNotes(d.notes ?? []); setProjects(d.projects ?? []);
        const s = { ...DEFAULT, ...d.settings }; settingsRef.current = s; setSettings(s);
      }
    } catch { /* ignore corrupt storage */ }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Local mode persistence (no Firebase keys yet)
  useEffect(() => {
    if (!ready || isFirebaseConfigured) return;
    try { localStorage.setItem(LS, JSON.stringify({ clients, income, expenses, notes, projects, settings })); } catch { /* storage full/blocked */ }
  }, [ready, clients, income, expenses, notes, projects, settings]);

  const updateSettings: Ctx['updateSettings'] = useCallback((fn) => {
    const next = fn(settingsRef.current);
    settingsRef.current = next; setSettings(next);
    if (isFirebaseConfigured && db) setDoc(doc(db, 'settings', 'main'), next).catch(() => {});
  }, []);

  const add: Ctx['add'] = useCallback(async (c, data) => {
    const now = new Date().toISOString();
    const full = { ...data, createdAt: now, ...(c === 'clients' || c === 'notes' || c === 'projects' ? { updatedAt: now } : {}) };
    const tempId = 'loc_' + Math.random().toString(36).slice(2, 10);
    setters[c]((p) => [{ ...full, id: tempId }, ...p]); // optimistic
    if (isFirebaseConfigured && db) {
      try { await addDoc(collection(db, c), full); } finally { setters[c]((p) => p.filter((r) => r.id !== tempId)); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update: Ctx['update'] = useCallback(async (c, id, data) => {
    const patch = { ...data, ...(c === 'clients' || c === 'notes' || c === 'projects' ? { updatedAt: new Date().toISOString() } : {}) };
    setters[c]((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (isFirebaseConfigured && db) await setDoc(doc(db, c, id), patch, { merge: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove: Ctx['remove'] = useCallback(async (c, id) => {
    setters[c]((p) => p.filter((r) => r.id !== id));
    if (isFirebaseConfigured && db) await deleteDoc(doc(db, c, id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importAll: Ctx['importAll'] = useCallback(async (d) => {
    const cl = d.clients ?? [], inc = d.income ?? [], ex = d.expenses ?? [], nt = d.notes ?? [], pr = d.projects ?? [];
    setClients(cl); setIncome(inc); setExpenses(ex); if (d.notes) setNotes(nt); if (d.projects) setProjects(pr);
    if (d.settings) updateSettings(() => ({ ...DEFAULT, ...d.settings }));
    if (isFirebaseConfigured && db) {
      const w = async (n: string, rows: { id: string }[]) => { for (const r of rows) { const { id, ...rest } = r; await setDoc(doc(db!, n, id), rest); } };
      await w('clients', cl); await w('income', inc); await w('expenses', ex); await w('notes', nt); await w('projects', pr);
    }
  }, [updateSettings]);

  const resetAll: Ctx['resetAll'] = useCallback(async () => {
    const all = { clients, income, expenses, projects } as Record<'clients' | 'income' | 'expenses' | 'projects', { id: string }[]>;
    setClients([]); setIncome([]); setExpenses([]); setProjects([]); updateSettings(() => DEFAULT);
    if (isFirebaseConfigured && db) {
      for (const n of ['clients', 'income', 'expenses', 'projects'] as const) for (const r of all[n]) await deleteDoc(doc(db, n, r.id));
    }
  }, [clients, income, expenses, projects, updateSettings]);

  return (
    <DataCtx.Provider value={{ clients, income, expenses, notes, projects, settings, updateSettings, ready, add, update, remove, importAll, resetAll, isMock: !isFirebaseConfigured }}>
      {children}
    </DataCtx.Provider>
  );
}
