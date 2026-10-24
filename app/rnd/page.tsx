'use client';
import { useMemo, useRef, useState } from 'react';
import { Clock, FlaskConical, Pencil, Search, Trash2, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import type { Note } from '@/types';
import { btnGhost, btnPrimary, Confirm, inputCls, PageHead } from '@/components/ui';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stamp = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Wraps every occurrence of the search words in a highlight
function Hl({ text, re }: { text: string; re: RegExp | null }) {
  if (!re) return <>{text}</>;
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="chip-bad rounded px-0.5">{part}</mark> : part))}</>;
}

function Editor({ note, onClose }: { note?: Note; onClose: () => void }) {
  const { add, update } = useData();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const empty = !title.trim() && !content.trim();

  const save = async () => {
    if (busy || empty) return;
    setBusy(true); setErr('');
    const data = { title: title.trim() || 'Untitled note', content: content.trim() };
    try {
      if (note) await update('notes', note.id, data); else await add('notes', data);
      onClose();
    } catch {
      setErr('Could not save the note. Check your connection and Firestore rules, then try again. Your text is still here.');
      setBusy(false);
    }
  };

  return (
    <div className="card fade-up space-y-4 p-6" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save(); }}>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Heading"
        className={inputCls + ' text-xl font-bold'} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your research here…"
        className={inputCls + ' min-h-[240px] resize-y leading-relaxed'} />
      {err && <p role="alert" className="text-sm font-medium text-[#EA580C]">{err}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-sm text-gray-500 sm:block">Ctrl / ⌘ + Enter to save</p>
        <div className="ml-auto flex gap-3">
          <button className={btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={btnPrimary + ' disabled:cursor-not-allowed disabled:opacity-60'} onClick={save} disabled={busy || empty}>
            {busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function RnDPage() {
  const { notes, remove } = useData();
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [del, setDel] = useState<Note | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const terms = useMemo(() => Array.from(new Set(q.toLowerCase().split(/\s+/).filter(Boolean))), [q]);
  const re = useMemo(() => (terms.length ? new RegExp('(' + [...terms].sort((a, b) => b.length - a.length).map(esc).join('|') + ')', 'gi') : null), [terms]);

  const sorted = useMemo(() => [...notes].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [notes]);
  // A note matches when every word you typed appears somewhere in its heading or body
  const results = useMemo(() => {
    if (!terms.length) return sorted;
    return sorted.filter((n) => { const hay = (n.title + '\n' + n.content).toLowerCase(); return terms.every((t) => hay.includes(t)); });
  }, [sorted, terms]);

  const lineHits = (n: Note) => n.content.split('\n').map((text, i) => ({ text, no: i + 1 }))
    .filter((l) => terms.some((t) => l.text.toLowerCase().includes(t)));

  const searching = terms.length > 0;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <PageHead title="R&D" onAdd={() => setEditing('new')} addLabel="Add note" />

      <div className="fade-up relative">
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes by heading or any word in the text…"
          className={inputCls + ' pl-12 pr-12'} />
        {q && <button aria-label="Clear search" onClick={() => { setQ(''); searchRef.current?.focus(); }}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:bg-[#F3F6E8]"><X size={20} /></button>}
      </div>
      {searching && <p className="text-sm text-gray-500">{results.length} {results.length === 1 ? 'note matches' : 'notes match'} “{q.trim()}”</p>}

      {editing === 'new' && <Editor onClose={() => setEditing(null)} />}

      {results.map((n) => {
        if (editing && editing !== 'new' && editing.id === n.id) return <Editor key={n.id} note={n} onClose={() => setEditing(null)} />;
        const hits = searching ? lineHits(n) : [];
        const long = n.content.length > 220 || n.content.split('\n').length > 3;
        const expanded = !!open[n.id];
        const edited = +new Date(n.updatedAt) - +new Date(n.createdAt) > 60000;
        return (
          <article key={n.id} className="card fade-up p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold tracking-tight"><Hl text={n.title} re={re} /></h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5"><Clock size={15} />{stamp(n.createdAt)}</span>
                  {edited && <span>Edited {stamp(n.updatedAt)}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button aria-label="Edit note" onClick={() => setEditing(n)} className="grid h-10 w-10 place-items-center rounded-full text-gray-500 hover:bg-[#F3F6E8]"><Pencil size={19} /></button>
                <button aria-label="Delete note" onClick={() => setDel(n)} className="grid h-10 w-10 place-items-center rounded-full text-[#EA580C] hover:bg-[#FFEDD5]"><Trash2 size={19} /></button>
              </div>
            </div>

            {n.content && (searching && hits.length && !expanded ? (
              <ul className="mt-4 space-y-1.5 rounded-2xl border border-[#E4EBD0] p-3 text-base">
                {hits.slice(0, 8).map((l) => (
                  <li key={l.no} className="flex gap-3"><span className="w-8 shrink-0 text-right text-sm text-gray-400">{l.no}</span>
                    <span className="min-w-0 break-words"><Hl text={l.text} re={re} /></span></li>))}
                {hits.length > 8 && <li className="pl-11 text-sm text-gray-500">+ {hits.length - 8} more matching lines</li>}
              </ul>
            ) : (
              <p className={`mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-gray-700 ${!expanded && !searching ? 'line-clamp-3' : ''}`}>
                <Hl text={n.content} re={re} /></p>
            ))}

            {(long || (searching && hits.length > 0)) && (
              <button className="mt-3 text-sm font-semibold text-[#4A5D23] hover:underline" onClick={() => setOpen((o) => ({ ...o, [n.id]: !expanded }))}>
                {expanded ? 'Show less' : searching && hits.length ? 'Open full note' : 'Read more'}</button>)}
          </article>
        );
      })}

      {!results.length && !editing && (
        <div className="fade-up grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#DDE5C8] p-8 text-center text-gray-500">
          <div className="space-y-2"><FlaskConical size={32} className="mx-auto text-gray-400" />
            <p className="text-base">{searching ? `No notes contain “${q.trim()}”.` : 'No research notes yet. Click “Add note” to write your first one.'}</p></div>
        </div>)}

      {del && <Confirm text={`Delete the note “${del.title}”? This cannot be undone.`} onNo={() => setDel(null)}
        onYes={async () => { await remove('notes', del.id); setDel(null); }} />}
    </main>
  );
}
