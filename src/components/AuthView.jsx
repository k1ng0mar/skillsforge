import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const switchMode = () => {
setIsSignup(!isSignup);
setEmail('');
setPassword('');
};

return (
<div style={{
  minHeight: '100vh',
  background: t.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily: ff.sans,
}}>
<style>{`@keyframes spin { to { transform: rotate(360deg); } } .auth-input::placeholder { color: ${t.faint}; opacity: 1; } .auth-input:focus { outline: none; } .auth-switch-link:hover { opacity: 0.7; } .auth-guest-btn:hover { color: ${t.muted} !important; }`}</style>

  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    style={{
      width: '100%',
      maxWidth: 420,
    }}
  >
    {/* Header */}
    <div style={{ textAlign: 'center', marginBottom: 36 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: t.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
        fontSize: 24, fontWeight: 800, color: '#fff',
        fontFamily: ff.serif,
        boxShadow: `0 8px 24px ${t.primary}40`,
      }}>
        S
      </div>

      <AnimatePresence mode="wait">
        <motion.h1
          key={isSignup ? 'signup' : 'login'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          style={{
            fontFamily: ff.serif,
            fontSize: 28,
            fontWeight: 700,
            color: t.txt,
            letterSpacing: '-0.5px',
            margin: 0,
          }}
        >
          {isSignup ? 'Sign Up' : 'Log In'}
        </motion.h1>
      </AnimatePresence>
    </div>

    {/* Card */}
    <div style={{
      background: t.surface,
      borderRadius: 24,
      padding: '32px 32px 28px',
      border: `1px solid ${t.line}`,
      boxShadow: dark
        ? `0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)`
        : `0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)`,
    }}>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              background: t.rDim,
              border: `1px solid ${t.rLine}`,
              borderRadius: 10,
              padding: '10px 14px',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 13, color: t.danger }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusField('email')}
            onBlur={() => setFocusField(null)}
            placeholder="Email Address"
            required
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: 50,
              border: `1.5px solid ${focusField === 'email' ? t.primary : t.line}`,
              background: t.bg,
              color: t.txt,
              fontSize: 14,
              fontFamily: ff.sans,
              transition: 'border-color 0.18s ease',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusField('password')}
              onBlur={() => setFocusField(null)}
              placeholder="Password"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '13px 18px',
                paddingRight: 80,
                borderRadius: 50,
                border: `1.5px solid ${focusField === 'password' ? t.primary : t.line}`,
                background: t.bg,
                color: t.txt,
                fontSize: 14,
                fontFamily: ff.sans,
                transition: 'border-color 0.18s ease',
                boxSizing: 'border-box',
              }}
            />
            {!isSignup && (
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: t.primary,
                  fontSize: 13,
                  fontFamily: ff.sans,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot?
              </button>
            )}
          </div>
          {isSignup && (
            <p style={{ fontSize: 11, color: t.faint, marginTop: 6, paddingLeft: 8 }}>
              Min. 6 characters
            </p>
          )}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 50,
            border: 'none',
            background: t.primary,
            color: '#fff',
            fontFamily: ff.sans,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.3,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: `0 4px 14px ${t.primary}30, 0 1px 3px ${t.primary}20`,
            transition: 'opacity 0.18s ease, box-shadow 0.18s ease',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="30 15"/>
              </svg>
              {isSignup ? 'Creating account...' : 'Signing in...'}
            </span>
          ) : (isSignup ? 'Sign Up' : 'Log In')}
        </motion.button>
      </form>
    </div>

    {/* Below card */}
    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <p style={{ fontSize: 14, color: t.muted, margin: '0 0 6px' }}>
        {isSignup ? 'Already have an account?' : "Don't have an account?"}
      </p>
      <button
        className="auth-switch-link"
        onClick={switchMode}
        style={{
          background: 'none',
          border: 'none',
          color: t.primary,
          fontFamily: ff.sans,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.18s',
          padding: 0,
        }}
      >
        {isSignup ? 'Log In' : 'Sign Up'}
      </button>
    </div>

    <div style={{ textAlign: 'center', marginTop: 12 }}>
      <button
        className="auth-guest-btn"
        onClick={onGuest}
        style={{
          background: 'none',
          border: 'none',
          color: t.faint,
          fontFamily: ff.sans,
          fontSize: 13,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: 0,
          transition: 'color 0.18s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Continue as Guest
      </button>
    </div>

    <p style={{ fontSize: 11, color: t.faint, textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
      By continuing you agree to our Terms of Service
    </p>
  </motion.div>
</div>
);
}