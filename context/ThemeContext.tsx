'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = () => setDark((d) => {
    const n = !d;
    document.documentElement.classList.toggle('dark', n);
    try { localStorage.setItem('ayyuq-theme', n ? 'dark' : 'light'); } catch { /* ignore */ }
    return n;
  });
  return <Ctx.Provider value={{ dark, toggle }}>{children}</Ctx.Provider>;
}
