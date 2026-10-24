import { NextRequest, NextResponse } from 'next/server';

// Runs on the server only: GEMINI_API_KEY never reaches the browser.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const MAX_MESSAGES = 20, MAX_TEXT = 4000, MAX_CONTEXT = 100_000;

type Msg = { role: 'user' | 'model'; text: string };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

// Only a signed-in user of your Firebase project may use the AI (checks the Firebase ID token).
async function isSignedIn(idToken: string) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key || !idToken) return false;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
    if (!r.ok) return false;
    const j = await r.json();
    return Boolean(j.users?.[0]?.localId) && !j.users[0].disabled;
  } catch { return false; }
}

const systemPrompt = (now: string, hasData: boolean, context: string) => [
  'You are AyyuqAI, the built-in assistant inside "Ayyuq Admin", the internal dashboard of Ayyuq Tech Solutions, a small web and digital services agency in India.',
  'Be concise, practical and friendly. Amounts are Indian rupees (₹). Use short markdown (bold, bullet lists, small tables) only when it helps.',
  'For writing tasks (WhatsApp messages, emails, proposals, copy, ideas) produce text that is ready to send. For web development questions, give working code.',
  `Current date and time: ${now}.`,
  hasData
    ? 'BUSINESS DATA (JSON) is below. For any question about clients, projects, income, expenses or deadlines, use only this data. The "totals" block and the per-client and per-project figures are already computed, so trust them instead of recalculating. If the answer is not in the data, say so instead of guessing.\n' + context
    : 'No business data was shared in this chat, so if asked about specific clients, projects or money, tell the user to turn on "Use my business data".',
].join('\n');

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(500, 'GEMINI_API_KEY is not set on the server. Add it to .env.local (and to your Vercel environment variables), then restart or redeploy.');

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!(await isSignedIn(token))) return fail(401, 'Your session has expired. Please sign out and sign in again.');

  let body: { messages?: Msg[]; context?: string; now?: string };
  try { body = await req.json(); } catch { return fail(400, 'Invalid request.'); }

  const msgs = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_MESSAGES).map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TEXT) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return fail(400, 'Send a message first.');

  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT) : '';
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt(String(body.now ?? new Date().toISOString()).slice(0, 80), Boolean(context), context) }] },
    contents: msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
  };

  const call = () => fetch(`${BASE}/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(55_000),
  });

  try {
    let r = await call();
    if (r.status === 503 || r.status === 429) { await new Promise((ok) => setTimeout(ok, 1200)); r = await call(); }
    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg = String(j?.error?.message ?? '').slice(0, 300);
      const reason = j?.error?.details?.find?.((d: any) => d?.reason)?.reason;
      if (r.status === 429) return fail(429, 'Gemini is rate limited or out of quota right now. Wait a minute and try again.');
      if (r.status === 404) return fail(502, `Gemini says the model "${MODEL}" was not found. Set GEMINI_MODEL in your environment variables to a current model name. (${msg})`);
      if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(msg)))
        return fail(502, `Gemini rejected the API key (${r.status}${reason ? ' ' + reason : ''}). ${msg}`);
      return fail(502, `Gemini error ${r.status}. ${msg}`);
    }

    const cand = j?.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p: any) => typeof p?.text === 'string' && !p.thought).map((p: any) => p.text).join('').trim();
    if (!text) {
      const why = j?.promptFeedback?.blockReason ?? cand?.finishReason;
      return fail(502, why ? `Gemini returned no answer (${why}). Try rephrasing your question.` : 'Gemini returned an empty answer. Try again.');
    }
    return NextResponse.json({ text, truncated: cand?.finishReason === 'MAX_TOKENS' });
  } catch (e: any) {
    return fail(504, e?.name === 'TimeoutError' ? 'Gemini took too long to answer. Try a shorter question.' : 'Could not reach Gemini. Check your internet connection and try again.');
  }
}
