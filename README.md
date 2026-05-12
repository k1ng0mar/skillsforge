# SkillForge

AI-powered custom curriculum generator with spaced repetition learning.

### Features

- **AI Curriculum Generation** — Describe what you want to learn, get a custom curriculum with modules and lessons
- **Multi-Model AI Routing** — Curriculum/exams and lessons use Llama 3.3 via Groq; auto-detects code/programming topics for programming-focused content
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
- **Offline-First PWA** — Install on mobile/desktop, works offline after first load
- **Safe Area Support** — Notch and status-bar aware padding on mobile devices
- **Data Persistence** — All progress, lessons, and settings saved to localStorage
- **Export/Import** — Backup and restore all data as JSON

### Setup

```bash
npm install
```

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

Create `.env.local` with your API keys:

```
GROQ_API_KEY=your_groq_key_here
```

- **Groq** for everything: [console.groq.com](https://console.groq.com) (free tier, llama-3.3-70b-versatile — 14,400 requests/day)

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
| `GROQ_API_KEY` | Your Groq API key |

The project includes:
- `api/ai.mjs` — Serverless AI proxy (multi-provider model routing)
- `vercel.json` — Vite build config

### AI Model Routing

All AI tasks route through Groq (free tier, 14,400 req/day):

| Task | Model |
|------|-------|
| Curriculum + Exams | `llama-3.3-70b-versatile` via Groq |
| Lessons (general + code) | `llama-3.3-70b-versatile` via Groq |

### Data

All data lives in `localStorage`:

- `sf_journeys` — Curriculum and metadata (including scope level per journey)
- `sf_progress` — XP, completed lessons, streaks per journey
- `sf_memory` — SM-2 flashcard data and history
- `sf_lessons` — Cached generated lessons (regenerated lessons overwrite originals)
- `sf_badges` — Earned achievement badges
- `sf_dark` — Theme preference

Use the **Export** button on the Journey tab to backup everything as JSON.
