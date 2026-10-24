'use client';
import { useRef, useState } from 'react';
import { Moon, Sun, Download, Upload, Trash2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { PHASES } from '@/lib/goals';
import { btnDanger, btnGhost, btnPrimary, Card, Confirm, day, PageHead } from '@/components/ui';

export default function SettingsPage() {
  const { clients, income, expenses, notes, projects, settings, importAll, resetAll, isMock } = useData();
  const { dark, toggle } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const backup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), clients, income, expenses, notes, projects, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `ayyuq-backup-${day(new Date().toISOString())}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.clients) && !Array.isArray(d.income) && !Array.isArray(d.expenses)) throw new Error('bad');
      await importAll(d);
      setMsg(`Restored ${d.clients?.length ?? 0} clients, ${d.income?.length ?? 0} income and ${d.expenses?.length ?? 0} expense records` + (d.projects?.length ? `, ${d.projects.length} projects` : '') + (d.notes?.length ? ` and ${d.notes.length} R&D notes.` : '.'));
    } catch { setMsg('That file is not a valid Ayyuq backup.'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const achievements = PHASES.flatMap((p) => p.goals.filter((g) => settings.achieved[g.id]).map((g) => ({ ...g, phase: p.n, when: settings.achieved[g.id] })))
    .sort((a, b) => +new Date(b.when) - +new Date(a.when));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHead title="Settings" />
      <Card title="Appearance" sub="Your choice is remembered on this device">
        <button className={btnPrimary + ' inline-flex items-center gap-2'} onClick={toggle}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}{dark ? 'Switch to light mode' : 'Switch to dark mode'}</button>
      </Card>
      <Card title="Data & Backup" sub={isMock ? 'Firebase is not connected, so your data lives in this browser. Back it up regularly.' : 'Connected to Firebase. Restore adds or overwrites records by id.'}>
        <div className="flex flex-wrap gap-3">
          <button className={btnGhost + ' inline-flex items-center gap-2'} onClick={backup}><Download size={20} />Download backup (JSON)</button>
          <button className={btnGhost + ' inline-flex items-center gap-2'} onClick={() => fileRef.current?.click()}><Upload size={20} />Restore from backup</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
        </div>
        {msg && <p className="mt-4 text-base font-medium text-[#4A5D23]">{msg}</p>}
        <p className="mt-4 text-sm text-gray-500">{clients.length} clients · {projects.length} projects · {income.length} income records · {expenses.length} expenses</p>
      </Card>
      <Card title="Achievements" sub="Goals you have completed, newest first">
        {achievements.length ? (
          <ul className="space-y-2">{achievements.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-2xl border border-[#E4EBD0] px-4 py-3 text-base">
              <span><b>Phase {a.phase}</b> · {a.title}</span><span className="text-sm text-gray-500">{day(a.when)}</span></li>))}</ul>
        ) : <p className="text-gray-500">No goals completed yet. They will appear here the moment you reach them.</p>}
      </Card>
      <Card title="Keyboard shortcuts">
        <p className="text-base"><kbd className="rounded-md bg-[#EAF0D8] px-2 py-0.5 text-sm">Ctrl / ⌘ + K</kbd> opens quick search for pages, clients and actions.</p>
      </Card>
      <Card title="Danger zone" sub="Deletes every client, project, income and expense record and resets goals to Phase 1. R&D notes are kept.">
        <button className={btnDanger + ' inline-flex items-center gap-2'} onClick={() => setConfirmReset(true)}><Trash2 size={20} />Delete all data</button>
      </Card>
      {confirmReset && <Confirm text="Delete ALL data? Download a backup first if you might need it. This cannot be undone."
        onNo={() => setConfirmReset(false)} onYes={async () => { await resetAll(); setConfirmReset(false); setMsg('All data deleted.'); }} />}
    </main>
  );
}
