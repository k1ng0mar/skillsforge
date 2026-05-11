import { useState, useEffect, useRef, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const ff = {
  serif: "'Fraunces', Georgia, serif",
  sans: "'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ─── CONTEXT ─── */
const Ctx = createContext(null);
const useT = () => useContext(Ctx);

/* ─── AI ─── */
async function callAI(prompt, sys) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      // Don't forget to pass your API key; Anthropic usually requires 'x-api-key', 
      // but Groq uses standard Bearer auth.
      "Authorization": `Bearer YOUR_GROQ_API_KEY` 
    },
    body: JSON.stringify({
      // You can swap this for "mixtral-8x7b-32768" or "llama3-8b-8192"
      model: "llama-3.3-70b-versatile", 
      max_tokens: 1000,
      response_format: { type: "json_object" }, // Forces JSON output on Groq
      messages: [
        { 
          role: "system", 
          content: sys + "\n\nReturn ONLY valid JSON. No markdown fences, no preamble." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
    }),
  });

  if (!r.ok) throw new Error(r.status);
  
  const d = await r.json();
  // Groq returns the text here
  const raw = d.choices?.[0]?.message?.content || "";
  
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
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
    primary: { bg: t.primary, clr: '#000', border: 'none', hov: dark ? '#44F6FF' : '#005A68' },
    outline: { bg: 'transparent', clr: t.primary, border: `1px solid ${t.pLine}`, hov: t.pDim },
    ghost:   { bg: 'transparent', clr: t.muted, border: `1px solid ${t.line}`, hov: t.line },
    success: { bg: t.sDim, clr: t.success, border: `1px solid ${t.sLine}`, hov: `${t.success}22` },
    danger:  { bg: t.rDim, clr: t.danger, border: `1px solid ${t.rLine}`, hov: `${t.danger}22` },
    amber:   { bg: t.aDim, clr: t.amber, border: `1px solid ${t.aLine}`, hov: `${t.amber}22` },
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
        transition: 'background 0.13s',
        cursor: disabled ? 'not-allowed' : 'pointer',
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
  const { t, dark, toggle } = useT();
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
    }}>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <span style={{ fontFamily: ff.serif, fontSize: 18, fontWeight: 700, color: t.txt, letterSpacing: '-0.3px' }}>
          SkillsForge
        </span>
        <button onClick={toggle} style={{
          width: 34, height: 34, borderRadius: 8,
          background: t.surface, border: `1px solid ${t.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.muted, fontSize: 15,
        }}>
          {dark ? '○' : '●'}
        </button>
      </div>

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
function JourneyView({ curriculum, progress, onLesson, onArena, onTab }) {
  const { t, dark } = useT();

  if (!curriculum) {
    return <Empty msg="No active journey yet." action="Generate one" onAction={() => onTab('gen')}/>;
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
  const dueCards = Math.max(0, (total - done) * 6);

  return (
    <div style={{ paddingBottom: 100, overflowY: 'auto', height: '100vh' }}>
      {/* top bar */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: ff.mono, fontSize: 10, color: t.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>
            Active Journey
          </p>
          <h1 style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 700, color: t.txt, letterSpacing: '-0.4px', lineHeight: 1.2, maxWidth: 220 }}>
            {curriculum.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* streak */}
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
          {/* ring */}
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
function SkillTreeView({ curriculum, progress, onLesson, onTab }) {
  const { t, dark } = useT();
  const [sheet, setSheet] = useState(null); // { mod, lesson, done, active }

  if (!curriculum) {
    return <Empty msg="No curriculum yet." action="Generate one" onAction={() => onTab('gen')}/>;
  }

  const flat = curriculum.modules.flatMap(m =>
    m.lessons.map(l => ({ ...l, modObj: m, modTitle: m.title }))
  );

  const isActive = (i) => !progress.completed[flat[i].id] && flat.slice(0, i).every(n => progress.completed[n.id]);

  return (
    <div style={{ paddingBottom: 100, overflowY: 'auto', height: '100vh' }}>
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

      {/* bottom sheet */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheet(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', bottom: 0,
                left: '50%', transform: 'translateX(-50%)',
                width: 'min(100%, 430px)',
                background: t.surface,
                borderRadius: '20px 20px 0 0',
                padding: '12px 24px 48px',
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
                  <p style={{ fontFamily: ff.serif, fontSize: 22, fontWeight: 700, color: t.txt }}>6 Cards</p>
                </div>
              </div>
              <Btn v="primary" full
                onClick={() => { setSheet(null); onLesson(sheet.node.modObj, sheet.node); }}
                style={{ height: 52, borderRadius: 999, letterSpacing: 1 }}>
                {sheet.done ? 'REVIEW LESSON' : 'ENTER ARENA'} →
              </Btn>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── LESSON ─── */
function LessonView({ lessonData, loading, moduleTitle, lessonId, progress, onQuiz, onFlashcards, onComplete, onBack }) {
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
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      {/* progress bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 3, background: t.line }}>
        <motion.div animate={{ width: `${scrollPct}%` }} style={{ height: '100%', background: t.primary }}/>
      </div>

      {/* sticky header */}
      <div style={{
        position: 'sticky', top: 3, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 20px',
        background: dark ? 'rgba(9,10,12,0.92)' : 'rgba(244,242,236,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${t.line}`,
      }}>
        <button onClick={onBack}
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
        style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 24px' }}>

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
            <p style={{ fontFamily: ff.sans, fontSize: 16, color: dark ? 'rgba(241,243,245,0.82)' : t.muted, lineHeight: 1.82 }}>
              {s.content}
            </p>
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
            {lessonData.keyPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < lessonData.keyPoints.length - 1 ? 10 : 0 }}>
                <span style={{ fontFamily: ff.mono, fontSize: 10, color: t.primary, fontWeight: 600, marginTop: 3, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p style={{ fontFamily: ff.sans, fontSize: 15, color: t.txt, lineHeight: 1.65 }}>{pt}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 8 }}>
          <Btn v="outline" onClick={() => onQuiz(lessonData.quiz, lessonData.title)}>Quiz me</Btn>
          <Btn v="ghost" onClick={() => onFlashcards(lessonData.flashcards, lessonData.title)}>Flashcards</Btn>
        </div>
      </div>

      {/* sticky CTA */}
      <div style={{
        position: 'sticky', bottom: 0, padding: '12px 24px 28px',
        background: dark ? 'rgba(9,10,12,0.95)' : 'rgba(244,242,236,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${t.line}`,
      }}>
        {!isDone ? (
          <Btn v="primary" full onClick={() => onComplete(lessonId)}
            style={{ height: 52, borderRadius: 999, letterSpacing: 1, boxShadow: dark ? t.glow(t.primary) : 'none' }}>
            COMPLETE LESSON →
          </Btn>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontFamily: ff.sans, fontSize: 14, fontWeight: 600, color: t.success }}>Lesson completed</span>
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
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
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
function ArenaView({ cards, lessonTitle, onBack }) {
  const { t, dark } = useT();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  const [done, setDone] = useState(false);

  const card = cards[idx];

  const rate = (r) => {
    const next = { ...ratings, [idx]: r };
    setRatings(next);
    if (idx + 1 >= cards.length) setDone(true);
    else { setIdx(i => i + 1); setFlipped(false); }
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
            <Btn v="outline" onClick={() => { setIdx(0); setFlipped(false); setRatings({}); setDone(false); }}>Retry</Btn>
            <Btn v="ghost" onClick={onBack}>Back</Btn>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
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

/* ─── ROOT ─── */
export default function App() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;
  const ctx = { t, dark, toggle: () => setDark(d => !d) };

  const [tab, setTab] = useState('gen');
  const [subview, setSubview] = useState(null); // 'lesson' | 'quiz' | 'arena'
  const [skill, setSkill] = useState('');
  const [curriculum, setCurriculum] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeMod, setActiveMod] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [arenaCards, setArenaCards] = useState(null);
  const [arenaTitle, setArenaTitle] = useState('');
  const [progress, setProgress] = useState({ xp: 0, completed: {}, streak: 0 });
  const [err, setErr] = useState('');

  const generate = async (skillName, scope) => {
    setSkill(skillName); setErr(''); setGenerating(true);
    const depth = {
      'Crash Course': '2-3 modules, 2-3 lessons each.',
      'Standard': '4-5 modules, 3-4 lessons each.',
      'Mastery': '6-7 modules, 4-5 lessons each.',
    }[scope] || '4-5 modules, 3-4 lessons each.';
    try {
      const data = await callAI(
        `Create a curriculum for: "${skillName}"`,
        `World-class curriculum designer. Return ONLY JSON:
{"title":"","description":"2 sentences","estimatedHours":<n>,"level":"Beginner|Intermediate|Advanced","modules":[{"id":"m1","title":"","description":"1 sentence","icon":"<emoji>","estimatedHours":<n>,"lessons":[{"id":"m1l1","title":"","duration":"X min","type":"core|practice|project"}]}]}
Use ${depth}`
      );
      setCurriculum(data);
      setTab('journey');
    } catch {
      setErr('Failed to generate curriculum. Please try again.');
    }
    setGenerating(false);
  };

  const openLesson = async (mod, lesson) => {
    setActiveMod(mod); setActiveLesson(lesson);
    setLessonData(null); setLessonLoading(true); setSubview('lesson');
    try {
      const data = await callAI(
        `Write a detailed lesson: "${lesson.title}" in "${mod.title}" for a "${skill}" course.`,
        `Expert educator. Return ONLY JSON:
{"title":"","summary":"2 sentences","sections":[{"heading":"","content":"140-word paragraph"}],"keyPoints":["x5"],"resources":[{"title":"","description":"1 sentence","icon":"<emoji>"}],"quiz":[{"question":"","options":["","","",""],"correct":<0-3>,"explanation":""}],"flashcards":[{"front":"term","back":"definition"}]}
Exactly: 3-4 sections, 5 keyPoints, 3 resources, 5 quiz Qs, 6 flashcards.`
      );
      setLessonData(data);
    } catch {
      setErr('Failed to load lesson. Please try again.');
    }
    setLessonLoading(false);
  };

  const complete = (id) => {
    setProgress(p => ({
      ...p,
      completed: { ...p.completed, [id]: true },
      xp: p.xp + 50,
      streak: p.streak + 1,
    }));
  };

  const openArena = (cards, title) => {
    setArenaCards(cards); setArenaTitle(title); setSubview('arena');
  };

  const launchDailyArena = () => {
    if (!curriculum) return;
    const cards = curriculum.modules.flatMap(m =>
      m.lessons.map(l => ({ front: l.title, back: m.description || `Review this in the lesson.` }))
    ).slice(0, 8);
    openArena(cards, curriculum.title);
  };

  const showNav = !subview && !generating;

  return (
    <Ctx.Provider value={ctx}>
      <style>{BASE}</style>

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
                progress={progress}
                onQuiz={(q, title) => { setQuizData({ q, title }); setSubview('quiz'); }}
                onFlashcards={openArena}
                onComplete={complete}
                onBack={() => setSubview(null)}
              />
            </motion.div>
          )}

          {!generating && subview === 'quiz' && quizData?.q && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizView
                quiz={quizData.q}
                lessonTitle={quizData.title}
                onComplete={(s) => setProgress(p => ({ ...p, xp: p.xp + s * 20 }))}
                onBack={() => setSubview('lesson')}
              />
            </motion.div>
          )}

          {!generating && subview === 'arena' && arenaCards && (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ArenaView
                cards={arenaCards}
                lessonTitle={arenaTitle}
                onBack={() => setSubview(subview === 'arena' && !lessonData ? null : 'lesson')}
              />
            </motion.div>
          )}

          {!generating && !subview && (
            <motion.div key="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {tab === 'gen' && <HomeView onGenerate={generate}/>}
              {tab === 'journey' && (
                <JourneyView
                  curriculum={curriculum}
                  progress={progress}
                  onLesson={openLesson}
                  onArena={launchDailyArena}
                  onTab={setTab}
                />
              )}
              {tab === 'tree' && (
                <SkillTreeView
                  curriculum={curriculum}
                  progress={progress}
                  onLesson={openLesson}
                  onTab={setTab}
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