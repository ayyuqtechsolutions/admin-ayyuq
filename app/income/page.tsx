'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import type { IncomeRecord } from '@/types';
import { downloadCSV } from '@/lib/csv';
import { btnGhost, btnPrimary, Confirm, day, Field, formData, inputCls, inr, Modal, PageHead } from '@/components/ui';

export default function IncomePage() {
  const { income, clients, projects, add, update, remove } = useData();
  const [q, setQ] = useState(''); const [method, setMethod] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [edit, setEdit] = useState<IncomeRecord | 'new' | null>(null);
  const [fc, setFc] = useState(''); // client chosen in the form, decides which projects are offered
  const [del, setDel] = useState<IncomeRecord | null>(null);
  const projName = (id?: string) => projects.find((p) => p.id === id)?.name ?? '';
  const open = (r: IncomeRecord | 'new') => { setEdit(r); setFc(r === 'new' ? (clients[0]?.id ?? '') : r.clientId); };
  const rows = income.filter((i) =>
    (i.clientName + ' ' + projName(i.projectId)).toLowerCase().includes(q.toLowerCase()) &&
    (!method || i.paymentMethod === method) && (!from || day(i.date) >= from) && (!to || day(i.date) <= to))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const cur = edit && edit !== 'new' ? edit : undefined;

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHead title="Income" onAdd={() => open('new')} addLabel="Add income"
        onExport={() => downloadCSV('income.csv', rows.map((i) => ({ date: day(i.date), client: i.clientName, project: projName(i.projectId), type: i.paymentType, method: i.paymentMethod, amount: i.amount, notes: i.notes ?? '' })))} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <input className={inputCls} placeholder="Search client or project" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All methods</option>{['Online', 'Cash'].map((m) => <option key={m}>{m}</option>)}</select>
        <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="overflow-x-auto card">
        <table className="w-full text-base">
          <thead className="bg-[#F3F6E8] text-left text-[#4A5D23]"><tr>
            {['Date', 'Client', 'Project', 'Type', 'Method', 'Amount', ''].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
          <tbody>{rows.map((i) => (
            <tr key={i.id} className="border-t border-[#E5E7EB]">
              <td className="px-5 py-4">{day(i.date)}</td><td className="px-5 py-4">{i.clientName}</td><td className="px-5 py-4">{projName(i.projectId) || '—'}</td>
              <td className="px-5 py-4">{i.paymentType}</td><td className="px-5 py-4">{i.paymentMethod}</td>
              <td className="px-5 py-4 font-medium">{inr(i.amount)}</td>
              <td className="space-x-2 px-5 py-4 text-right">
                <button className={btnGhost} onClick={() => open(i)}>Edit</button>
                <button className={btnGhost} onClick={() => setDel(i)}>Delete</button></td>
            </tr>))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No records</td></tr>}</tbody>
        </table>
      </div>
      {edit && (
        <Modal title={cur ? 'Edit income' : 'Add income'} onClose={() => setEdit(null)}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => {
            const f = formData(e); const c = clients.find((x) => x.id === f.clientId);
            const data = { clientId: f.clientId, clientName: c?.businessName ?? '', projectId: f.projectId, amount: Number(f.amount),
              paymentType: f.paymentType, paymentMethod: f.paymentMethod,
              date: new Date(f.date).toISOString(), notes: f.notes };
            cur ? update('income', cur.id, data) : add('income', data); setEdit(null);
          }}>
            <Field label="Client"><select name="clientId" className={inputCls} value={fc} onChange={(e) => setFc(e.target.value)} required>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}</select></Field>
            <Field label="Project (optional)"><select key={fc} name="projectId" className={inputCls} defaultValue={cur && cur.clientId === fc ? cur.projectId ?? '' : ''}>
              <option value="">No project</option>
              {projects.filter((p) => p.clientId === fc).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Amount (₹)"><input name="amount" type="number" min="0" className={inputCls} defaultValue={cur?.amount} required /></Field>
            <Field label="Type"><select name="paymentType" className={inputCls} defaultValue={cur?.paymentType}>
              {['advance', 'final_balance', 'retainer'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Method"><select name="paymentMethod" className={inputCls} defaultValue={cur ? (cur.paymentMethod === 'Cash' ? 'Cash' : 'Online') : undefined}>
              {['Online', 'Cash'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Date"><input name="date" type="date" className={inputCls} defaultValue={day(cur?.date) || day(new Date().toISOString())} required /></Field>
            <Field label="Notes"><input name="notes" className={inputCls} defaultValue={cur?.notes} /></Field>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary}>Save</button></div>
          </form>
        </Modal>)}
      {del && <Confirm text={`Permanently delete ${inr(del.amount)} from ${del.clientName}?`}
        onNo={() => setDel(null)} onYes={() => { remove('income', del.id); setDel(null); }} />}
    </main>
  );
}
