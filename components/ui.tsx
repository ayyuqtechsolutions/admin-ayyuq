'use client';
import React from 'react';
export const OLIVE = '#4A5D23', ORANGE = '#EA580C';
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
export const day = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const inputCls = 'w-full rounded-xl border border-[#DDE5C8] bg-white px-4 py-3 text-base outline-none transition focus:border-[#4A5D23] focus:ring-4 focus:ring-[#4A5D23]/15';
export const btnPrimary = 'rounded-xl bg-gradient-to-r from-[#4A5D23] to-[#6B8434] px-5 py-3 text-base font-semibold text-white shadow-md shadow-[#4A5D23]/25 transition hover:brightness-110 active:scale-[.98]';
export const btnGhost = 'rounded-xl border border-[#DDE5C8] bg-white px-4 py-2.5 text-base font-medium transition hover:bg-[#F6F8EE] active:scale-[.98]';
export const btnDanger = 'rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EA580C] px-5 py-3 text-base font-semibold text-white shadow-md shadow-orange-500/30 transition hover:brightness-110 active:scale-[.98]';
export const formData = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
};
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-gray-600"><span>{label}</span>{children}</label>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b240c]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#E4EBD0] bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: OLIVE }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-[#F3F6E8]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal title="Confirm delete" onClose={onNo}>
      <p className="mb-6 text-base text-gray-700">{text}</p>
      <div className="flex justify-end gap-3"><button className={btnGhost} onClick={onNo}>Cancel</button>
        <button className={btnDanger} onClick={onYes}>Delete</button></div>
    </Modal>
  );
}
export function PageHead({ title, onAdd, addLabel, onExport }: { title: string; onAdd?: () => void; addLabel?: string; onExport?: () => void }) {
  return (
    <div className="fade-up flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: OLIVE }}>{title}</h1>
      <div className="flex gap-3">
        {onExport && <button className={btnGhost} onClick={onExport}>⬇ Export CSV</button>}
        {onAdd && <button className={btnPrimary} onClick={onAdd}>+ {addLabel}</button>}
      </div>
    </div>
  );
}
export const Badge = ({ children, warn }: { children: React.ReactNode; warn?: boolean }) => (
  <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold capitalize ${warn ? 'chip-bad' : 'chip-good'}`}>{children}</span>
);
export function Card({ title, sub, children, className = '' }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card fade-up p-6 ${className}`}>
      <div className="mb-4"><h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {sub && <p className="text-sm text-gray-500">{sub}</p>}</div>
      {children}
    </div>
  );
}
