'use client';
import { useMemo } from 'react';
import { CheckCircle2, Globe, Server } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { computeAlerts } from '@/lib/alerts';
import { wa } from '@/lib/whatsapp';
import { Card } from './ui';

const ICONS = { domain: Globe, hosting: Server };

export default function Alerts() {
  const { clients } = useData();
  const alerts = useMemo(() => computeAlerts(clients), [clients]);
  const urgent = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <Card title="Alerts & Reminders" sub="Domain / hosting renewals (next 30 days)">
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="chip-bad rounded-full px-3.5 py-1 text-sm font-semibold">{urgent} urgent</span>
        <span className="chip-idle rounded-full px-3.5 py-1 text-sm font-semibold">{alerts.length - urgent} due soon</span>
      </div>
      {alerts.length === 0 ? (
        <div className="chip-good flex items-center gap-3 rounded-2xl p-5 text-base font-medium">
          <CheckCircle2 size={24} /> All clear: no expiring domains or hosting.</div>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {alerts.map((a) => {
            const Icon = ICONS[a.kind];
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E4EBD0] p-3.5">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${a.severity === 'critical' ? 'icon-out' : 'icon-warn'}`}><Icon size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{a.title}</p>
                  <p className={`text-sm ${a.severity === 'critical' ? 'font-semibold text-[#EA580C]' : 'text-gray-500'}`}>
                    {a.severity === 'critical' ? 'Urgent · ' : ''}{a.detail}</p>
                </div>
                <div className="flex gap-2">
                  {a.client?.phone && (
                    <a target="_blank" rel="noreferrer" href={wa(a.client, 'renewal')}
                      className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EA580C] px-4 py-2.5 text-base font-semibold text-white shadow-md shadow-orange-500/30 transition hover:brightness-110">Remind</a>)}
                </div>
              </li>);
          })}
        </ul>)}
    </Card>
  );
}
