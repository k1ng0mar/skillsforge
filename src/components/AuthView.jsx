import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ff } from '../constants';

export default function AuthView({ onLogin, onSignup, onGuest, onGoogleAuth, error, t, dark }) {
const [isSignup, setIsSignup] = useState(false);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [googleLoading, setGoogleLoading] = useState(false);
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

const handleGoogle = async () => {
setGoogleLoading(true);
await onGoogleAuth?.();
setGoogleLoading(false);
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
<style>{`@keyframes spin { to { transform: rotate(360deg); } } .auth-input::placeholder { color: ${t.faint}; opacity: 1; } .auth-input:focus { outline: none; } .auth-google-btn:hover { background: ${t.surface} !important; border-color: ${t.line} !important; } .auth-switch-link:hover { opacity: 0.7; } .auth-guest-btn:hover { color: ${t.muted} !important; }`}</style>

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
        ? `0 2px 40px rgba(0,0,0,0.25)`
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

      {/* Google Button */}
      <button
        className="auth-google-btn"
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          width: '100%',
          padding: '13px 16px',
          borderRadius: 50,
          border: `1.5px solid ${t.line}`,
          background: t.bg,
          color: t.txt,
          fontSize: 14,
          fontFamily: ff.sans,
          fontWeight: 500,
          cursor: googleLoading ? 'not-allowed' : 'pointer',
          opacity: googleLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'all 0.18s ease',
          marginBottom: 20,
        }}
      >
        {googleLoading ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite', opacity: 0.5 }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="30 15"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: t.line }} />
        <span style={{ fontSize: 11, color: t.faint, letterSpacing: 0.8, textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: 1, background: t.line }} />
      </div>

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
            boxShadow: `0 4px 16px ${t.primary}50`,
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