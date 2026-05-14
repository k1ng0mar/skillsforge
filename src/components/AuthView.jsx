import { useState, useEffect, useRef } from "react";

function ForgeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const nodes = Array.from({ length: 22 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 3 + 1.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#00081a");
      bg.addColorStop(0.5, "#0a0e1a");
      bg.addColorStop(1, "#050d1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const orb = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.45);
      orb.addColorStop(0, "rgba(59,130,246,0.12)");
      orb.addColorStop(0.5, "rgba(37,99,235,0.05)");
      orb.addColorStop(1, "transparent");
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, W, H);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.02;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.35;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        g.addColorStop(0, `rgba(96,165,250,${0.9})`);
        g.addColorStop(0.4, `rgba(59,130,246,${0.4 * glow})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,197,253,${0.7 + 0.3 * glow})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={240}
      style={{ width: "100%", height: "240px", display: "block" }}
    />
  );
}

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const DiscordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
  </svg>
);

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const AnvilIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 17h16l-2-5H6L4 17zm3-7h10V8H7v2zM9 6h6V4H9v2zm-5 13h16v2H4v-2z" opacity="0.9"/>
  </svg>
);

const styles = {
  root: {
    fontFamily: "'Outfit', sans-serif",
    background: "#030712",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  phone: {
    width: "100%",
    maxWidth: "390px",
    minHeight: "750px",
    background: "#0a1628",
    borderRadius: "40px",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 0 0 1px rgba(59,130,246,0.08), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(37,99,235,0.04)",
    display: "flex",
    flexDirection: "column",
  },
  screen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  },
  heroWrap: {
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80px",
    background: "linear-gradient(to bottom, transparent, #0a1628)",
    zIndex: 1,
  },
  splashBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0 28px 36px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "4px",
  },
  brandIcon: {
    color: "#3B82F6",
    display: "flex",
    alignItems: "center",
  },
  appName: {
    fontFamily: "'Chakra Petch', sans-serif",
    fontSize: "36px",
    fontWeight: "700",
    lineHeight: 1,
    letterSpacing: "-0.5px",
    margin: 0,
  },
  appNameSkills: {
    color: "#FFFFFF",
  },
  appNameForge: {
    color: "#3B82F6",
  },
  tagline: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 28px",
    fontWeight: "400",
    letterSpacing: "0.2px",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(to right, transparent, rgba(59,130,246,0.25), transparent)",
    margin: "0 0 28px",
  },
  spacer: { flex: 1 },
  ctaCard: {
    background: "rgba(59,130,246,0.04)",
    border: "1px solid rgba(59,130,246,0.12)",
    borderRadius: "24px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "linear-gradient(135deg, #3B82F6, #2563EB)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    height: "52px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.2px",
    boxShadow: "0 4px 24px rgba(59,100,246,0.3)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "6px",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.1px",
    textAlign: "center",
    textDecoration: "underline",
    textDecorationColor: "rgba(59,130,246,0.35)",
    textUnderlineOffset: "3px",
  },
  optHeader: {
    display: "flex",
    alignItems: "center",
    padding: "20px 24px 4px",
    gap: "12px",
    position: "relative",
  },
  backBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "none",
    borderRadius: "10px",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    cursor: "pointer",
    flexShrink: 0,
  },
  optTitle: {
    fontFamily: "'Chakra Petch', sans-serif",
    fontSize: "18px",
    fontWeight: "600",
    color: "#fff",
    margin: 0,
    flex: 1,
    textAlign: "center",
    letterSpacing: "0.3px",
  },
  optTitleSpacer: { width: "36px" },
  optBody: {
    flex: 1,
    padding: "24px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  orRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "4px 0",
  },
  orLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,0.08)",
  },
  orText: {
    fontSize: "12px",
    color: "#475569",
    fontWeight: "500",
    letterSpacing: "0.5px",
  },
  btnEmail: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "linear-gradient(135deg, #3B82F6, #2563EB)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    height: "54px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.2px",
    boxShadow: "0 4px 24px rgba(59,100,246,0.25)",
  },
  btnGoogle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#FFFFFF",
    color: "#1A1A1A",
    border: "none",
    borderRadius: "14px",
    height: "54px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.2px",
  },
  btnDiscord: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#5865F2",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    height: "54px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.2px",
  },
  btnGuest: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.06)",
    color: "#94A3B8",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    height: "54px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.2px",
    marginTop: "4px",
  },
  formInput: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "#fff",
    fontSize: "15px",
    fontFamily: "'Outfit', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  },
  tos: {
    marginTop: "auto",
    textAlign: "center",
    fontSize: "11.5px",
    color: "#334155",
    lineHeight: "1.6",
    padding: "0 8px",
  },
  tosLink: {
    color: "#3B82F6",
    textDecoration: "none",
  },
};

export default function AuthView({ onLogin, onSignup, onGuest, onOAuth, error = '' }) {
  const [screen, setScreen] = useState("splash");
  const [formType, setFormType] = useState("login");
  const [entering, setEntering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState("");
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");

  const goToOptions = () => {
    setEntering(true);
    setTimeout(() => {
      setScreen("options");
      setEntering(false);
    }, 220);
  };

  const goBack = () => {
    setEntering(true);
    setLocalError("");
    setSuccess("");
    const fromScreen = screen;
    setTimeout(() => {
      setScreen(fromScreen === "form" ? "options" : "splash");
      setEntering(false);
    }, 220);
  };

  const openForm = (type) => {
    setFormType(type);
    setLocalError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setEntering(true);
    setTimeout(() => {
      setScreen("form");
      setEntering(false);
    }, 220);
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    try {
      await onOAuth(provider);
    } finally {
      setOauthLoading("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSuccess("");
    setLoading(true);

    try {
      if (formType === "signup") {
        await onSignup(email, password);
        if (!error && !localError) {
          setSuccess("Check your email to verify your account!");
        }
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setLocalError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const transStyle = {
    opacity: entering ? 0 : 1,
    transform: entering ? "translateX(12px)" : "translateX(0)",
  };

  const displayError = localError || error;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Outfit:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030712; }
        button:hover { opacity: 0.88; }
        button:active { transform: scale(0.97) !important; }
      `}</style>
      <div style={styles.root}>
        <div style={styles.phone}>
          {screen === "splash" && (
            <div style={{ ...styles.screen, ...transStyle }}>
              <div style={styles.heroWrap}>
                <ForgeCanvas />
                <div style={styles.heroOverlay} />
              </div>

              <div style={styles.splashBody}>
                <div style={styles.brandRow}>
                  <span style={styles.brandIcon}><AnvilIcon /></span>
                  <h1 style={styles.appName}>
                    <span style={styles.appNameSkills}>Skills</span>
                    <span style={styles.appNameForge}>Forge</span>
                  </h1>
                </div>
                <p style={styles.tagline}>Build Skills. Forge Your Future.</p>
                <div style={styles.divider} />

                <div style={styles.spacer} />

                <div style={styles.ctaCard}>
                  <button style={styles.btnPrimary} onClick={() => openForm("login")}>
                    <EmailIcon />
                    Continue with Email
                  </button>
                  <button style={styles.btnGhost} onClick={goToOptions}>
                    Explore other sign-in options
                  </button>
                </div>
              </div>
            </div>
          )}
          {screen === "options" && (
            <div style={{ ...styles.screen, ...transStyle }}>
              <div style={styles.optHeader}>
                <button style={styles.backBtn} onClick={goBack}>
                  <ChevronLeft />
                </button>
                <h2 style={styles.optTitle}>Sign-in options</h2>
                <div style={styles.optTitleSpacer} />
              </div>

              <div style={styles.optBody}>
                <button style={styles.btnEmail} onClick={() => openForm("login")}>
                  <EmailIcon />
                  Continue with Email
                </button>

                <div style={styles.orRow}>
                  <div style={styles.orLine} />
                  <span style={styles.orText}>or</span>
                  <div style={styles.orLine} />
                </div>

                <button 
                  style={{ ...styles.btnGoogle, opacity: oauthLoading === 'google' ? 0.7 : 1 }} 
                  onClick={() => handleOAuth('google')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'google' ? "Redirecting..." : <><GoogleIcon /> Sign in with Google</>}
                </button>

                <button 
                  style={{ ...styles.btnDiscord, opacity: oauthLoading === 'discord' ? 0.7 : 1 }} 
                  onClick={() => handleOAuth('discord')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'discord' ? "Redirecting..." : <><DiscordIcon /> Sign in with Discord</>}
                </button>

                <button style={styles.btnGuest} onClick={() => onGuest()}>
                  Continue as Guest
                </button>

                <p style={styles.tos}>
                  By signing in, you agree to our{" "}
                  <a href="#" style={styles.tosLink}>Terms of Service</a>
                  {" "}and acknowledge that you have read our{" "}
                  <a href="#" style={styles.tosLink}>Privacy Policy</a>
                  {" "}and{" "}
                  <a href="#" style={styles.tosLink}>Cookies Policy</a>.
                </p>
              </div>
            </div>
          )}
          {screen === "form" && (
            <div style={{ ...styles.screen, ...transStyle }}>
              <div style={{ ...styles.optHeader, paddingBottom: "16px" }}>
                <button style={styles.backBtn} onClick={() => { setLocalError(""); setSuccess(""); goBack(); }}>
                  <ChevronLeft />
                </button>
                <h2 style={styles.optTitle}>{formType === "login" ? "Sign In" : "Create Account"}</h2>
                <div style={styles.optTitleSpacer} />
              </div>

              <div style={{ padding: "0 24px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {displayError && (
                  <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "12px 16px", color: "#fca5a5", fontSize: "13px" }}>
                    {displayError}
                  </div>
                )}
                {success && (
                  <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px", padding: "12px 16px", color: "#86efac", fontSize: "13px" }}>
                    {success}
                  </div>
                )}
                <input
                  style={styles.formInput}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  style={styles.formInput}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                />
                <button
                  style={{ ...styles.btnEmail, opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit}
                  disabled={loading || !email || !password}
                >
                  {loading ? (formType === "login" ? "Signing in..." : "Creating account...") : (formType === "login" ? "Sign In" : "Create Account")}
                </button>
                <p style={{ textAlign: "center", color: "#475569", fontSize: "13px" }}>
                  {formType === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", fontSize: "13px", fontFamily: "'Outfit', sans-serif", textDecoration: "underline", textUnderlineOffset: "2px" }}
                    onClick={() => setFormType(formType === "login" ? "signup" : "login")}
                  >
                    {formType === "login" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}