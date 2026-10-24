'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { auth } from '@/lib/firebase';
import { buildContext } from '@/lib/aiContext';
import Markdown from '@/components/Markdown';
import { btnGhost, inputCls, OLIVE } from '@/components/ui';

interface Msg { id: string; role: 'user' | 'model'; text: string; }
const KEY = 'ayyuqai-chat';
const uid = () => Math.random().toString(36).slice(2, 10);
const SUGGESTIONS = [
  'Which projects are due in the next 7 days?',
  'Which clients have paid me the most?',
  "Summarize this month's income, expenses and profit",
  'Which domains or hosting plans expire soon?',
  'Write a polite WhatsApp payment reminder for the client with the highest balance due',
];

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button aria-label="Copy answer" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* clipboard blocked */ } }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-gray-500 transition hover:bg-[#EAF0D8]">
      {ok ? <Check size={15} /> : <Copy size={15} />}{ok ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AyyuqAIPage() {
  const { clients, projects, income, expenses } = useData();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [useData_, setUseData] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // keep the chat while you move between pages (cleared when the tab closes)
  useEffect(() => {
    try { const raw = sessionStorage.getItem(KEY); if (raw) setMsgs(JSON.parse(raw)); } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { sessionStorage.setItem(KEY, JSON.stringify(msgs)); } catch { /* ignore */ } }, [msgs, loaded]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, error]);

  const ask = async (history: Msg[]) => {
    setBusy(true); setError('');
    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign out and sign in again.');
      const res = await fetch('/api/ayyuqai', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          context: useData_ ? buildContext({ clients, projects, income, expenses }) : '',
          now: new Date().toString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status}). Please try again.`);
      setMsgs([...history, { id: uid(), role: 'model', text: data.text + (data.truncated ? '\n\n_(Answer was cut off. Ask me to continue.)_' : '') }]);
    } catch (e: any) { setError(e?.message || 'Something went wrong.'); }
    setBusy(false);
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { id: uid(), role: 'user' as const, text: t }];
    setMsgs(next); setInput(''); ask(next);
  };
  const retry = () => { if (!busy && msgs.length && msgs[msgs.length - 1].role === 'user') ask(msgs); };
  const reset = () => { setMsgs([]); setError(''); setInput(''); };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
      <div className="fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-extrabold tracking-tight" style={{ color: OLIVE }}><Sparkles size={34} className="text-[#EA580C]" />AyyuqAI</h1>
          <p className="mt-1 text-base text-gray-500">Ask about your clients, projects and money, or get help writing and building.</p>
        </div>
        {!!msgs.length && <button className={btnGhost + ' inline-flex items-center gap-2'} onClick={reset}><RotateCcw size={17} />New chat</button>}
      </div>

      <section className="card fade-up flex h-[calc(100vh-17rem)] min-h-[440px] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!msgs.length && !busy && (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-lg space-y-5">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#FF7A45,#EA580C)' }}><Sparkles size={32} /></div>
                <div><h2 className="text-2xl font-extrabold tracking-tight">Hi, I'm AyyuqAI</h2>
                  <p className="mt-1 text-base text-gray-500">Try one of these, or type your own question.</p></div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-[#DDE5C8] bg-white px-4 py-2 text-left text-sm font-medium transition hover:bg-[#F6F8EE]">{s}</button>)}
                </div>
              </div>
            </div>)}

          {msgs.map((m) => m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-r from-[#4A5D23] to-[#6B8434] px-4 py-3 text-base text-white shadow-md shadow-[#4A5D23]/20">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#FF7A45,#EA580C)' }}><Sparkles size={18} /></div>
              <div className="min-w-0 max-w-[90%]">
                <div className="rounded-2xl rounded-tl-md border border-[#E4EBD0] bg-[#F6F8EE] px-4 py-3"><Markdown text={m.text} /></div>
                <div className="mt-1"><CopyBtn text={m.text} /></div>
              </div>
            </div>))}

          {busy && (
            <div className="flex gap-3">
              <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#FF7A45,#EA580C)' }}><Sparkles size={18} /></div>
              <div className="rounded-2xl rounded-tl-md border border-[#E4EBD0] bg-[#F6F8EE] px-4 py-3 text-base text-gray-500"><span className="animate-pulse">Thinking…</span></div>
            </div>)}

          {error && (
            <div role="alert" className="rounded-2xl border border-[#FED7AA] bg-[#FFEDD5] p-4 text-sm text-[#C2410C]">
              <p className="break-words">{error}</p>
              {!!msgs.length && msgs[msgs.length - 1].role === 'user' && <button onClick={retry} className="mt-2 font-semibold underline">Try again</button>}
            </div>)}
          <div ref={endRef} />
        </div>

        <div className="space-y-3 border-t border-[#E4EBD0] p-4">
          <div className="flex items-end gap-2">
            <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} placeholder="Ask AyyuqAI anything…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className={inputCls + ' resize-none'} />
            <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send"
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#4A5D23] to-[#6B8434] text-white shadow-md shadow-[#4A5D23]/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><Send size={21} /></button>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-500">
            <input type="checkbox" checked={useData_} onChange={(e) => setUseData(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4A5D23]" />
            <span>Use my business data (clients, projects, income, expenses). Phone numbers and emails are not shared. This data is sent to Google Gemini to answer you.</span>
          </label>
        </div>
      </section>
    </main>
  );
}
