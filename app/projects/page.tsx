'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, FolderKanban, Mail, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { wa } from '@/lib/whatsapp';
import type { ChecklistItem, Client, Project, ProjectStatus } from '@/types';
import { Badge, btnGhost, btnPrimary, Confirm, day, Field, formData, inputCls, inr, Modal, PageHead } from '@/components/ui';

const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date | string) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const fmtDue = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const hrs = (n: number) => String(Math.round(n * 10) / 10);
const SERVICES = ['Website', 'QR Menu', 'POS', 'Mobile App', 'SEO', 'Branding', 'Maintenance'];
const STATUS_LABEL: Record<ProjectStatus, string> = { active: 'Active', on_hold: 'On hold', completed: 'Completed' };

// Progress is simply ticked tasks / total tasks
const progress = (p: Project) => {
  const total = p.checklist?.length ?? 0, done = (p.checklist ?? []).filter((i) => i.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
};

function timeLeft(deadline: string, now: number) {
  const ms = new Date(deadline).getTime() - now;
  const over = ms < 0;
  let m = Math.floor(Math.abs(ms) / 60000);
  const d = Math.floor(m / 1440); m -= d * 1440;
  const h = Math.floor(m / 60); m -= h * 60;
  const parts = d ? `${d} day${d > 1 ? 's' : ''} ${h} hr` : h ? `${h} hr ${m} min` : `${m} min`;
  return { over, urgent: over || ms < 48 * 3600e3, text: over ? `Overdue by ${parts}` : `${parts} left` };
}

// Re-render every minute so the countdown stays current
function useNow(ms = 60000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

function Checklist({ p }: { p: Project }) {
  const { update } = useData();
  const [text, setText] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const list = p.checklist ?? [];
  const save = (next: ChecklistItem[]) => update('projects', p.id, { checklist: next });
  const addItem = () => { const t = text.trim(); if (!t) return; save([...list, { id: uid(), text: t, done: false }]); setText(''); };
  const commitEdit = () => {
    const t = editText.trim();
    if (editId && t) save(list.map((i) => (i.id === editId ? { ...i, text: t } : i)));
    setEditId(null);
  };
  const { done, total } = progress(p);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-base font-bold">Checklist</h4>
        <span className="text-sm text-gray-500">{done}/{total} done</span>
      </div>
      <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {list.map((i) => (
          <li key={i.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#F6F8EE]">
            <input type="checkbox" checked={i.done} aria-label={`Mark "${i.text}" ${i.done ? 'not done' : 'done'}`}
              onChange={() => save(list.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))}
              className="h-5 w-5 shrink-0 cursor-pointer accent-[#4A5D23]" />
            {editId === i.id ? (
              <>
                <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className={inputCls + ' !py-1.5'}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditId(null); }} />
                <button aria-label="Save task" onClick={commitEdit} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#4A5D23] hover:bg-[#EAF0D8]"><Check size={18} /></button>
              </>
            ) : (
              <>
                <span className={`min-w-0 flex-1 break-words text-base ${i.done ? 'text-gray-400 line-through' : ''}`}>{i.text}</span>
                <button aria-label="Edit task" onClick={() => { setEditId(i.id); setEditText(i.text); }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-[#EAF0D8]"><Pencil size={16} /></button>
                <button aria-label="Delete task" onClick={() => save(list.filter((x) => x.id !== i.id))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#EA580C] hover:bg-[#FFEDD5]"><X size={18} /></button>
              </>
            )}
          </li>))}
        {!list.length && <li className="py-2 text-sm text-gray-500">No tasks yet. Add the first one below, e.g. “Make body structure”.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task…" className={inputCls}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} />
        <button onClick={addItem} aria-label="Add task" className={btnPrimary + ' !px-4'}><Plus size={20} /></button>
      </div>
    </div>
  );
}

function ProjectCard({ p, client, money, now, onEdit, onDelete }: {
  p: Project; client?: Client; now: number;
  money: { received: number; spent: number; balance: number };
  onEdit: () => void; onDelete: () => void;
}) {
  const { update } = useData();
  const { pct, total } = progress(p);
  const left = timeLeft(p.deadline, now);
  const setStatus = (status: ProjectStatus) => update('projects', p.id, { status });
  const cName = client?.businessName ?? p.clientName;

  return (
    <article className="card fade-up p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-extrabold tracking-tight">{p.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="chip-idle inline-block rounded-full px-3 py-1 text-sm font-semibold">{p.service || 'Service not set'}</span>
            <Badge warn={p.status === 'on_hold'}>{STATUS_LABEL[p.status]}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold leading-none text-[#4A5D23]">{pct}%</p>
          <p className="mt-1 text-sm text-gray-500">{total ? 'work done' : 'no tasks yet'}</p>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#EAF0D8]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#4A5D23] to-[#8FA85A] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <section className="space-y-1.5">
            <h4 className="text-base font-bold">Client</h4>
            <p className="text-base font-medium">{cName}</p>
            {client ? (
              <>
                <p className="text-base text-gray-600">{client.ownerName}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
                  <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-[#4A5D23] hover:underline"><Phone size={16} />{client.phone}</a>
                  {client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 text-[#4A5D23] hover:underline"><Mail size={16} />{client.email}</a>}
                </div>
                <a target="_blank" rel="noreferrer" href={wa(client, 'greeting')}
                  className="mt-1 inline-block rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EA580C] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 transition hover:brightness-110">WhatsApp</a>
              </>
            ) : <p className="text-sm text-gray-500">This client was deleted, so contact details are no longer available.</p>}
          </section>

          <section className="space-y-2">
            <h4 className="text-base font-bold">Delivery</h4>
            <p className="inline-flex items-center gap-2 text-base"><Clock size={18} className="text-gray-500" />Due {fmtDue(p.deadline)}</p>
            <div>
              {p.status === 'completed'
                ? <span className="chip-good inline-block rounded-full px-3 py-1 text-sm font-semibold">Completed</span>
                : <span className={`${left.urgent ? 'chip-bad' : 'chip-good'} inline-block rounded-full px-3 py-1 text-sm font-semibold`}>{left.text}</span>}
            </div>
            {!!p.estimatedHours && p.estimatedHours > 0 && (
              <p className="text-sm text-gray-500">Work estimate: {hrs(p.estimatedHours)} hrs{p.status !== 'completed' && <> · about {hrs(p.estimatedHours * (1 - pct / 100))} hrs of work left</>}</p>)}
          </section>

          <section>
            <h4 className="mb-2 text-base font-bold">Money</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-3"><p className="text-xs text-gray-500">Budget</p><p className="text-lg font-extrabold">{inr(p.budget)}</p></div>
              <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-3"><p className="text-xs text-gray-500">Received</p><p className="text-lg font-extrabold text-[#4A5D23]">{inr(money.received)}</p></div>
              <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-3"><p className="text-xs text-gray-500">Balance due</p><p className="text-lg font-extrabold text-[#EA580C]">{inr(money.balance)}</p></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Expenses {inr(money.spent)}</p>
          </section>
        </div>

        <Checklist p={p} />
      </div>

      {p.notes && <p className="mt-5 whitespace-pre-wrap break-words text-sm text-gray-600">{p.notes}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#E4EBD0] pt-4">
        {p.status === 'active' && pct === 100 && <span className="mr-auto text-sm font-semibold text-[#4A5D23]">All tasks done. Ready to mark completed?</span>}
        {p.status === 'active' && <button className={pct === 100 ? btnPrimary : btnGhost} onClick={() => setStatus('completed')}>Mark completed</button>}
        {p.status === 'active' && <button className={btnGhost} onClick={() => setStatus('on_hold')}>Put on hold</button>}
        {p.status === 'on_hold' && <button className={btnPrimary} onClick={() => setStatus('active')}>Resume</button>}
        {p.status === 'completed' && <button className={btnGhost} onClick={() => setStatus('active')}>Reopen</button>}
        <button className={btnGhost + ' ml-auto'} onClick={onEdit}>Edit</button>
        <button className={btnGhost + ' inline-flex items-center gap-1.5'} onClick={onDelete}><Trash2 size={16} />Delete</button>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const { projects, clients, income, expenses, add, update, remove } = useData();
  const now = useNow();
  const [tab, setTab] = useState<'active' | 'on_hold' | 'completed' | 'all'>('active');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Project | 'new' | null>(null);
  const [del, setDel] = useState<Project | null>(null);
  const cur = edit && edit !== 'new' ? edit : undefined;

  const moneyOf = useMemo(() => {
    const m: Record<string, { received: number; spent: number; balance: number }> = {};
    projects.forEach((p) => {
      const inc = income.filter((i) => i.projectId === p.id);
      const received = inc.reduce((s, i) => s + i.amount, 0);
      const spent = expenses.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.amount, 0);
      m[p.id] = { received, spent, balance: Math.max(p.budget - received, 0) };
    });
    return m;
  }, [projects, income, expenses]);

  const active = projects.filter((p) => p.status === 'active');
  const stats = {
    count: active.length,
    soon: active.filter((p) => { const ms = new Date(p.deadline).getTime() - now; return ms < 7 * 86400e3; }).length,
    value: active.reduce((s, p) => s + p.budget, 0),
    collect: active.reduce((s, p) => s + (moneyOf[p.id]?.balance ?? 0), 0),
  };

  const rank: Record<ProjectStatus, number> = { active: 0, on_hold: 1, completed: 2 };
  const rows = projects
    .filter((p) => (tab === 'all' || p.status === tab) &&
      (p.name + ' ' + (clients.find((c) => c.id === p.clientId)?.businessName ?? p.clientName) + ' ' + p.service).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank[a.status] - rank[b.status] || +new Date(a.deadline) - +new Date(b.deadline));

  const tabs: [typeof tab, string, number][] = [
    ['active', 'Active', active.length], ['on_hold', 'On hold', projects.filter((p) => p.status === 'on_hold').length],
    ['completed', 'Completed', projects.filter((p) => p.status === 'completed').length], ['all', 'All', projects.length],
  ];
  const services = Array.from(new Set([...SERVICES, ...clients.flatMap((c) => c.servicesTaken)]));
  const defaultDeadline = () => { const d = new Date(Date.now() + 7 * 86400e3); d.setHours(18, 0, 0, 0); return toLocalInput(d); };

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHead title="Active Projects" onAdd={() => setEdit('new')} addLabel="Add project" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-6"><p className="text-sm text-gray-500">Active projects</p>
          <p className="text-2xl font-extrabold text-[#4A5D23]">{stats.count}</p>
          <p className="text-sm text-gray-500">{stats.soon} due within 7 days or overdue</p></div>
        <div className="card p-6"><p className="text-sm text-gray-500">Total project value</p>
          <p className="text-2xl font-extrabold text-[#4A5D23]">{inr(stats.value)}</p></div>
        <div className="card p-6"><p className="text-sm text-gray-500">Balance to collect</p>
          <p className="text-2xl font-extrabold text-[#EA580C]">{inr(stats.collect)}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([k, label, n]) => (
          <button key={k} className={tab === k ? btnPrimary : btnGhost} onClick={() => setTab(k)}>{label} ({n})</button>))}
        <input className={inputCls + ' sm:ml-auto sm:max-w-xs'} placeholder="Search project, client or service" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-4">
        {rows.map((p) => (
          <ProjectCard key={p.id} p={p} client={clients.find((c) => c.id === p.clientId)} now={now}
            money={moneyOf[p.id] ?? { received: 0, spent: 0, balance: p.budget }}
            onEdit={() => setEdit(p)} onDelete={() => setDel(p)} />))}
        {!rows.length && (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#DDE5C8] p-8 text-center text-gray-500">
            <div className="space-y-2"><FolderKanban size={32} className="mx-auto text-gray-400" />
              <p className="text-base">{projects.length ? 'No projects match this filter.' : 'No projects yet. Click “Add project” to create your first one.'}</p></div>
          </div>)}
      </div>

      {edit && !clients.length && (
        <Modal title="Add a client first" onClose={() => setEdit(null)}>
          <p className="mb-5 text-base text-gray-700">Every project belongs to a client. Create the client, then come back here.</p>
          <div className="flex justify-end gap-3"><button className={btnGhost} onClick={() => setEdit(null)}>Close</button>
            <Link href="/clients" className={btnPrimary}>Go to Clients</Link></div>
        </Modal>)}

      {edit && !!clients.length && (
        <Modal title={cur ? 'Edit project' : 'Add project'} onClose={() => setEdit(null)}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => {
            const f = formData(e);
            const c = clients.find((x) => x.id === f.clientId);
            const data: Record<string, any> = {
              name: f.name.trim(), clientId: f.clientId, clientName: c?.businessName ?? '', service: f.service.trim(), status: f.status,
              startDate: f.startDate ? new Date(f.startDate).toISOString() : '', deadline: new Date(f.deadline).toISOString(),
              budget: Number(f.budget || 0), estimatedHours: Number(f.estimatedHours || 0), notes: f.notes,
            };
            if (cur) update('projects', cur.id, data);
            else add('projects', { ...data, checklist: (f.checklist ?? '').split('\n').map((t) => t.trim()).filter(Boolean).map((text) => ({ id: uid(), text, done: false })) });
            setEdit(null);
          }}>
            <div className="col-span-2"><Field label="Project name"><input name="name" className={inputCls} defaultValue={cur?.name} placeholder="e.g. Restaurant website" required /></Field></div>
            <Field label="Client"><select name="clientId" className={inputCls} defaultValue={cur?.clientId ?? clients[0]?.id} required>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}</select></Field>
            <Field label="Service">
              <input name="service" list="svc" className={inputCls} defaultValue={cur?.service} placeholder="Website, QR Menu…" required />
              <datalist id="svc">{services.map((s) => <option key={s} value={s} />)}</datalist></Field>
            <Field label="Start date"><input name="startDate" type="date" className={inputCls} defaultValue={cur ? day(cur.startDate) : day(new Date().toISOString())} /></Field>
            <Field label="Deadline (date and time)"><input name="deadline" type="datetime-local" className={inputCls} defaultValue={cur ? toLocalInput(cur.deadline) : defaultDeadline()} required /></Field>
            <Field label="Project budget (₹)"><input name="budget" type="number" min="0" className={inputCls} defaultValue={cur?.budget} required /></Field>
            <Field label="Work hours estimate (optional)"><input name="estimatedHours" type="number" min="0" step="0.5" className={inputCls} defaultValue={cur?.estimatedHours || ''} /></Field>
            <Field label="Status"><select name="status" className={inputCls} defaultValue={cur?.status ?? 'active'}>
              {(['active', 'on_hold', 'completed'] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <div className="col-span-2"><Field label="Notes (optional)"><input name="notes" className={inputCls} defaultValue={cur?.notes} /></Field></div>
            {!cur && (
              <div className="col-span-2"><Field label="Checklist (one task per line, you can add more later)">
                <textarea name="checklist" className={inputCls + ' min-h-[130px]'} placeholder={'Make body structure\nAdd CSS\nAdd animations\nTest on mobile'} /></Field></div>)}
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary}>Save</button></div>
          </form>
        </Modal>)}

      {del && <Confirm text={`Delete project "${del.name}"? Income and expense records linked to it stay, but lose the project link.`}
        onNo={() => setDel(null)} onYes={() => { remove('projects', del.id); setDel(null); }} />}
    </main>
  );
}
