'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Receipt, Users, FolderKanban, FlaskConical, Sparkles, Settings as Cog, Menu, LogOut, Moon, Sun, Search } from 'lucide-react';
import { computeAlerts } from '@/lib/alerts';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { OLIVE } from './ui';
import Login from './Login';
import VoiceAssistant from './VoiceAssistant';
import CommandPalette from './CommandPalette';

const links = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard }, { href: '/income', label: 'Income', Icon: Wallet },
  { href: '/expenses', label: 'Expenses', Icon: Receipt }, { href: '/clients', label: 'Clients', Icon: Users },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/rnd', label: 'R&D', Icon: FlaskConical },
  { href: '/ayyuqai', label: 'AyyuqAI', Icon: Sparkles },
  { href: '/settings', label: 'Settings', Icon: Cog },
];
const sideBtn = 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base text-white/75 transition hover:bg-white/10 hover:text-white';

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { clients, income } = useData();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const { user, loading, logout } = useAuth();
  const urgent = useMemo(() => computeAlerts(clients, income).filter((a) => a.severity === 'critical').length, [clients, income]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  if (loading) return null;          // wait for Firebase to restore the session (no login flash)
  if (!user) return <Login />;       // every URL shows the login page until signed in
  return (
    <div className="min-h-screen md:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col p-5 text-white transition-transform md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${open ? '' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg,#2A3513 0%,#3A4A1B 55%,#4A5D23 100%)' }}>
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl font-extrabold shadow-lg"
            style={{ background: 'linear-gradient(135deg,#FF7A45,#EA580C)' }}>A</div>
          <div><p className="text-xl font-extrabold leading-tight">Ayyuq</p><p className="text-sm text-white/60">Admin & CRM</p></div>
        </div>
        <nav className="flex-1 space-y-2">
          {links.map(({ href, label, Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-medium transition ${active ? 'bg-white/15 text-white shadow-inner' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={22} />{label}
                {href === '/' && urgent > 0 && <span className="ml-auto rounded-full bg-[#FF5722] px-2.5 py-0.5 text-xs font-bold text-white">{urgent}</span>}
                {active && !(href === '/' && urgent > 0) && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-[#FF5722]" />}
              </Link>);
          })}
        </nav>
        <div className="space-y-1">
          <button onClick={() => setPalette(true)} className={sideBtn}><Search size={22} />Search
            <kbd className="ml-auto rounded-md bg-white/15 px-2 py-0.5 text-xs">Ctrl K</kbd></button>
          <button onClick={toggle} className={sideBtn}>{dark ? <Sun size={22} /> : <Moon size={22} />}{dark ? 'Light mode' : 'Dark mode'}</button>
          <button onClick={logout} className={sideBtn}><LogOut size={22} />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={26} /></button>
          <span className="flex-1 text-lg font-extrabold" style={{ color: OLIVE }}>Ayyuq Admin</span>
          <button onClick={() => setPalette(true)} aria-label="Search"><Search size={22} /></button>
          <button onClick={toggle} aria-label="Toggle theme">{dark ? <Sun size={22} /> : <Moon size={22} />}</button>
        </div>
        {children}
      </div>
      <VoiceAssistant />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
