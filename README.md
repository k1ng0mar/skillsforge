# SkillsForge

Describe what you want to learn and get a full course built around it: modules, lessons, flashcards, exams. Then work through it while the app tracks your progress.

Everything runs in the browser. No account, no backend, no tracking. Your data lives in localStorage and you can export it as JSON any time.

### What it does

- Custom curriculums from a one line prompt, in three depths: Crash Course, Standard, Mastery
- Lessons with code highlighting and math rendering, regenerable with your own instructions
- A tutor chat that answers from the actual lesson content
- SM-2 flashcards that schedule reviews based on how you rate yourself
- Final exams per curriculum, plus badges, streaks, and XP
- Several learning journeys side by side, each with its own progress

### AI setup

SkillsForge ships with no built-in AI. You bring a key from any OpenAI compatible provider. Tap the gear icon (top right) and pick a preset or enter a custom base URL:

- Groq (free tier, works out of the box)
- Custom (any base URL, with a Fetch models button to list what it offers)

One model does everything: curriculum, lessons, exams, tutor. Your key never leaves the browser. If it is missing or wrong, the app says so instead of failing quietly.

One limitation worth knowing: some providers send no CORS headers, so browsers refuse to call them directly. Groq works fine from the browser. The app tells you when this is the problem.

### Run it

```bash
npm install
npm run dev
```

`npm run build` produces the offline capable PWA in `dist/`. It deploys as a static site (a `vercel.json` is included).

```
src/
├── ai.js           # Provider config plus direct AI calls
├── constants.js    # Shared constants (fonts)
├── App.jsx         # Main application component
└── index.jsx       # React entry point
```

### Data

Local only, one key per concern:

- `sf_journeys` — Curriculum and metadata, including depth per journey
- `sf_progress` — XP, completed lessons, streaks per journey
- `sf_memory` — SM-2 flashcard data and history
- `sf_lessons` — Cached lessons (regenerating overwrites the original)
- `sf_badges` — Earned achievements
- `sf_dark` — Theme preference

The Export button on the Journey tab backs all of it up as JSON.
