import type { Client, ExpenseRecord, IncomeRecord, Project } from '@/types';

// Builds a compact snapshot of the business for the AI. Contact details (phone, email, address)
// are deliberately left out. Totals are precomputed because language models are unreliable at adding long lists.
const pad = (n: number) => String(n).padStart(2, '0');
const daysFrom = (iso: string | undefined, now: Date) => (iso ? Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000) : undefined);
const sum = (a: { amount: number }[]) => a.reduce((s, r) => s + (Number(r.amount) || 0), 0);

export function buildContext(
  data: { clients: Client[]; projects: Project[]; income: IncomeRecord[]; expenses: ExpenseRecord[] },
  now = new Date(),
) {
  const { clients, projects, income, expenses } = data;
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const pName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const cName = (id?: string) => clients.find((c) => c.id === id)?.businessName;
  const byDateDesc = <T extends { date: string }>(a: T[]) => [...a].sort((x, y) => +new Date(y.date) - +new Date(x.date));

  const received = income;
  const monthIn = sum(received.filter((i) => i.date.startsWith(ym)));
  const monthOut = sum(expenses.filter((e) => e.date.startsWith(ym)));

  const clientRows = clients.map((c) => ({
    name: c.businessName, owner: c.ownerName, status: c.status, contract: c.contractType, services: c.servicesTaken,
    oneTimeFee: c.oneTimeFee, monthlyRetainer: c.retainerAmountMonthly,
    domain: c.domainName || undefined, domainExpiresInDays: daysFrom(c.domainExpiryDate, now),
    hosting: c.hostingProvider || undefined, hostingExpiresInDays: daysFrom(c.hostingExpiryDate, now),
    received: sum(received.filter((i) => i.clientId === c.id)),
    expenses: sum(expenses.filter((e) => e.clientId === c.id)),
  }));

  const projectRows = projects.map((p) => {
    const list = p.checklist ?? []; const done = list.filter((i) => i.done).length;
    const rec = sum(received.filter((i) => i.projectId === p.id));
    return {
      name: p.name, client: cName(p.clientId) ?? p.clientName, service: p.service, status: p.status,
      deadline: p.deadline, daysLeft: daysFrom(p.deadline, now), percentDone: list.length ? Math.round((done / list.length) * 100) : 0,
      tasksDone: done, tasksTotal: list.length, openTasks: list.filter((i) => !i.done).slice(0, 12).map((i) => i.text),
      estimatedWorkHours: p.estimatedHours || undefined,
      budget: p.budget, received: rec,
      balanceDue: Math.max(p.budget - rec, 0), expenses: sum(expenses.filter((e) => e.projectId === p.id)),
    };
  });

  for (const limit of [120, 60, 25]) {
    const out = JSON.stringify({
      today: now.toISOString().slice(0, 10),
      currency: 'INR',
      totals: {
        incomeReceived: sum(received), expensesAll: sum(expenses),
        profitAllTime: sum(received) - sum(expenses),
        thisMonth: { month: ym, incomeReceived: monthIn, expenses: monthOut, profit: monthIn - monthOut },
        activeProjects: projects.filter((p) => p.status === 'active').length,
      },
      clients: clientRows,
      projects: projectRows,
      recentIncome: byDateDesc(income).slice(0, limit).map((i) => ({ date: i.date.slice(0, 10), client: i.clientName, project: pName(i.projectId), amount: i.amount, type: i.paymentType, method: i.paymentMethod })),
      recentExpenses: byDateDesc(expenses).slice(0, limit).map((e) => ({ date: e.date.slice(0, 10), title: e.title, category: e.category, vendor: e.vendorName, client: cName(e.clientId), project: pName(e.projectId), amount: e.amount })),
    });
    if (out.length < 90000) return out;
  }
  return '{}';
}
