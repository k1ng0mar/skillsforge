# SkillForge

AI-powered custom curriculum generator with spaced repetition learning.

### Features

- **AI Curriculum Generation** — Describe what you want to learn, get a custom curriculum with modules and lessons
- **Multi-Model AI Routing** — Curriculum/exams use Llama 3.3 via Groq; lessons use Hy3 via OpenRouter for deep conceptual content; Codestral for code/programming topics automatically
- **Three Depth Levels** — Crash Course (lean overview), Standard (thorough), Mastery (university-level: 8-12 modules, 5 sections × 300+ words, derivations, multi-tier examples, no stone left unturned)
- **AI Tutor Mode** — Ask questions about any lesson in a live chat; Hy3 uses the full lesson + curriculum context to answer
- **Skill Tree** — Visual neural pathway showing your learning progress
- **Lesson Regeneration** — Regenerate any lesson with custom instructions directly from the Skill Tree; completed lessons are unaffected
- **Spaced Repetition (SM-2)** — Flashcard arena that adapts review intervals based on your ratings
- **Multiple Journeys** — Track several learning paths at once; switch between them from Journey or Skill Tree views
- **Delete Journeys** — Remove any journey directly from the switcher pills
- **Final Exams** — Comprehensive curriculum-wide exam unlocked when all lessons are completed
- **Badges & Rewards** — 11 achievements that auto-unlock as you hit milestones (lessons, streaks, XP, etc.)
- **Streak System** — Daily streak with reset on missed days
- **Cloud Sync** — Sign in to sync all progress across devices (Clerk auth + Neon Postgres) — **optional, app works fully without it**
- **Offline-First PWA** — Install on mobile/desktop, works offline after first load
- **Safe Area Support** — Notch and status-bar aware padding on mobile devices
- **Data Persistence** — All progress, lessons, and settings saved to localStorage (synced to cloud when signed in)
- **Export/Import** — Backup and restore all data as JSON

### Setup

```bash
npm install
```

### Running

```bash
# Development (frontend only — AI proxy not needed for local dev)
npm run dev

# Backend AI proxy (required for curriculum generation locally)
npm run server

# Both together
npm start
```

### Environment

Create `.env.local` with your API keys. Cloud sync is optional — the app works fully without these:

```
# AI Providers (required for curriculum generation)
GROQ_API_KEY=your_groq_key_here
OPENROUTER_API_KEY=your_openrouter_key_here

# Cloud sync (optional — app works without these)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...       # Optional
CLERK_JWKS_URL=https://your-clerk-project.clerk.accounts.dev/.well-known/jwks.json  # Optional
CLERK_SECRET_KEY=sk_test_...                # Optional
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require  # Optional
```

- **Groq** for curriculum/exams: [console.groq.com](https://console.groq.com) (free tier, llama-3.3-70b-versatile)
- **OpenRouter** for lessons & tutor (Hy3) and code lessons (Codestral): [openrouter.ai](https://openrouter.ai) (free tier)

### Cloud Sync Setup (Optional)

Without Clerk + Neon, the app works fully offline using localStorage. To enable cross-device sync:

**1. Clerk — Authentication**

1. Go to [clerk.com](https://clerk.com) and create a new application (choose any sign-in method)
2. Go to your Clerk dashboard → **API Keys** → copy your **Publishable Key** → add as `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` and Vercel env vars
3. Construct your JWKS URL: `https://{your-clerk-slug}.clerk.accounts.dev/.well-known/jwks.json` → add as `CLERK_JWKS_URL`
4. In Clerk dashboard → **API Keys** → copy your **Secret Key** → add as `CLERK_SECRET_KEY` in `.env.local` and Vercel env vars (never prefix with `VITE_`)

**2. Neon — Database**

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Copy your **Connection string** → add as `DATABASE_URL` in `.env.local` and Vercel env vars
3. In Neon SQL Editor, run the migration from `migrations/001_create_user_data.sql`

**3. Sync Flow**

- Sign in via the **Sign In** button in the top bar
- Data syncs automatically after every action (optimistic local writes — app never blocks on sync)
- On sign-in, cloud data overwrites local if the cloud is newer
- The sync status icon shows: spinning (syncing) / checkmark (synced) / error (failed)

### Production Build

```bash
npm run build
```

The `dist/` folder contains a fully offline-capable PWA.

### Deploy to Vercel

```bash
# Push to a Vercel-connected git repo
```

Add these environment variables in **Vercel → Project → Settings → Environment Variables**:

| Name | Required | Notes |
|------|---------|-------|
| `GROQ_API_KEY` | Yes | Groq API key |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `VITE_CLERK_PUBLISHABLE_KEY` | No | Clerk publishable key (enables sign-in) |
| `CLERK_JWKS_URL` | No | Clerk JWKS URL |
| `CLERK_SECRET_KEY` | No | Clerk secret key |
| `DATABASE_URL` | No | Neon connection string |

The project includes:
- `api/ai.mjs` — Serverless AI proxy (multi-provider model routing)
- `api/sync/route.js` — Cloud sync endpoint (Clerk JWT verify + Neon upsert)
- `vercel.json` — Vite build config

### AI Model Routing

| Task | Model | Provider |
|------|-------|----------|
| Curriculum + Exams | `groq/llama-3.3-70b-versatile` | Groq (fast, good structure) |
| General Lessons + Tutor | `tencent/hy3-preview` | OpenRouter |
| Code/Programming Lessons | `mistral/codestral-2501` | OpenRouter |

### Data

All data lives in `localStorage` and syncs to Neon Postgres when signed in:

- `sf_journeys` — Curriculum and metadata (including scope level per journey)
- `sf_progress` — XP, completed lessons, streaks per journey
- `sf_memory` — SM-2 flashcard data and history
- `sf_lessons` — Cached generated lessons (regenerated lessons overwrite originals)
- `sf_badges` — Earned achievement badges
- `sf_dark` — Theme preference

Use the **Export** button on the Journey tab to backup everything as JSON.
