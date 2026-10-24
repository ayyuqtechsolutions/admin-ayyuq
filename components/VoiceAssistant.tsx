'use client';
import { useState } from 'react';
import { Mic } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { inr } from './ui';

// Rule-based answers from local data. Swap `answer()` for an OpenAI/Gemini call to use an LLM.
export default function VoiceAssistant() {
  const { clients, income, expenses } = useData();
  const [text, setText] = useState('Tap the mic and ask about revenue, profit, expenses or clients.');
  const answer = (q: string) => {
    q = q.toLowerCase();
    const rev = income.reduce((s, i) => s + i.amount, 0);
    const exp = expenses.reduce((s, e) => s + e.amount, 0);
    if (q.includes('profit')) return `Net profit is ${inr(rev - exp)}.`;
    if (q.includes('revenue') || q.includes('income')) return `Gross revenue is ${inr(rev)}.`;
    if (q.includes('expense')) return `Total expenses are ${inr(exp)}.`;
    if (q.includes('client')) return `You have ${clients.filter((c) => c.status === 'active').length} active clients.`;
    return "Sorry, I can answer about revenue, profit, expenses and clients.";
  };
  const listen = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return setText('Voice input is not supported in this browser.');
    const r = new SR(); r.lang = 'en-IN';
    r.onresult = (e: any) => {
      const a = answer(e.results[0][0].transcript); setText(a);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(a));
    };
    r.start();
  };
  return (
    <div className="fixed bottom-4 right-4 z-30 flex max-w-sm items-end gap-2">
      <p className="card px-4 py-3 text-sm">{text}</p>
      <button onClick={listen} aria-label="Voice assistant" className="rounded-full bg-gradient-to-br from-[#FF5722] to-[#EA580C] p-4 text-white shadow-lg shadow-orange-500/40 transition hover:scale-110"><Mic size={24} /></button>
    </div>
  );
}
