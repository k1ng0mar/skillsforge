import { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useAuth } from './hooks/useAuth';
import AuthView from './components/AuthView';
import { ff } from './constants';

/* ─── MARKDOWN + RENDERING ─── */
marked.setOptions({ gfm: true, breaks: true });
const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
  const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLang }).value;
  return `<pre style="background:#1B1F27;border-radius:10px;padding:14px 16px;overflow-x:auto;margin:12px 0;"><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

function renderMath(text) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      try {
        return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { displayMode: true, throwOnError: false }) }} />;
      } catch { return <span key={i} style={{ color: 'var(--err)' }}>{part}</span>; }
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      try {
        return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(1, -1), { displayMode: false, throwOnError: false }) }} />;
      } catch { return <span key={i}>{part}</span>; }
    }
    return part;
  });
}

function renderContent(text) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, i) => {
    para = para.trim();
    if (!para) return null;
    if (para.startsWith('```')) {
      return <div key={i} dangerouslySetInnerHTML={{ __html: marked.parse(para) }} />;
    }
    const inlines = renderMath(para);
    if (Array.isArray(inlines)) {
      return <p key={i} style={{ fontFamily: ff.sans, fontSize: 16, color: 'inherit', lineHeight: 1.82 }}>{inlines}</p>;
    }
    return <p key={i} style={{ fontFamily: ff.sans, fontSize: 16, color: 'inherit', lineHeight: 1.82 }} dangerouslySetInnerHTML={{ __html: marked.parse(inlines) }} />;
  });
}

/* ─── PERSISTENCE ─── */
const STORAGE_KEYS = {
  journeys: 'sf_journeys',
  activeJourney: 'sf_active_journey',
  progress: 'sf_progress',
  dark: 'sf_dark',
  memory: 'sf_memory',
  lessons: 'sf_lessons',
  badges: 'sf_badges',
};

/* ─── BADGES ─── */
const BADGE_DEFS = [
  { id: 'first_lesson', label: 'First Steps', desc: 'Complete your first lesson', icon: '🌱', check: (p, allP) => Object.keys(p.completed || {}).length >= 1 },
  { id: 'scholar', label: 'Scholar', desc: 'Complete 5 lessons', icon: '📚', check: (p, allP) => Object.keys(p.completed || {}).length >= 5 },
  { id: 'module_master', label: 'Module Master', desc: 'Complete an entire module', icon: '🏗️', check: (p, allP) => false },
  { id: 'pathfinder', label: 'Pathfinder', desc: 'Complete a whole curriculum', icon: '🌟', check: (p, allP) => false },
  { id: 'streak_3', label: 'Habit Builder', desc: '3-day streak', icon: '🔥', check: (p, allP) => (p.streak || 0) >= 3 },
  { id: 'streak_7', label: 'Consistent', desc: '7-day streak', icon: '💪', check: (p, allP) => (p.streak || 0) >= 7 },
  { id: 'centurion', label: 'Centurion', desc: 'Earn 200 XP', icon: '⭐', check: (p, allP) => (p.xp || 0) >= 200 },
  { id: 'xp500', label: 'Knowledge Seeker', desc: 'Earn 500 XP', icon: '🏆', check: (p, allP) => (p.xp || 0) >= 500 },
  { id: 'xp1000', label: 'Sage', desc: 'Earn 1000 XP', icon: '👑', check: (p, allP) => (p.xp || 0) >= 1000 },
  { id: 'pluralist', label: 'Pluralist', desc: 'Generate 2+ curricula', icon: '🎯', check: (p, allP) => allP && Object.keys(allP).filter(k => allP[k]?.xp > 0).length >= 2 },
  { id: 'exam_ace', label: 'Exam Ace', desc: 'Pass a final exam', icon: '🎓', check: (p, allP) => p.examPassed || false },
];

function checkNewBadges(progress, allProgress, earned) {
  return BADGE_DEFS.filter(b => !earned.includes(b.id) && b.check(progress, allProgress)).map(b => b.id);
}

const API_BASE = '';

/* ─── SM-2 SPACED REPETITION ─── */
function sm2(ease, interval, rep, rating) {
  let e = ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (e < 1.3) e = 1.3;
  let i, r;
  if (rating < 3) { i = 1; r = 0; }
  else if (rep === 0) { i = 1; r = 1; }
  else if (rep === 1) { i = 6; r = 2; }
  else { i = Math.round(interval * e); r = rep + 1; }
  return { ease: e, interval: i, rep: r };
}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded — clearing oldest lessons');
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sf_'));
      for (const k of keys) { try { localStorage.removeItem(k); break; } catch (e) { /* skip locked keys */ } }
    }
    return fallback;
  }
}

function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
    }
  }
}

function useLocalStorage(key, fallback) {
  const [val, setVal] = useState(() => loadStorage(key, fallback));
  useEffect(() => { saveStorage(key, val); }, [key, val]);
  return [val, setVal];
}

/* ─── FONTS + RESET ─── */
const BASE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { min-height: 100%; }
input, textarea { font-family: inherit; resize: none; }
input:focus, textarea:focus { outline: none; }
button { cursor: pointer; font-family: inherit; border: none; background: none; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.15); border-radius: 4px; }
code.hljs { background: transparent; padding: 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
pre code.hljs { background: transparent; padding: 0; }
.katex { font-size: 1.05em; }
.katex-display { margin: 16px 0; overflow-x: auto; }
p { line-height: 1.82; }
`;

/* ─── THEMES ─── */
const DARK = {
  bg: '#090A0C', surface: '#14171C', lift: '#1B1F27',
  primary: '#00F0FF', pDim: 'rgba(0,240,255,0.1)', pLine: 'rgba(0,240,255,0.28)',
  success: '#00FF94', sDim: 'rgba(0,255,148,0.1)', sLine: 'rgba(0,255,148,0.28)',
  danger: '#FF0055', rDim: 'rgba(255,0,85,0.1)', rLine: 'rgba(255,0,85,0.28)',
  amber: '#F59E0B', aDim: 'rgba(245,158,11,0.1)', aLine: 'rgba(245,158,11,0.28)',
  txt: '#F1F3F5', muted: '#8B95A5', faint: '#3A4255',
  line: 'rgba(255,255,255,0.07)', lineMd: 'rgba(255,255,255,0.13)',
  glow: (hex) => `0 0 28px ${hex}30, 0 4px 14px ${hex}18`,
  navBg: 'rgba(9,10,12,0.92)',
};
const LIGHT = {
  bg: '#F4F2EC', surface: '#FFFFFF', lift: '#EEECE6',
  primary: '#007A8C', pDim: 'rgba(0,122,140,0.08)', pLine: 'rgba(0,122,140,0.22)',
  success: '#0A7C40', sDim: 'rgba(10,124,64,0.08)', sLine: 'rgba(10,124,64,0.22)',
  danger: '#C01044', rDim: 'rgba(192,16,68,0.08)', rLine: 'rgba(192,16,68,0.22)',
  amber: '#B45309', aDim: 'rgba(180,83,9,0.08)', aLine: 'rgba(180,83,9,0.22)',
  txt: '#0D1117', muted: '#4B5563', faint: '#C4C9D4',
  line: 'rgba(0,0,0,0.07)', lineMd: 'rgba(0,0,0,0.13)',
  glow: () => 'none',
  navBg: 'rgba(244,242,236,0.92)',
};

/* ─── CONTEXT ─── */
const Ctx = createContext(null);
const useT = () => useContext(Ctx);

/* ─── AI ─── */
const CODE_KEYWORDS = new Set([
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'rust', 'go', 'golang',
  'swift', 'kotlin', 'ruby', 'php', 'sql', 'html', 'css', 'react', 'vue', 'angular',
  'node', 'django', 'flask', 'spring', 'rails', 'laravel', 'nextjs', 'next.js',
  'api', 'backend', 'frontend', 'fullstack', 'full-stack', 'web dev', 'web development',
  'algorithm', 'data structure', 'dsa', 'competitive programming', 'coding',
  'programming', 'software', 'machine learning', 'ml', 'deep learning', 'ai',
  'data science', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'keras', 'scikit',
  'database', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest api', 'docker',
  'kubernetes', 'devops', 'cloud', 'aws', 'azure', 'gcp', 'firebase', 'linux',
  'bash', 'shell', 'scripting', 'automation', 'CI/CD', 'git', 'github',
]);

function isCodeRelated(skillName, lessonTitle = '') {
  const combined = `${skillName} ${lessonTitle}`.toLowerCase();
  return [...CODE_KEYWORDS].some(k => combined.includes(k));
}

const SCOPE_CONFIG = {
  'Crash Course': {
    modDesc: '3-4 modules.',
    lesDesc: '2-3 concise lessons per module covering the essential core only. Lesson titles are short and broad.',
    contentHint: 'Provide a 80-word overview section with essential concepts and one worked example.',
    lesWordCount: 80,
    numSections: 2,
  },
  'Standard': {
    modDesc: '4-5 modules.',
    lesDesc: '3-4 lessons per module. Each lesson has: overview, two detailed sections (~140 words each), key takeaways, example.',
    contentHint: 'Include conceptual explanations, one detailed example, and brief practical application.',
    lesWordCount: 140,
    numSections: 3,
  },
  'Mastery': {
    modDesc: '8-12 modules.',
    lesDesc: '6-8 granular lessons per module. Lesson titles are precise and specific (e.g. "Gradient Descent: Line Search Methods" not "Optimization"). Every lesson must be independently comprehensive.',
    contentHint: `Each lesson must stand alone as a complete, university-level lecture. Cover EVERYTHING — history, motivation, formal definitions, edge cases, counterexamples, and real-world applications.
For STEM/math/physics: MUST include formal notation, complete derivations step-by-step, multiple solved examples at varying difficulty, common student misconceptions and how to avoid them, prerequisite knowledge connections.
For code/programming: MUST include algorithm analysis (time/space complexity), complete working implementation with line-by-line explanation, test cases, common pitfalls and how to fix them, performance tradeoffs, real-world usage patterns.
Every word of every section must contain NEW information — never repeat what was said before.`,
    lesWordCount: 300,
    numSections: 5,
  },
};

async function callAI(prompt, sys, modelHint = 'curriculum', skillName = '') {
  let model = modelHint;
  if (modelHint === 'auto') {
    model = isCodeRelated(skillName, prompt.slice(0, 250)) ? 'code' : 'lesson';
  }
  const r = await fetch(`${API_BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system: sys + "\n\nReturn ONLY valid JSON. No markdown fences, no preamble.", model }),
  });

  if (!r.ok) throw new Error(r.status);

  const d = await r.json();
  if (d.error) throw new Error(d.error);

  return d;
}

/* ─── PRIMITIVES ─── */
function Bar({ pct, color, h = 4, delay = 0 }) {
  const { t } = useT();
  return (
    <div style={{ height: h, background: t.line, borderRadius: h, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
        style={{ height: '100%', background: color || t.primary, borderRadius: h }}
      />
    </div>
  );
}

function Ring({ pct = 0, size = 56, stroke = 3.5, color }) {
  const { t } = useT();
  const c = color || t.primary;
  const r = (size - stroke * 2) / 2;
  const circ = r * 2 * Math.PI;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.line} strokeWidth={stroke}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c}
        strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}/>
    </svg>
  );
}

function Tag({ label, color, dim, border }) {
  const { t } = useT();
  return (
    <span style={{
      fontFamily: ff.mono, fontSize: 10, fontWeight: 600,
      letterSpacing: 0.8, textTransform: 'uppercase',
      color: color || t.primary,
      background: dim || t.pDim,
      border: `1px solid ${border || t.pLine}`,
      padding: '3px 9px', borderRadius: 999,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function Card({ children, style, onClick, glow }) {
  const { t, dark } = useT();
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.99 } : {}}
      style={{
        background: t.surface,
        border: `1px solid ${hov && onClick ? t.lineMd : t.line}`,
        borderRadius: 16,
        boxShadow: glow && dark ? t.glow(t.primary) : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >{children}</motion.div>
  );
}

function Btn({ children, onClick, v = 'primary', style, disabled, full }) {
  const { t, dark } = useT();
  const [hov, setHov] = useState(false);
  const variants = {
    primary: { bg: t.primary, clr: '#000', border: 'none', hov: dark ? '#44F6FF' : '#005A68', shadow: dark ? '0 4px 14px rgba(0,240,255,0.25), 0 1px 3px rgba(0,240,255,0.15)' : '0 4px 14px rgba(0,122,140,0.25), 0 1px 3px rgba(0,122,140,0.15)', shadowHov: dark ? '0 6px 20px rgba(0,240,255,0.4), 0 2px 6px rgba(0,240,255,0.25)' : '0 6px 20px rgba(0,122,140,0.4), 0 2px 6px rgba(0,122,140,0.25)' },
    outline: { bg: 'transparent', clr: t.primary, border: `1px solid ${t.pLine}`, hov: t.pDim, shadow: 'none', shadowHov: 'none' },
    ghost:   { bg: 'transparent', clr: t.muted, border: `1px solid ${t.line}`, hov: t.line, shadow: 'none', shadowHov: 'none' },
    success: { bg: t.sDim, clr: t.success, border: `1px solid ${t.sLine}`, hov: `${t.success}22`, shadow: dark ? '0 4px 14px rgba(0,255,148,0.15), 0 1px 3px rgba(0,255,148,0.1)' : '0 4px 14px rgba(10,124,64,0.15), 0 1px 3px rgba(10,124,64,0.1)', shadowHov: dark ? '0 6px 20px rgba(0,255,148,0.25), 0 2px 6px rgba(0,255,148,0.15)' : '0 6px 20px rgba(10,124,64,0.25), 0 2px 6px rgba(10,124,64,0.15)' },
    danger:  { bg: t.rDim, clr: t.danger, border: `1px solid ${t.rLine}`, hov: `${t.danger}22`, shadow: dark ? '0 4px 14px rgba(255,0,85,0.15), 0 1px 3px rgba(255,0,85,0.1)' : '0 4px 14px rgba(192,16,68,0.15), 0 1px 3px rgba(192,16,68,0.1)', shadowHov: dark ? '0 6px 20px rgba(255,0,85,0.25), 0 2px 6px rgba(255,0,85,0.15)' : '0 6px 20px rgba(192,16,68,0.25), 0 2px 6px rgba(192,16,68,0.15)' },
    amber:   { bg: t.aDim, clr: t.amber, border: `1px solid ${t.aLine}`, hov: `${t.amber}22`, shadow: dark ? '0 4px 14px rgba(245,158,11,0.15), 0 1px 3px rgba(245,158,11,0.1)' : '0 4px 14px rgba(180,83,9,0.15), 0 1px 3px rgba(180,83,9,0.1)', shadowHov: dark ? '0 6px 20px rgba(245,158,11,0.25), 0 2px 6px rgba(245,158,11,0.15)' : '0 6px 20px rgba(180,83,9,0.25), 0 2px 6px rgba(180,83,9,0.15)' },
  };
  const s = variants[v] || variants.primary;
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: hov && !disabled ? s.hov : s.bg,
        color: s.clr, border: s.border,
        borderRadius: 12, padding: '11px 20px',
        fontFamily: ff.sans, fontSize: 14, fontWeight: 700,
        letterSpacing: v === 'primary' ? 0.5 : 0,
        display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', gap: 7,
        width: full ? '100%' : 'auto',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, box-shadow 0.15s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: hov && !disabled ? s.shadowHov : s.shadow,
        ...style,
      }}
    >{children}</motion.button>
  );
}

function Empty({ msg, action, onAction }) {
  const { t } = useT();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '55vh', padding: '32px 28px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: t.surface, border: `1px solid ${t.lineMd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
      <p style={{ fontFamily: ff.sans, fontSize: 15, color: t.muted, marginBottom: action ? 20 : 0, lineHeight: 1.6 }}>
        {msg}
      </p>
      {action && <Btn v="outline" onClick={onAction}>{action}</Btn>}
    </div>
  );
}

/* ─── NAV ICONS ─── */
const JourneyIcon = ({ c }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
    <path d="M3 12 C5.5 4 8 4 10 12 C12 20 14.5 20 17 12 C18.5 7 20 7 21 12"/>
  </svg>
);
const TreeIcon = ({ c }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="4" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
    <line x1="12" y1="6" x2="12" y2="14"/>
    <line x1="12" y1="14" x2="5" y2="17"/>
    <line x1="12" y1="14" x2="19" y2="17"/>
  </svg>
);
const GenIcon = ({ c }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={c}>
    <path d="M13 2L4 13h7l-1 9 9-11h-7l1-9z"/>
  </svg>
);

/* ─── BOTTOM NAV ─── */
function BottomNav({ tab, setTab }) {
  const { t, dark } = useT();
  const items = [
    { id: 'journey', label: 'Journey', icon: JourneyIcon },
    { id: 'tree', label: 'Skill Tree', icon: TreeIcon },
    { id: 'gen', label: 'Generate', icon: GenIcon },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: 'min(100%, 430px)', height: 68,
      background: t.navBg,
      backdropFilter: 'blur(16px)',
      borderTop: `1px solid ${t.line}`,
      display: 'flex', zIndex: 200,
    }}>
      {items.map(item => {
        const active = tab === item.id;
        const color = active ? t.primary : t.muted;
        return (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              color, fontFamily: ff.sans, fontSize: 11,
              fontWeight: active ? 600 : 400, transition: 'color 0.15s',
            }}>
            <item.icon c={color}/>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── HOME / GENERATOR ─── */
const CHIPS = ['Advanced Rust', 'Quantum Physics', 'Machine Learning', 'Neuroscience', 'Options Trading', 'System Design', 'Stoic Philosophy'];

function HomeView({ onGenerate }) {
  const { t, dark } = useT();
  const [val, setVal] = useState('');
  const [scope, setScope] = useState('Standard');
  const ref = useRef();

  useEffect(() => { setTimeout(() => ref.current?.focus(), 300); }, []);

  const go = (v) => {
    const s = (v || val).trim();
    if (s) onGenerate(s, scope);
  };

  const active = val.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh', background: t.bg,
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div style={{ flex: 1, padding: '28px 24px 0' }}>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: ff.serif, fontSize: 'clamp(30px, 8vw, 38px)',
            fontWeight: 700, color: t.txt,
            letterSpacing: '-1px', lineHeight: 1.18, marginBottom: 10,
          }}
        >
          What do you want to{' '}
          <em style={{ fontStyle: 'italic', color: t.primary }}>master</em>{' '}
          today?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ fontFamily: ff.sans, fontSize: 15, color: t.muted, lineHeight: 1.65, marginBottom: 32 }}
        >
          Describe your goal. We'll forge a custom curriculum.
        </motion.p>

        {/* input */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <textarea
            ref={ref}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }}
            placeholder="e.g. I want to build a physics engine in Rust..."
            rows={3}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? t.primary : t.lineMd}`,
              fontFamily: ff.serif, fontSize: 20, color: t.txt,
              padding: '8px 0 14px', lineHeight: 1.5, transition: 'border-color 0.2s',
            }}
          />
        </motion.div>

        {/* chips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
          style={{ marginTop: 20, marginBottom: 28 }}>
          <p style={{ fontFamily: ff.sans, fontSize: 11, color: t.muted, marginBottom: 10 }}>Popular prompts</p>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
            {CHIPS.map(c => (
              <button key={c} onClick={() => go(c)}
                style={{
                  fontFamily: ff.sans, fontSize: 12, fontWeight: 500,
                  color: t.txt, background: t.surface,
                  border: `1px solid ${t.lineMd}`,
                  borderRadius: 999, padding: '6px 13px',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'background 0.12s',
                }}>{c}</button>
            ))}
          </div>
        </motion.div>

        {/* scope selector */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}>
          <p style={{ fontFamily: ff.sans, fontSize: 11, color: t.muted, marginBottom: 10 }}>Depth</p>
          <div style={{
            display: 'flex', background: t.surface,
            border: `1px solid ${t.lineMd}`, borderRadius: 13, padding: 4, gap: 3,
          }}>
            {['Crash Course', 'Standard', 'Mastery'].map(s => {
              const sel = scope === s;
              return (
                <button key={s} onClick={() => setScope(s)}
                  style={{
                    flex: 1, fontFamily: ff.sans, fontSize: 13.5,
                    fontWeight: sel ? 700 : 400,
                    color: sel ? (dark ? '#000' : '#fff') : t.muted,
                    background: sel ? t.primary : 'transparent',
                    borderRadius: 10, padding: '10px 6px',
                    transition: 'all 0.14s', textAlign: 'center',
                  }}>{s}</button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* CTA */}
      <div style={{ padding: '24px 24px 100px' }}>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          whileTap={active ? { scale: 0.97 } : {}}
          onClick={() => go()}
          disabled={!active}
          style={{
            width: '100%', height: 56,
            background: active ? t.primary : t.surface,
            color: active ? '#000' : t.muted,
            border: 'none', borderRadius: 999,
            fontFamily: ff.sans, fontSize: 15, fontWeight: 800, letterSpacing: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: active && dark ? t.glow(t.primary) : 'none',
            transition: 'all 0.2s',
            cursor: active ? 'pointer' : 'default',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? '#000' : t.muted}>
            <path d="M12 23C8.4 23 5 20 5 16c0-2.8 1.8-5.1 4.4-7 .1.7.3 1.5.7 2.2 1.2-1.5 1.9-3.5 1.9-5.4 0-1.4-.5-2.8-1.5-4 2.8.3 5 1.9 6.2 4.3.5-.7.7-1.5.7-2.3C20 7.5 21 11 21 14c0 5-4 9-9 9z"/>
          </svg>
          IGNITE JOURNEY
        </motion.button>
      </div>
    </div>
  );
}

/* ─── GENERATING ─── */
const GEN_STEPS = [
  'Structuring syllabus…',
  'Generating modules…',
  'Writing lesson outlines…',
  'Generating flashcards…',
  'Finalising curriculum…',
];

function GeneratingView({ skill }) {
  const { t, dark } = useT();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 1300);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: t.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          border: `3px solid ${t.line}`,
          borderTopColor: t.primary,
          boxShadow: dark ? t.glow(t.primary) : 'none',
          marginBottom: 28,
        }}
      />
      <h2 style={{
        fontFamily: ff.serif, fontSize: 28, fontWeight: 700,
        color: t.txt, letterSpacing: '-0.5px', marginBottom: 8, textAlign: 'center',
      }}>
        Forging your path
      </h2>
      <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted, marginBottom: 26, textAlign: 'center' }}>
        Building curriculum for <strong style={{ color: t.txt }}>{skill}</strong>
      </p>
      <AnimatePresence mode="wait">
        <motion.p key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          style={{ fontFamily: ff.mono, fontSize: 13, color: t.primary }}
        >
          {GEN_STEPS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ─── JOURNEY (DASHBOARD) ─── */
function JourneyView({ journeys, activeJourneyId, curriculum, progress, memory, badges, onLesson, onArena, onTab, onSwitch, onDelete, onExport, onImport, dueCards }) {
  const { t, dark } = useT();

  if (!curriculum) {
    return (
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Empty msg="No active journey yet." action="Generate one" onAction={() => onTab('gen')}/>
        <div style={{ textAlign: 'center', marginTop: -12 }}>
          <span style={{ fontFamily: ff.sans, fontSize: 12, color: t.faint }}>or</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <label style={{ fontFamily: ff.sans, fontSize: 13, color: t.muted, padding: '8px 16px', borderRadius: 999, border: `1px solid ${t.line}`, cursor: 'pointer', display: 'inline-block' }}>
            Import existing journey
            <input type="file" accept=".json" onChange={e => e.target.files[0] && onImport(e.target.files[0])} style={{ display: 'none' }}/>
          </label>
        </div>
      </div>
    );
  }

  let nextMod = null, nextLesson = null;
  outer: for (const mod of curriculum.modules) {
    for (const l of mod.lessons) {
      if (!progress.completed[l.id]) { nextMod = mod; nextLesson = l; break outer; }
    }
  }

  const total = curriculum.modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = Object.keys(progress.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const level = Math.floor(progress.xp / 200) + 1;
  const xpInLevel = progress.xp % 200;

  return (
    <div style={{ paddingBottom: 100, overflowY: 'auto', height: '100vh' }}>
      {/* journeys switcher */}
      {journeys.length > 0 && (
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 0px) 20px 12px', borderBottom: `1px solid ${t.line}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {journeys.map(j => (
              <div key={j.id} style={{ flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button onClick={() => onSwitch(j.id)}
                  style={{
                    padding: '5px 12px 5px 14px', borderRadius: 999,
                    fontFamily: ff.sans, fontSize: 12, fontWeight: j.id === activeJourneyId ? 600 : 400,
                    background: j.id === activeJourneyId ? t.pDim : 'transparent',
                    color: j.id === activeJourneyId ? t.primary : t.muted,
                    border: `1px solid ${j.id === activeJourneyId ? t.pLine : t.line}`,
                    transition: 'all 0.13s',
                  }}>
                  {j.curriculum?.title || j.skill}
                </button>
                <button onClick={() => onDelete(j.id)}
                  title="Delete journey"
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: t.danger, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: 0.8,
                    fontSize: 10, color: '#fff', lineHeight: 1,
                  }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* settings row */}
      <div style={{ padding: '0 20px 8px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onExport} style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 6, background: 'transparent', border: `1px solid ${t.line}` }}>
          Export
        </button>
        <label style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', padding: '4px 8px', borderRadius: 6, background: 'transparent', border: `1px solid ${t.line}`, cursor: 'pointer' }}>
          Import
          <input type="file" accept=".json" onChange={e => e.target.files[0] && onImport(e.target.files[0])} style={{ display: 'none' }}/>
        </label>
      </div>
        {/* top bar */}
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>
            Active Journey
          </p>
          <h1 style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 700, color: t.txt, letterSpacing: '-0.4px', lineHeight: 1.2, maxWidth: 220 }}>
            {curriculum.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: t.sDim, border: `1px solid ${t.sLine}`,
            borderRadius: 999, padding: '7px 13px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={t.success}>
              <path d="M12 23C8.4 23 5 20 5 16c0-2.8 1.8-5.1 4.4-7 .1.7.3 1.5.7 2.2 1.2-1.5 1.9-3.5 1.9-5.4 0-1.4-.5-2.8-1.5-4 2.8.3 5 1.9 6.2 4.3.5-.7.7-1.5.7-2.3C20 7.5 21 11 21 14c0 5-4 9-9 9z"/>
            </svg>
            <span style={{ fontFamily: ff.mono, fontSize: 14, fontWeight: 700, color: t.success }}>
              {progress.streak || 0}
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <Ring pct={pct} size={50} stroke={3.5}/>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, color: t.primary }}>{pct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px' }}>
        {/* next up */}
        {nextLesson ? (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: ff.sans, fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Next Up
            </p>
            <Card glow onClick={() => onLesson(nextMod, nextLesson)}
              style={{ padding: '18px 20px', border: `1px solid ${t.pLine}` }}>
              <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 }}>
                {nextMod.title}
              </p>
              <h2 style={{ fontFamily: ff.serif, fontSize: 24, fontWeight: 700, color: t.txt, lineHeight: 1.2, marginBottom: 14 }}>
                {nextLesson.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.muted }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontFamily: ff.sans, fontSize: 12 }}>Est. {nextLesson.duration}</span>
                </div>
                <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 700, color: t.primary, letterSpacing: 0.3 }}>
                  BEGIN →
                </span>
              </div>
            </Card>
          </div>
        ) : (
          <Card style={{ padding: '16px 20px', marginBottom: 14, border: `1px solid ${t.sLine}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p style={{ fontFamily: ff.sans, fontSize: 15, fontWeight: 600, color: t.success }}>
                All lessons completed!
              </p>
            </div>
          </Card>
        )}

        {/* daily review */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: ff.sans, fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Spaced Repetition
          </p>
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: t.aDim, border: `1px solid ${t.aLine}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.amber} strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <path d="M7 12h5M7 16h8"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: ff.sans, fontSize: 15, fontWeight: 600, color: t.txt, marginBottom: 2 }}>
                  {dueCards} Cards Due
                </p>
                <p style={{ fontFamily: ff.sans, fontSize: 12, color: t.muted }}>Memory decay detected</p>
              </div>
              <Btn v="primary" onClick={onArena}
                style={{ flexShrink: 0, padding: '8px 14px', fontSize: 11, letterSpacing: 0.8 }}>
                ENTER ARENA
              </Btn>
            </div>
          </Card>
        </div>

        {/* stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Card style={{ padding: '16px' }}>
            <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Level
            </p>
            <p style={{ fontFamily: ff.serif, fontSize: 34, fontWeight: 700, color: t.txt, lineHeight: 1, marginBottom: 8 }}>
              {level}
            </p>
            <Bar pct={(xpInLevel / 200) * 100} color={t.success} h={3}/>
          </Card>
          <Card style={{ padding: '16px' }}>
            <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              XP Earned
            </p>
            <p style={{ fontFamily: ff.serif, fontSize: 34, fontWeight: 700, color: t.txt, lineHeight: 1, marginBottom: 8 }}>
              {progress.xp >= 1000 ? `${(progress.xp / 1000).toFixed(1)}k` : progress.xp}
            </p>
            <p style={{ fontFamily: ff.mono, fontSize: 11, color: t.primary }}>
              {done}/{total} lessons
            </p>
          </Card>
        </div>

        {/* badges */}
        {badges && badges.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: ff.sans, fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Badges ({badges.length}/{BADGE_DEFS.length})
            </p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {BADGE_DEFS.map(b => {
                const earned = badges.find(x => x.id === b.id);
                return (
                  <div key={b.id} style={{
                    flexShrink: 0, width: 82,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    opacity: earned ? 1 : 0.3,
                    transition: 'opacity 0.2s',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: earned ? t.pDim : t.surface,
                      border: `1px solid ${earned ? t.pLine : t.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      {b.icon}
                    </div>
                    <p style={{ fontFamily: ff.mono, fontSize: 9, fontWeight: 600, color: earned ? t.primary : t.faint, textAlign: 'center', letterSpacing: 0.3 }}>
                      {b.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* completed recently */}
        {done > 0 && (
          <div>
            <p style={{ fontFamily: ff.sans, fontSize: 11, fontWeight: 600, color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Completed Recently
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {curriculum.modules.flatMap(m => m.lessons.filter(l => progress.completed[l.id]).map(l => ({ ...l, mod: m.title }))).slice(-3).reverse().map(l => (
                <Card key={l.id} style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.sDim, border: `1px solid ${t.sLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <p style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 500, color: t.txt }}>{l.title}</p>
                      <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted }}>{l.mod}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SKILL TREE ─── */
function SkillTreeView({ journeys, activeJourneyId, curriculum, progress, onLesson, onTab, onSwitch, onStartExam, onRegenerate }) {
  const { t, dark } = useT();
  const [sheet, setSheet] = useState(null);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenerated, setRegenerated] = useState(false);

  if (!curriculum) {
    return <Empty msg="No curriculum yet." action="Generate one" onAction={() => onTab('gen')}/>;
  }

  const flat = curriculum.modules.flatMap(m =>
    m.lessons.map(l => ({ ...l, modObj: m, modTitle: m.title }))
  );

  const isActive = (i) => !progress.completed[flat[i].id] && flat.slice(0, i).every(n => progress.completed[n.id]);
  const allDone = flat.every(n => progress.completed[n.id]);
  const examDone = progress.examPassed || false;

  return (
    <div style={{ paddingBottom: 100, overflowY: 'auto', height: '100vh' }}>
      {/* journeys switcher */}
      {journeys.length > 0 && (
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px', borderBottom: `1px solid ${t.line}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {journeys.map(j => (
              <button key={j.id} onClick={() => onSwitch(j.id)}
                style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 999,
                  fontFamily: ff.sans, fontSize: 12, fontWeight: j.id === activeJourneyId ? 600 : 400,
                  background: j.id === activeJourneyId ? t.pDim : 'transparent',
                  color: j.id === activeJourneyId ? t.primary : t.muted,
                  border: `1px solid ${j.id === activeJourneyId ? t.pLine : t.line}`,
                  transition: 'all 0.13s',
                }}>
                {j.curriculum?.title || j.skill}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '16px 20px 20px' }}>
        <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
          Neural Pathway
        </p>
        <h1 style={{ fontFamily: ff.serif, fontSize: 26, fontWeight: 700, color: t.txt, letterSpacing: '-0.5px', marginBottom: 4 }}>
          {curriculum.title}
        </h1>
        <p style={{ fontFamily: ff.sans, fontSize: 13, color: t.muted }}>{curriculum.description}</p>
      </div>

      <div style={{ position: 'relative', padding: '0 20px' }}>
        {/* center line */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3,
          background: dark
            ? `linear-gradient(to bottom, ${t.success}88, ${t.primary}55, ${t.line})`
            : `linear-gradient(to bottom, ${t.success}55, ${t.primary}33, ${t.line})`,
          transform: 'translateX(-50%)',
          borderRadius: 2, zIndex: 0,
        }}/>

        {flat.map((node, i) => {
          const done = !!progress.completed[node.id];
          const active = isActive(i);
          const locked = !done && !active;
          const isLeft = i % 2 === 0;
          const nodeColor = done ? t.success : active ? t.primary : t.faint;

          return (
            <motion.div key={node.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                position: 'relative', zIndex: 1,
                display: 'grid', gridTemplateColumns: '1fr 60px 1fr',
                alignItems: 'center', padding: '18px 0',
              }}
            >
              {/* left label */}
              <div style={{ textAlign: 'right', paddingRight: 14, opacity: locked ? 0.4 : 1 }}>
                {isLeft && (
                  <div>
                    <p style={{ fontFamily: ff.mono, fontSize: 9, color: nodeColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                      {node.modTitle}
                    </p>
                    <p style={{ fontFamily: ff.serif, fontSize: 16, fontWeight: 600, color: t.txt, lineHeight: 1.3 }}>
                      {node.title}
                    </p>
                    {done && <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.success, marginTop: 3 }}>MASTERED</p>}
                    {active && <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.primary, marginTop: 3 }}>UP NEXT →</p>}
                  </div>
                )}
              </div>

              {/* node */}
              <motion.button
                whileTap={!locked ? { scale: 0.88 } : {}}
                onClick={!locked ? () => setSheet({ node, done, active }) : null}
                style={{
                  width: active ? 52 : 44, height: active ? 52 : 44,
                  borderRadius: '50%',
                  background: done ? t.success : active ? t.primary : t.surface,
                  border: `2.5px solid ${nodeColor}`,
                  boxShadow: dark ? t.glow(nodeColor) : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                  cursor: locked ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {done && (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                )}
                {locked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
              </motion.button>

              {/* right label */}
              <div style={{ textAlign: 'left', paddingLeft: 14, opacity: locked ? 0.4 : 1 }}>
                {!isLeft && (
                  <div>
                    <p style={{ fontFamily: ff.mono, fontSize: 9, color: nodeColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                      {node.modTitle}
                    </p>
                    <p style={{ fontFamily: ff.serif, fontSize: 16, fontWeight: 600, color: t.txt, lineHeight: 1.3 }}>
                      {node.title}
                    </p>
                    {done && <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.success, marginTop: 3 }}>MASTERED</p>}
                    {active && <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.primary, marginTop: 3 }}>UP NEXT →</p>}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* final exam node */}
      {allDone && (
        <div style={{ padding: '0 20px 32px' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: examDone ? t.sDim : t.pDim,
              border: `1px solid ${examDone ? t.sLine : t.pLine}`,
              borderRadius: 16, padding: '16px 20px',
              cursor: examDone ? 'default' : 'pointer',
            }}
            onClick={examDone ? null : onStartExam}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: examDone ? t.sDim : t.pDim,
              border: `2px solid ${examDone ? t.success : t.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {examDone ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: ff.serif, fontSize: 17, fontWeight: 700, color: t.txt, marginBottom: 2 }}>
                {examDone ? 'Exam Passed' : 'Final Exam'}
              </p>
              <p style={{ fontFamily: ff.sans, fontSize: 12, color: t.muted }}>
                {examDone ? 'Comprehensive curriculum assessment completed' : 'Test your knowledge across all modules'}
              </p>
            </div>
            {!examDone && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            )}
          </motion.div>
        </div>
      )}

      {/* bottom sheet */}
      <AnimatePresence>
        {sheet && (
          <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setSheet(null); setRegenerateOpen(false); setRegenerated(false); setRegenerateInstructions(''); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
            />
            <motion.div
              initial={{ y: '100%', x: '-50%' }} animate={{ y: 0, x: '-50%' }} exit={{ y: '100%', x: '-50%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', bottom: 0,
                left: '50%',
                width: 'min(100%, 430px)',
                maxHeight: '85vh', overflowY: 'auto',
                background: t.surface,
                borderRadius: '20px 20px 0 0',
                padding: '12px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)',
                zIndex: 301,
              }}
            >
              <div style={{ width: 36, height: 4, background: t.lineMd, borderRadius: 2, margin: '0 auto 20px' }}/>
              <Tag label={`Module ${flat.findIndex(n => n.id === sheet.node.id) + 1}`} style={{ marginBottom: 14 }}/>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ fontFamily: ff.serif, fontSize: 26, fontWeight: 700, color: t.txt, letterSpacing: '-0.4px', lineHeight: 1.2, flex: 1, marginRight: 12 }}>
                  {sheet.node.title}
                </h2>
                {sheet.active && (
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: t.pDim, border: `1px solid ${t.pLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="2">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted, lineHeight: 1.65, marginBottom: 20 }}>
                {sheet.node.modObj.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Est. Time</p>
                  <p style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 700, color: t.txt }}>{sheet.node.duration}</p>
                </div>
                <div style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontFamily: ff.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Contains</p>
                  <p style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 700, color: t.txt }}>{sheet.node.flashcards || 6} Cards</p>
                </div>
              </div>
              <Btn v="primary" full
                onClick={() => { setSheet(null); setRegenerateOpen(false); setRegenerated(false); setRegenerateInstructions(''); onLesson(sheet.node.modObj, sheet.node); }}
                style={{ height: 52, borderRadius: 999, letterSpacing: 1, marginBottom: 8 }}>
                {sheet.done ? 'REVIEW LESSON' : 'ENTER ARENA'} →
              </Btn>

              {!regenerateOpen && !regenerated && (
                <Btn v="ghost" full onClick={() => setRegenerateOpen(true)}
                  style={{ letterSpacing: 0.5, fontSize: 12 }}>
                  Regenerate with custom instructions
                </Btn>
              )}

              {regenerateOpen && !regenerating && (
                <div>
                  <textarea
                    value={regenerateInstructions}
                    onChange={e => setRegenerateInstructions(e.target.value)}
                    placeholder="e.g. Make it simpler, add more code examples, focus on practical applications..."
                    rows={2}
                    style={{
                      width: '100%', background: t.bg, border: `1px solid ${t.lineMd}`,
                      borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                      fontFamily: ff.sans, fontSize: 13, color: t.txt,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn v="ghost" onClick={() => { setRegenerateOpen(false); setRegenerateInstructions(''); }}
                      style={{ flex: 1, fontSize: 12, letterSpacing: 0.5 }}>
                      Cancel
                    </Btn>
                    <Btn v="primary" onClick={async () => {
                      setRegenerating(true);
                      const ok = await onRegenerate(sheet.node.modObj, sheet.node, regenerateInstructions || 'Make the content more accessible and easier to understand');
                      setRegenerating(false);
                      if (ok) { setRegenerated(true); setRegenerateOpen(false); }
                    }} disabled={!regenerateInstructions.trim()}
                      style={{ flex: 1, fontSize: 12, letterSpacing: 0.5 }}>
                      Confirm
                    </Btn>
                  </div>
                </div>
              )}

              {regenerating && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${t.line}`, borderTopColor: t.primary }}/>
                  <span style={{ fontFamily: ff.sans, fontSize: 13, color: t.muted }}>Regenerating…</span>
                </div>
              )}

              {regenerated && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 600, color: t.success }}>Regenerated!</span>
                  </div>
                  <Btn v="outline" onClick={() => { setSheet(null); setRegenerateOpen(false); setRegenerated(false); setRegenerateInstructions(''); onLesson(sheet.node.modObj, sheet.node); }}
                    style={{ fontSize: 12, letterSpacing: 0.5 }}>
                    View Updated Lesson →
                  </Btn>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── LESSON ─── */
function LessonView({ lessonData, loading, moduleTitle, lessonId, progress, onQuiz, onFlashcards, onComplete, onBack, onTutor }) {
  const { t, dark } = useT();
  const isDone = progress.completed[lessonId];
  const scrollRef = useRef();
  const [scrollPct, setScrollPct] = useState(0);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollPct(Math.min((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100, 100));
  };

  if (loading || !lessonData) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, padding: '56px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${t.line}`, borderTopColor: t.primary }}/>
          <span style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted }}>Generating lesson…</span>
        </div>
        {[0.7, 0.45, 0.9, 0.6, 0.8].map((w, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.14 }}
            style={{ height: i === 0 ? 28 : 13, width: `${w * 100}%`, background: t.surface, borderRadius: 6, marginBottom: i === 0 ? 22 : 10 }}
          />
        ))}
      </div>
    );
  }

  return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* progress bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 3, background: t.line }}>
        <motion.div animate={{ width: `${scrollPct}%` }} style={{ height: '100%', background: t.primary }}/>
      </div>

      {/* sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(13px + env(safe-area-inset-top, 0px)) 20px 13px',
        background: dark ? 'rgba(9,10,12,0.92)' : 'rgba(244,242,236,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${t.line}`,
      }}>
        <button onClick={onBack} aria-label="Go back"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.muted, fontFamily: ff.sans, fontSize: 13, fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {moduleTitle}
        </span>
        <div style={{ width: 16 }}/>
      </div>

       {/* content */}
       <div ref={scrollRef} onScroll={onScroll}
         style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 120px' }}>

        <div style={{ marginBottom: 16 }}>
          <Tag label="Lesson"/>
        </div>

        <h1 style={{
          fontFamily: ff.serif, fontSize: 'clamp(26px, 7vw, 34px)',
          fontWeight: 700, color: t.txt,
          letterSpacing: '-0.8px', lineHeight: 1.22, marginBottom: 12,
        }}>
          {lessonData.title}
        </h1>
        <p style={{ fontFamily: ff.sans, fontSize: 16, color: t.muted, lineHeight: 1.75, marginBottom: 28 }}>
          {lessonData.summary}
        </p>

        {lessonData.sections?.map((s, i) => (
          <div key={i} style={{ marginBottom: 26 }}>
            <h2 style={{
              fontFamily: ff.serif, fontSize: 22, fontWeight: 700,
              color: t.txt, letterSpacing: '-0.3px', lineHeight: 1.3, marginBottom: 10,
            }}>
              {s.heading}
            </h2>
            <div style={{ fontFamily: ff.sans, fontSize: 16, color: dark ? 'rgba(241,243,245,0.82)' : t.muted }}>
              {renderContent(s.content)}
            </div>
          </div>
        ))}

        {lessonData.keyPoints?.length > 0 && (
          <div style={{
            background: t.pDim,
            border: `1px solid ${t.pLine}`,
            borderLeft: `4px solid ${t.primary}`,
            borderRadius: '0 12px 12px 0',
            padding: '18px 20px', marginBottom: 28,
          }}>
            <p style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, color: t.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
              Key Takeaways
            </p>
            {lessonData.keyPoints?.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < (lessonData.keyPoints?.length ?? 0) - 1 ? 10 : 0 }}>
                <span style={{ fontFamily: ff.mono, fontSize: 10, color: t.primary, fontWeight: 600, marginTop: 3, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ fontFamily: ff.sans, fontSize: 15, color: t.txt, lineHeight: 1.65 }}>{renderContent(pt)}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 8 }}>
          <Btn v="outline" onClick={() => onQuiz(lessonData.quiz, lessonData.title)}>Quiz me</Btn>
          <Btn v="ghost" onClick={() => onFlashcards(lessonData.flashcards, lessonData.title)}>Flashcards</Btn>
          <Btn v="ghost" onClick={onTutor}>Ask Tutor</Btn>
        </div>
      </div>

      {/* fixed CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px 28px',
        background: dark ? 'rgba(9,10,12,0.95)' : 'rgba(244,242,236,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${t.line}`,
        zIndex: 100,
      }}>
        {!isDone ? (
          <Btn v="primary" full onClick={() => onComplete(lessonId)}
            style={{ height: 52, borderRadius: 999, letterSpacing: 1, boxShadow: dark ? t.glow(t.primary) : 'none' }}>
            COMPLETE LESSON →
          </Btn>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontFamily: ff.sans, fontSize: 14, fontWeight: 600, color: t.success }}>Lesson completed</span>
            </div>
            <Btn v="outline" onClick={onBack} style={{ letterSpacing: 0.5 }}>
              Back to Journey →
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── QUIZ ─── */
function QuizView({ quiz, lessonTitle, onComplete, onBack }) {
  const { t } = useT();
  const [cur, setCur] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz[cur];

  const pick = (i) => {
    if (revealed) return;
    setChosen(i);
    setRevealed(true);
  };

  const next = () => {
    const correct = chosen === q.correct;
    const nTally = [...tally, correct];
    const nScore = score + (correct ? 1 : 0);
    setTally(nTally); setScore(nScore);
    if (cur + 1 >= quiz.length) { onComplete(nScore, quiz.length); setDone(true); }
    else { setCur(c => c + 1); setChosen(null); setRevealed(false); }
  };

  if (done) {
    const pct = Math.round((score / quiz.length) * 100);
    const color = pct >= 80 ? t.success : pct >= 60 ? t.amber : t.danger;
    return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontFamily: ff.mono, fontSize: 58, fontWeight: 700, color, marginBottom: 12 }}>{pct}%</div>
          <h2 style={{ fontFamily: ff.serif, fontSize: 28, fontWeight: 700, color: t.txt, marginBottom: 6 }}>
            {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good work.' : 'Keep grinding.'}
          </h2>
          <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted, marginBottom: 24 }}>
            {score}/{quiz.length} correct · +{score * 20} XP
          </p>
          <Bar pct={pct} color={color} h={5}/>
          <div style={{ height: 24 }}/>
          <Btn v="outline" onClick={onBack} style={{ margin: '0 auto' }}>Back to Lesson</Btn>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={onBack} style={{ fontFamily: ff.sans, fontSize: 13, color: t.muted }}>← Back</button>
          <Tag label="Quiz"/>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {quiz.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2, transition: 'background 0.2s',
              background: i < tally.length ? (tally[i] ? t.success : t.danger)
                        : i === cur ? t.pLine : t.line,
            }}/>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 20px 28px', overflowY: 'auto' }}>
        <p style={{ fontFamily: ff.sans, fontSize: 12, color: t.muted, marginBottom: 14 }}>
          Question {cur + 1} of {quiz.length}
        </p>
        <AnimatePresence mode="wait">
          <motion.div key={cur} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}>
            <Card style={{ padding: '20px', marginBottom: 12 }}>
              <h2 style={{ fontFamily: ff.serif, fontSize: 20, fontWeight: 600, color: t.txt, lineHeight: 1.52 }}>
                {q.question}
              </h2>
            </Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {q.options.map((opt, i) => {
                const isRight = i === q.correct, isSel = i === chosen;
                let bg = t.surface, border = t.line, clr = t.txt;
                if (revealed) {
                  if (isRight) { bg = t.sDim; border = t.sLine; clr = t.success; }
                  else if (isSel) { bg = t.rDim; border = t.rLine; clr = t.danger; }
                }
                return (
                  <motion.button key={i} whileHover={!revealed ? { x: 3 } : {}} onClick={() => pick(i)}
                    style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: 12,
                      padding: '12px 16px', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 12,
                      fontFamily: ff.sans, fontSize: 15, color: clr,
                      fontWeight: isSel || (revealed && isRight) ? 600 : 400,
                      cursor: revealed ? 'default' : 'pointer', transition: 'all 0.13s',
                    }}>
                    <span style={{ fontFamily: ff.mono, fontSize: 10, color: revealed && isRight ? t.success : t.muted, fontWeight: 600, width: 18, flexShrink: 0 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {revealed && isRight && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    {revealed && isSel && !isRight && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {revealed && q.explanation && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: t.pDim, border: `1px solid ${t.pLine}`, borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                  <p style={{ fontFamily: ff.sans, fontSize: 13, color: t.txt, lineHeight: 1.65 }}>{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {revealed && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Btn v="primary" onClick={next}>{cur + 1 >= quiz.length ? 'Finish' : 'Next →'}</Btn>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── ARENA (FLASHCARDS) ─── */
function ArenaView({ cards, lessonTitle, onBack, onDone }) {
  const { t, dark } = useT();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  const [done, setDone] = useState(false);
  const [ratedCards, setRatedCards] = useState([]);

  const card = cards[idx];

  const rate = (r) => {
    const next = { ...ratings, [idx]: r };
    const rc = [...ratedCards, { ...cards[idx], rating: r }];
    setRatings(next); setRatedCards(rc);
    if (idx + 1 >= cards.length) setDone(true);
    else { setIdx(i => i + 1); setFlipped(false); }
  };

  const finishArena = () => {
    if (idx < cards.length - 1) { setIdx(0); setFlipped(false); setRatings({}); setRatedCards([]); setDone(false); }
  };

  if (done) {
    const easy = Object.values(ratings).filter(r => r === 'easy').length;
    const good = Object.values(ratings).filter(r => r === 'good').length;
    const hard = Object.values(ratings).filter(r => r === 'hard').length;
    const pct = Math.round(((easy + good) / cards.length) * 100);

    return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            background: t.sDim, border: `2px solid ${t.sLine}`,
            boxShadow: dark ? t.glow(t.success) : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: ff.serif, fontSize: 30, fontWeight: 700, color: t.txt, letterSpacing: '-0.5px', marginBottom: 6 }}>
            Arena Cleared
          </h2>
          <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted, marginBottom: 24 }}>
            {pct >= 80 ? 'Excellent retention.' : 'Keep grinding.'}
          </p>
          <Card style={{ padding: '22px 24px', marginBottom: 20 }}>
            <div style={{ fontFamily: ff.mono, fontSize: 50, fontWeight: 700, color: pct >= 80 ? t.success : t.primary, marginBottom: 14 }}>
              {pct}%
            </div>
            <Bar pct={pct} color={pct >= 80 ? t.success : t.primary} h={5}/>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18 }}>
              {[['Easy', easy, t.success], ['Good', good, t.primary], ['Hard', hard, t.danger]].map(([label, count, color]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: ff.mono, fontSize: 22, fontWeight: 700, color, marginBottom: 3 }}>{count}</div>
                  <div style={{ fontFamily: ff.sans, fontSize: 11, color: t.muted }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center' }}>
            <Btn v="outline" onClick={() => { onDone && onDone(ratings, ratedCards); finishArena(); }}>Retry</Btn>
            <Btn v="ghost" onClick={onBack}>Back</Btn>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* header */}
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: t.surface, border: `1px solid ${t.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>
              {lessonTitle}
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              {cards.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2, transition: 'background 0.2s',
                  background: ratings[i] === 'easy' ? t.success
                            : ratings[i] === 'good' ? t.primary
                            : ratings[i] === 'hard' ? t.danger
                            : i === idx ? t.pLine : t.line,
                }}/>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* card */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div onClick={() => setFlipped(f => !f)}
          style={{ perspective: 1000, width: '100%', maxWidth: 360, cursor: 'pointer' }}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', transformStyle: 'preserve-3d', height: 240 }}>

            {/* front */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              background: t.surface,
              border: `1px solid ${t.pLine}`,
              boxShadow: dark ? t.glow(t.primary) : 'none',
              borderRadius: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 28, textAlign: 'center',
            }}>
              <p style={{ fontFamily: ff.mono, fontSize: 9, fontWeight: 600, letterSpacing: 2, color: t.muted, textTransform: 'uppercase', marginBottom: 18 }}>
                Question
              </p>
              <p style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 600, color: t.txt, lineHeight: 1.45 }}>
                {card.front}
              </p>
              <p style={{ fontFamily: ff.sans, fontSize: 12, color: t.faint, marginTop: 20 }}>tap to flip</p>
            </div>

            {/* back */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: t.surface,
              border: `1px solid ${t.pLine}`,
              boxShadow: dark ? t.glow(t.primary) : 'none',
              borderRadius: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 28, textAlign: 'center',
            }}>
              <p style={{ fontFamily: ff.mono, fontSize: 9, fontWeight: 600, letterSpacing: 2, color: t.primary, textTransform: 'uppercase', marginBottom: 18 }}>
                The Answer
              </p>
              <p style={{ fontFamily: ff.sans, fontSize: 16, color: t.txt, lineHeight: 1.72 }}>
                {card.back}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* rating buttons */}
      <AnimatePresence>
        {flipped ? (
          <motion.div key="btns"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ padding: '16px 24px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'HARD', v: 'danger', r: 'hard' },
              { label: 'GOOD', v: 'outline', r: 'good' },
              { label: 'EASY', v: 'success', r: 'easy' },
            ].map(btn => (
              <Btn key={btn.r} v={btn.v} onClick={() => rate(btn.r)} full
                style={{ height: 54, borderRadius: 14, letterSpacing: 0.8 }}>
                {btn.label}
              </Btn>
            ))}
          </motion.div>
        ) : (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '16px 24px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: ff.sans, fontSize: 13, color: t.faint }}>Tap the card to reveal the answer</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── TUTOR ─── */
function TutorView({ lessonData, lessonTitle, moduleTitle, skill, curriculum, onBack }) {
  const { t, dark } = useT();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const userMsg = { role: 'user', content: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const lessonContext = lessonData ? `Current lesson: "${lessonTitle}" in ${moduleTitle} for "${skill}"
Lesson content:
${lessonData.sections?.map(s => `## ${s.heading}\n${s.content}`).join('\n\n') || ''}
${lessonData.keyPoints ? `Key points: ${lessonData.keyPoints.join(', ')}` : ''}` : '';

      const data = await callAI(
        q,
        `You are a world-class personal tutor. Be warm, precise, and rigorous.
${lessonContext ? `CONTEXT — use this lesson content to inform your answer. You may reference, explain, and build upon it:\n${lessonContext}\n` : ''}
${curriculum ? `COURSE CONTEXT — full curriculum for broader questions:\nTitle: ${curriculum.title}\nLevel: ${curriculum.level}\nModules: ${(curriculum.modules || []).map(m => `${m.title}: ${m.description}`).join(' | ')}\n` : ''}
If a question is outside the lesson/course scope, answer from general knowledge.
Be encouraging but honest. Use examples, analogies, and counterexamples.`
      );
      const tutorMsg = { role: 'assistant', content: data.content || data.response || JSON.stringify(data) };
      setMessages(prev => [...prev, tutorMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.line}`, background: dark ? 'rgba(9,10,12,0.92)' : 'rgba(244,242,236,0.92)', backdropFilter: 'blur(12px)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.muted, fontFamily: ff.sans, fontSize: 13, fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>AI Tutor</p>
          <p style={{ fontFamily: ff.sans, fontSize: 12, color: t.primary, fontWeight: 600 }}>{lessonTitle}</p>
        </div>
        <div style={{ width: 16 }}/>
      </div>

      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <p style={{ fontFamily: ff.serif, fontSize: 18, fontWeight: 700, color: t.txt, marginBottom: 8 }}>Your personal tutor</p>
            <p style={{ fontFamily: ff.sans, fontSize: 13, color: t.muted, lineHeight: 1.65, maxWidth: 280, margin: '0 auto' }}>
              Ask anything about this lesson, the module, or the broader course. I can explain concepts, give examples, or quiz you.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.pDim, border: `1px solid ${t.pLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, fontSize: 14 }}>
                📖
              </div>
            )}
            <div style={{ maxWidth: '75%', background: msg.role === 'user' ? t.primary : t.surface, color: msg.role === 'user' ? '#000' : t.txt, borderRadius: 16, padding: '12px 16px', fontFamily: ff.sans, fontSize: 14, border: msg.role === 'user' ? 'none' : `1px solid ${t.line}` }}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.pDim, border: `1px solid ${t.pLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, fontSize: 14 }}>📖</div>
            <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16, padding: '12px 16px' }}>
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
                <span style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted }}>Thinking…</span>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', borderTop: `1px solid ${t.line}`, background: dark ? 'rgba(9,10,12,0.95)' : 'rgba(244,242,236,0.95)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about this lesson…"
            rows={1}
            style={{
              flex: 1, background: t.bg, border: `1px solid ${t.lineMd}`,
              borderRadius: 12, padding: '10px 14px',
              fontFamily: ff.sans, fontSize: 14, color: t.txt,
              resize: 'none', maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            style={{ width: 42, height: 42, borderRadius: 12, background: input.trim() ? t.primary : t.surface, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={input.trim() ? '#000' : t.muted}>
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          </button>
        </div>
        <p style={{ fontFamily: ff.sans, fontSize: 10, color: t.faint, marginTop: 6, textAlign: 'center' }}>Shift+Enter for new line · Enter to send</p>
      </div>
    </div>
  );
}

/* ─── ROOT ─── */
const DEFAULT_PROGRESS = {};
const DEFAULT_MEMORY = { cards: [], history: [] };

export default function App() {
  const [dark, setDark] = useState(() => loadStorage(STORAGE_KEYS.dark, true));
  const t = dark ? DARK : LIGHT;
  const ctx = { t, dark, toggle: () => {
    const next = !dark;
    saveStorage(STORAGE_KEYS.dark, next);
    setDark(next);
  }};

  const { user, authLoading, authError, guestMode, handleLogout, handleGuest, exitGuest, saveToSupabase, loadUserData, handleLogin, handleSignup, handleOAuth } = useAuth();
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) setAuthTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  useEffect(() => {
    if (!user) {
      setUserDataLoaded(true);
      return;
    }
    const loadData = async () => {
      const data = await loadUserData();
      if (data) {
        if (data.journeys) setJourneys(data.journeys);
        if (data.activeJourneyId !== undefined) setActiveJourneyId(data.activeJourneyId);
        if (data.progress) setProgress(data.progress);
        if (data.memory) setMemory(data.memory);
        if (data.lessons) setLessons(data.lessons);
        if (data.badges) setBadges(data.badges);
        if (data.dark !== undefined) setDark(data.dark);
      }
      setUserDataLoaded(true);
    };
    loadData();
  }, [user, loadUserData]);

  const [tab, setTab] = useState('gen');
  const [subview, setSubview] = useState(null);
  const [skill, setSkill] = useState('');
  const [journeys, setJourneys] = useLocalStorage(STORAGE_KEYS.journeys, []);
  const [activeJourneyId, setActiveJourneyId] = useLocalStorage(STORAGE_KEYS.activeJourney, null);
  const [curriculum, setCurriculum] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeMod, setActiveMod] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [arenaCards, setArenaCards] = useState(null);
  const [arenaTitle, setArenaTitle] = useState('');
  const [arenaReturnTo, setArenaReturnTo] = useState(null);
  const [progress, setProgress] = useLocalStorage(STORAGE_KEYS.progress, DEFAULT_PROGRESS);
  const [memory, setMemory] = useLocalStorage(STORAGE_KEYS.memory, DEFAULT_MEMORY);
  const [lessons, setLessons] = useLocalStorage(STORAGE_KEYS.lessons, {});
  const [badges, setBadges] = useLocalStorage(STORAGE_KEYS.badges, []);
  const [examData, setExamData] = useState(null);
  const [examLoading, setExamLoading] = useState(false);
  const [tutorActive, setTutorActive] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user || !userDataLoaded) return;
    saveToSupabase({ journeys, activeJourneyId, progress, memory, lessons, badges, dark });
  }, [user, userDataLoaded, journeys, activeJourneyId, progress, memory, lessons, badges, dark]);

  useEffect(() => {
    if (!activeJourneyId && journeys.length > 0) {
      setActiveJourneyId(journeys[0].id);
    }
  }, [activeJourneyId, journeys]);

  useEffect(() => {
    const j = journeys.find(j => j.id === activeJourneyId);
    setCurriculum(j?.curriculum || null);
  }, [activeJourneyId, journeys]);

  const ready = (guestMode || !authLoading || authTimedOut) && (!user || userDataLoaded);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${t.line}`, borderTopColor: t.primary }}/>
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <Ctx.Provider value={ctx}>
        <style>{BASE}</style>
        <AuthView
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGuest={handleGuest}
          onOAuth={handleOAuth}
          error={authError}
          t={t}
          dark={dark}
        />
      </Ctx.Provider>
    );
  }

  const getProgress = (journeyId) => {
    return progress[journeyId] || { xp: 0, completed: {}, streak: 0, lastVisit: null };
  };

  const setJourneyProgress = (journeyId, updater) => {
    setProgress(p => ({ ...p, [journeyId]: typeof updater === 'function' ? updater(p[journeyId] || { xp: 0, completed: {}, streak: 0, lastVisit: null }) : updater }));
  };

  const generate = async (skillName, scope) => {
    setSkill(skillName); setErr(''); setGenerating(true);
    const cfg = SCOPE_CONFIG[scope] || SCOPE_CONFIG['Standard'];
    try {
      const data = await callAI(
        `Create a curriculum for: "${skillName}"`,
        `World-class curriculum designer. Return ONLY JSON:
{"title":"","description":"2 sentences","estimatedHours":<n>,"level":"Beginner|Intermediate|Advanced","modules":[{"id":"m1","title":"","description":"1 sentence","icon":"<emoji>","estimatedHours":<n>,"lessons":[{"id":"m1l1","title":"","duration":"X min","type":"core|practice|project"}]}]}
MANDATORY: ${cfg.modDesc} ${cfg.lesDesc}
CRITICAL: ${cfg.contentHint}`
      );
      const jid = `j_${Date.now()}`;
      const journey = { id: jid, skill: skillName, scope, curriculum: data, createdAt: Date.now() };
      setJourneys(prev => [...prev, journey]);
      setActiveJourneyId(jid);
      setTab('journey');
    } catch {
      setErr('Failed to generate curriculum. Please try again.');
    }
    setGenerating(false);
  };

  const openLesson = async (mod, lesson) => {
    setActiveMod(mod); setActiveLesson(lesson);
    const cacheKey = `${activeJourneyId}_${lesson.id}`;
    const cached = lessons[cacheKey];
    if (cached) {
      setLessonData(cached); setLessonLoading(false); setSubview('lesson');
      return;
    }
    setLessonData(null); setLessonLoading(true); setSubview('lesson');
    const cfg = SCOPE_CONFIG[curriculum?.scope] || SCOPE_CONFIG['Standard'];
    try {
      const data = await callAI(
        `Write a detailed lesson: "${lesson.title}" in "${mod.title}" for a "${skill}" course.`,
        `Expert university-level educator. Return ONLY JSON:
{"title":"","summary":"2 sentences","sections":[{"heading":"","content":"<n>-word paragraph"}],"keyPoints":["x5"],"resources":[{"title":"","description":"1 sentence","icon":"<emoji>"}],"quiz":[{"question":"","options":["","","",""],"correct":<0-3>,"explanation":""}],"flashcards":[{"front":"term","back":"definition"}]}
MUST contain ${cfg.numSections} sections. Each section MUST be ${cfg.lesWordCount} words minimum — NO shorter, NO fluff.
${curriculum?.scope === 'Mastery' ? `MASTERY LEVEL — NO STONE LEFT UNTURNED. This must read like a top-tier university lecture. Cover: historical context and motivation, formal definitions with notation, complete derivations step-by-step, multiple solved examples at increasing difficulty, common misconceptions with corrections, prerequisite knowledge links, edge cases, real-world applications, and performance/accuracy tradeoffs. Every section must contain entirely new information — zero repetition across sections.` : curriculum?.scope === 'Standard' ? `Provide thorough explanations, one detailed worked example, conceptual depth, and brief practical application.` : `Provide a concise overview with essential concepts and one clear worked example.`}
For STEM/math/physics: include formal mathematical notation, complete derivations, at least 2 worked examples (one basic, one advanced), and common student misconceptions.
For code/programming: include algorithm analysis (time + space complexity), complete working implementation with line-by-line comment explanations, test cases, performance tradeoffs, and real-world usage patterns.
5 keyPoints, 3 resources, 5 quiz Qs (mix of conceptual and application), 6 flashcards.`, 'auto', skill
      );
      setLessonData(data);
      setLessons(l => ({ ...l, [cacheKey]: data }));
    } catch {
      setErr('Failed to load lesson. Please try again.');
    }
    setLessonLoading(false);
  };

  const regenerateLesson = async (mod, lesson, instructions) => {
    const cacheKey = `${activeJourneyId}_${lesson.id}`;
    const cfg = SCOPE_CONFIG[curriculum?.scope] || SCOPE_CONFIG['Standard'];
    try {
      const data = await callAI(
        `Rewrite "${lesson.title}" in "${mod.title}" for "${skill}" course.
Custom instructions: "${instructions}"
This is a ${curriculum?.scope || 'Standard'} level lesson.`,
        `Expert university-level educator. Return ONLY JSON with the adapted lesson:
{"title":"${lesson.title}","summary":"2 sentences reflecting the custom adaptation","sections":[{"heading":"","content":"<n>-word paragraph"}],"keyPoints":["x5"],"resources":[{"title":"","description":"1 sentence","icon":"<emoji>"}],"quiz":[{"question":"","options":["","","",""],"correct":<0-3>,"explanation":""}],"flashcards":[{"front":"term","back":"definition"}]}
MUST contain ${cfg.numSections} sections. Each section MUST be ${cfg.lesWordCount} words minimum.
${curriculum?.scope === 'Mastery' ? `MASTERY — university level. Every concept must be developed from first principles, with complete derivations, multiple difficulty-tiered examples, misconceptions addressed, and real-world context. No repetition, no padding.` : `Thorough but accessible. Apply the custom instructions throughout while maintaining quality.`}
For code topics: include full implementation with explanations, complexity analysis, and test cases.
5 keyPoints, 3 resources, 5 quiz Qs, 6 flashcards.`, 'auto', skill
      );
      setLessons(l => ({ ...l, [cacheKey]: data }));
      setLessonData(data);
      return true;
    } catch {
      setErr('Failed to regenerate lesson.');
      return false;
    }
  };

  const MS_PER_DAY = 86400000;
const XP_PER_LESSON = 50;
const XP_PER_ARENA = 20;
const HISTORY_LIMIT = 100;

const complete = (id) => {
    if (!activeJourneyId) return;
    const lesson = curriculum?.modules?.flatMap(m => m.lessons)?.find(l => l.id === id);
    const modTitle = curriculum?.modules?.find(m => m.lessons?.some(l => l.id === id))?.title;
    if (!lesson) return;
    setJourneyProgress(activeJourneyId, p => {
      const now = Date.now();
      const lastVisit = p.lastVisit || 0;
      const daysSince = lastVisit ? (now - lastVisit) / MS_PER_DAY : Infinity;
      const brokenStreak = daysSince > 1;
      return {
        ...p, completed: { ...p.completed, [id]: true },
        xp: p.xp + XP_PER_LESSON,
        streak: brokenStreak ? 1 : (p.streak || 0) + 1,
        lastVisit: now,
      };
    });
    setMemory(m => ({
      ...m,
      cards: [...(m.cards || []).filter(c => c.lessonId !== id), { lessonId: id, title: lesson.title, module: modTitle, journeyId: activeJourneyId, learnedAt: Date.now(), nextReview: Date.now() + MS_PER_DAY, interval: 1, rep: 0, ease: 2.5 }],
      history: [{ type: 'lesson_complete', id, title: lesson.title, journeyId: activeJourneyId, ts: Date.now() }, ...(m.history || [])].slice(0, HISTORY_LIMIT),
    }));
    setTimeout(() => activateBadges(), 100);
  };

  const openArena = (cards, title) => {
    setArenaCards(cards); setArenaTitle(title); setArenaReturnTo(subview === 'lesson' ? 'lesson' : null); setSubview('arena');
  };

  const arenaDone = (ratings, ratedCards) => {
    if (!activeJourneyId) return;
    setJourneyProgress(activeJourneyId, p => ({ ...p, xp: p.xp + XP_PER_ARENA }));
    if (ratedCards && ratedCards.length > 0) {
      setMemory(m => {
        const ratingMap = {};
        ratedCards.forEach(rc => { ratingMap[rc.lessonId || rc.id] = rc.rating; });
        const updatedCards = (m.cards || []).map(c => {
          const r = ratingMap[c.lessonId || c.id];
          if (r === undefined) return c;
          const q = r === 'easy' ? 5 : r === 'good' ? 4 : 2;
          const { ease, interval, rep } = sm2(c.ease || 2.5, c.interval || 1, c.rep || 0, q);
          return { ...c, ease, interval, rep, nextReview: Date.now() + interval * 86400000 };
        });
        return { ...m, cards: updatedCards, history: [{ type: 'arena_done', title: arenaTitle, ts: Date.now() }, ...(m.history || [])].slice(0, 100) };
      });
    } else {
      setMemory(m => ({ ...m, history: [{ type: 'arena_done', title: arenaTitle, ts: Date.now() }, ...(m.history || [])].slice(0, 100) }));
    }
  };

  const launchDailyArena = () => {
    if (!curriculum) return;
    const dueCards = (memory.cards || []).filter(c => c.journeyId === activeJourneyId && (!c.nextReview || c.nextReview <= Date.now()));
    if (dueCards.length > 0) {
      openArena(dueCards.map(c => ({ ...c, front: c.title, back: `Module: ${c.module}` })), `${curriculum.title} — Review`);
    } else {
      const cards = (curriculum.modules || []).flatMap(m =>
        m.lessons.map(l => ({ front: l.title, back: m.description || `Review this in the lesson.` }))
      ).slice(0, 8);
      openArena(cards, curriculum.title);
    }
  };

  const getDueCards = () => (memory.cards || []).filter(c => c.journeyId === activeJourneyId && (!c.nextReview || c.nextReview <= Date.now()));

  const switchJourney = (id) => {
    const j = journeys.find(j => j.id === id);
    if (j) setSkill(j.skill);
    setActiveJourneyId(id); setSubview(null);
  };

  const activateBadges = () => {
    const earned = badges.map(b => b.id);
    const p = getProgress(activeJourneyId);
    const newIds = checkNewBadges(p, progress, earned);

    if (!earned.includes('module_master') && curriculum) {
      for (const mod of curriculum.modules) {
        if (mod.lessons.every(l => p.completed[l.id])) {
          newIds.push('module_master');
          break;
        }
      }
    }
    if (!earned.includes('pathfinder') && curriculum) {
      if (curriculum.modules.every(m => m.lessons.every(l => p.completed[l.id]))) {
        newIds.push('pathfinder');
      }
    }

    if (newIds.length > 0) {
      const newBadges = newIds.map(id => ({ id, earnedAt: Date.now() }));
      setBadges(prev => [...prev, ...newBadges]);
      if (newIds.length === 1) {
        const b = BADGE_DEFS.find(x => x.id === newIds[0]);
        setErr(`🏆 Badge unlocked: ${b?.label}!`);
        setTimeout(() => setErr(''), 3000);
      } else {
        setErr(`🏆 ${newIds.length} new badges unlocked!`);
        setTimeout(() => setErr(''), 3000);
      }
    }
  };

  const startExam = async () => {
    if (!curriculum || !activeJourneyId) return;
    const cacheKey = `${activeJourneyId}_exam`;
    const cached = lessons[cacheKey];
    if (cached) {
      setExamData(cached); setExamLoading(false); setSubview('exam');
      return;
    }
    setExamData(null); setExamLoading(true); setSubview('exam');
    try {
      const data = await callAI(
        `Create a comprehensive final exam for the "${curriculum?.title}" curriculum covering: ${(curriculum?.modules || []).map(m => m.title).join(', ')}.`,
        `Expert examiner. Return ONLY JSON with a comprehensive exam:
{"title":"${curriculum.title} Final Exam","questions":[{"question":"","options":["","","",""],"correct":<0-3>,"explanation":""}]}
Exactly 10 questions covering all modules.`
      );
      const exam = { title: data.title || `${curriculum.title} Final Exam`, questions: data.questions || data.quiz || [] };
      setExamData(exam);
      setLessons(l => ({ ...l, [cacheKey]: exam }));
    } catch {
      setErr('Failed to generate exam. Please try again.');
    }
    setExamLoading(false);
  };

  const completeExam = (score, total) => {
    if (!activeJourneyId) return;
    const pct = Math.round((score / total) * 100);
    setJourneyProgress(activeJourneyId, p => ({ ...p, xp: p.xp + score * 30, examPassed: pct >= 60 || p.examPassed }));
    setTimeout(() => activateBadges(), 100);
  };

  const deleteJourney = (id) => {
    setJourneys(prev => prev.filter(j => j.id !== id));
    setProgress(p => { const n = { ...p }; delete n[id]; return n; });
    setMemory(m => ({ ...m, cards: (m.cards || []).filter(c => c.journeyId !== id), history: (m.history || []).filter(h => h.journeyId !== id) }));
    if (activeJourneyId === id) {
      const remaining = journeys.filter(j => j.id !== id);
      setActiveJourneyId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const exportData = () => {
    const data = { journeys, progress, memory, lessons, badges, dark, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `skillforge-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.journeys) setJourneys(data.journeys);
        if (data.progress) setProgress(p => ({ ...p, ...data.progress }));
        if (data.memory) setMemory(data.memory);
        if (data.lessons) setLessons(data.lessons);
        if (data.badges) setBadges(data.badges);
        if (typeof data.dark === 'boolean') { setDark(data.dark); saveStorage(STORAGE_KEYS.dark, data.dark); }
        setErr('');
      } catch { setErr('Failed to import data. Invalid file format.'); }
    };
    reader.readAsText(file);
  };

  const showNav = !subview && !generating;

  return (
    <Ctx.Provider value={ctx}>
      <style>{BASE}</style>

      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        background: t.bg,
        borderBottom: `1px solid ${t.line}`,
      }}>
        <span style={{ fontFamily: ff.serif, fontSize: 18, fontWeight: 700, color: t.txt, letterSpacing: '-0.3px' }}>
          SkillsForge
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={ctx.toggle}
            style={{ width: 30, height: 30, borderRadius: 7, background: t.surface, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.muted, fontSize: 13 }}>
            {dark ? '○' : '●'}
          </button>
          {guestMode ? (
            <button onClick={exitGuest}
              style={{ height: 30, padding: '0 10px', borderRadius: 7, background: t.surface, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 4, color: t.amber, fontSize: 12, fontFamily: ff.sans }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Exit Guest
            </button>
          ) : user ? (
            <button onClick={handleLogout}
              style={{ height: 30, padding: '0 10px', borderRadius: 7, background: t.surface, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 4, color: t.muted, fontSize: 12, fontFamily: ff.sans }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          ) : null}
        </div>
      </div>

      {/* error toast */}
      <AnimatePresence>
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setErr('')}
            style={{
              position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
              background: t.surface, border: `1px solid ${t.rLine}`,
              borderRadius: 10, padding: '9px 16px',
              fontFamily: ff.sans, fontSize: 13, color: t.danger,
              zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              cursor: 'pointer', maxWidth: 380, whiteSpace: 'nowrap',
            }}>
            {err}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: t.bg }}>
        <AnimatePresence mode="wait">
          {generating && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GeneratingView skill={skill}/>
            </motion.div>
          )}

          {!generating && subview === 'lesson' && (
            <motion.div key="lesson" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.24 }}>
              <LessonView
                lessonData={lessonData}
                loading={lessonLoading}
                moduleTitle={activeMod?.title}
                lessonId={activeLesson?.id}
                progress={getProgress(activeJourneyId)}
                onQuiz={(q, title) => { setQuizData({ q, title }); setSubview('quiz'); }}
                onFlashcards={openArena}
                onComplete={complete}
                onBack={() => setSubview(null)}
                onTutor={() => setSubview('tutor')}
              />
            </motion.div>
          )}

          {!generating && subview === 'quiz' && quizData?.q && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizView
                quiz={quizData.q}
                lessonTitle={quizData.title}
                onComplete={(s) => activeJourneyId && setJourneyProgress(activeJourneyId, p => ({ ...p, xp: p.xp + s * XP_PER_LESSON }))}
                onBack={() => setSubview('lesson')}
              />
            </motion.div>
          )}

          {!generating && subview === 'tutor' && (
            <motion.div key="tutor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TutorView
                lessonData={lessonData}
                lessonTitle={activeLesson?.title || lessonData?.title}
                moduleTitle={activeMod?.title}
                skill={skill}
                curriculum={curriculum}
                onBack={() => setSubview('lesson')}
              />
            </motion.div>
          )}

          {!generating && subview === 'arena' && arenaCards && (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ArenaView
                cards={arenaCards}
                lessonTitle={arenaTitle}
                onBack={() => setSubview(arenaReturnTo === 'lesson' ? 'lesson' : null)}
                onDone={arenaDone}
              />
            </motion.div>
          )}

          {!generating && subview === 'exam' && (
            <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {examLoading ? (
                <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${t.line}`, borderTopColor: t.primary, marginBottom: 20 }}/>
                  <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted }}>Generating final exam…</p>
                </div>
              ) : examData?.questions ? (
                <QuizView
                  quiz={examData.questions}
                  lessonTitle={examData.title}
                  onComplete={completeExam}
                  onBack={() => setSubview(null)}
                />
              ) : (
                <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                  <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted }}>Exam data not available.</p>
                </div>
              )}
            </motion.div>
          )}

          {!generating && !subview && (
            <motion.div key="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {tab === 'gen' && <HomeView onGenerate={generate}/>}
              {tab === 'journey' && (
                <JourneyView
                  journeys={journeys}
                  activeJourneyId={activeJourneyId}
                  curriculum={curriculum}
                  progress={getProgress(activeJourneyId)}
                  memory={memory}
                  badges={badges}
                  onLesson={openLesson}
                  onArena={launchDailyArena}
                  onTab={setTab}
                  onSwitch={switchJourney}
                  onDelete={deleteJourney}
                  onExport={exportData}
                  onImport={importData}
                  dueCards={getDueCards().length}
                />
              )}
              {tab === 'tree' && (
                <SkillTreeView
                  journeys={journeys}
                  activeJourneyId={activeJourneyId}
                  curriculum={curriculum}
                  progress={getProgress(activeJourneyId)}
                  onLesson={openLesson}
                  onTab={setTab}
                  onSwitch={switchJourney}
                  onStartExam={startExam}
                  onRegenerate={regenerateLesson}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showNav && <BottomNav tab={tab} setTab={setTab}/>}
      </div>
    </Ctx.Provider>
  );
}