'use client';
import { useEffect, useState } from 'react';
import { useData } from '@/context/DataContext';
import type { Client } from '@/types';
import { downloadCSV } from '@/lib/csv';
import { TEMPLATES, wa } from '@/lib/whatsapp';
import { Badge, btnGhost, btnPrimary, Confirm, day, Field, formData, inputCls, inr, Modal, PageHead } from '@/components/ui';


export default function ClientsPage() {
  const { clients, income, expenses, add, update, remove } = useData();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [edit, setEdit] = useState<Client | 'new' | null>(null);
  const [del, setDel] = useState<Client | null>(null);
  const [sel, setSel] = useState<Client | null>(null);
  const [tpl, setTpl] = useState('greeting');
  const cur = edit && edit !== 'new' ? edit : undefined;
  useEffect(() => { // open a client from quick search (?open=<id>)
    const id = new URLSearchParams(window.location.search).get('open');
    const c = id ? clients.find((x) => x.id === id) : undefined;
    if (c) { setSel(c); window.history.replaceState(null, '', '/clients'); }
  }, [clients]);

  const profile = (c: Client) => {
    const inc = income.filter((i) => i.clientId === c.id).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter((e) => e.clientId === c.id).reduce((s, e) => s + e.amount, 0);
    return { inc, exp, margin: inc ? ((inc - exp) / inc) * 100 : 0 };
  };
  const WaBtn = ({ c }: { c: Client }) => (
    <a className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EA580C] px-4 py-2.5 text-base font-semibold text-white shadow-md shadow-orange-500/30 transition hover:brightness-110" target="_blank" rel="noreferrer" href={wa(c, 'greeting')}>WhatsApp</a>);

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHead title="Clients" onAdd={() => setEdit('new')} addLabel="Add client"
        onExport={() => downloadCSV('clients.csv', clients.map((c) => ({ business: c.businessName, owner: c.ownerName, phone: c.phone, email: c.email ?? '', status: c.status, contract: c.contractType, services: c.servicesTaken.join(' | '), oneTimeFee: c.oneTimeFee, monthlyRetainer: c.retainerAmountMonthly, domain: c.domainName ?? '', domainExpiry: day(c.domainExpiryDate), hosting: c.hostingProvider ?? '', hostingExpiry: day(c.hostingExpiryDate) })))} />
      <div className="flex gap-2">
        <button className={view === 'grid' ? btnPrimary : btnGhost} onClick={() => setView('grid')}>Grid</button>
        <button className={view === 'table' ? btnPrimary : btnGhost} onClick={() => setView('table')}>Table</button>
      </div>
      {view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="space-y-2 card p-6">
              <div className="flex justify-between"><p className="text-xl font-bold">{c.businessName}</p>
                <Badge warn={c.status === 'lead'}>{c.status}</Badge></div>
              <p className="text-base text-gray-600">{c.ownerName} · {c.phone}</p>
              <p className="text-sm text-gray-500">{c.servicesTaken.join(', ')}</p>
              <div className="flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => setSel(c)}>View</button>
                <button className={btnGhost} onClick={() => setEdit(c)}>Edit</button>
                <button className={btnGhost} onClick={() => setDel(c)}>Delete</button><WaBtn c={c} /></div>
            </div>))}
        </div>
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-base">
            <thead className="bg-[#F3F6E8] text-left text-[#4A5D23]"><tr>
              {['Business', 'Owner', 'Contract', 'Status', 'MRR', ''].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
            <tbody>{clients.map((c) => (
              <tr key={c.id} className="border-t border-[#E5E7EB]">
                <td className="px-5 py-4">{c.businessName}</td><td className="px-5 py-4">{c.ownerName}</td>
                <td className="px-5 py-4">{c.contractType}</td><td className="px-5 py-4"><Badge warn={c.status === 'lead'}>{c.status}</Badge></td>
                <td className="px-5 py-4">{inr(c.retainerAmountMonthly)}</td>
                <td className="space-x-2 whitespace-nowrap px-5 py-4 text-right"><button className={btnGhost} onClick={() => setSel(c)}>View</button>
                  <button className={btnGhost} onClick={() => setEdit(c)}>Edit</button>
                  <button className={btnGhost} onClick={() => setDel(c)}>Delete</button><WaBtn c={c} /></td>
              </tr>))}</tbody>
          </table>
        </div>)}

      {sel && (() => { const p = profile(sel); return (
        <Modal title={sel.businessName} onClose={() => setSel(null)}>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-4"><p className="text-sm text-gray-500">Income</p><p className="text-xl font-extrabold text-[#4A5D23]">{inr(p.inc)}</p></div>
            <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-4"><p className="text-sm text-gray-500">Expenses</p><p className="text-xl font-extrabold text-[#EA580C]">{inr(p.exp)}</p></div>
            <div className="rounded-2xl border border-[#E4EBD0] bg-[#F6F8EE] p-4"><p className="text-sm text-gray-500">Margin</p><p className="text-xl font-extrabold">{p.margin.toFixed(1)}%</p></div>
          </div>
          <div className="space-y-2 text-base">
            <p>{sel.ownerName} · {sel.phone} {sel.email && `· ${sel.email}`}</p>
            {sel.address && <p>{sel.address}</p>}
            {sel.googleMapsUrl && <a className="text-[#4A5D23] underline" href={sel.googleMapsUrl} target="_blank" rel="noreferrer">Open in Maps</a>}
            <p>Contract: {sel.contractType} · One-time {inr(sel.oneTimeFee)} · Retainer {inr(sel.retainerAmountMonthly)}/mo</p>
            {(sel.domainName || sel.domainExpiryDate) && <p>Domain: {sel.domainName || '—'} (expires {day(sel.domainExpiryDate) || '—'})</p>}
            {(sel.hostingProvider || sel.hostingExpiryDate) && <p>Hosting: {sel.hostingProvider || '—'} (expires {day(sel.hostingExpiryDate) || '—'})</p>}
            {sel.notes && <p className="text-gray-600">{sel.notes}</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <select className={inputCls} value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {Object.keys(TEMPLATES).map((t) => <option key={t}>{t}</option>)}</select>
            <a className="whitespace-nowrap rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EA580C] px-5 py-3 text-base font-semibold text-white shadow-md shadow-orange-500/30" target="_blank" rel="noreferrer" href={wa(sel, tpl)}>Send on WhatsApp</a>
          </div>
        </Modal>); })()}

      {edit && (
        <Modal title={cur ? 'Edit client' : 'Add client'} onClose={() => setEdit(null)}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => {
            const f = formData(e);
            const data = { businessName: f.businessName, ownerName: f.ownerName, phone: f.phone, email: f.email, address: f.address,
              googleMapsUrl: f.googleMapsUrl || undefined, contractType: f.contractType, status: f.status,
              servicesTaken: f.services.split(',').map((s) => s.trim()).filter(Boolean),
              oneTimeFee: Number(f.oneTimeFee || 0), retainerAmountMonthly: Number(f.retainer || 0),
              domainName: f.domainName || undefined, domainExpiryDate: f.domainExpiryDate ? new Date(f.domainExpiryDate).toISOString() : undefined,
              hostingProvider: f.hostingProvider || undefined, hostingExpiryDate: f.hostingExpiryDate ? new Date(f.hostingExpiryDate).toISOString() : undefined,
              notes: f.notes };
            cur ? update('clients', cur.id, data) : add('clients', data); setEdit(null);
          }}>
            <Field label="Business name"><input name="businessName" className={inputCls} defaultValue={cur?.businessName} required /></Field>
            <Field label="Owner name"><input name="ownerName" className={inputCls} defaultValue={cur?.ownerName} required /></Field>
            <Field label="Phone (with country code)"><input name="phone" className={inputCls} defaultValue={cur?.phone} required /></Field>
            <Field label="Email"><input name="email" type="email" className={inputCls} defaultValue={cur?.email} /></Field>
            <Field label="Address"><input name="address" className={inputCls} defaultValue={cur?.address} /></Field>
            <Field label="Google Maps URL (optional)"><input name="googleMapsUrl" className={inputCls} defaultValue={cur?.googleMapsUrl} /></Field>
            <Field label="Contract"><select name="contractType" className={inputCls} defaultValue={cur?.contractType}>
              {['one-time', 'retainer', 'hybrid'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Status"><select name="status" className={inputCls} defaultValue={cur?.status ?? 'lead'}>
              {['lead', 'active', 'completed', 'cancelled'].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <div className="col-span-2"><Field label="Services (comma separated)"><input name="services" className={inputCls}
              defaultValue={cur?.servicesTaken.join(', ')} placeholder="Website, QR Menu, POS" /></Field></div>
            <Field label="One-time fee (₹)"><input name="oneTimeFee" type="number" className={inputCls} defaultValue={cur?.oneTimeFee} /></Field>
            <Field label="Monthly retainer (₹)"><input name="retainer" type="number" className={inputCls} defaultValue={cur?.retainerAmountMonthly} /></Field>
            <Field label="Domain (optional)"><input name="domainName" className={inputCls} defaultValue={cur?.domainName} /></Field>
            <Field label="Domain expiry (optional)"><input name="domainExpiryDate" type="date" className={inputCls} defaultValue={day(cur?.domainExpiryDate)} /></Field>
            <Field label="Hosting provider (optional)"><input name="hostingProvider" className={inputCls} defaultValue={cur?.hostingProvider} /></Field>
            <Field label="Hosting expiry (optional)"><input name="hostingExpiryDate" type="date" className={inputCls} defaultValue={day(cur?.hostingExpiryDate)} /></Field>
            <div className="col-span-2"><Field label="Notes"><input name="notes" className={inputCls} defaultValue={cur?.notes} /></Field></div>
            <div className="col-span-2 flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancel</button>
              <button className={btnPrimary}>Save</button></div>
          </form>
        </Modal>)}
      {del && <Confirm text={`Delete client "${del.businessName}"? Their projects, income and expense records stay.`}
        onNo={() => setDel(null)} onYes={() => { remove('clients', del.id); setDel(null); }} />}
    </main>
  );
}
