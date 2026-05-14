# SkillForge

AI-powered custom curriculum generator with spaced repetition learning.

### Features

- **AI Curriculum Generation** — Describe what you want to learn, get a custom curriculum with modules and lessons
- **Multi-Model AI Routing** — Curriculum uses DeepSeek via direct API; lessons, code, and exams use Qwen-Max via DashScope (Alibaba) — both produce high-quality, detailed content with theoretical, practical, and real-world examples
- **Three Depth Levels** — Crash Course (lean overview), Standard (thorough), Mastery (university-level: 8-12 modules, 5 sections × 300+ words, derivations, multi-tier examples, no stone left unturned)
- **AI Tutor Mode** — Ask questions about any lesson in a live chat; uses the full lesson + curriculum context to answer
- **Skill Tree** — Visual neural pathway showing your learning progress
- **Lesson Regeneration** — Regenerate any lesson with custom instructions directly from the Skill Tree; completed lessons are unaffected
- **Spaced Repetition (SM-2)** — Flashcard arena that adapts review intervals based on your ratings
- **Multiple Journeys** — Track several learning paths at once; switch between them from Journey or Skill Tree views
- **Delete Journeys** — Remove any journey directly from the switcher pills
- **Final Exams** — Comprehensive curriculum-wide exam unlocked when all lessons are completed
- **Badges & Rewards** — 11 achievements that auto-unlock as you hit milestones (lessons, streaks, XP, etc.)
- **Streak System** — Daily streak with reset on missed days
- **Supabase Authentication** — Email/password sign up and login to sync your progress across devices
- **Guest Mode** — Continue without an account; all data stored locally with option to sign in later
- **Supabase Database** — All progress, lessons, and settings saved to Supabase when logged in
- **Modern Auth UI** — Clean design with gradient accents and smooth animations
- **Offline-First PWA** — Install on mobile/desktop, works offline after first load
- **Safe Area Support** — Notch and status-bar aware padding on mobile devices
- **Data Persistence** — LocalStorage fallback for guest users; Supabase sync for authenticated users
- **Export/Import** — Backup and restore all data as JSON
- **Fixed UI Elements** — "Complete lesson" button now stays fixed at the bottom of the viewport

### Project Structure

```
src/
├── components/
│   └── AuthView.jsx      # Auth UI (login, signup, guest mode)
├── hooks/
│   └── useAuth.js         # Supabase auth hook
├── constants.js           # Shared constants (fonts)
├── supabase.js            # Supabase client configuration
├── App.jsx                # Main application component
└── index.jsx              # React entry point
```

### Setup

```bash
npm install
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Go to **SQL Editor** and run this to create the users table with RLS policies:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  journeys JSONB DEFAULT '[]',
  active_journey_id TEXT,
  progress JSONB DEFAULT '{}',
  memory JSONB DEFAULT '{"cards":[],"history":[]}',
  lessons JSONB DEFAULT '{}',
  badges JSONB DEFAULT '[]',
  dark BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can READ their own row
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Policy 2: Users can INSERT their own row (needed for upsert on first login)
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Policy 3: Users can UPDATE their own row
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Policy 4: Users can DELETE their own row
CREATE POLICY "Users can delete own data" ON users
  FOR DELETE USING (auth.uid()::text = id);
```

> **Why separate policies?** The original `FOR ALL` with `USING` did not cover `INSERT` operations. `upsert()` internally performs an `INSERT` when the row doesn't exist yet, which requires a `WITH CHECK` policy. Without it, new logins get a 401/permission error.

4. Get your credentials from **Settings → API**
5. Update your `.env` file with your Supabase URL and anon key (see Environment section below)

### Running

```bash
# Development (frontend only)
npm run dev

# Backend AI proxy (required for curriculum generation)
npm run server

# Both together
npm start
```

### Environment

Create a `.env` file with your API keys:

```
# DashScope (Alibaba Model Studio) — one key for everything
DASHSCOPE_API_KEY=your_dashscope_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- **DashScope** — get your key at [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com)
  - `qwen-max` for lessons, code, and exams (highest-quality reasoning)
  - `deepseek-v3` for curriculum generation (strong structural output)
- **Supabase** for auth and database: [supabase.com](https://supabase.com) (free tier)

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

| Name | Value |
|------|-------|
| `DASHSCOPE_API_KEY` | Your DashScope API key |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

The project includes:
- `api/ai.mjs` — Serverless AI proxy (multi-provider model routing)
- `vercel.json` — Vite build config

### AI Model Routing

| Task | Model | Platform |
|------|-------|----------|
| Curriculum | `deepseek-v3` | DashScope (Alibaba) |
| Lessons | `qwen-max` | DashScope (Alibaba) |
| Code/Programming | `qwen-max` | DashScope (Alibaba) |
| Exams | `qwen-max` | DashScope (Alibaba) |

### Data

**Guest Mode:** All data lives in `localStorage` (no account needed):
- `sf_journeys` — Curriculum and metadata (including scope level per journey)
- `sf_progress` — XP, completed lessons, streaks per journey
- `sf_memory` — SM-2 flashcard data and history
- `sf_lessons` — Cached generated lessons (regenerated lessons overwrite originals)
- `sf_badges` — Earned achievement badges
- `sf_dark` — Theme preference

**Authenticated Users:** Data is synced to **Supabase Database** and available across devices. When you sign in, local data can be migrated to your Supabase account.

Use the **Export** button on the Journey tab to backup everything as JSON.