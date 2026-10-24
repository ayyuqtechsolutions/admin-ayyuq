'use client';
import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import type { ExpenseRecord } from '@/types';
import { downloadCSV } from '@/lib/csv';
import { btnGhost, btnPrimary, Confirm, day, Field, formData, inputCls, inr, Modal, PageHead } from '@/components/ui';

const CATS = ['domain_hosting', 'software_subscription', 'transport_marketing', 'contractor_payout', 'hardware_rd', 'miscellaneous'];

export default function ExpensesPage() {
  const { expenses, clients, projects, add, update, remove } = useData();
  const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [edit, setEdit] = useState<ExpenseRecord | 'new' | null>(null);
  const [fc, setFc] = useState(''); // client chosen in the form ('' = none), narrows the project list
  const [del, setDel] = useState<ExpenseRecord | null>(null);
  const projName = (id?: string) => projects.find((p) => p.id === id)?.name ?? '';
  const open = (r: ExpenseRecord | 'new') => { setEdit(r); setFc(r === 'new' ? '' : r.clientId ?? ''); };
  const rows = expenses.filter((e) => (e.title + e.vendorName + projName(e.projectId)).toLowerCase().includes(q.toLowerCase()) && (!cat || e.category === cat))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const s = useMemo(() => {
    const by: Record<string, number> = {}; expenses.forEach((e) => (by[e.category] = (by[e.category] ?? 0) + e.amount));
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    const ym = new Date().toISOString().slice(0, 7);
    return { top, month: expenses.filter((e) => day(e.date).startsWith(ym)).reduce((t, e) => t + e.amount, 0) };
  }, [expenses]);
  const cur = edit && edit !== 'new' ? edit : undefined;

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHead title="Expenses" onAdd={() => open('new')} addLabel="Add expense"
        onExport={() => downloadCSV('expenses.csv', rows.map((e) => ({ date: day(e.date), title: e.title, category: e.category, vendor: e.vendorName, client: clients.find((c) => c.id === e.clientId)?.businessName ?? '', project: projName(e.projectId), amount: e.amount, notes: e.notes ?? '' })))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-6"><p className="text-sm text-gray-500">Top category</p>
          <p className="text-2xl font-extrabold text-[#EA580C]">{s.top ? `${s.top[0]} · ${inr(s.top[1])}` : '—'}</p></div>
        <div className="card p-6"><p className="text-sm text-gray-500">This month</p>
          <p className="text-2xl font-extrabold text-[#4A5D23]">{inr(s.month)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Search title, vendor or project" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      <div className="overflow-x-auto card">
        <table className="w-full text-base">
          <thead className="bg-[#F3F6E8] text-left text-[#4A5D23]"><tr>
            {['Date', 'Title', 'Category', 'Vendor', 'Client', 'Project', 'Amount', ''].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.id} className="border-t border-[#E5E7EB]">
              <td className="px-5 py-4">{day(e.date)}</td><td className="px-5 py-4">{e.title}</td><td className="px-5 py-4">{e.category}</td>
              <td className="px-5 py-4">{e.vendorName}</td>
              <td className="px-5 py-4">{clients.find((c) => c.id === e.clientId)?.businessName ?? '—'}</td>
              <td className="px-5 py-4">{projName(e.projectId) || '—'}</td>
              <td className="px-5 py-4 font-medium">{inr(e.amount)}</td>
              <td className="space-x-2 px-5 py-4 text-right"><button className={btnGhost} onClick={() => open(e)}>Edit</button>
                <button className={btnGhost} onClick={() => setDel(e)}>Delete</button></td>
            </tr>))}
            {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No records</td></tr>}</tbody>
        </table>
      </div>
      {edit && (
        <Modal title={cur ? 'Edit expense' : 'Add expense'} onClose={() => setEdit(null)}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(ev) => {
            const f = formData(ev);
            const proj = projects.find((p) => p.id === f.projectId);
            const data = { title: f.title, category: f.category, amount: Number(f.amount), vendorName: f.vendorName,
              // linking a project also fills in its client when none was picked
              clientId: f.clientId || proj?.clientId || '', projectId: f.projectId, date: new Date(f.date).toISOString(), notes: f.notes };
            cur ? update('expenses', cur.id, data) : add('expenses', data); setEdit(null);
          }}>
            <div className="col-span-2"><Field label="Title"><input name="title" className={inputCls} defaultValue={cur?.title} required /></Field></div>
            <Field label="Category"><select name="category" className={inputCls} defaultValue={cur?.category}>
              {CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Amount (₹)"><input name="amount" type="number" min="0" className={inputCls} defaultValue={cur?.amount} required /></Field>
            <Field label="Vendor"><input name="vendorName" className={inputCls} defaultValue={cur?.vendorName} required /></Field>
            <Field label="Client (optional)"><select name="clientId" className={inputCls} value={fc} onChange={(e) => setFc(e.target.value)}>
              <option value="">None</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}</select></Field>
            <Field label="Project (optional)"><select key={fc} name="projectId" className={inputCls}
              defaultValue={cur?.projectId && projects.some((p) => p.id === cur.projectId && (!fc || p.clientId === fc)) ? cur.projectId : ''}>
              <option value="">No project</option>
              {projects.filter((p) => !fc || p.clientId === fc).map((p) => <option key={p.id} value={p.id}>{fc ? p.name : `${p.name} · ${p.clientName}`}</option>)}</select></Field>
            <Field label="Date"><input name="date" type="date" className={inputCls} defaultValue={day(cur?.date) || day(new Date().toISOString())} required /></Field>
            <div className="col-span-2"><Field label="Notes"><input name="notes" className={inputCls} defaultValue={cur?.notes} /></Field></div>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary}>Save</button></div>
          </form>
        </Modal>)}
      {del && <Confirm text={`Permanently delete "${del.title}"?`} onNo={() => setDel(null)}
        onYes={() => { remove('expenses', del.id); setDel(null); }} />}
    </main>
  );
}
