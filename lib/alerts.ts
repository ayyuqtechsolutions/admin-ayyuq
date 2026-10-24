import type { Client, IncomeRecord } from '@/types';

export interface Alert {
  id: string; kind: 'domain' | 'hosting'; severity: 'critical' | 'warning';
  title: string; detail: string; client?: Client; days: number;
}
const DAY = 86400000;
const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export function computeAlerts(clients: Client[], _income: IncomeRecord[] = [], now = new Date()): Alert[] {
  const out: Alert[] = [];
  clients.filter((c) => c.status !== 'cancelled').forEach((c) => {
    ([['domain', c.domainName, c.domainExpiryDate], ['hosting', c.hostingProvider, c.hostingExpiryDate]] as const).forEach(([kind, label, exp]) => {
      if (!exp) return;
      const left = Math.ceil((+new Date(exp) - +now) / DAY);
      if (left > 30) return;
      out.push({ id: `${kind}-${c.id}`, kind, severity: left <= 7 ? 'critical' : 'warning',
        title: `${kind === 'domain' ? 'Domain' : 'Hosting'}${label ? ' ' + label : ''} ${left < 0 ? 'has expired' : 'expires soon'} · ${c.businessName}`,
        detail: left < 0 ? `Expired ${plural(-left)} ago` : left === 0 ? 'Expires today' : `Expires in ${plural(left)}`, client: c, days: left });
    });
  });
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1) || a.days - b.days);
}
