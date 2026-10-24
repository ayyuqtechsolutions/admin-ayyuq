import type { Client, IncomeRecord, ExpenseRecord } from '@/types';

export interface Stats { revenue: number; profit: number; monthRevenue: number; completedPaidClients: number; }
export interface Goal {
  id: string; title: string; deadline?: string; // ISO date
  auto?: (s: Stats) => { done: boolean; progress: string; ratio: number }; // omitted = manual tick
}
export interface Phase { n: number; name: string; focus: string; goals: Goal[]; }

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const money = (target: number) => (s: Stats) => ({ done: s.revenue >= target, progress: `${inr(s.revenue)} / ${inr(target)}`, ratio: s.revenue / target });

export function computeStats(clients: Client[], income: IncomeRecord[], expenses: ExpenseRecord[]): Stats {
  const received = income;
  const revenue = received.reduce((s, i) => s + i.amount, 0);
  const spend = expenses.reduce((s, e) => s + e.amount, 0);
  const ym = new Date().toISOString().slice(0, 7);
  const monthRevenue = received.filter((i) => i.date.startsWith(ym)).reduce((s, i) => s + i.amount, 0);
  // "completed" client = client status completed + at least one payment received
  const completedPaidClients = clients.filter((c) =>
    c.status === 'completed' &&
    received.some((i) => i.clientId === c.id)).length;
  return { revenue, profit: revenue - spend, monthRevenue, completedPaidClients };
}

export const PHASES: Phase[] = [
  { n: 1, name: 'Survival & Service Cash Flow', focus: 'Sell websites, QR menus and POS to local businesses. R&D ideation only, no hardware spend.',
    goals: [
      { id: 'p1-20k', title: 'Hit ₹20,000 by Nov 2026', deadline: '2026-11-30', auto: money(20000) },
      { id: 'p1-100k', title: 'Hit ₹1,00,000 by 31 Dec 2026', deadline: '2026-12-31', auto: money(100000) },
      { id: 'p1-clients', title: 'Complete 5+ clients by 31 Dec 2026', deadline: '2026-12-31',
        auto: (s) => ({ done: s.completedPaidClients >= 5, progress: `${s.completedPaidClients} / 5 completed & paid`, ratio: s.completedPaidClients / 5 }) },
      { id: 'p1-product', title: 'Finalise hardware product and do R&D', deadline: '2026-12-31' },
    ] },
  { n: 2, name: 'Agency Scale & Capital Building', focus: 'Hire devs, focus on sales, build capital, buy first components for a bench-top PoC.',
    goals: [
      { id: 'p2-mrr', title: 'Reach ₹1.5 Lakh agency revenue in a month',
        auto: (s) => ({ done: s.monthRevenue >= 150000, progress: `${inr(s.monthRevenue)} / ${inr(150000)} this month`, ratio: s.monthRevenue / 150000 }) },
      { id: 'p2-capital', title: 'Accumulate ₹5 Lakh+ capital reserve',
        auto: (s) => ({ done: s.profit >= 500000, progress: `${inr(s.profit)} / ${inr(500000)}`, ratio: s.profit / 500000 }) },
      { id: 'p2-hire', title: 'Hire freelance / part-time devs for client builds' },
      { id: 'p2-poc', title: 'Buy ESP32/Pi, sensors, 3D printer and build bench-top PoC' },
    ] },
  { n: 3, name: 'Hardware Product R&D & Prototyping', focus: 'Build, refine and patent the product, funded by agency reserves.',
    goals: [
      { id: 'p3-pcb', title: 'Move from breadboard to custom PCB' },
      { id: 'p3-enclosure', title: 'Design enclosure for injection molding' },
      { id: 'p3-software', title: 'Build firmware, cloud backend and mobile app dashboard' },
      { id: 'p3-beta', title: 'Field-test 5–10 prototype units (internal beta)' },
      { id: 'p3-patent', title: 'File provisional patents' },
    ] },
  { n: 4, name: 'Market Blitz, Validation & Distribution', focus: 'Launch, pilot sales, proof, and regulatory certification.',
    goals: [
      { id: 'p4-launch', title: 'Launch: Product Hunt, YouTube reviews, LinkedIn, trade shows' },
      { id: 'p4-ship', title: 'Ship first 100–1,000 units to early adopters / pilots' },
      { id: 'p4-proof', title: 'Capture case studies, testimonials and ROI metrics' },
      { id: 'p4-cert', title: 'Secure CE, FCC and BIS certifications' },
      { id: 'p4-1000', title: 'Prove demand: 1,000 units sold + multi-region waitlist' },
    ] },
  { n: 5, name: 'Mass Scale & Dual-Engine Conglomerate', focus: 'Hardware giant (Engine A) plus permanent agency division (Engine B).',
    goals: [
      { id: 'p5-mfg', title: 'Mass manufacturing and global supply chain' },
      { id: 'p5-saas', title: 'Launch hardware + subscription/SaaS revenue' },
      { id: 'p5-md', title: 'Appoint Managing Director / Lead Dev for the Agency division' },
      { id: 'p5-global', title: 'Ship across North America, Europe and Asia' },
    ] },
];
