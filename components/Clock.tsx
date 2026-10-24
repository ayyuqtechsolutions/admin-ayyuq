'use client';
import { useEffect, useState } from 'react';

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="rounded-2xl bg-white/10 px-6 py-4 text-right backdrop-blur">
      <p className="text-4xl font-extrabold tabular-nums tracking-tight">{now.toLocaleTimeString('en-IN')}</p>
      <p className="mt-1 text-base text-white/80">
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}
