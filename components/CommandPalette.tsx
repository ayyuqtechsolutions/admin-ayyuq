'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';

interface Item { id: string; label: string; hint: string; run: () => void; }

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { clients } = useData();
  const { dark, toggle } = useTheme();
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const items: Item[] = useMemo(() => [
    ...[['Dashboard', '/'], ['Income', '/income'], ['Expenses', '/expenses'], ['Clients', '/clients'], ['Projects', '/projects'], ['R&D', '/rnd'], ['AyyuqAI', '/ayyuqai'], ['Settings', '/settings']]
      .map(([l, h]) => ({ id: 'go' + h, label: `Go to ${l}`, hint: 'Page', run: () => router.push(h) })),
    { id: 'theme', label: dark ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Action', run: toggle },
    ...clients.map((c) => ({ id: 'c' + c.id, label: c.businessName, hint: `Client · ${c.ownerName}`, run: () => router.push('/clients?open=' + c.id) })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [clients, dark]);
  const list = items.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => ref.current?.focus(), 0); } }, [open]);
  if (!open) return null;
  const go = (i?: Item) => { if (!i) return; i.run(); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#1b240c]/50 p-4 pt-[15vh] backdrop-blur-sm" onClick={onClose}>
      <div className="card fade-up w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#E4EBD0] px-5 py-4">
          <Search size={20} />
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter') go(list[idx]);
              else if (e.key === 'Escape') onClose();
            }}
            placeholder="Search pages, clients, actions…" className="w-full bg-transparent text-lg outline-none" />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {list.map((i, n) => (
            <li key={i.id}>
              <button onClick={() => go(i)} onMouseEnter={() => setIdx(n)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-base ${n === idx ? 'bg-[#EAF0D8]' : ''}`}>
                <span className="font-medium">{i.label}</span><span className="text-sm text-gray-500">{i.hint}</span>
              </button></li>))}
          {!list.length && <li className="p-4 text-center text-gray-400">No results</li>}
        </ul>
      </div>
    </div>
  );
}
