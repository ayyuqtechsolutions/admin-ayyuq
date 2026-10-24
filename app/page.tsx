'use client';
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, LabelList, AreaChart, Area } from 'recharts';
import { Wallet, TrendingDown, PiggyBank, Repeat, Users, ArrowDownLeft, ArrowUpRight, Target } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { PHASES } from '@/lib/goals';
import Clock from '@/components/Clock';
import Goals from '@/components/Goals';
import Alerts from '@/components/Alerts';
import { useTheme } from '@/context/ThemeContext';
import { Card, inr, day, OLIVE, ORANGE } from '@/components/ui';

const PALETTE = ['#4A5D23', '#EA580C', '#8FA85A', '#F59E0B', '#14532D', '#9CA3AF'];
const TIP_COLORS: Record<string, string> = { Income: OLIVE, Expenses: ORANGE, 'Net (cumulative)': '#6B7280' };
const compact = (n: number) => Math.abs(n) >= 100000 ? (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L'
  : Math.abs(n) >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
type Range = 'all' | 'ytd' | '90' | '30';
const RANGES: [Range, string][] = [['all', 'All time'], ['ytd', 'This year'], ['90', '90 days'], ['30', '30 days']];

const Tip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="rounded-2xl border border-[#E4EBD0] bg-white px-4 py-3 text-sm shadow-xl">
    {label && <p className="mb-1.5 font-bold">{label}</p>}
    {payload.map((p: any) => (
      <p key={p.dataKey ?? p.name} className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIP_COLORS[p.name] ?? p.payload?.fill ?? p.color }} />
        {p.name}: <b>{inr(p.value)}</b></p>))}
  </div>) : null;

const Empty = ({ text }: { text: string }) => (
  <div className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-[#DDE5C8] p-6 text-center text-gray-400">{text}</div>);

function Spark({ data, k, color, id }: { data: any[]; k: string; color: string; id: string }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Area type="monotone" dataKey={k} stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>);
}

export default function Dashboard() {
  const { clients, income: incomeAll, expenses: expensesAll, settings, isMock } = useData();
  const { dark } = useTheme();
  const [range, setRange] = useState<Range>('all');
  const ink = dark ? '#E8ECDD' : '#111827', gridC = dark ? '#2B3A1A' : '#E4EBD0';
  const axisTick = { fill: dark ? '#9AA68A' : '#6B7280', fontSize: 13 };
  const inRange = (d: string) => {
    if (range === 'all') return true;
    const t = new Date(d), now = new Date();
    return range === 'ytd' ? t.getFullYear() === now.getFullYear() : +now - +t <= Number(range) * 86400000;
  };
  const income = useMemo(() => incomeAll.filter((i) => inRange(i.date)), [incomeAll, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const expenses = useMemo(() => expensesAll.filter((e) => inRange(e.date)), [expensesAll, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const [greet, setGreet] = useState('Welcome back');
  useEffect(() => { const h = new Date().getHours(); setGreet(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'); }, []);
  const phase = PHASES.find((p) => p.n === settings.phase) ?? PHASES[0];

  const m = useMemo(() => {
    const received = income;
    const revenue = received.reduce((s, i) => s + i.amount, 0);
    const spend = expenses.reduce((s, e) => s + e.amount, 0);
    const active = clients.filter((c) => c.status === 'active');
    const by: Record<string, { ym: string; income: number; expenses: number }> = {};
    const ensure = (d: string) => (by[d.slice(0, 7)] ??= { ym: d.slice(0, 7), income: 0, expenses: 0 });
    received.forEach((i) => (ensure(i.date).income += i.amount));
    expenses.forEach((e) => (ensure(e.date).expenses += e.amount));
    let cum = 0;
    const flow = Object.values(by).sort((a, b) => a.ym.localeCompare(b.ym)).map((r) => {
      cum += r.income - r.expenses;
      return { ...r, net: r.income - r.expenses, cumulative: cum,
        month: new Date(r.ym + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }) };
    });
    const svc: Record<string, number> = {};
    received.forEach((i) => {
      const c = clients.find((x) => x.id === i.clientId);
      const label = i.paymentType === 'retainer' ? 'Retainers' : c?.servicesTaken[0] ?? 'Other';
      svc[label] = (svc[label] ?? 0) + i.amount;
    });
    const cat: Record<string, number> = {}; expenses.forEach((e) => (cat[e.category] = (cat[e.category] ?? 0) + e.amount));
    const cl: Record<string, number> = {}; received.forEach((i) => (cl[i.clientName] = (cl[i.clientName] ?? 0) + i.amount));
    const feed = [
      ...income.map((i) => ({ id: i.id, t: i.clientName, sub: pretty(i.paymentType), amt: i.amount, date: i.date, in: true })),
      ...expenses.map((e) => ({ id: e.id, t: e.title, sub: pretty(e.category), amt: e.amount, date: e.date, in: false })),
    ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);
    return { revenue, spend, profit: revenue - spend, mrr: active.reduce((s, c) => s + c.retainerAmountMonthly, 0), activeCount: active.length, flow, feed,
      svc: Object.entries(svc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      cats: Object.entries(cat).map(([k, value]) => ({ name: pretty(k), value })).sort((a, b) => b.value - a.value),
      top: Object.entries(cl).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5) };
  }, [clients, income, expenses]);

  const delta = (k: 'income' | 'expenses' | 'net') => {
    const f = m.flow; if (f.length < 2) return null;
    const a = f[f.length - 1][k], b = f[f.length - 2][k];
    return b ? ((a - b) / Math.abs(b)) * 100 : null;
  };
  const kpis = [
    { label: 'Gross Revenue', value: inr(m.revenue), Icon: Wallet, color: OLIVE, spark: 'income', d: delta('income'), goodUp: true },
    { label: 'Operational Expenses', value: inr(m.spend), Icon: TrendingDown, color: ORANGE, spark: 'expenses', d: delta('expenses'), goodUp: false },
    { label: 'Net Profit', value: inr(m.profit), Icon: PiggyBank, color: '#14532D', spark: 'cumulative', d: delta('net'), goodUp: true },
    { label: 'MRR', value: inr(m.mrr), Icon: Repeat, color: '#F59E0B' },
    { label: 'Active Clients', value: String(m.activeCount), Icon: Users, color: '#8FA85A' },
  ];

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
      <section className="fade-up relative overflow-hidden rounded-3xl p-6 text-white md:p-9"
        style={{ background: 'linear-gradient(120deg,#2A3513 0%,#4A5D23 55%,#6B8434 100%)' }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#FF5722]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.25em] text-white/70">{greet}</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight md:text-5xl">Ayyuq Tech Solutions</h1>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base backdrop-blur">
              <Target size={18} /> Phase {phase.n} · {phase.name}</span>
          </div>
          <Clock />
        </div>
      </section>
      {isMock && <p className="text-sm text-gray-500">Firebase not connected: your data is saved in this browser only.</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Overview</h2>
        <div className="inline-flex rounded-2xl border border-[#DDE5C8] bg-white p-1">
          {RANGES.map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === k ? 'bg-gradient-to-r from-[#4A5D23] to-[#6B8434] text-white shadow' : 'text-gray-600 hover:bg-[#F3F6E8]'}`}>{l}</button>))}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k, i) => {
          const good = k.d != null && (k.d >= 0) === k.goodUp;
          return (
            <div key={k.label} className="card fade-up p-5" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">{k.label}</p>
                  <p className="mt-1 truncate text-3xl font-extrabold tracking-tight" style={{ color: k.color }}>{k.value}</p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg,${k.color},${k.color}bb)` }}><k.Icon size={24} /></span>
              </div>
              {k.d != null && (
                <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${good ? 'chip-good' : 'chip-bad'}`}>
                  {k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d).toFixed(0)}% vs last month</span>)}
              {k.spark && m.flow.length > 1 && <div className="-mx-2 mt-2"><Spark data={m.flow} k={k.spark} color={k.color} id={`sp${i}`} /></div>}
            </div>);
        })}
      </section>

      <Alerts />

      <section className="grid gap-6 xl:grid-cols-3">
        <Card title="Cash Flow" sub="Monthly income vs expenses with cumulative net profit" className="xl:col-span-2">
          <div className="h-96">
            {m.flow.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={m.flow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C9A3C" /><stop offset="100%" stopColor="#4A5D23" /></linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF8A5B" /><stop offset="100%" stopColor="#EA580C" /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 7" vertical={false} stroke={gridC} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={compact} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(74,93,35,.06)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 14, paddingTop: 8 }} />
                  <Bar dataKey="income" name="Income" fill="url(#gInc)" radius={[10, 10, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="expenses" name="Expenses" fill="url(#gExp)" radius={[10, 10, 0, 0]} maxBarSize={38} />
                  <Line type="monotone" dataKey="cumulative" name="Net (cumulative)" stroke={ink} strokeWidth={3}
                    dot={{ r: 5, fill: dark ? '#172010' : '#fff', stroke: ink, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ResponsiveContainer>) : <Empty text="Add your first income or expense to see cash flow." />}
          </div>
        </Card>
        <Card title="Service Breakdown" sub="Where your revenue comes from">
          <div className="relative h-64">
            {m.svc.length ? (<>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={m.svc} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="94%" paddingAngle={4} cornerRadius={8} stroke="none">
                  {m.svc.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie>
                  <Tooltip content={<Tip />} /></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><p className="text-sm text-gray-500">Total earned</p><p className="text-2xl font-extrabold">{inr(m.revenue)}</p></div></div>
            </>) : <Empty text="No received income yet." />}
          </div>
          <ul className="mt-5 space-y-2.5">
            {m.svc.map((s, i) => (
              <li key={s.name} className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2.5"><span className="h-3.5 w-3.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{s.name}</span>
                <span className="font-bold">{Math.round((s.value / m.revenue) * 100)}%</span></li>))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><Goals /></div>
        <Card title="Recent Transactions" sub="Latest income and expense entries">
          {m.feed.length ? (
            <ul className="space-y-3">
              {m.feed.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[#F6F8EE]">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${f.in ? 'icon-in' : 'icon-out'}`}>
                    {f.in ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold">{f.t}</p>
                    <p className="text-sm text-gray-500">{f.sub} · {day(f.date)}</p></div>
                  <span className="text-base font-bold" style={{ color: f.in ? OLIVE : ORANGE }}>{f.in ? '+' : '−'}{inr(f.amt)}</span>
                </li>))}
            </ul>) : <Empty text="No transactions yet." />}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Expenses by Category" sub="Where the money goes">
          <div style={{ height: Math.max(240, m.cats.length * 56) }}>
            {m.cats.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.cats} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ ...axisTick, fontSize: 14 }} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(234,88,12,.06)' }} />
                  <Bar dataKey="value" name="Spent" radius={[0, 12, 12, 0]} barSize={26}>
                    {m.cats.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    <LabelList dataKey="value" position="right" formatter={(v: any) => '₹' + compact(Number(v))} style={{ fill: ink, fontWeight: 700, fontSize: 13 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>) : <Empty text="No expenses logged yet." />}
          </div>
        </Card>
        <Card title="Top Clients" sub="Ranked by received revenue">
          {m.top.length ? (
            <ul className="space-y-5">
              {m.top.map((c, i) => (
                <li key={c.name}>
                  <div className="mb-1.5 flex justify-between text-base"><span className="font-semibold">{i + 1}. {c.name}</span><span className="font-bold">{inr(c.value)}</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#EAF0D8]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(c.value / m.top[0].value) * 100}%`, background: 'linear-gradient(90deg,#4A5D23,#EA580C)' }} /></div>
                </li>))}
            </ul>) : <Empty text="Client revenue will appear here." />}
        </Card>
      </section>
    </main>
  );
}
