import { useState } from 'react';
import { motion } from 'framer-motion';
import { ff } from '../constants';

export default function AuthView({ onLogin, onSignup, onGuest, error, t, dark }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignup) {
      await onSignup(email, password);
    } else {
      await onLogin(email, password);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%', maxWidth: 400,
          background: t.surface,
          borderRadius: 16,
          padding: '48px 40px',
          border: `1px solid ${t.line}`,
        }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: t.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: ff.serif
          }}>
            S
          </div>
          <h1 style={{ fontFamily: ff.serif, fontSize: 24, fontWeight: 700, color: t.txt, letterSpacing: '-0.3px' }}>
            SkillForge
          </h1>
          <p style={{ fontFamily: ff.sans, fontSize: 14, color: t.muted, marginTop: 4 }}>
            {isSignup ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: t.rDim, border: `1px solid ${t.rLine}`, borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <span style={{ fontFamily: ff.sans, fontSize: 13, color: t.danger }}>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: ff.sans, fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1.5px solid ${focusField === 'email' ? t.primary : t.line}`,
                background: t.bg, color: t.txt, fontSize: 15, fontFamily: ff.sans,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              placeholder="you@email.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: ff.sans, fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Password
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusField('password')} onBlur={() => setFocusField(null)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1.5px solid ${focusField === 'password' ? t.primary : t.line}`,
                background: t.bg, color: t.txt, fontSize: 15, fontFamily: ff.sans,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              placeholder="••••••••" required minLength={6} />
            {isSignup && (
              <p style={{ fontFamily: ff.sans, fontSize: 11, color: t.faint, marginTop: 6 }}>
                Min. 6 characters
              </p>
            )}
          </div>
          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none',
              background: t.primary, color: '#fff',
              fontFamily: ff.sans, fontSize: 15, fontWeight: 600, letterSpacing: 0.3,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="30 15" strokeDashoffset="0"/>
                </svg>
                {isSignup ? 'Signing up...' : 'Signing in...'}
              </span>
            ) : (isSignup ? 'Sign Up' : 'Sign In')}
          </motion.button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: t.line }} />
          <span style={{ fontFamily: ff.sans, fontSize: 11, color: t.faint, letterSpacing: 0.5, textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: t.line }} />
        </div>

        <button onClick={() => { setIsSignup(!isSignup); setEmail(''); setPassword(''); }}
          style={{
            width: '100%', padding: '12px', background: 'none', border: 'none',
            color: t.primary, fontFamily: ff.sans, fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}>
          {isSignup ? 'Have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>

        <button onClick={onGuest}
          style={{
            width: '100%', padding: '12px', marginTop: 8, background: 'none', border: 'none',
            color: t.muted, fontFamily: ff.sans, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Continue as Guest
        </button>

        <p style={{ fontFamily: ff.sans, fontSize: 11, color: t.faint, textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          By continuing you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}