# admin-ayyuq
1. `npm install`
2. `npm run dev` (starts empty; until `.env.local` Firebase keys are filled, data is saved in this browser's localStorage)
3. Fill `.env.local` with your Firebase web-app keys and restart `npm run dev`.
4. Login uses Firebase Auth (Email/Password) and has no sign-up screen. Add your user by hand in Firebase Console > Authentication > Users, and turn off self sign-up (Authentication > Settings > User actions > uncheck "Enable create (sign-up)").
5. Lock Firestore to your account only (see rules below). Collections: `clients`, `projects` (Projects page), `income`, `expenses`, `notes` (R&D page), `settings/main`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.email == 'YOUR_EMAIL_HERE';
    }
  }
}
```

AyyuqAI (`/ayyuqai`) calls Gemini through a server route (`app/api/ayyuqai`). Put `GEMINI_API_KEY` in `.env.local` and in your Vercel environment variables (never with a `NEXT_PUBLIC_` prefix). Optional: `GEMINI_MODEL`.

Features: login, active projects with checklist progress, income/expense linked to projects, R&D research notes with full-text search, dashboard with goals/phases (`lib/goals.ts`), alerts for pending payments and domain/hosting expiry (`lib/alerts.ts`),
dark mode, Ctrl+K quick search, CSV export, JSON backup/restore (Settings), WhatsApp reminders, voice assistant.
Voice assistant answers are rule-based; replace `answer()` in components/VoiceAssistant.tsx with an LLM call if wanted.
