import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body, #root { background: #F5F3EE; min-height: 100vh; }
input, textarea { font-family: inherit; }
input:focus { outline: none; }
button { cursor: pointer; font-family: inherit; border: none; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
::selection { background: #C3E6CB; color: #0A2E14; }
.lesson-layout { display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }
@media (max-width: 820px) { .lesson-layout { grid-template-columns: 1fr !important; } }
`;

const T = {
  forest: '#0A1E10', forestMd: '#142A1A', forestHov: '#1A3520',
  cream: '#F5F3EE', white: '#FFFFFF', paper: '#FAFAF7',
  green: '#1A7A3C', greenHov: '#15632F', greenLt: '#E9F5EE', greenTxt: '#0F5C2A',
  amber: '#C97A10', amberLt: '#FEF3C7', amberMd: '#F59E0B',
  blue: '#1D4ED8', blueLt: '#EFF6FF', blueTxt: '#1E40AF',
  red: '#DC2626', redLt: '#FEF2F2',
  purple: '#7C3AED', purpleLt: '#F3F0FF',
  txt: '#0D1117', muted: '#4B5563', dim: '#9CA3AF',
  border: 'rgba(0,0,0,0.07)', borderMd: 'rgba(0,0,0,0.12)',
};
const ff = { serif: "'Fraunces', Georgia, serif", sans: "'DM Sans', sans-serif", mono: "'JetBrains Mono', monospace" };

async function callAI(userMsg, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: system + "\n\nReturn ONLY valid JSON. No markdown fences, no preamble, no trailing text.",
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  const d = await r.json();
  const raw = d.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

/* ── PRIMITIVES ── */
function Tag({ label, color = T.green, bg = T.greenLt }) {
  return <span style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.4, color, background: bg, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{label}</span>;
}
function Badge({ children, color = T.greenTxt, bg = T.greenLt }) {
  return <span style={{ fontFamily: ff.sans, fontSize: 12, fontWeight: 600, color, background: bg, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{children}</span>;
}
function ProgressBar({ pct, color = T.green, height = 5, delay = 0 }) {
  return (
    <div style={{ height, background: T.border, borderRadius: height, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: [0.22,1,0.36,1], delay }}
        style={{ height: '100%', background: color, borderRadius: height }} />
    </div>
  );
}
function Ring({ pct = 0, size = 36, stroke = 2.5, color = T.green }) {
  const r = (size - stroke * 2) / 2, c = r * 2 * Math.PI;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct/100)*c }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}/>
    </svg>
  );
}
function Card({ children, style, onClick }) {
  const [h, sH] = useState(false);
  return (
    <motion.div onHoverStart={() => sH(true)} onHoverEnd={() => sH(false)} onClick={onClick}
      style={{ background: T.white, border: `1px solid ${h && onClick ? T.borderMd : T.border}`,
        borderRadius: 12, boxShadow: h && onClick ? '0 4px 16px rgba(0,0,0,0.07)' : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s, box-shadow 0.15s', ...style }}>
      {children}
    </motion.div>
  );
}
function Btn({ children, onClick, variant = 'primary', style, disabled, full }) {
  const [h, sH] = useState(false);
  const vs = {
    primary: { bg: T.green, hov: T.greenHov, clr: '#fff', b: 'none', sh: '0 1px 3px rgba(26,122,60,0.3)' },
    outline: { bg: T.white, hov: T.cream, clr: T.txt, b: `1px solid ${T.borderMd}`, sh: '0 1px 2px rgba(0,0,0,0.04)' },
    ghost:   { bg: 'transparent', hov: 'rgba(0,0,0,0.04)', clr: T.muted, b: `1px solid ${T.border}`, sh: 'none' },
    danger:  { bg: T.redLt, hov: '#fde0e0', clr: T.red, b: `1px solid rgba(220,38,38,0.2)`, sh: 'none' },
    success: { bg: T.greenLt, hov: '#d5eddd', clr: T.greenTxt, b: `1px solid rgba(26,122,60,0.18)`, sh: 'none' },
    dark:    { bg: T.forest, hov: T.forestHov, clr: '#E8F5EC', b: 'none', sh: '0 1px 4px rgba(0,0,0,0.25)' },
  };
  const s = vs[variant] || vs.primary;
  return (
    <motion.button whileTap={!disabled ? { scale: 0.97 } : {}}
      onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)}
      onClick={onClick} disabled={disabled}
      style={{ background: h && !disabled ? s.hov : s.bg, color: s.clr, border: s.b,
        boxShadow: s.sh, borderRadius: 8, padding: '9px 18px', fontFamily: ff.sans,
        fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
        width: full ? '100%' : 'auto', justifyContent: full ? 'center' : 'flex-start',
        opacity: disabled ? 0.5 : 1, transition: 'background 0.15s', cursor: disabled ? 'not-allowed' : 'pointer', ...style }}>
      {children}
    </motion.button>
  );
}

/* ── SIDEBAR ── */
const NAV = [
  { id: 'curriculum', icon: '◫', label: 'My Path' },
  { id: 'progress',   icon: '◎', label: 'Progress' },
];

function Sidebar({ view, onNav, xp, completedCount, totalLessons }) {
  const level = Math.floor(xp / 200) + 1;
  return (
    <motion.aside initial={{ x: -220 }} animate={{ x: 0 }} transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}
      style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 210,
        background: T.forest, zIndex: 100, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.04)' }}>

      <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>⚡</div>
          <span style={{ fontFamily: ff.serif, fontSize: 17, fontWeight: 700, color: '#E8F5EC', letterSpacing: '-0.2px' }}>Forge</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = view === item.id || (item.id === 'curriculum' && ['lesson','quiz','flashcards'].includes(view));
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px',
                borderRadius: 7, background: active ? 'rgba(34,163,80,0.16)' : 'transparent',
                border: active ? '1px solid rgba(34,163,80,0.28)' : '1px solid transparent',
                color: active ? '#7DDA9B' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.13s', cursor: 'pointer',
                fontFamily: ff.sans, fontSize: 13.5, fontWeight: active ? 600 : 400 }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}}>
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '10px 12px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontFamily: ff.sans, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Level {level}</span>
            <span style={{ fontFamily: ff.mono, fontSize: 10, color: '#7DDA9B', fontWeight: 600 }}>{xp} XP</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${(xp % 200) / 200 * 100}%` }}
              style={{ height: '100%', background: T.green, borderRadius: 2 }} transition={{ duration: 0.6 }}/>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

/* ── HOME ── */
const SUGGESTIONS = [
  { label: 'Python',        emoji: '🐍', color: T.blue,   bg: T.blueLt   },
  { label: 'UI/UX Design',  emoji: '🎨', color: T.amber,  bg: T.amberLt  },
  { label: 'Web Dev',       emoji: '🌐', color: T.green,  bg: T.greenLt  },
  { label: 'Data Science',  emoji: '📊', color: T.purple, bg: T.purpleLt },
  { label: 'Machine Learning', emoji: '🤖', color: T.blue, bg: T.blueLt  },
  { label: 'Photography',   emoji: '📷', color: '#DB2777', bg: '#FDF2F8' },
  { label: 'Public Speaking', emoji: '🎤', color: T.green, bg: T.greenLt },
  { label: 'Marketing',     emoji: '📣', color: T.amber,  bg: T.amberLt  },
];

function HomeView({ onGenerate }) {
  const [val, setVal] = useState('');
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 350); }, []);
  const go = (v) => { const s = (v || val).trim(); if (s) onGenerate(s); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: T.cream }}>
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22,1,0.36,1] }}
        style={{ width: '100%', maxWidth: 540, textAlign: 'center' }}>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            background: T.greenLt, border: `1px solid rgba(26,122,60,0.18)`,
            borderRadius: 999, padding: '5px 14px 5px 8px', marginBottom: 26 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: T.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⚡</div>
          <span style={{ fontFamily: ff.sans, fontSize: 12, fontWeight: 600, color: T.greenTxt }}>AI-Powered Curriculum</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          style={{ fontFamily: ff.serif, fontSize: 'clamp(36px,7vw,62px)', fontWeight: 800,
            color: T.txt, letterSpacing: '-2px', lineHeight: 1.04, marginBottom: 14 }}>
          Master any skill<br />
          <em style={{ fontStyle: 'italic', color: T.green }}>from scratch.</em>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}
          style={{ fontFamily: ff.sans, fontSize: 15.5, color: T.muted, lineHeight: 1.68,
            marginBottom: 32, maxWidth: 430, margin: '0 auto 32px' }}>
          Tell the AI what you want to learn. It builds your full curriculum — lessons, quizzes, flashcards — instantly.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: T.white, border: `1px solid ${T.borderMd}`, borderRadius: 10,
            padding: '10px 15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ color: T.dim, fontSize: 15 }}>🔍</span>
            <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()}
              placeholder="e.g. Machine learning, Guitar, Python…"
              style={{ flex: 1, border: 'none', background: 'none', fontFamily: ff.sans, fontSize: 15, color: T.txt }}/>
          </div>
          <Btn variant="primary" onClick={() => go()} disabled={!val.trim()}
            style={{ padding: '10px 22px', borderRadius: 10, flexShrink: 0 }}>
            Build →
          </Btn>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.26 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
          {SUGGESTIONS.map((s, i) => (
            <motion.button key={s.label}
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => go(s.label)}
              style={{ background: s.bg, border: `1px solid rgba(0,0,0,0.06)`, borderRadius: 999,
                padding: '6px 14px', fontFamily: ff.sans, fontSize: 13, fontWeight: 500,
                color: s.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {s.emoji} {s.label}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── GENERATING ── */
const GEN_STEPS = ['Analysing skill requirements…', 'Structuring learning modules…', 'Writing lesson outlines…', 'Finalising curriculum blueprint…'];
function GeneratingView({ skill }) {
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(5);
  useEffect(() => {
    const t = setInterval(() => { setStep(s => Math.min(s+1,GEN_STEPS.length-1)); setPct(p => Math.min(p+22,92)); }, 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.cream, padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.border}`,
            borderTopColor: T.green, margin: '0 auto 24px' }}/>
        <h2 style={{ fontFamily: ff.serif, fontSize: 28, fontWeight: 700, color: T.txt, letterSpacing: '-0.5px', marginBottom: 5 }}>
          Building your path
        </h2>
        <p style={{ fontFamily: ff.sans, color: T.muted, fontSize: 14, marginBottom: 24 }}>
          Personalising curriculum for <strong style={{ color: T.txt, fontWeight: 600 }}>{skill}</strong>
        </p>
        <Card style={{ padding: '18px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
            <AnimatePresence mode="wait">
              <motion.span key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ fontFamily: ff.sans, fontSize: 13, color: T.muted }}>{GEN_STEPS[step]}</motion.span>
            </AnimatePresence>
            <span style={{ fontFamily: ff.mono, fontSize: 12, color: T.green, fontWeight: 600 }}>{pct}%</span>
          </div>
          <ProgressBar pct={pct} color={T.green} height={4}/>
        </Card>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2,3].map(i => (
            <motion.div key={i} animate={{ opacity: [0.25, 0.6, 0.25] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.18 }}
              style={{ flex: 1, height: 72, background: T.white, borderRadius: 10, border: `1px solid ${T.border}` }}/>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── CURRICULUM ── */
const ACCENTS = [
  { color: T.green,  bg: T.greenLt,  txt: T.greenTxt },
  { color: T.blue,   bg: T.blueLt,   txt: T.blueTxt  },
  { color: T.amber,  bg: T.amberLt,  txt: T.amber    },
  { color: T.purple, bg: T.purpleLt, txt: '#5B21B6'  },
  { color: '#DB2777', bg: '#FDF2F8', txt: '#9D174D'  },
];

function LessonRow({ lesson, completed, onSelect }) {
  const ts = { core: [T.blue, T.blueLt], practice: [T.amber, T.amberLt], project: [T.green, T.greenLt] };
  const [c, bg] = ts[lesson.type] || ts.core;
  return (
    <motion.div whileHover={{ x: 2 }} onClick={() => onSelect(lesson)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px',
        borderRadius: 7, cursor: 'pointer', transition: 'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = T.cream}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: completed ? T.green : 'transparent',
        border: `1.5px solid ${completed ? T.green : T.dim}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
        {completed && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ flex: 1, fontFamily: ff.sans, fontSize: 13.5, color: completed ? T.dim : T.txt,
        textDecoration: completed ? 'line-through' : 'none', textDecorationColor: T.dim }}>
        {lesson.title}
      </span>
      <Tag label={lesson.type} color={c} bg={bg}/>
      <span style={{ fontFamily: ff.mono, fontSize: 10, color: T.dim, flexShrink: 0 }}>{lesson.duration}</span>
    </motion.div>
  );
}

function ModuleCard({ mod, accentSet, completedCount, onSelectLesson }) {
  const [open, setOpen] = useState(false);
  const pct = mod.lessons.length > 0 ? Math.round((completedCount / mod.lessons.length) * 100) : 0;
  return (
    <Card>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '16px 18px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: accentSet.bg,
            border: `1px solid rgba(0,0,0,0.06)`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{mod.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
              <h3 style={{ fontFamily: ff.sans, fontSize: 14.5, fontWeight: 600, color: T.txt,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Ring pct={pct} size={30} stroke={2.5} color={accentSet.color}/>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}
                  style={{ display: 'block', color: T.dim, fontSize: 11 }}>▾</motion.span>
              </div>
            </div>
            <p style={{ fontFamily: ff.sans, fontSize: 12.5, color: T.muted, lineHeight: 1.5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
              {mod.description}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}><ProgressBar pct={pct} color={accentSet.color} height={3}/></div>
              <span style={{ fontFamily: ff.mono, fontSize: 10, color: T.dim, flexShrink: 0 }}>{completedCount}/{mod.lessons.length}</span>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ height: 1, background: T.border }}/>
            <div style={{ padding: '6px 10px 10px' }}>
              {mod.lessons.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <LessonRow lesson={l} completed={!!progress.completed[l.id]} onSelect={() => onSelectLesson(mod, l)}/>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function CurriculumView({ curriculum, progress, onSelectLesson }) {
  const total = curriculum.modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = Object.keys(progress.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      style={{ padding: '36px 32px 60px', maxWidth: 720, width: '100%' }}>
      <p style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
        color: T.green, textTransform: 'uppercase', marginBottom: 7 }}>Learning Path</p>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: ff.serif, fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 700,
            color: T.txt, letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: 7 }}>{curriculum.title}</h1>
          <p style={{ fontFamily: ff.sans, color: T.muted, fontSize: 14, maxWidth: 460, lineHeight: 1.65 }}>{curriculum.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {[[curriculum.modules.length, 'modules'], [total, 'lessons'], [curriculum.estimatedHours+'h', 'total']].map(([v, l]) => (
            <div key={l} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: '9px 13px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontFamily: ff.mono, fontSize: 17, fontWeight: 600, color: T.txt }}>{v}</div>
              <div style={{ fontFamily: ff.sans, fontSize: 10.5, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <Card style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 600, color: T.txt }}>Overall Progress</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: ff.mono, fontSize: 11.5, color: T.muted }}>{done}/{total}</span>
            <Badge>{pct}%</Badge>
          </div>
        </div>
        <ProgressBar pct={pct} height={6} delay={0.2}/>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {curriculum.modules.map((mod, i) => {
          const ac = ACCENTS[i % ACCENTS.length];
          const mc = mod.lessons.filter(l => progress.completed[l.id]).length;
          return (
            <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}>
              <ModuleCard mod={mod} accentSet={ac} completedCount={mc} onSelectLesson={onSelectLesson}/>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── PROGRESS ── */
function ProgressView({ curriculum, progress }) {
  const total = curriculum ? curriculum.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;
  const done = Object.keys(progress.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const level = Math.floor(progress.xp / 200) + 1;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      style={{ padding: '36px 32px 60px', maxWidth: 680, width: '100%' }}>
      <p style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
        color: T.green, textTransform: 'uppercase', marginBottom: 7 }}>Progress</p>
      <h1 style={{ fontFamily: ff.serif, fontSize: 34, fontWeight: 700, color: T.txt,
        letterSpacing: '-1px', marginBottom: 24 }}>Your Stats</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Level', value: level, icon: '🏅' },
          { label: 'Total XP', value: progress.xp, icon: '⚡' },
          { label: 'Completed', value: done, icon: '✅' },
          { label: 'XP to Next', value: 200 - (progress.xp % 200), icon: '🎯' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
            <div style={{ fontFamily: ff.mono, fontSize: 22, fontWeight: 600, color: T.txt, marginBottom: 1 }}>{s.value}</div>
            <div style={{ fontFamily: ff.sans, fontSize: 11.5, color: T.muted }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 600, color: T.txt }}>Level {level} → {level + 1}</span>
          <span style={{ fontFamily: ff.mono, fontSize: 11, color: T.muted }}>{progress.xp % 200}/200 XP</span>
        </div>
        <ProgressBar pct={(progress.xp % 200) / 200 * 100} color={T.amber} height={6}/>
      </Card>
      {curriculum && (
        <>
          <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 600, color: T.txt }}>Course Completion</span>
              <Badge>{pct}%</Badge>
            </div>
            <ProgressBar pct={pct} height={6}/>
            <p style={{ fontFamily: ff.mono, fontSize: 11, color: T.dim, marginTop: 7 }}>{done} of {total} lessons</p>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {curriculum.modules.map((mod, i) => {
              const ac = ACCENTS[i % ACCENTS.length];
              const mc = mod.lessons.filter(l => progress.completed[l.id]).length;
              const mp = mod.lessons.length > 0 ? Math.round((mc / mod.lessons.length) * 100) : 0;
              return (
                <Card key={mod.id} style={{ padding: '11px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{mod.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: ff.sans, fontSize: 13, fontWeight: 500, color: T.txt,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.title}</span>
                        <span style={{ fontFamily: ff.mono, fontSize: 10.5, color: T.dim, flexShrink: 0, marginLeft: 8 }}>{mc}/{mod.lessons.length}</span>
                      </div>
                      <ProgressBar pct={mp} color={ac.color} height={3}/>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ── LESSON ── */
function LessonView({ lessonData, loading, moduleTitle, lessonId, progress, onQuiz, onFlashcards, onComplete }) {
  const isDone = progress.completed[lessonId];
  if (loading || !lessonData) {
    return (
      <div style={{ padding: '36px 32px', maxWidth: 720, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${T.border}`, borderTopColor: T.green }}/>
          <span style={{ fontFamily: ff.sans, fontSize: 14, color: T.muted }}>Generating lesson…</span>
        </div>
        {[1, 0.55, 0.8, 0.65, 0.9].map((w, i) => (
          <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
            style={{ height: i === 0 ? 30 : 13, width: `${w*100}%`, background: T.borderMd, borderRadius: 5, marginBottom: i === 0 ? 22 : 9 }}/>
        ))}
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      style={{ padding: '34px 32px 60px', width: '100%', maxWidth: 960 }}>
      <div className="lesson-layout">
        <div>
          <p style={{ fontFamily: ff.mono, fontSize: 10, fontWeight: 600, color: T.dim,
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>{moduleTitle}</p>
          <h1 style={{ fontFamily: ff.serif, fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700,
            color: T.txt, letterSpacing: '-0.8px', lineHeight: 1.15, marginBottom: 9 }}>{lessonData.title}</h1>
          <p style={{ fontFamily: ff.sans, fontSize: 15, color: T.muted, lineHeight: 1.72,
            marginBottom: 24, maxWidth: 560 }}>{lessonData.summary}</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24,
            paddingBottom: 22, borderBottom: `1px solid ${T.border}` }}>
            <Btn variant="outline" onClick={() => onQuiz(lessonData.quiz, lessonData.title)}>🎯 Quiz</Btn>
            <Btn variant="outline" onClick={() => onFlashcards(lessonData.flashcards, lessonData.title)}>🃏 Flashcards</Btn>
            {!isDone
              ? <Btn variant="primary" onClick={() => onComplete(lessonId)}>
                  ✓ Complete · <span style={{ fontFamily: ff.mono, fontSize: 12, opacity: 0.75 }}>+50 XP</span>
                </Btn>
              : <Badge color={T.greenTxt} bg={T.greenLt}>✓ Completed</Badge>
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lessonData.sections?.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card style={{ padding: '18px 20px' }}>
                  <h2 style={{ fontFamily: ff.sans, fontSize: 13.5, fontWeight: 700, color: T.txt,
                    marginBottom: 7, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 3, height: 13, background: T.green, borderRadius: 2, flexShrink: 0 }}/>
                    {s.heading}
                  </h2>
                  <p style={{ fontFamily: ff.sans, fontSize: 14, color: T.muted, lineHeight: 1.8 }}>{s.content}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {lessonData.keyPoints?.length > 0 && (
            <Card style={{ padding: '18px 20px', marginTop: 12, background: T.greenLt, border: `1px solid rgba(26,122,60,0.14)` }}>
              <h3 style={{ fontFamily: ff.sans, fontSize: 11, fontWeight: 700, color: T.greenTxt,
                textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>Key Takeaways</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {lessonData.keyPoints.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: ff.mono, fontSize: 10, color: T.green, fontWeight: 600,
                      background: T.white, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 2 }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <p style={{ fontFamily: ff.sans, fontSize: 14, color: T.greenTxt, lineHeight: 1.65 }}>{pt}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Card style={{ padding: '15px 17px' }}>
            <p style={{ fontFamily: ff.mono, fontSize: 9.5, fontWeight: 600, color: T.dim,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 11 }}>Lesson</p>
            {[['Sections', lessonData.sections?.length||0], ['Key Points', lessonData.keyPoints?.length||0],
              ['Quiz Qs', lessonData.quiz?.length||0], ['Flashcards', lessonData.flashcards?.length||0]].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontFamily: ff.sans, fontSize: 12.5, color: T.muted }}>{k}</span>
                <span style={{ fontFamily: ff.mono, fontSize: 12.5, fontWeight: 500, color: T.txt }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 11, padding: '9px 11px', background: T.amberLt,
              border: `1px solid rgba(201,122,16,0.16)`, borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15 }}>⚡</span>
              <div>
                <div style={{ fontFamily: ff.mono, fontSize: 13, fontWeight: 600, color: T.amber }}>+50–150 XP</div>
                <div style={{ fontFamily: ff.sans, fontSize: 11, color: T.amber, opacity: 0.7 }}>complete + quiz</div>
              </div>
            </div>
          </Card>

          {lessonData.resources?.length > 0 && (
            <Card style={{ padding: '15px 17px' }}>
              <p style={{ fontFamily: ff.mono, fontSize: 9.5, fontWeight: 600, color: T.dim,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 11 }}>Resources</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {lessonData.resources.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, padding: '8px 9px',
                    background: T.cream, borderRadius: 7, border: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontFamily: ff.sans, fontSize: 12.5, fontWeight: 600, color: T.txt, marginBottom: 1 }}>{r.title}</div>
                      <div style={{ fontFamily: ff.sans, fontSize: 11.5, color: T.muted, lineHeight: 1.4 }}>{r.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── QUIZ ── */
function QuizView({ quiz, lessonTitle, onComplete, onBack }) {
  const [cur, setCur] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState([]);
  const [done, setDone] = useState(false);
  const q = quiz[cur];
  const pick = i => { if (!revealed) { setChosen(i); setRevealed(true); } };
  const next = () => {
    const ok = chosen === q.correct;
    const t = [...tally, ok];
    setTally(t);
    if (cur+1 >= quiz.length) { setDone(true); onComplete(t.filter(Boolean).length, quiz.length); }
    else { setCur(c => c+1); setChosen(null); setRevealed(false); }
  };
  if (done) {
    const score = tally.filter(Boolean).length;
    const pct = Math.round((score/quiz.length)*100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '32px 24px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <motion.div animate={{ scale: [0, 1.1, 1] }} transition={{ duration: 0.42 }}
            style={{ fontSize: 60, marginBottom: 18 }}>{pct>=80?'🏆':pct>=60?'🎯':'📚'}</motion.div>
          <h2 style={{ fontFamily: ff.serif, fontSize: 32, fontWeight: 700, color: T.txt, letterSpacing: '-0.8px', marginBottom: 5 }}>
            {pct>=80?'Excellent!':pct>=60?'Good job!':'Keep at it!'}
          </h2>
          <p style={{ fontFamily: ff.sans, color: T.muted, fontSize: 14, marginBottom: 22 }}>
            {score}/{quiz.length} correct on <strong style={{ color: T.txt }}>{lessonTitle}</strong>
          </p>
          <Card style={{ padding: '24px', marginBottom: 18 }}>
            <div style={{ fontFamily: ff.mono, fontSize: 52, fontWeight: 700,
              color: pct>=80?T.green:pct>=60?T.amber:T.blue, marginBottom: 14 }}>{pct}%</div>
            <ProgressBar pct={pct} color={pct>=80?T.green:pct>=60?T.amberMd:T.blue} height={6}/>
            <p style={{ fontFamily: ff.mono, fontSize: 11.5, color: T.muted, marginTop: 9 }}>+{score*20} XP earned</p>
          </Card>
          <Btn variant="outline" onClick={onBack} style={{ margin: '0 auto' }}>← Back to Lesson</Btn>
        </motion.div>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '36px 32px', maxWidth: 600, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <Tag label="Quiz" color={T.blue} bg={T.blueLt}/>
        <div style={{ display: 'flex', gap: 3 }}>
          {quiz.map((_,i) => (
            <div key={i} style={{ width: 26, height: 3.5, borderRadius: 2,
              background: i<tally.length?(tally[i]?T.green:T.red):i===cur?T.blue:T.border,
              transition: 'background 0.2s' }}/>
          ))}
        </div>
      </div>
      <p style={{ fontFamily: ff.sans, fontSize: 12, color: T.muted, marginBottom: 26 }}>
        Question {cur+1} of {quiz.length} — {lessonTitle}
      </p>
      <AnimatePresence mode="wait">
        <motion.div key={cur} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}>
          <Card style={{ padding: '20px 22px', marginBottom: 12 }}>
            <h2 style={{ fontFamily: ff.serif, fontSize: 19, fontWeight: 600, color: T.txt, lineHeight: 1.52 }}>{q.question}</h2>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
            {q.options.map((opt, i) => {
              const isRight = i===q.correct, isSel = i===chosen;
              let bg=T.white, bc=T.border, clr=T.txt;
              if (revealed) {
                if (isRight) { bg=T.greenLt; bc='rgba(26,122,60,0.28)'; clr=T.greenTxt; }
                else if (isSel) { bg=T.redLt; bc='rgba(220,38,38,0.28)'; clr=T.red; }
              }
              return (
                <motion.button key={i} whileHover={!revealed?{x:2}:{}} onClick={() => pick(i)}
                  style={{ background: bg, border: `1px solid ${bc}`, borderRadius: 9,
                    padding: '11px 15px', textAlign: 'left', display: 'flex', alignItems: 'center',
                    gap: 11, fontFamily: ff.sans, fontSize: 14, color: clr,
                    cursor: revealed?'default':'pointer', transition: 'all 0.13s',
                    fontWeight: (isSel||(revealed&&isRight))?600:400,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <span style={{ fontFamily: ff.mono, fontSize: 10.5, color: revealed&&isRight?T.green:T.dim,
                    width: 18, flexShrink: 0, fontWeight: 600 }}>{String.fromCharCode(65+i)}</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                  {revealed && isRight && <span style={{ color: T.green }}>✓</span>}
                  {revealed && isSel && !isRight && <span style={{ color: T.red }}>✗</span>}
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence>
            {revealed && q.explanation && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: T.blueLt, border: `1px solid rgba(29,78,216,0.14)`,
                  borderRadius: 9, padding: '11px 15px', marginBottom: 12 }}>
                <p style={{ fontFamily: ff.sans, fontSize: 13, color: T.blueTxt, lineHeight: 1.65 }}>💡 {q.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {revealed && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="primary" onClick={next}>{cur+1>=quiz.length?'See Results':'Next'} →</Btn>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ── FLASHCARDS ── */
function FlashcardsView({ cards, lessonTitle, onBack }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [done, setDone] = useState(false);
  const card = cards[idx];
  const respond = ok => {
    if (ok) setKnown(k => new Set([...k, idx]));
    if (idx+1 >= cards.length) setDone(true);
    else { setIdx(i=>i+1); setFlipped(false); }
  };
  if (done) {
    const pct = Math.round((known.size/cards.length)*100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '32px 24px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>🃏</div>
          <h2 style={{ fontFamily: ff.serif, fontSize: 30, fontWeight: 700, color: T.txt, letterSpacing: '-0.5px', marginBottom: 7 }}>Review done!</h2>
          <p style={{ fontFamily: ff.sans, color: T.muted, fontSize: 14, marginBottom: 22 }}>
            Knew {known.size} of {cards.length} cards
          </p>
          <Card style={{ padding: '22px', marginBottom: 18 }}>
            <div style={{ fontFamily: ff.mono, fontSize: 46, fontWeight: 700,
              color: pct>=80?T.green:T.amber, marginBottom: 12 }}>{known.size}/{cards.length}</div>
            <ProgressBar pct={pct} color={pct>=80?T.green:T.amberMd} height={6}/>
          </Card>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Btn variant="outline" onClick={() => { setIdx(0); setFlipped(false); setKnown(new Set()); setDone(false); }}>🔄 Retry</Btn>
            <Btn variant="ghost" onClick={onBack}>← Back</Btn>
          </div>
        </motion.div>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: '36px 32px', maxWidth: 520, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Tag label="Flashcards" color={T.blue} bg={T.blueLt}/>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: ff.mono, fontSize: 11.5, color: T.muted }}>{idx+1}/{cards.length}</span>
          <Badge>✓ {known.size}</Badge>
        </div>
      </div>
      <p style={{ fontFamily: ff.sans, fontSize: 12, color: T.muted, marginBottom: 18 }}>{lessonTitle}</p>
      <div style={{ height: 3, background: T.border, borderRadius: 2, marginBottom: 22, overflow: 'hidden' }}>
        <motion.div animate={{ width: `${(idx/cards.length)*100}%` }}
          style={{ height: '100%', background: T.blue, borderRadius: 2 }}/>
      </div>
      <div onClick={() => setFlipped(f=>!f)} style={{ perspective: 1000, cursor: 'pointer', marginBottom: 18, userSelect: 'none' }}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.36, ease: [0.22,1,0.36,1] }}
          style={{ position: 'relative', transformStyle: 'preserve-3d', height: 220 }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: T.white, border: `1px solid ${T.borderMd}`, borderRadius: 14,
            boxShadow: '0 4px 18px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
            <p style={{ fontFamily: ff.mono, fontSize: 9, fontWeight: 600, letterSpacing: 2,
              color: T.dim, textTransform: 'uppercase', marginBottom: 14 }}>Term</p>
            <p style={{ fontFamily: ff.serif, fontSize: 21, fontWeight: 600, color: T.txt, lineHeight: 1.4 }}>{card.front}</p>
            <p style={{ fontFamily: ff.sans, fontSize: 11.5, color: T.dim, marginTop: 18 }}>tap to reveal ↕</p>
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)', background: T.forest, borderRadius: 14,
            boxShadow: '0 4px 18px rgba(0,0,0,0.14)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
            <p style={{ fontFamily: ff.mono, fontSize: 9, fontWeight: 600, letterSpacing: 2,
              color: 'rgba(125,218,155,0.6)', textTransform: 'uppercase', marginBottom: 14 }}>Answer</p>
            <p style={{ fontFamily: ff.sans, fontSize: 15.5, color: '#E8F5EC', lineHeight: 1.72 }}>{card.back}</p>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 9 }}>
            <Btn variant="danger" onClick={() => respond(false)} full>✗ Still learning</Btn>
            <Btn variant="success" onClick={() => respond(true)} full>✓ Got it!</Btn>
          </motion.div>
        )}
      </AnimatePresence>
      {!flipped && (
        <p style={{ fontFamily: ff.sans, fontSize: 12, color: T.dim, textAlign: 'center' }}>
          Flip the card, then mark whether you knew it
        </p>
      )}
    </motion.div>
  );
}

/* ── ROOT ── */
export default function App() {
  const [view, setView] = useState('home');
  const [skill, setSkill] = useState('');
  const [curriculum, setCurriculum] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [quizPayload, setQuizPayload] = useState(null);
  const [fcPayload, setFcPayload] = useState(null);
  const [progress, setProgress] = useState({ xp: 0, completed: {} });
  const [error, setError] = useState('');

  const hasSidebar = view !== 'home' && view !== 'generating';
  const total = curriculum ? curriculum.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;
  const done = Object.keys(progress.completed).length;

  const generate = async (skillName) => {
    setSkill(skillName); setError(''); setView('generating');
    try {
      const data = await callAI(`Create a comprehensive learning curriculum for: "${skillName}"`,
        `You are a world-class curriculum designer. Return ONLY a JSON object:
{"title":"Course title","description":"2-sentence overview","estimatedHours":<number>,"level":"Beginner|Intermediate|Advanced",
"modules":[{"id":"m1","title":"Module","description":"1-sentence desc","icon":"<emoji>","estimatedHours":<number>,
"lessons":[{"id":"m1l1","title":"Lesson","duration":"20 min","type":"core|practice|project"}]}]}
Exactly 4-5 modules with 3-4 lessons each.`);
      setCurriculum(data); setView('curriculum');
    } catch (e) { setError('Could not generate curriculum. Please try again.'); setView('home'); }
  };

  const selectLesson = async (mod, lesson) => {
    setActiveModule(mod); setActiveLesson(lesson);
    setLessonData(null); setLoadingLesson(true); setView('lesson');
    try {
      const data = await callAI(
        `Write a detailed lesson for "${lesson.title}" in module "${mod.title}" of a "${skill}" course.`,
        `You are an expert educator. Return ONLY JSON:
{"title":"Lesson title","summary":"2-sentence overview",
"sections":[{"heading":"heading","content":"140-word paragraph"}],
"keyPoints":["takeaway x5"],
"resources":[{"title":"name","description":"1-sentence","icon":"<emoji>"}],
"quiz":[{"question":"?","options":["A","B","C","D"],"correct":<0-3>,"explanation":"why"}],
"flashcards":[{"front":"term","back":"definition"}]}
Exactly: 3-4 sections, 5 keyPoints, 3 resources, 5 quiz, 6 flashcards.`);
      setLessonData(data);
    } catch (e) {
      console.error('Lesson generation failed:', e);
      setError('Failed to load lesson. Please try again.');
      setLoadingLesson(false);
    }
    setLoadingLesson(false);
  };

  const complete = (id) => setProgress(p => ({ ...p, completed: { ...p.completed, [id]: true }, xp: p.xp + 50 }));

  const navTo = (dest) => setView(dest);

  return (
    <>
      <style>{FONTS}</style>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
              background: T.white, border: `1px solid rgba(220,38,38,0.22)`, borderRadius: 9,
              padding: '9px 16px', fontFamily: ff.sans, fontSize: 13, color: T.red,
              zIndex: 999, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {hasSidebar && (
        <Sidebar view={view} onNav={navTo} xp={progress.xp} completedCount={done} totalLessons={total}/>
      )}

      <div style={{ marginLeft: hasSidebar ? 210 : 0, minHeight: '100vh', background: T.cream,
        transition: 'margin-left 0.3s', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {view === 'home'       && <HomeView key="home" onGenerate={generate}/>}
          {view === 'generating' && <GeneratingView key="gen" skill={skill}/>}
          {view === 'curriculum' && curriculum && (
            <CurriculumView key="curr" curriculum={curriculum} progress={progress} onSelectLesson={selectLesson}/>
          )}
          {view === 'progress'   && <ProgressView key="prog" curriculum={curriculum} progress={progress}/>}
          {view === 'lesson'     && (
            <LessonView key="lesson" lessonData={lessonData} loading={loadingLesson}
              moduleTitle={activeModule?.title} lessonId={activeLesson?.id} progress={progress}
              onQuiz={(q,t) => { setQuizPayload({questions:q,title:t}); setView('quiz'); }}
              onFlashcards={(c,t) => { setFcPayload({cards:c,title:t}); setView('flashcards'); }}
              onComplete={complete}/>
          )}
          {view === 'quiz' && quizPayload?.questions && (
            <QuizView key="quiz" quiz={quizPayload.questions} lessonTitle={quizPayload.title}
              onComplete={(s,t) => setProgress(p => ({ ...p, xp: p.xp + s * 20 }))}
              onBack={() => setView('lesson')}/>
          )}
          {view === 'flashcards' && fcPayload?.cards && (
            <FlashcardsView key="fc" cards={fcPayload.cards} lessonTitle={fcPayload.title}
              onBack={() => setView('lesson')}/>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}