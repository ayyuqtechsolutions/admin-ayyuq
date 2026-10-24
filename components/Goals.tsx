'use client';
import { useEffect, useMemo } from 'react';
import { Target } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { computeStats, PHASES } from '@/lib/goals';
import { OLIVE, ORANGE, day } from './ui';

export default function Goals() {
  const { clients, income, expenses, settings, updateSettings, ready } = useData();
  const stats = useMemo(() => computeStats(clients, income, expenses), [clients, income, expenses]);
  const phase = PHASES.find((p) => p.n === settings.phase) ?? PHASES[0];

  const rows = phase.goals.map((g) => {
    const r = g.auto?.(stats);
    const recorded = settings.achieved[g.id];
    return { g, done: Boolean(recorded) || Boolean(r?.done), progress: r?.progress, ratio: r?.ratio, when: recorded };
  });
  const allDone = rows.every((r) => r.done);
  const doneCount = rows.filter((r) => r.done).length;

  // 1) record auto goals the moment they are reached (stays ticked even if data changes later)
  useEffect(() => {
    if (!ready) return;
    const fresh = rows.filter((r) => r.g.auto && r.done && !r.when);
    if (fresh.length) {
      const stamp = new Date().toISOString();
      updateSettings((s) => ({ ...s, achieved: { ...s.achieved, ...Object.fromEntries(fresh.map((r) => [r.g.id, stamp])) } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stats, settings.phase, settings.achieved]);

  // 2) all goals ticked -> advance to the next phase
  useEffect(() => {
    if (ready && allDone && settings.phase < PHASES.length) updateSettings((s) => ({ ...s, phase: s.phase + 1 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, allDone, settings.phase]);

  const toggle = (id: string) => updateSettings((s) => {
    const achieved = { ...s.achieved };
    if (achieved[id]) delete achieved[id]; else achieved[id] = new Date().toISOString();
    return { ...s, achieved };
  });

  return (
    <section className="card fade-up h-full p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg,${OLIVE},#6B8434)` }}><Target size={24} /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: OLIVE }}>Goals</h2>
            <p className="text-sm text-gray-500">Phase {phase.n}: {phase.name} · {doneCount}/{rows.length} done</p>
          </div>
        </div>
        <div className="flex gap-1.5" aria-label="Phase progress">
          {PHASES.map((p) => (
            <span key={p.n} className="chip-idle rounded-full px-3 py-1 text-sm font-semibold"
              style={p.n === phase.n ? { background: ORANGE, color: '#fff' }
                : p.n < phase.n ? { background: OLIVE, color: '#fff' } : {}}>P{p.n}</span>))}
        </div>
      </div>
      <p className="mb-4 text-base text-gray-600">{phase.focus}</p>
      <ul className="space-y-3">
        {rows.map(({ g, done, progress, ratio, when }) => {
          const overdue = !done && g.deadline && new Date(g.deadline + 'T23:59:59') < new Date();
          const pct = done ? 100 : Math.max(0, Math.min(100, (ratio ?? 0) * 100));
          return (
            <li key={g.id} className="flex items-start gap-4 rounded-2xl border border-[#E4EBD0] bg-white p-4 transition hover:shadow-md">
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[#4A5D23]" checked={done}
                disabled={Boolean(g.auto)} onChange={() => toggle(g.id)}
                title={g.auto ? 'Ticks automatically from your income and client records' : 'Tick manually when done'} />
              <div className="min-w-0 flex-1">
                <p className={`text-lg font-semibold ${done ? 'text-gray-400 line-through' : ''}`}>{g.title}</p>
                {g.auto && (
                  <div className="my-2 h-2.5 overflow-hidden rounded-full bg-[#EAF0D8]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: done ? OLIVE : `linear-gradient(90deg,${OLIVE},${ORANGE})` }} />
                  </div>)}
                <p className="text-sm text-gray-500">
                  {progress && <span className="font-medium text-gray-700">{progress}</span>}
                  {g.deadline && <span>{progress ? ' · ' : ''}Due {day(g.deadline)}</span>}
                  {when && <span> · Achieved {day(when)}</span>}
                  {overdue && <span className="ml-1 font-semibold text-[#EA580C]"> · Overdue</span>}
                </p>
              </div>
            </li>);
        })}
      </ul>
    </section>
  );
}
