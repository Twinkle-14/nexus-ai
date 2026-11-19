import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Cpu,
  Globe2,
  KeyRound,
  Layers3,
  Lock,
  LogIn,
  Menu,
  Play,
  Radar,
  RotateCcw,
  ScanSearch,
  Server,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import {
  createCostReport,
  createService,
  getAwsScan,
  getAwsCosts,
  getCostReports,
  getDatabaseStatus,
  getDemoAppStatus,
  getHealth,
  getChaosExperiments,
  getIncidents,
  getSecretScan,
  getServices,
  updateService,
  investigateIncident,
  scanAndInvestigateIncident,
  removeLegacyPaymentPlaceholder,
  runChaosExperiment,
  recoverPrimary,
  runFailover,
  simulateFailure,
} from "./api/nexus";

type FeatureId =
  | "chaos"
  | "failover"
  | "cost"
  | "root-cause"
  | "secrets";

type AppView = "landing" | "login" | "signup" | "dashboard" | FeatureId;

type Feature = {
  id: FeatureId;
  number: string;
  title: string;
  short: string;
  description: string;
  accent: string;
  icon: ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: "chaos",
    number: "01",
    title: "Chaos Lab",
    short: "Break production on purpose.",
    description:
      "Run controlled chaos experiments against deployments and watch Nexus AI reason about resilience.",
    accent: "#ff4d6d",
    icon: <Zap size={22} />,
  },
  {
    id: "failover",
    number: "02",
    title: "Multi-Region Failover",
    short: "Keep traffic alive.",
    description:
      "Simulate regional failure, switch to a healthy backup, and make recovery paths visible.",
    accent: "#36b7ff",
    icon: <Globe2 size={22} />,
  },
  {
    id: "cost",
    number: "03",
    title: "Cost Intelligence",
    short: "See where cloud money goes.",
    description:
      "Scan infrastructure cost signals and surface the resources that deserve attention.",
    accent: "#ffbf3f",
    icon: <CircleDollarSign size={22} />,
  },
  {
    id: "root-cause",
    number: "04",
    title: "AI Root Cause Analysis",
    short: "Turn incidents into answers.",
    description:
      "Investigate incidents with AI-assisted reasoning over the operational signals already in Nexus.",
    accent: "#b875ff",
    icon: <Radar size={22} />,
  },
  {
    id: "secrets",
    number: "05",
    title: "Secret Scanner",
    short: "Catch exposed credentials.",
    description:
      "Scan for secret-like values before they become an avoidable security incident.",
    accent: "#36e0a1",
    icon: <ShieldCheck size={22} />,
  },
];

const FEATURE_MAP = Object.fromEntries(
  FEATURES.map((feature) => [feature.id, feature])
) as Record<FeatureId, Feature>;

function App() {
  const [view, setView] = useState<AppView>("landing");
  const [pendingFeature, setPendingFeature] = useState<FeatureId | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const openFeature = (id: FeatureId) => {
    if (!loggedIn) {
      setPendingFeature(id);
      setView("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const afterAuth = () => {
    setLoggedIn(true);
    setView(pendingFeature ?? "dashboard");
    setPendingFeature(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (view === "landing") {
    return (
      <LandingPage
        onFeature={openFeature}
        onLogin={() => setView("login")}
        onSignup={() => setView("signup")}
      />
    );
  }

  if (view === "login" || view === "signup") {
    return (
      <AuthScreen
        mode={view}
        pendingFeature={pendingFeature}
        onBack={() => setView("landing")}
        onSwitch={() => setView(view === "login" ? "signup" : "login")}
        onSuccess={afterAuth}
      />
    );
  }

  return (
    <PlatformShell
      view={view}
      onNavigate={(next) => {
        setView(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onLogout={() => {
        setLoggedIn(false);
        setPendingFeature(null);
        setView("landing");
      }}
    />
  );
}


function LandingPage({
  onFeature,
  onLogin,
  onSignup,
}: {
  onFeature: (id: FeatureId) => void;
  onLogin: () => void;
  onSignup: () => void;
}) {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [rotationStart, setRotationStart] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || dragging) return;

    const timer = window.setInterval(() => {
      setRotation((value) => value - 0.18);
    }, 30);

    return () => window.clearInterval(timer);
  }, [paused, dragging]);

  useEffect(() => {
    const selected = ((Math.round(-rotation / 72) % 5) + 5) % 5;
    setActiveFeature(selected);
  }, [rotation]);

  const heroProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, window.innerHeight)));
  const systemProgress = Math.min(
    1,
    Math.max(0, (scrollY - window.innerHeight * 0.82) / Math.max(1, window.innerHeight * 1.9))
  );

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="nx-site nx-three-page-site">
      <style>{GLOBAL_CSS}</style>

      <div className="nx-noise" />
      <div className="nx-aurora nx-aurora-a" />
      <div className="nx-aurora nx-aurora-b" />

      {/* PAGE 1 / HERO */}
      <header className="nx-nav nx-pill-nav">
        <button
          className="nx-pill-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Nexus AI home"
        >
          <span className="nx-pill-logo-ring"><span /></span>
          <span>NEXUS <b>AI</b></span>
        </button>

        <nav className="nx-pill-links" aria-label="Primary navigation">
          <button onClick={() => scrollTo("top")}>Home</button>
          <span>•</span>
          <button onClick={() => scrollTo("systems")}>Systems</button>
          <span>•</span>
          <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
          <span>•</span>
          <button onClick={() => scrollTo("final")}>Recover</button>
        </nav>

        <div className="nx-pill-actions">
          <button className="nx-pill-login" onClick={onLogin}>Log in</button>
          <button className="nx-pill-signup" onClick={onSignup}>
            Sign up free <ArrowUpRight size={14} />
          </button>
        </div>
      </header>

      <main>
        <section className="nx-page nx-hero-v4" id="top">
          <div className="nx-hero-bg">
            <div className="nx-hero-haze haze-one" />
            <div className="nx-hero-haze haze-two" />
            <div className="nx-thread-field">
              <svg viewBox="0 0 1400 850" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="nxThreadA" x1="0" x2="1">
                    <stop offset="0" stopColor="#35ddff" stopOpacity=".05" />
                    <stop offset=".35" stopColor="#35ddff" stopOpacity=".85" />
                    <stop offset=".68" stopColor="#9a6cff" stopOpacity=".9" />
                    <stop offset="1" stopColor="#ff4ca8" stopOpacity=".15" />
                  </linearGradient>
                  <linearGradient id="nxThreadB" x1="0" x2="1">
                    <stop offset="0" stopColor="#ff4ca8" stopOpacity=".08" />
                    <stop offset=".5" stopColor="#a36cff" stopOpacity=".8" />
                    <stop offset="1" stopColor="#36e7ff" stopOpacity=".12" />
                  </linearGradient>
                  <filter id="nxThreadGlow">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <g className="nx-thread-glow" filter="url(#nxThreadGlow)">
                  <path className="thread t1" stroke="url(#nxThreadA)" d="M-80 510 C220 180 330 760 590 405 S1010 85 1480 360" />
                  <path className="thread t2" stroke="url(#nxThreadB)" d="M-80 300 C260 650 390 80 650 430 S1080 720 1480 220" />
                  <path className="thread t3" stroke="url(#nxThreadA)" d="M-80 610 C240 250 430 700 720 410 S1100 210 1480 530" />
                  <path className="thread t4" stroke="url(#nxThreadB)" d="M-80 180 C250 420 410 150 690 460 S1120 680 1480 390" />
                  <path className="thread t5" stroke="url(#nxThreadA)" d="M-80 740 C250 420 430 570 700 350 S1120 110 1480 610" />
                </g>

                <g className="nx-thread-core">
                  <path className="thread t1" stroke="url(#nxThreadA)" d="M-80 510 C220 180 330 760 590 405 S1010 85 1480 360" />
                  <path className="thread t2" stroke="url(#nxThreadB)" d="M-80 300 C260 650 390 80 650 430 S1080 720 1480 220" />
                  <path className="thread t3" stroke="url(#nxThreadA)" d="M-80 610 C240 250 430 700 720 410 S1100 210 1480 530" />
                  <path className="thread t4" stroke="url(#nxThreadB)" d="M-80 180 C250 420 410 150 690 460 S1120 680 1480 390" />
                  <path className="thread t5" stroke="url(#nxThreadA)" d="M-80 740 C250 420 430 570 700 350 S1120 110 1480 610" />
                </g>
              </svg>
            </div>

            <div className="nx-hero-grid" />
            <div className="nx-floating-orb orb-one" />
            <div className="nx-floating-orb orb-two" />
            <div className="nx-floating-orb orb-three" />
          </div>

          <div
            className="nx-hero-v4-content"
            style={{
              transform: `translate3d(0, ${scrollY * -0.11}px, 0)`,
              opacity: Math.max(0, 1 - heroProgress * 1.15),
            }}
          >
            <div className="nx-hero-brandline">
              <span className="nx-brand-pulse" />
              NEXUS AI
              <span className="nx-brand-rule" />
              AUTONOMOUS DEVOPS / SRE
            </div>

            <h1>
              <span className="nx-hero-line">Break it.</span>
              <span className="nx-hero-line nx-gradient-text">Watch it heal itself.</span>
            </h1>

            <p>
              Autonomous infrastructure that detects failure, reasons through the signal,
              and executes the recovery path.
            </p>

            <div className="nx-hero-actions">
              <button className="nx-primary" onClick={onSignup}>
                Start building free <ArrowUpRight size={17} />
              </button>
              <button className="nx-ghost" onClick={() => scrollTo("systems")}>
                Explore five systems <ChevronDown size={17} />
              </button>
            </div>
          </div>

          <div className="nx-hero-micro micro-left">FAILURE IS A SIGNAL</div>
          <div className="nx-hero-micro micro-right">RECOVERY IS A SYSTEM</div>

          <div className="nx-hero-bottom">
            <span>CHAOS / FAILOVER / COST / ROOT CAUSE / SECRETS</span>
            <div className="nx-scroll-cue"><span>SCROLL</span><i /></div>
            <span>BUILD FOR RESILIENCE</span>
          </div>
        </section>

        {/* PAGE 2 — FIVE SYSTEMS */}
        <section id="systems" className="nx-page nx-systems-v4">
          <div className="nx-systems-v4-bg" />
          <div className="nx-systems-layout">
            <div className="nx-systems-copy">
              <div className="nx-section-eyebrow">NEXUS AI / SYSTEM ARCHITECTURE</div>

              <h2>
                Five systems.
                <br />
                <span>One platform.</span>
              </h2>

              <p>
                One intelligent operational layer for breaking systems,
                surviving failure, controlling cost, finding root cause,
                and protecting secrets.
              </p>

              <div className="nx-hologram-core">
                <div className="nx-hologram-ring ring-a" />
                <div className="nx-hologram-ring ring-b" />
                <div className="nx-hologram-ring ring-c" />
                <div className="nx-hologram-pulse" />
                <div className="nx-hologram-core-text">
                  <span>NEXUS AI</span>
                  <strong>CORE</strong>
                  <small>INTELLIGENT CONTROL</small>
                </div>
              </div>

              <div className="nx-core-caption">
                <i />
                FIVE SYSTEMS CONNECTED
              </div>
            </div>

            <div
              className={`nx-energy-network ${dragging ? "is-dragging" : ""}`}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                setDragging(true);
                setPaused(true);
                setDragStartX(event.clientX);
                setRotationStart(rotation);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!dragging) return;
                setRotation(rotationStart + (event.clientX - dragStartX) * 0.5);
              }}
              onPointerUp={() => {
                setDragging(false);
                setPaused(false);
              }}
              onPointerCancel={() => {
                setDragging(false);
                setPaused(false);
              }}
              onWheel={(event) => {
                setRotation((value) => value - Math.sign(event.deltaY) * 12);
              }}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => {
                if (!dragging) setPaused(false);
              }}
            >
              <svg className="nx-energy-path" viewBox="0 0 600 650" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="nxEnergyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#36D9FF" />
                    <stop offset="48%" stopColor="#9B72FF" />
                    <stop offset="100%" stopColor="#FF55B8" />
                  </linearGradient>
                  <filter id="nxEnergyGlow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path className="nx-energy-trail" d="M 43 65 C 150 65 220 188 327 188 C 430 188 170 324 67 324 C -20 324 220 461 327 461 C 430 461 180 584 79 584" />
                <path className="nx-energy-line" d="M 43 65 C 150 65 220 188 327 188 C 430 188 170 324 67 324 C -20 324 220 461 327 461 C 430 461 180 584 79 584" />
                <circle r="4" fill="#8CEBFF" filter="url(#nxEnergyGlow)">
                  <animateMotion dur="7s" repeatCount="indefinite" path="M 43 65 C 150 65 220 188 327 188 C 430 188 170 324 67 324 C -20 324 220 461 327 461 C 430 461 180 584 79 584" />
                </circle>
                <circle r="3" fill="#D9A4FF" filter="url(#nxEnergyGlow)">
                  <animateMotion dur="7s" begin="-3.5s" repeatCount="indefinite" path="M 43 65 C 150 65 220 188 327 188 C 430 188 170 324 67 324 C -20 324 220 461 327 461 C 430 461 180 584 79 584" />
                </circle>
              </svg>

              <div className="nx-energy-nodes">
                {FEATURES.map((feature, index) => (
                  <button
                    key={feature.id}
                    className={`nx-energy-node node-${index + 1} ${activeFeature === index ? "is-active" : ""}`}
                    style={{
                      "--node-accent": feature.accent,
                      "--node-index": index,
                    } as CSSProperties}
                    onClick={() => {
                      setActiveFeature(index);
                      setRotation(-index * 72);
                      onFeature(feature.id);
                    }}
                  >
                    <span className="nx-energy-node-orb">
                      <span className="nx-energy-node-icon">{feature.icon}</span>
                      <i />
                    </span>

                    <span className="nx-energy-node-copy">
                      <small>{feature.number} / SYSTEM</small>
                      <strong>{feature.title}</strong>
                      <span>{feature.short}</span>
                      <em>EXPLORE SYSTEM <ArrowUpRight size={12} /></em>
                    </span>

                    <span className="nx-energy-node-pulse" />
                  </button>
                ))}
              </div>

            </div>
          </div>

          <div
            className="nx-system-word"
            style={{ transform: `translate3d(${systemProgress * -12}%, 0, 0)` }}
          >
            OPERATE / RECOVER / LEARN
          </div>
        </section>

        {/* PAGE 3 — HOW IT WORKS */}
        <section id="how-it-works" className="nx-page nx-how-v4">
          <div className="nx-how-backdrop" />
          <div className="nx-how-inner">
            <div className="nx-section-eyebrow">FROM SIGNAL TO SELF-RECOVERY</div>
            <h2>One connected <span>intelligence loop.</span></h2>
            <p className="nx-how-intro">Nexus AI turns operational signals into action, then uses every outcome to make the next response smarter.</p>
            <div className="nx-how-flow">
              <div className="nx-how-line"><i /><i /><i /></div>
              <article className="nx-how-step step-detect">
                <span className="nx-how-number">01</span>
                <div className="nx-how-icon"><Activity size={23} /></div>
                <h3>Detect</h3>
                <p>Spot failures, unusual costs, risky changes and exposed secrets.</p>
              </article>
              <article className="nx-how-step step-analyze">
                <span className="nx-how-number">02</span>
                <div className="nx-how-icon"><Radar size={23} /></div>
                <h3>Analyze</h3>
                <p>Connect the signals and investigate what is actually happening.</p>
              </article>
              <article className="nx-how-step step-respond">
                <span className="nx-how-number">03</span>
                <div className="nx-how-icon"><Zap size={23} /></div>
                <h3>Respond</h3>
                <p>Choose a recovery path and make the next action clear.</p>
              </article>
              <article className="nx-how-step step-learn">
                <span className="nx-how-number">04</span>
                <div className="nx-how-icon"><Sparkles size={23} /></div>
                <h3>Learn</h3>
                <p>Turn each outcome into stronger, more resilient operations.</p>
              </article>
            </div>
            <div className="nx-how-foot"><span /> DETECT → UNDERSTAND → RECOVER → IMPROVE</div>
          </div>
        </section>

        {/* PAGE 4 — FINAL CTA */}
        <section id="final" className="nx-page nx-final-v4">
          <div className="nx-final-grid" />
          <div className="nx-final-glow glow-one" />
          <div className="nx-final-glow glow-two" />
          <div className="nx-final-scan" />

          <div className="nx-section-eyebrow">NEXUS AI</div>
          <h2>
            Ready to <span>break</span> something?
          </h2>
          <p>Build a system that knows how to recover.</p>

          <div className="nx-final-actions">
            <button className="nx-primary" onClick={onSignup}>
              Sign up free <ArrowUpRight size={17} />
            </button>
            <button className="nx-ghost" onClick={onLogin}>
              I already have an account <LogIn size={16} />
            </button>
          </div>

          <footer className="nx-footer nx-footer-v3">
            <span>© 2026 Nexus AI</span>
            <span>Autonomous DevOps / SRE platform</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

function AuthScreen({
  mode,
  pendingFeature,
  onBack,
  onSwitch,
  onSuccess,
}: {
  mode: "login" | "signup";
  pendingFeature: FeatureId | null;
  onBack: () => void;
  onSwitch: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    onSuccess();
  };

  return (
    <div className="nx-auth">
      <style>{GLOBAL_CSS}</style>
      <div className="nx-auth-bg" />
      <button className="nx-auth-back" onClick={onBack}>
        <ArrowLeft size={17} /> Back to Nexus
      </button>

      <div className="nx-auth-orbit auth-orbit-a" />
      <div className="nx-auth-orbit auth-orbit-b" />

      <div className="nx-auth-core" aria-hidden="true"><div className="nx-auth-core-ring" /><div className="nx-auth-core-ring two" /><div className="nx-auth-core-dot" /></div>

      <div className="nx-auth-card">
        <div className="nx-brand auth-brand">
          <span className="nx-brand-mark"><span /><span /><span /></span>
          <span>NEXUS <b>AI</b></span>
        </div>

        {pendingFeature && (
          <div className="nx-auth-notice">
            <Lock size={15} />
            <span>
              Sign in to open <b>{FEATURE_MAP[pendingFeature].title}</b>.
            </span>
          </div>
        )}

        <div className="nx-section-eyebrow">{mode === "login" ? "WELCOME BACK" : "START YOUR WORKSPACE"}</div>
        <h1>{mode === "login" ? "Enter the control plane." : "Build your control plane."}</h1>
        <p>
          {mode === "login"
            ? "Your systems are waiting behind authentication."
            : "Create a free Nexus AI workspace and operate all five systems."}
        </p>

        <form onSubmit={submit} className="nx-auth-form">
          <label>
            Email
            <div className="nx-input">
              <LogIn size={17} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="nx-input">
              <KeyRound size={17} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          <button className="nx-primary auth-submit" type="submit">
            {mode === "login" ? "Log in" : "Create account"} <ArrowRight size={17} />
          </button>
        </form>

        <div className="nx-auth-switch">
          {mode === "login" ? "New to Nexus AI?" : "Already have an account?"}
          <button onClick={onSwitch}>
            {mode === "login" ? "Sign up free" : "Log in"}
          </button>
        </div>

        <small className="nx-demo-note">
          Demo authentication: any valid email + password opens the platform.
        </small>
      </div>
    </div>
  );
}

function PlatformShell({
  view,
  onNavigate,
  onLogout,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: AppView; label: string; icon: ReactNode }[] = [
    { id: "dashboard", label: "Overview", icon: <Layers3 size={17} /> },
    { id: "chaos", label: "Chaos Lab", icon: <Zap size={17} /> },
    { id: "failover", label: "Multi-Region Failover", icon: <Globe2 size={17} /> },
    { id: "cost", label: "Cost Intelligence", icon: <CircleDollarSign size={17} /> },
    { id: "root-cause", label: "AI Root Cause", icon: <Radar size={17} /> },
    { id: "secrets", label: "Secret Scanner", icon: <ShieldCheck size={17} /> },
  ];

  return (
    <div className="nx-platform">
      <style>{GLOBAL_CSS}</style>

      <aside className={`nx-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="nx-side-brand">
          <span className="nx-brand-mark"><span /><span /><span /></span>
          <span>NEXUS <b>AI</b></span>
        </div>

        <div className="nx-side-label">CONTROL PLANE</div>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="nx-side-bottom">
          <div className="nx-side-status">
            <span className="nx-live-dot" />
            <div><b>Systems online</b><small>All control paths ready</small></div>
          </div>
          <button onClick={onLogout} className="nx-side-logout">
            Log out
          </button>
        </div>
      </aside>

      <div className="nx-app-main">
        <header className="nx-app-header">
          <button className="nx-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <div className="nx-header-kicker">NEXUS AI / CONTROL PLANE</div>
            <h1>{view === "dashboard" ? "Operational overview" : FEATURE_MAP[view as FeatureId]?.title}</h1>
          </div>
          <div className="nx-header-right">
            <div className="nx-online"><span className="nx-live-dot" /> LIVE</div>
            <button className="nx-icon-button"><Bell size={18} /></button>
            <div className="nx-avatar">TS</div>
          </div>
        </header>

        <div className="nx-app-content">
          {view === "dashboard" && <Dashboard onNavigate={onNavigate} />}
          {view === "chaos" && <ChaosLab />}
          {view === "failover" && <Failover />}
          {view === "cost" && <CostIntelligence />}
          {view === "root-cause" && <RootCause />}
          {view === "secrets" && <SecretScanner />}
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Check that the backend is running.";
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12,
      border: "1px solid rgba(255,77,109,.3)", background: "rgba(255,77,109,.08)",
      color: "#ffb4c0", fontSize: 13, lineHeight: 1.5 }}>
      {message}
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [backendStatus, setBackendStatus] = useState("Checking");
  const [databaseStatus, setDatabaseStatus] = useState("Checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    const [serviceResult, incidentResult, healthResult, dbResult] = await Promise.allSettled([
      getServices(), getIncidents(), getHealth(), getDatabaseStatus(),
    ]);

    const errors: string[] = [];
    if (serviceResult.status === "fulfilled" && Array.isArray(serviceResult.value)) {
      setServices(serviceResult.value);
    } else {
      setServices([]);
      errors.push(serviceResult.status === "rejected" ? getErrorMessage(serviceResult.reason) : "Services response was not a list.");
    }
    if (incidentResult.status === "fulfilled" && Array.isArray(incidentResult.value)) {
      setIncidents(incidentResult.value);
    } else {
      setIncidents([]);
      errors.push(incidentResult.status === "rejected" ? getErrorMessage(incidentResult.reason) : "Incidents response was not a list.");
    }
    setBackendStatus(healthResult.status === "fulfilled" && healthResult.value?.status === "ok" ? "Online" : "Offline");
    setDatabaseStatus(dbResult.status === "fulfilled" && dbResult.value?.database === "connected" ? "Connected" : "Unavailable");
    if (errors.length) setError(errors[0]);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const openIncidents = incidents.filter((incident) =>
    !["resolved", "closed"].includes(String(incident?.status ?? "open").toLowerCase())
  ).length;

  const signalRows = [
    ["Backend API", backendStatus, backendStatus === "Online" ? "#36e0a1" : "#ff6b7d"],
    ["Database", databaseStatus, databaseStatus === "Connected" ? "#36e0a1" : "#ff6b7d"],
    ["Service registry", `${services.length} loaded`, "#36b7ff"],
    ["Incident queue", `${openIncidents} open`, "#b875ff"],
  ];

  return (
    <div className="nx-dashboard">
      <div className="nx-dashboard-hero">
        <div>
          <div className="nx-section-eyebrow">AUTONOMOUS OPERATIONS</div>
          <h2>Know what changed.<br /><span>Know what to do next.</span></h2>
          <p>Nexus connects resilience, cost, security and incident reasoning in one operational surface.</p>
        </div>
        <div className="nx-dashboard-core">
          <div className="core-ring" />
          <Bot size={40} />
          <small>NX CORE</small>
        </div>
      </div>

      <div className="nx-metric-grid">
        <Metric title="Services" value={services.length} icon={<Server />} />
        <Metric title="Open incidents" value={openIncidents} icon={<Activity />} />
        <Metric title="Systems" value="05" icon={<Layers3 />} />
        <Metric title="Control plane" value={backendStatus === "Online" ? "LIVE" : backendStatus === "Checking" ? "..." : "DOWN"} icon={<Cpu />} />
      </div>

      <div className="nx-dashboard-grid">
        <div className="nx-panel nx-panel-large">
          <div className="nx-panel-head">
            <div><span>OPERATIONS</span><h3>Five systems. One control plane.</h3></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="nx-live-pill"><i /> {backendStatus}</span>
              <button className="nx-ghost" onClick={() => void refresh()} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="nx-dashboard-features">
            {FEATURES.map((feature) => (
              <button key={feature.id} onClick={() => onNavigate(feature.id)} className="nx-dashboard-feature">
                <span style={{ color: feature.accent }}>{feature.icon}</span>
                <div><b>{feature.title}</b><small>{feature.short}</small></div>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          {error && <ErrorNotice message={error} />}
        </div>

        <div className="nx-panel">
          <div className="nx-panel-head"><div><span>SYSTEM SIGNAL</span><h3>Health stream</h3></div></div>
          <div className="nx-health-stream">
            {signalRows.map(([name, status, color]) => (
              <div key={name}>
                <span className="health-dot" style={{ background: color }} />
                <span>{name}</span>
                <b>{status}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="nx-metric">
      <div className="nx-metric-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>LIVE SIGNAL</small>
    </div>
  );
}

function ChaosLab() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [clusterStatus, setClusterStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshStatus = async () => {
    const status = await getDemoAppStatus();
    setClusterStatus(status);
    return status;
  };

  const refreshHistory = async () => {
    const rows = await getChaosExperiments();
    // Only show runs against this isolated demo workload, not regional services.
    setExperiments(Array.isArray(rows)
      ? rows.filter((item) => String(item?.notes ?? "").includes("demo-web-app"))
      : []);
  };

  const loadPage = async () => {
    setError("");
    const results = await Promise.allSettled([refreshStatus(), refreshHistory()]);
    const failed = results.find((entry) => entry.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(getErrorMessage(failed.reason));
    setLoading(false);
  };

  useEffect(() => {
    void loadPage();
    // Keep the pod panel live so the audience can watch Kubernetes replace a killed pod.
    const timer = window.setInterval(() => {
      getDemoAppStatus().then(setClusterStatus).catch((err) => setError(getErrorMessage(err)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const run = async () => {
    if (!clusterStatus?.deployment_exists) {
      setError("demo-web-app was not found in Minikube. Deploy the demo app before running Chaos Lab.");
      return;
    }
    if (!clusterStatus?.pods?.length) {
      setError("No demo-web-app pods are currently available to target.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await runChaosExperiment("demo-web-app");
      setResult(response);
      await Promise.allSettled([refreshStatus(), refreshHistory()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pods = Array.isArray(clusterStatus?.pods) ? clusterStatus.pods : [];
  const readyPods = pods.filter((pod: any) => pod.ready).length;
  const desiredReplicas = Number(clusterStatus?.deployment?.replicas ?? 0);
  const availableReplicas = Number(clusterStatus?.deployment?.available_replicas ?? readyPods);
  const deploymentExists = Boolean(clusterStatus?.deployment_exists);

  return (
    <FeatureWorkspace feature={FEATURE_MAP.chaos} eyebrow="FAULT INJECTION / RESILIENCE"
      description="Break the isolated demo-web-app workload in Minikube, watch Kubernetes replace the pod, and review each experiment here.">
      <div className="nx-work-grid">
        <div className="nx-panel nx-panel-large">
          <PanelTitle title="Run pod-kill experiment" label="CHAOS MESH / PODCHAOS" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, margin: "4px 0 18px" }}>
            <div style={{ padding: 13, borderRadius: 11, background: "rgba(54,217,255,.06)", border: "1px solid rgba(54,217,255,.14)" }}>
              <small style={{ color: "#728099", display: "block", fontSize: 9 }}>TARGET APP</small>
              <b style={{ display: "block", color: "#e9f5ff", marginTop: 7, fontSize: 12 }}>demo-web-app</b>
            </div>
            <div style={{ padding: 13, borderRadius: 11, background: "rgba(54,217,255,.06)", border: "1px solid rgba(54,217,255,.14)" }}>
              <small style={{ color: "#728099", display: "block", fontSize: 9 }}>NAMESPACE</small>
              <b style={{ display: "block", color: "#e9f5ff", marginTop: 7, fontSize: 12 }}>default</b>
            </div>
            <div style={{ padding: 13, borderRadius: 11, background: "rgba(54,224,161,.06)", border: "1px solid rgba(54,224,161,.14)" }}>
              <small style={{ color: "#728099", display: "block", fontSize: 9 }}>HEALTHY PODS</small>
              <b style={{ display: "block", color: "#36e0a1", marginTop: 7, fontSize: 12 }}>{readyPods} / {desiredReplicas || "—"}</b>
            </div>
          </div>
          <div className="nx-inline-warning">
            Controlled test: Chaos Mesh kills exactly one pod labelled app=demo-web-app in the default namespace. Kubernetes Deployment recreates it. Mumbai and Virginia failover services are not used by this page.
          </div>
          <div className="nx-control-row">
            <button className="nx-primary" onClick={run} disabled={busy || loading || !deploymentExists || pods.length === 0}>
              <Play size={17} /> {busy ? "Injecting failure..." : "Kill one demo pod"}
            </button>
            <button className="nx-ghost" onClick={() => void loadPage()} disabled={busy || loading}>Refresh status</button>
          </div>
          {!loading && !deploymentExists && <div className="nx-helper-text">demo-web-app is not detected. Start the Minikube demo deployment before running this experiment.</div>}
          {clusterStatus?.chaos_mesh_installed === false && <div className="nx-helper-text">Chaos Mesh PodChaos CRD was not detected in this cluster.</div>}
          {error && <ErrorNotice message={error} />}
          {result && <ResultBox data={result} />}
          <div className="nx-helper-text">The experiment is triggered from this page. The pod list on the right refreshes every 3 seconds so you can show termination and recovery without typing kubectl commands.</div>
        </div>

        <div className="nx-panel">
          <PanelTitle title="Live Kubernetes pods" label={loading ? "CONNECTING" : deploymentExists ? `${readyPods} READY` : "NOT DETECTED"} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0 13px", color: "#758198", fontSize: 10 }}>
            <span>Deployment availability</span>
            <b style={{ color: availableReplicas > 0 ? "#36e0a1" : "#ff7089" }}>{availableReplicas} / {desiredReplicas}</b>
          </div>
          {loading ? <div className="nx-empty-state small">Reading Minikube status…</div> : pods.length === 0 ? (
            <div className="nx-empty-state small">No pods found for app=demo-web-app.</div>
          ) : (
            <div className="nx-list">
              {pods.map((pod: any) => (
                <div className="nx-list-row" key={pod.name}>
                  <Activity size={15} color={pod.ready ? "#36e0a1" : "#ffbf3f"} />
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: "block", color: "#dce4f5", fontSize: 9, overflowWrap: "anywhere" }}>{pod.name}</b>
                    <small style={{ display: "block", color: "#64718a", fontSize: 8, marginTop: 4 }}>Restarts: {pod.restarts} · {pod.ip || "IP pending"}</small>
                  </span>
                  <b style={{ color: pod.ready ? "#36e0a1" : "#ffbf3f" }}>{pod.deleting ? "TERMINATING" : pod.ready ? "READY" : pod.phase}</b>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: "1px solid #ffffff0c", marginTop: 14, paddingTop: 13 }}>
            <PanelTitle title="Demo experiment history" label={`${experiments.length} RUNS`} />
            <DataList items={experiments} empty="No demo-web-app experiments yet. Run your first pod kill above."
              render={(item, index) => (
                <div className="nx-list-row" key={item?.id ?? index}>
                  <Zap size={15} /><span>{item?.notes ?? `Experiment ${index + 1}`}</span>
                  <b>{item?.result ?? "recorded"}</b>
                </div>
              )} />
          </div>
        </div>
      </div>
    </FeatureWorkspace>
  );
}

function displayRegionName(value: unknown) {
  const region = String(value ?? "").trim();
  const normalized = region.toLowerCase();
  if (normalized.includes("mumbai") || normalized.includes("ap-south-1")) return "Mumbai";
  if (normalized.includes("virginia") || normalized.includes("us-east-1")) return "Virginia";
  return region || "Unassigned region";
}

function isMumbaiService(service: any) {
  const region = String(service?.region ?? "").toLowerCase();
  return region.includes("mumbai") || region.includes("ap-south-1");
}

function isVirginiaService(service: any) {
  const region = String(service?.region ?? "").toLowerCase();
  return region.includes("virginia") || region.includes("us-east-1");
}

function Failover() {
  const [services, setServices] = useState<any[]>([]);
  const [primary, setPrimary] = useState<number | "">("");
  const [backup, setBackup] = useState<number | "">("");
  const [primaryEndpoint, setPrimaryEndpoint] = useState("");
  const [backupEndpoint, setBackupEndpoint] = useState("");
  const [savingEndpoints, setSavingEndpoints] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  // Multi-Region Failover is intentionally limited to the two demo records.
  // The old payments-api record and the local demo-web-app record are hidden,
  // but neither is deleted from the database.
  const getRegionalPair = (rows: any[]) => {
    const eligible = Array.isArray(rows)
      ? rows.filter((service: any) => {
          const name = String(service?.name ?? "").trim().toLowerCase();
          return name === "my-web-app" && (isMumbaiService(service) || isVirginiaService(service));
        })
      : [];
    const mumbai = eligible.find(isMumbaiService);
    const virginia = eligible.find(isVirginiaService);
    return [mumbai, virginia].filter(Boolean);
  };

  const refreshServices = async () => {
    const rows = await getServices();
    const next = getRegionalPair(rows);
    setServices(next);

    const mumbai = next.find(isMumbaiService);
    const virginia = next.find(isVirginiaService);
    if (mumbai && (primary === "" || !next.some((service: any) => Number(service.id) === Number(primary)))) {
      setPrimary(Number(mumbai.id));
    }
    if (virginia && (backup === "" || !next.some((service: any) => Number(service.id) === Number(backup)))) {
      setBackup(Number(virginia.id));
    }
    return next;
  };

  const ensureMumbaiVirginiaPair = async () => {
    setCreating(true);
    setError("");
    setResult(null);
    try {
      const current = await getServices();
      const regional = getRegionalPair(current);
      let mumbai = regional.find(isMumbaiService);
      let virginia = regional.find(isVirginiaService);

      if (!mumbai) {
        mumbai = await createService({
          name: "my-web-app",
          region: "Mumbai (ap-south-1)",
          status: "healthy",
          endpoint_url: "",
        });
      }
      if (!virginia) {
        virginia = await createService({
          name: "my-web-app",
          region: "Virginia (us-east-1)",
          status: "healthy",
          endpoint_url: "",
        });
      }

      const refreshed = await getServices();
      const next = getRegionalPair(refreshed);
      setServices(next);
      setPrimary(Number(mumbai.id));
      setBackup(Number(virginia.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    refreshServices().catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    const selectedPrimary = services.find((service) => Number(service.id) === Number(primary));
    const selectedBackup = services.find((service) => Number(service.id) === Number(backup));
    setPrimaryEndpoint(selectedPrimary?.endpoint_url ?? "");
    setBackupEndpoint(selectedBackup?.endpoint_url ?? "");
  }, [primary, backup, services]);

  const saveHealthEndpoints = async () => {
    const selectedPrimary = services.find((service) => Number(service.id) === Number(primary));
    const selectedBackup = services.find((service) => Number(service.id) === Number(backup));
    if (!selectedPrimary || !selectedBackup || primary === backup) {
      setError("Select the Mumbai and Virginia services before saving endpoints.");
      return;
    }
    setSavingEndpoints(true);
    setError("");
    try {
      await Promise.all([
        updateService(Number(primary), {
          name: selectedPrimary.name,
          region: selectedPrimary.region,
          status: selectedPrimary.status,
          endpoint_url: primaryEndpoint.trim() || undefined,
        }),
        updateService(Number(backup), {
          name: selectedBackup.name,
          region: selectedBackup.region,
          status: selectedBackup.status,
          endpoint_url: backupEndpoint.trim() || undefined,
        }),
      ]);
      await refreshServices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEndpoints(false);
    }
  };

  const simulate = async () => {
    if (primary === "") return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await simulateFailure(Number(primary)));
      await refreshServices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (primary === "" || backup === "" || primary === backup) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await runFailover(Number(primary), Number(backup)));
      await refreshServices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    if (primary === "" || backup === "" || primary === backup) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await recoverPrimary(Number(primary), Number(backup)));
      await refreshServices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const primaryService = services.find((service) => Number(service.id) === Number(primary));
  const backupService = services.find((service) => Number(service.id) === Number(backup));

  return (
    <FeatureWorkspace
      feature={FEATURE_MAP.failover}
      eyebrow="RESILIENCE / TRAFFIC CONTINUITY"
      description="Test regional recovery between your Mumbai primary and Virginia backup service."
    >
      <div className="nx-work-grid">
        <div className="nx-panel nx-panel-large">
          <PanelTitle title="Regional recovery" label="FAILOVER ENGINE" />
          <div className="nx-region-map">
            <div className="region-node primary">
              <span /><b>PRIMARY</b>
              <small>{displayRegionName(primaryService?.region ?? "Mumbai")}</small>
            </div>
            <div className="region-connection"><i /></div>
            <div className="region-node backup">
              <span /><b>BACKUP</b>
              <small>{displayRegionName(backupService?.region ?? "Virginia")}</small>
            </div>
          </div>

          <div className="nx-control-row">
            <button className="nx-ghost" onClick={ensureMumbaiVirginiaPair} disabled={creating || busy}>
              {creating ? "Preparing regions..." : "Set up Mumbai + Virginia demo pair"}
            </button>
            <button className="nx-ghost" onClick={() => refreshServices().catch((err) => setError(getErrorMessage(err)))}>
              Refresh
            </button>
          </div>

          <div className="nx-control-grid">
            <label className="nx-select">Primary service (Mumbai)
              <select value={primary} onChange={(e) => setPrimary(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select Mumbai primary</option>
                {services.filter(isMumbaiService).map((service) => (
                  <option key={service.id} value={service.id}>{service.name} · Mumbai</option>
                ))}
              </select>
            </label>
            <label className="nx-select">Backup service (Virginia)
              <select value={backup} onChange={(e) => setBackup(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select Virginia backup</option>
                {services.filter(isVirginiaService).map((service) => (
                  <option key={service.id} value={service.id}>{service.name} · Virginia</option>
                ))}
              </select>
            </label>
          </div>

          <div className="nx-panel" style={{ marginTop: 14, padding: 14 }}>
            <PanelTitle title="Health check endpoints" label="OPTIONAL AUTO-MONITOR" />
            <div className="nx-control-grid">
              <label className="nx-select">Primary endpoint (Mumbai)
                <input value={primaryEndpoint} onChange={(e) => setPrimaryEndpoint(e.target.value)} placeholder="https://mumbai.example.com/health" />
              </label>
              <label className="nx-select">Backup endpoint (Virginia)
                <input value={backupEndpoint} onChange={(e) => setBackupEndpoint(e.target.value)} placeholder="https://virginia.example.com/health" />
              </label>
            </div>
            <button className="nx-ghost" onClick={saveHealthEndpoints} disabled={savingEndpoints || primary === "" || backup === "" || primary === backup}>
              {savingEndpoints ? "Saving endpoints..." : "Save health endpoints"}
            </button>
            <p className="nx-helper-text">
              Endpoints must be reachable from the WSL backend and return HTTP 2xx/3xx. Automatic monitoring is optional and promotes the backup service record in the database; it does not switch live DNS or production traffic.
            </p>
            <p className="nx-helper-text">Current pair IDs: Mumbai #{primary || "—"} → Virginia #{backup || "—"}</p>
          </div>

          <div className="nx-control-row">
            <button className="nx-danger" onClick={simulate} disabled={busy || primary === ""}>
              <Zap size={16} /> Simulate failure
            </button>
            <button className="nx-primary" onClick={execute} disabled={busy || primary === "" || backup === "" || primary === backup}>
              <RotateCcw size={16} /> Run failover
            </button>
            <button className="nx-ghost" onClick={recover} disabled={busy || primary === "" || backup === "" || primary === backup}>
              Restore primary
            </button>
          </div>
          {error && <ErrorNotice message={error} />}
          {result && <ResultBox data={result} />}
          <p className="nx-helper-text">
            Prototype note: these actions update service records in the database. They do not switch live DNS or production traffic.
          </p>
        </div>

        <div className="nx-panel">
          <div className="nx-panel-head">
            <div><span>{services.length} REGIONAL SERVICES</span><h3>Mumbai / Virginia registry</h3></div>
            <button className="nx-ghost" onClick={() => refreshServices().catch((err) => setError(getErrorMessage(err)))}>Refresh</button>
          </div>
          <DataList
            items={services}
            empty="The Mumbai and Virginia demo services are not set up yet. Use Set up Mumbai + Virginia demo pair."
            render={(item, index) => (
              <div className="nx-list-row" key={item?.id ?? index}>
                <Server size={15} />
                <span>{item?.name ?? "my-web-app"} · {displayRegionName(item?.region)}</span>
                <b>{item?.status ?? "unknown"}</b>
              </div>
            )}
          />
        </div>
      </div>
    </FeatureWorkspace>
  );
}


function CostIntelligence() {
  const [billing, setBilling] = useState<any>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [inventory, setInventory] = useState<any>(null);
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [resourceName, setResourceName] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [potentialSavings, setPotentialSavings] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshReports = async () => {
    const rows = await getCostReports();
    setReports(Array.isArray(rows) ? rows : []);
  };

  const loadActualCosts = async (forceRefresh = false) => {
    setBillingBusy(true);
    setBillingError("");
    try {
      const result = await getAwsCosts(forceRefresh);
      setBilling(result);
      if (result?.status !== "connected") {
        setBillingError(result?.message || "AWS Cost Explorer did not return billing data.");
      }
    } catch (err) {
      setBillingError(getErrorMessage(err));
    } finally {
      setBillingBusy(false);
    }
  };

  const scanInventory = async () => {
    setInventoryBusy(true);
    setError("");
    try {
      setInventory(await getAwsScan());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInventoryBusy(false);
    }
  };

  useEffect(() => {
    refreshReports().catch((err) => setError(getErrorMessage(err)));
    // Fetch once when this page is opened. Backend caches Cost Explorer
    // responses so revisiting the page does not automatically bill each time.
    loadActualCosts(false);
  }, []);

  const saveReport = async () => {
    const cost = Number(monthlyCost);
    const savings = potentialSavings.trim() ? Number(potentialSavings) : null;
    if (
      !resourceName.trim() || !monthlyCost.trim() || !Number.isFinite(cost) || cost < 0 ||
      (savings !== null && (!Number.isFinite(savings) || savings < 0))
    ) {
      setError("Enter a resource name and valid non-negative cost values.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createCostReport({
        resource_name: resourceName.trim(),
        monthly_cost: Math.round(cost),
        recommendation: recommendation.trim() || undefined,
        potential_savings: savings === null ? undefined : Math.round(savings),
      });
      await refreshReports();
      setResourceName("");
      setMonthlyCost("");
      setPotentialSavings("");
      setRecommendation("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const formatAwsMoney = (amount: string | number | undefined, unit: string | undefined) => {
    const value = Number(amount ?? 0);
    const currency = unit || billing?.currency || "USD";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number.isFinite(value) ? value : 0);
    } catch {
      return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
    }
  };

  const reportsTotal = reports.reduce((sum, row) => sum + Number(row?.monthly_cost || 0), 0);
  const reportsSavings = reports.reduce((sum, row) => sum + Number(row?.potential_savings || 0), 0);
  const trend = Array.isArray(billing?.monthly_trend) ? billing.monthly_trend : [];
  const trendMax = Math.max(0, ...trend.map((row: any) => Number(row.amount || 0)));
  const inventoryEc2 = inventory?.ec2_findings ?? [];
  const inventoryEbs = inventory?.ebs_findings ?? [];

  return (
    <FeatureWorkspace
      feature={FEATURE_MAP.cost}
      eyebrow="CLOUD ECONOMICS / AWS"
      description="View actual AWS account spend from Cost Explorer, review service-level trends, and scan resources for waste signals."
    >
      <div className="nx-panel nx-panel-wide">
        <div className="nx-panel-head">
          <div>
            <span>AWS BILLING / COST EXPLORER</span>
            <h3>Actual AWS account spend</h3>
          </div>
          <button
            className="nx-primary"
            onClick={() => loadActualCosts(true)}
            disabled={billingBusy}
          >
            {billingBusy ? "Loading actual costs..." : "Refresh actual AWS costs"}
            <RotateCcw size={15} />
          </button>
        </div>

        {billingBusy && !billing && (
          <p className="nx-helper-text">Connecting to AWS Cost Explorer and retrieving billing data...</p>
        )}

        {billingError && <ErrorNotice message={billingError} />}

        {billing?.status === "connected" && (
          <>
            <div className="nx-metric-grid compact">
              <Metric
                title={`Current month · ${billing.current_month?.label ?? "Month to date"}`}
                value={formatAwsMoney(billing.current_month?.amount, billing.current_month?.unit)}
                icon={<CircleDollarSign />}
              />
              <Metric
                title={`Previous month · ${billing.previous_month?.label ?? "Previous month"}`}
                value={formatAwsMoney(billing.previous_month?.amount, billing.previous_month?.unit)}
                icon={<Activity />}
              />
            </div>

            <div className="nx-work-grid">
              <div>
                <PanelTitle title="Monthly AWS spend" label="LAST SIX MONTHS" />
                {trend.length === 0 ? (
                  <p className="nx-helper-text">AWS has not returned monthly cost history for this account yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))`, gap: 10, alignItems: "end", minHeight: 170, padding: "12px 4px" }}>
                    {trend.map((row: any) => {
                      const amount = Number(row.amount || 0);
                      const height = trendMax > 0 ? Math.max(4, (amount / trendMax) * 112) : 4;
                      return (
                        <div key={row.month} title={`${row.label}: ${formatAwsMoney(row.amount, row.unit)}`} style={{ display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <strong style={{ fontSize: 10, color: "var(--muted, #94a3b8)", textAlign: "center", overflowWrap: "anywhere" }}>{formatAwsMoney(row.amount, row.unit)}</strong>
                          <div style={{ height, width: "100%", maxWidth: 46, borderRadius: "7px 7px 2px 2px", background: "linear-gradient(180deg,#43c5ee,#8b5cf6 68%,#e75cae)" }} />
                          <small style={{ fontSize: 10, color: "var(--muted, #94a3b8)", textAlign: "center" }}>{row.label}</small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <PanelTitle title="Spend by AWS service" label="CURRENT MONTH" />
                <DataList
                  items={billing.service_breakdown ?? []}
                  empty="No service-level charges were returned for the current month."
                  render={(item: any, index: number) => (
                    <div className="nx-list-row" key={`${item.service}-${index}`}>
                      <Server size={15} />
                      <span><b>{item.service}</b></span>
                      <strong>{formatAwsMoney(item.amount, item.unit)}</strong>
                    </div>
                  )}
                />
              </div>
            </div>

            <p className="nx-helper-text">
              Source: AWS Cost Explorer · Billing currency: {billing.currency} ·
              {billing.cached ? " Cached result" : " Live API result"} ·
              {billing.fetched_at ? ` Retrieved ${new Date(billing.fetched_at).toLocaleString()}` : ""}
            </p>
            <p className="nx-helper-text">{billing.note}</p>
          </>
        )}

        {!billing && !billingBusy && !billingError && (
          <p className="nx-helper-text">Open this page to load your AWS account's actual spending.</p>
        )}
      </div>

      <div className="nx-panel nx-panel-wide">
        <div className="nx-panel-head">
          <div>
            <span>RESOURCE INVENTORY / READ ONLY</span>
            <h3>Infrastructure waste signals</h3>
          </div>
          <button className="nx-ghost" onClick={scanInventory} disabled={inventoryBusy}>
            {inventoryBusy ? "Scanning EC2 / EBS..." : "Scan EC2 / EBS inventory"}
            <ScanSearch size={15} />
          </button>
        </div>
        <p className="nx-helper-text">This separate scan lists running EC2 instances and unattached EBS volumes. It does not calculate your bill.</p>
        {error && <ErrorNotice message={error} />}
        {inventory && (
          <>
            {(inventory.errors ?? []).map((message: string, index: number) => <ErrorNotice key={index} message={message} />)}
            <div className="nx-metric-grid compact">
              <Metric title="Running EC2" value={inventoryEc2.length} icon={<Server />} />
              <Metric title="Unattached EBS" value={inventoryEbs.length} icon={<Layers3 />} />
            </div>
            <div className="nx-work-grid">
              <div>
                <PanelTitle title="Compute findings" label="EC2" />
                <DataList items={inventoryEc2} empty="No running EC2 instances returned." render={(item: any, index: number) => (
                  <div className="nx-list-row" key={item.resource_name ?? index}>
                    <Server size={15} />
                    <span><b>{item.resource_name}</b><small>{item.resource_type} · {item.region_name ?? item.region ?? "AWS region"} · {item.recommendation}</small></span>
                    <strong>{item.status}</strong>
                  </div>
                )} />
              </div>
              <div>
                <PanelTitle title="Storage findings" label="EBS" />
                <DataList items={inventoryEbs} empty="No unattached EBS volumes returned." render={(item: any, index: number) => (
                  <div className="nx-list-row" key={item.resource_name ?? index}>
                    <Layers3 size={15} />
                    <span><b>{item.resource_name}</b><small>{item.resource_type} · {item.region_name ?? item.region ?? "AWS region"} · {item.recommendation}</small></span>
                    <strong>{item.status}</strong>
                  </div>
                )} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="nx-work-grid">
        <div className="nx-panel nx-panel-large">
          <PanelTitle title="Add cost record" label="MANUAL ESTIMATE · INR" />
          <div className="nx-form-grid">
            <label className="nx-select nx-field">Resource name
              <input value={resourceName} onChange={(e) => setResourceName(e.target.value)} placeholder="e.g. Production EC2" />
            </label>
            <label className="nx-select nx-field">Monthly cost (₹)
              <input type="number" min="0" step="1" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="e.g. 120" />
            </label>
            <label className="nx-select nx-field">Potential savings (₹, optional)
              <input type="number" min="0" step="1" value={potentialSavings} onChange={(e) => setPotentialSavings(e.target.value)} placeholder="e.g. 25" />
            </label>
            <label className="nx-select nx-field">Recommendation (optional)
              <input value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder="Review utilization and resize" />
            </label>
          </div>
          <button className="nx-primary" onClick={saveReport} disabled={saving || !resourceName.trim() || !monthlyCost.trim()}>{saving ? "Saving..." : "Save cost record"}</button>
          <p className="nx-helper-text">These are manually entered INR estimates, shown separately from actual AWS Cost Explorer charges.</p>
        </div>
        <div className="nx-panel">
          <PanelTitle title="Manual cost register" label={`${reports.length} SAVED RECORDS`} />
          <div className="nx-metric-grid compact nx-cost-metrics">
            <Metric title="Estimated monthly total" value={`₹${reportsTotal.toLocaleString("en-IN")}`} icon={<CircleDollarSign />} />
            <Metric title="Potential savings" value={`₹${reportsSavings.toLocaleString("en-IN")}`} icon={<Activity />} />
          </div>
          <DataList items={reports} empty="No manual cost records saved yet."
            render={(item, index) => <div className="nx-list-row nx-cost-row" key={item?.id ?? index}>
              <CircleDollarSign size={15} /><span><b>{item?.resource_name}</b><small>{item?.recommendation ?? "No recommendation added"}</small></span>
              <strong>₹{Number(item?.monthly_cost ?? 0).toLocaleString("en-IN")}</strong>
            </div>} />
          <button className="nx-ghost" onClick={() => refreshReports().catch((err) => setError(getErrorMessage(err)))}>Refresh cost records</button>
        </div>
      </div>
    </FeatureWorkspace>
  );
}
function RootCause() {
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState<number | "">("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState(
    "Chaos Mesh PodChaos deliberately terminated one demo-web-app pod. Kubernetes created a replacement pod. Investigate the failure and recovery using the available Prometheus telemetry."
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Delete only the exact legacy fake Payment API seed incident.
        // This does not delete real incidents or service records.
        await removeLegacyPaymentPlaceholder().catch(() => null);
        const rows = await getServices();
        const demoApps = (Array.isArray(rows) ? rows : []).filter(
          (service: any) =>
            String(service?.name ?? "").trim().toLowerCase() === "demo-web-app"
        );
        if (!mounted) return;
        setServices(demoApps);
        if (demoApps.length) setServiceId(Number(demoApps[0].id));
        if (!demoApps.length) {
          setError("The demo-web-app service is not registered. Start the demo workload and refresh the service registry first.");
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const startInvestigation = async () => {
    if (!serviceId || !description.trim()) {
      setError("Choose the demo application and enter an incident description.");
      return;
    }
    if (description.trim().length < 12) {
      setError("Please provide a little more detail in the incident description.");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);
    try {
      // One action performs the complete workflow: create incident -> query Prometheus -> ask Llama 3.
      const result = await scanAndInvestigateIncident({
        service_id: Number(serviceId),
        severity,
        description: description.trim(),
        status: "open",
      });
      setReport(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reportText = String(report?.ai_analysis ?? "");
  // Ollama may wrap section headings in Markdown bold markers. Normalize first
  // so the report is rendered as designed instead of showing raw ** markers.
  const normalizedReport = reportText
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .trim();

  const extractSection = (labels: string[], following: string[]) => {
    const labelPattern = labels.join("|");
    const expression = new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:?\\s*`, "i");
    const match = expression.exec(normalizedReport);
    if (!match) return "";
    const contentStart = match.index + match[0].length;
    const tail = normalizedReport.slice(contentStart);
    let contentEnd = tail.length;
    if (following.length) {
      const nextPattern = following.join("|");
      const next = new RegExp(`\\n\\s*(?:${nextPattern})\\s*:?\\s*`, "i").exec(tail);
      if (next) contentEnd = next.index;
    }
    return tail.slice(0, contentEnd).trim();
  };

  const rootCause = extractSection(
    ["ROOT CAUSE HYPOTHESIS", "ROOT CAUSE"],
    ["CONFIDENCE", "EVIDENCE", "RECOMMENDED ACTION", "RECOMMENDED FIX"]
  );
  const confidence = extractSection(
    ["CONFIDENCE"],
    ["EVIDENCE", "RECOMMENDED ACTION", "RECOMMENDED FIX"]
  );
  const evidenceText = extractSection(
    ["EVIDENCE"],
    ["RECOMMENDED ACTION", "RECOMMENDED FIX"]
  );
  const recommendedAction = extractSection(
    ["RECOMMENDED ACTION", "RECOMMENDED FIX"],
    []
  );
  const evidenceItems = evidenceText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const selectedService = services.find((service: any) => Number(service.id) === Number(serviceId));
  const reportMetrics = report?.metrics_used ?? {};
  const podMetrics = reportMetrics.deployment_pods ?? {};
  const restartMetrics = reportMetrics.pod_restarts ?? {};
  const clusterMetrics = reportMetrics.cluster_health ?? {};
  const metricValue = (value: any) =>
    value === undefined || value === null || (typeof value === "object" && value.error)
      ? "Unavailable"
      : String(value);
  const podsRunningValue =
    podMetrics.pods_running !== undefined && podMetrics.pods_seen !== undefined && !podMetrics.error
      ? `${podMetrics.pods_running} / ${podMetrics.pods_seen}`
      : "Unavailable";
  const targetsUpValue =
    clusterMetrics.up !== undefined && clusterMetrics.total !== undefined && !clusterMetrics.error
      ? `${clusterMetrics.up} / ${clusterMetrics.total}`
      : "Unavailable";
  const telemetryLabel = report?.metrics_status === "connected"
    ? "Prometheus connected"
    : report?.metrics_status === "partial"
      ? `Partial telemetry · unavailable: ${(report.unavailable_metric_groups ?? []).join(", ") || "some queries"}`
      : "Prometheus unavailable · keep the port-forward terminal running";

  return (
    <FeatureWorkspace
      feature={FEATURE_MAP["root-cause"]}
      eyebrow="INCIDENTS / AI REASONING"
      description="Choose the demo application, describe the incident and set its severity. One click collects Prometheus evidence and generates the AI incident report."
    >
      <div className="nx-panel nx-panel-wide">
        <div className="nx-panel-head">
          <div>
            <span>INCIDENT INTAKE / AUTOMATED INVESTIGATION</span>
            <h3>Scan & investigate</h3>
          </div>
          <span className="nx-panel-status"><i /> {loading ? "LOADING" : "READY"}</span>
        </div>

        {error && <ErrorNotice message={error} />}

        <div className="nx-form-grid" style={{ marginTop: 18 }}>
          <label className="nx-select">
            Affected application
            <select
              value={serviceId === "" ? "" : String(serviceId)}
              onChange={(event) => setServiceId(event.target.value ? Number(event.target.value) : "")}
              disabled={loading || busy || services.length === 0}
            >
              <option value="">Select application</option>
              {services.map((service: any) => (
                <option key={service.id} value={String(service.id)}>
                  {service.name} · {service.region}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-select">
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} disabled={busy}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="nx-select nx-field" style={{ gridColumn: "1 / -1" }}>
            Incident description
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what failed, what you observed, and what recovered..."
              disabled={busy}
            />
          </label>
        </div>

        <button
          className="nx-primary full"
          onClick={startInvestigation}
          disabled={loading || busy || !serviceId || !description.trim()}
        >
          {busy ? (
            <><RotateCcw size={17} className="animate-spin" /> Collecting evidence & generating report...</>
          ) : (
            <><Sparkles size={17} /> Scan & Investigate</>
          )}
        </button>

        <p className="nx-helper-text" style={{ marginTop: 12 }}>
          One workflow: save the incident, scan available Prometheus telemetry, and ask local Llama 3 for an evidence-based diagnosis. The legacy Payment API demo incident is excluded.
        </p>
      </div>

      {busy && (
        <div className="nx-panel nx-panel-wide" style={{ marginTop: 18 }}>
          <div className="nx-empty-state small">
            <div className="empty-icon"><Bot size={24} /></div>
            <b>Generating your incident report</b>
            <span>Nexus is collecting metrics and asking Llama 3 to analyse the incident. The first model load can take longer; later reports reuse the loaded model.</span>
          </div>
        </div>
      )}

      {report && !busy && (
        <section className="nx-panel nx-panel-wide" style={{ marginTop: 18 }}>
          <div className="nx-panel-head">
            <div>
              <span>AI-GENERATED INCIDENT REPORT · {report.model ?? "LLAMA 3"}</span>
              <h3>Root cause analysis</h3>
            </div>
            <span className="nx-header-kicker">REPORT READY</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, margin: "14px 0 20px" }}>
            <span className="nx-report-tag">{selectedService?.name ?? "demo-web-app"}</span>
            <span className="nx-report-tag">{selectedService?.region ?? "minikube-local"}</span>
            <span className="nx-report-tag">{String(report.severity ?? severity).toUpperCase()}</span>
            <span className="nx-report-tag">Incident #{report.incident_id ?? report.incident?.id ?? "—"}</span>
          </div>

          <div className="nx-report-description">
            <span className="nx-header-kicker">INCIDENT DESCRIPTION</span>
            <p>{report.description ?? description}</p>
          </div>

          <div className="nx-metric-grid compact nx-report-metrics">
            <Metric title="Demo pods running" value={podsRunningValue} icon={<Server />} />
            <Metric title="Pods observed" value={metricValue(podMetrics.pods_seen)} icon={<Layers3 />} />
            <Metric title="Container restarts" value={metricValue(restartMetrics.total_restarts)} icon={<RotateCcw />} />
            <Metric title="Prometheus targets up" value={targetsUpValue} icon={<Activity />} />
          </div>

          <div className="nx-report-section">
            <span className="nx-header-kicker">ROOT CAUSE HYPOTHESIS</span>
            <p>{rootCause || reportText || "The model returned no analysis text."}</p>
          </div>

          {confidence && (
            <div className="nx-report-section">
              <span className="nx-header-kicker">CONFIDENCE</span>
              <p>{confidence}</p>
            </div>
          )}

          {evidenceItems.length > 0 && (
            <div className="nx-report-section">
              <span className="nx-header-kicker">PROMETHEUS / INCIDENT EVIDENCE</span>
              <ul>
                {evidenceItems.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          )}

          {recommendedAction && (
            <div className="nx-report-section nx-report-action">
              <span className="nx-header-kicker">RECOMMENDED ACTION</span>
              <p>{recommendedAction}</p>
            </div>
          )}

          <div className="nx-report-footer">
            <span>Telemetry: {telemetryLabel}</span>
            <button className="nx-ghost" onClick={() => { setReport(null); setError(""); }}>
              New investigation
            </button>
          </div>
        </section>
      )}
    </FeatureWorkspace>
  );
}

function SecretScanner() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scan = async () => {
    setBusy(true); setError(""); setData(null);
    try { setData(await getSecretScan()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const findings = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.findings)) return data.findings;
    return [];
  }, [data]);
  return (
    <FeatureWorkspace feature={FEATURE_MAP.secrets} eyebrow="SECURITY / CREDENTIAL EXPOSURE"
      description="Scan the connected project source for secret-like values. The backend returns file paths and finding counts, not matched secret values.">
      <div className="nx-panel nx-panel-wide">
        <PanelTitle title="Secret scanner" label="SECURITY ENGINE" />
        <div className="nx-scanner-hero">
          <div className="scanner-core"><ShieldCheck size={40} /><div className="scanner-ring" /></div>
          <div><h3>Credentials should never be an incident.</h3><p>Run the scanner to inspect eligible source files in the Nexus AI project directory. Review each finding and rotate any real credential that was exposed.</p>
            <button className="nx-primary" onClick={scan} disabled={busy}>{busy ? "Scanning project..." : "Scan project for secrets"} <ScanSearch size={16} /></button>
          </div>
        </div>
        {error && <ErrorNotice message={error} />}
        {data?.error && <ErrorNotice message={String(data.error)} />}
        {data && <>
          <div className="nx-metric-grid compact">
            <Metric title="Findings" value={data?.total_findings ?? findings.length} icon={<KeyRound />} />
            <Metric title="Files scanned" value={data?.files_scanned ?? "—"} icon={<ScanSearch />} />
            <Metric title="Scanner" value="COMPLETE" icon={<ShieldCheck />} />
            <Metric title="Project files" value={data?.scanned_root ? "LOCAL" : "—"} icon={<Server />} />
          </div>
          <div className="nx-panel-head" style={{ marginTop: 24 }}><div><span>REVIEW RESULTS</span><h3>Potential exposures</h3></div></div>
          <DataList items={findings} empty="No secret-like patterns found in the scanned files."
            render={(item, index) => <div className="nx-list-row nx-secret-row" key={`${item?.file ?? "finding"}-${item?.type ?? index}`}>
              <KeyRound size={15} /><span><b>{item?.type ?? "Potential secret"}</b><small>{item?.file ?? "Unknown file"} · Line(s): {Array.isArray(item?.line_numbers) ? item.line_numbers.join(", ") : "not reported"}</small></span><strong>{item?.occurrences ?? 1} match(es)</strong>
            </div>} />
        </>}
      </div>
    </FeatureWorkspace>
  );
}

function FeatureWorkspace({
  feature,
  eyebrow,
  description,
  children,
}: {
  feature: Feature;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="nx-feature-workspace">
      <div
        className="nx-workspace-hero"
        style={{
          "--feature-color": feature.accent,
        } as CSSProperties}
      >
        <div className="workspace-glow" />
        <div className="nx-section-eyebrow">{eyebrow}</div>
        <div className="workspace-heading">
          <div className="workspace-icon">{feature.icon}</div>
          <div>
            <h2>{feature.title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function PanelTitle({ title, label }: { title: string; label: string }) {
  return (
    <div className="nx-panel-head">
      <div>
        <span>{label}</span>
        <h3>{title}</h3>
      </div>
      <span className="nx-panel-status"><i /> ACTIVE</span>
    </div>
  );
}

function DataList({
  items,
  empty,
  render,
}: {
  items: any[];
  empty: string;
  render: (item: any, index: number) => ReactNode;
}) {
  if (!items.length) {
    return <div className="nx-empty-state small"><span>{empty}</span></div>;
  }
  return <div className="nx-list">{items.map(render)}</div>;
}

function ResultBox({ data }: { data: any }) {
  return (
    <div className="nx-result">
      <div className="nx-result-head">
        <span><CheckCircle2 size={15} /> BACKEND RESPONSE</span>
        <span>LIVE</span>
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

const GLOBAL_CSS = `
:root {
  --nx-bg: #050611;
  --nx-panel: rgba(12, 15, 29, .76);
  --nx-border: rgba(255,255,255,.09);
  --nx-text: #f7f9ff;
  --nx-muted: #8f97ad;
  --nx-cyan: #36d9ff;
  --nx-violet: #9a63ff;
  --nx-pink: #ff4d8d;
  --nx-green: #36e0a1;
  --nx-yellow: #ffbf3f;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--nx-bg);
  color: var(--nx-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }

.nx-site {
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(circle at 50% 20%, rgba(73,55,255,.15), transparent 28%),
    radial-gradient(circle at 80% 55%, rgba(0,200,255,.07), transparent 26%),
    #050611;
}
.nx-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .045;
  z-index: 50;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
}
.nx-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .16;
  background-image:
    linear-gradient(rgba(91,108,255,.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91,108,255,.09) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
  transform: perspective(700px) rotateX(60deg) translateY(18%);
  transform-origin: center bottom;
  z-index: 0;
}
.nx-aurora {
  position: fixed;
  width: 52vw;
  height: 52vw;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  opacity: .13;
  z-index: 0;
  animation: nxDrift 13s ease-in-out infinite alternate;
}
.nx-aurora-a { background: #4d2cff; top: -18vw; left: -10vw; }
.nx-aurora-b { background: #00c8ff; right: -18vw; top: 32vh; animation-delay: -5s; }
@keyframes nxDrift { from { transform: translate3d(-3%, -2%,0) scale(.95); } to { transform: translate3d(5%, 5%,0) scale(1.1); } }

.nx-nav {
  height: 76px;
  position: absolute;
  z-index: 20;
  left: 0; right: 0; top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5vw;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(to bottom, rgba(5,6,17,.78), transparent);
  backdrop-filter: blur(12px);
}
.nx-brand, .nx-side-brand {
  border: 0;
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: .08em;
}
.nx-brand b, .nx-side-brand b { color: var(--nx-cyan); }
.nx-brand-mark {
  width: 24px;
  height: 24px;
  display: grid;
  grid-template-columns: repeat(3,1fr);
  align-items: end;
  gap: 3px;
}
.nx-brand-mark span {
  display: block;
  border-radius: 3px;
  background: linear-gradient(to top, #6d54ff, #43ddff);
  box-shadow: 0 0 14px rgba(66,213,255,.45);
}
.nx-brand-mark span:nth-child(1){height: 48%}
.nx-brand-mark span:nth-child(2){height: 82%}
.nx-brand-mark span:nth-child(3){height: 62%}
.nx-nav-links { display: flex; gap: 32px; }
.nx-nav-links a { color: #a8afc3; text-decoration: none; font-size: 13px; }
.nx-nav-links a:hover { color: white; }
.nx-nav-actions { display: flex; gap: 18px; align-items: center; }
.nx-link-button, .nx-ghost {
  border: 0;
  background: transparent;
  color: #d7dced;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.nx-primary {
  border: 0;
  border-radius: 999px;
  color: #07101a;
  background: linear-gradient(100deg, #53e4ff, #9b70ff 55%, #ff5ca9);
  box-shadow: 0 0 30px rgba(88,115,255,.2);
  padding: 14px 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-weight: 800;
  transition: transform .25s ease, box-shadow .25s ease;
}
.nx-primary:hover { transform: translateY(-2px); box-shadow: 0 0 42px rgba(104,125,255,.38); }
.nx-primary.small { padding: 10px 15px; font-size: 12px; }
.nx-ghost { padding: 12px 0; color: #adb5ca; }
.nx-ghost:hover { color: white; }

.nx-hero {
  min-height: 1050px;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 130px 6vw 80px;
}
.nx-hero-copy {
  width: min(650px, 90vw);
  position: relative;
  z-index: 8;
  margin-right: 47vw;
  margin-top: -80px;
}
.nx-kicker, .nx-section-eyebrow, .nx-header-kicker {
  font-size: 10px;
  letter-spacing: .24em;
  color: #79839c;
  font-weight: 800;
}
.nx-kicker { display: flex; gap: 9px; align-items: center; margin-bottom: 28px; }
.nx-live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #36e0a1;
  box-shadow: 0 0 12px #36e0a1;
  display: inline-block;
  animation: nxPulse 1.8s ease-in-out infinite;
}
@keyframes nxPulse { 50% { opacity: .35; transform: scale(.72); } }
.nx-hero h1 {
  margin: 0;
  font-size: clamp(58px, 8vw, 128px);
  line-height: .85;
  letter-spacing: -.075em;
  font-weight: 900;
}
.nx-hero h1 span { display: block; }
.nx-hero h1 em {
  display: block;
  font-style: normal;
  font-size: .55em;
  line-height: 1.15;
  margin-top: 20px;
  background: linear-gradient(100deg,#f4f6ff,#55dcff 42%,#b96bff 80%,#ff629e);
  -webkit-background-clip: text;
  color: transparent;
}
.nx-hero-copy > p {
  color: #929ab0;
  font-size: 16px;
  line-height: 1.75;
  max-width: 540px;
  margin: 34px 0;
}
.nx-hero-actions { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.nx-hero-meta { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 32px; color: #737d96; font-size: 11px; }
.nx-hero-meta span { display: inline-flex; gap: 7px; align-items: center; }
.nx-hero-meta svg { color: #4fd8ff; }
.nx-robot-stage {
  position: absolute;
  width: min(720px, 62vw);
  height: 780px;
  right: 3vw;
  top: 125px;
  z-index: 4;
  transition: transform .12s linear;
}
.nx-three-robot { width: 100%; height: 100%; }
.nx-hero-orbit {
  position: absolute;
  width: 500px; height: 500px;
  border: 1px solid rgba(99,116,255,.13);
  border-radius: 50%;
  right: 11vw; top: 210px;
  transform: rotateX(68deg) rotateZ(15deg);
  box-shadow: 0 0 90px rgba(72,72,255,.08);
  animation: nxOrbit 14s linear infinite;
}
.nx-hero-orbit.orbit-two { width: 670px; height: 670px; right: 3vw; top: 140px; animation-duration: 20s; animation-direction: reverse; border-color: rgba(54,217,255,.09); }
@keyframes nxOrbit { to { transform: rotateX(68deg) rotateZ(375deg); } }
.nx-floating-chip {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(10,13,27,.62);
  backdrop-filter: blur(16px);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0,0,0,.25);
  animation: nxFloat 5s ease-in-out infinite;
}
.nx-floating-chip b { display: block; font-size: 9px; letter-spacing: .15em; color: #9ca5ba; }
.nx-floating-chip small { display: block; color: white; font-size: 11px; margin-top: 3px; }
.nx-floating-chip .chip-icon { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: rgba(54,224,161,.1); color: #36e0a1; }
.nx-floating-chip .purple { background: rgba(154,99,255,.12); color: #a878ff; }
.chip-one { right: 11vw; top: 265px; }
.chip-two { right: 8vw; top: 635px; animation-delay: -2.3s; }
@keyframes nxFloat { 50% { transform: translateY(-13px) translateX(4px); } }
.nx-scroll-cue {
  position: absolute;
  left: 5vw; bottom: 55px;
  display: flex; align-items: center; gap: 14px;
  color: #67718a; font-size: 9px; letter-spacing: .2em;
}
.nx-scroll-line { width: 50px; height: 1px; background: rgba(255,255,255,.13); }
.nx-scroll-line i { display:block; width:100%; height:3px; background:#55dcff; transform-origin:left; }

.nx-statement-section { min-height: 690px; padding: 170px 8vw; position: relative; overflow: hidden; }
.nx-statement { max-width: 1000px; margin-top: 45px; font-size: clamp(42px, 6vw, 86px); line-height: .98; letter-spacing: -.06em; }
.nx-statement span { display:block; color:#737d95; }
.nx-statement strong { display:block; color:#f5f7ff; }
.nx-signal-wall { position:absolute; inset:0; pointer-events:none; opacity:.7; }
.nx-signal-wall span { position:absolute; bottom:-20px; width:1px; height:120px; background:linear-gradient(to top, transparent, rgba(74,220,255,.45), transparent); animation:nxSignal linear infinite; }
@keyframes nxSignal { from { transform:translateY(0) scaleY(.4); opacity:0; } 35% {opacity:1;} to {transform:translateY(-720px) scaleY(1.2); opacity:0;} }

.nx-systems { position:relative; padding: 130px 6vw 0; }
.nx-systems-intro { max-width:1200px; margin:0 auto 110px; display:flex; justify-content:space-between; gap:80px; align-items:end; }
.nx-systems-intro h2 { font-size:clamp(52px,7vw,108px); line-height:.88; letter-spacing:-.075em; margin:18px 0 0; }
.nx-systems-intro h2 span { background:linear-gradient(100deg,#55dcff,#9b70ff,#ff5ca9); -webkit-background-clip:text; color:transparent; }
.nx-systems-intro p { max-width:370px; color:#80899f; line-height:1.7; }
.nx-feature-scroller { max-width:1400px; margin:auto; display:grid; grid-template-columns:minmax(330px,.85fr) 1.15fr; gap:7vw; }
.nx-feature-sticky { position:sticky; top:110px; height:calc(100vh - 150px); min-height:620px; display:flex; flex-direction:column; justify-content:center; }
.nx-feature-visual {
  position:relative; height:580px; border:1px solid rgba(255,255,255,.07);
  border-radius:32px; overflow:hidden;
  background:radial-gradient(circle at 50% 45%, rgba(92,80,255,.12), transparent 44%), rgba(7,9,20,.65);
  display:grid; place-items:center;
}
.nx-feature-glow { position:absolute; width:480px; height:480px; filter:blur(60px); transition:background 1s ease; }
.nx-feature-ring { position:absolute; width:380px; height:380px; border:1px solid rgba(93,214,255,.12); border-radius:50%; transform:rotateX(68deg) rotateZ(20deg); animation:nxRing 11s linear infinite; }
.nx-feature-ring.ring-b { width:280px; height:280px; border-color:rgba(182,91,255,.15); animation-duration:8s; animation-direction:reverse; }
@keyframes nxRing { to { transform:rotateX(68deg) rotateZ(380deg); } }
.nx-feature-core {
  position:relative; z-index:2; width:94px; height:94px; border-radius:30px;
  display:grid; place-items:center; color:white;
  background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.14);
  box-shadow:0 0 70px rgba(70,112,255,.25);
  animation:nxCore 3.5s ease-in-out infinite;
}
@keyframes nxCore { 50% { transform:translateY(-10px) scale(1.04); } }
.nx-feature-console {
  position:absolute; bottom:24px; left:24px; right:24px;
  padding:18px; border-radius:18px; border:1px solid rgba(255,255,255,.08);
  background:rgba(3,5,13,.68); backdrop-filter:blur(14px);
}
.nx-feature-console span,.nx-feature-console small { display:block; color:#69738d; font-size:9px; letter-spacing:.17em; }
.nx-feature-console strong { display:block; font-size:18px; margin:8px 0; }
.nx-feature-progress { display:flex; gap:7px; margin-top:18px; }
.nx-feature-progress button { flex:1; border:0; background:transparent; padding:0; color:#657089; text-align:left; }
.nx-feature-progress button span { font-size:9px; letter-spacing:.12em; }
.nx-feature-progress button i { display:block; height:2px; margin-top:8px; background:#23283a; }
.nx-feature-progress button.active { color:white; }
.nx-feature-progress button.active i { background:linear-gradient(90deg,#55dcff,#9b70ff,#ff5ca9); }

.nx-feature-list { padding-bottom:80px; }
.nx-feature-section { min-height:820px; display:grid; grid-template-columns:70px 1fr; align-items:center; gap:35px; position:relative; }
.nx-feature-number { font-size:11px; color:#58627a; letter-spacing:.15em; align-self:start; padding-top:150px; }
.nx-feature-copy { max-width:570px; }
.nx-feature-icon { width:54px; height:54px; display:grid; place-items:center; border:1px solid; border-radius:16px; margin-bottom:32px; }
.nx-feature-copy h3 { font-size:clamp(42px,5vw,72px); letter-spacing:-.065em; line-height:.95; margin:16px 0; }
.nx-feature-copy h4 { font-size:20px; margin:0 0 17px; color:#d8dcec; }
.nx-feature-copy p { color:#7f889e; line-height:1.8; font-size:15px; }
.nx-feature-cta {
  margin-top:30px; border:1px solid rgba(255,255,255,.11); border-radius:999px;
  background:rgba(255,255,255,.025); color:white; padding:12px 16px;
  display:inline-flex; align-items:center; gap:8px;
}
.nx-feature-cta:hover { background:rgba(255,255,255,.08); }
.nx-mini-visual {
  position:absolute; right:0; bottom:170px; width:260px; height:200px; opacity:.8;
  border:1px solid color-mix(in srgb, var(--feature-color) 20%, transparent);
  border-radius:24px; overflow:hidden; background:rgba(7,9,18,.7);
}
.mini-grid { position:absolute; inset:0; background-image:linear-gradient(color-mix(in srgb,var(--feature-color) 12%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--feature-color) 12%,transparent) 1px,transparent 1px); background-size:25px 25px; transform:perspective(400px) rotateX(55deg) scale(1.4); transform-origin:center bottom; }
.mini-orb { position:absolute; width:60px; height:60px; border-radius:50%; background:var(--feature-color); filter:blur(1px); box-shadow:0 0 55px var(--feature-color); left:50%; top:50%; transform:translate(-50%,-50%); animation:nxMini 3s ease-in-out infinite; }
@keyframes nxMini { 50% { transform:translate(-50%,-60%) scale(1.2); } }
.mini-lines { position:absolute; inset:22px; display:flex; flex-direction:column; justify-content:space-around; }
.mini-lines i { display:block; height:1px; background:linear-gradient(90deg,transparent,var(--feature-color),transparent); opacity:.55; }
.nx-mini-visual > span { position:absolute; left:15px; bottom:13px; color:#778098; font-size:8px; letter-spacing:.16em; }

.nx-flow-section { padding:180px 7vw; }
.nx-flow-section h2 { font-size:clamp(48px,7vw,96px); letter-spacing:-.07em; line-height:.9; margin:20px 0 80px; }
.nx-flow-section h2 span { color:#55dcff; }
.nx-flow { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.08); }
.nx-flow-card { min-height:270px; padding:30px; background:#070914; transition:transform .3s ease,background .3s ease; }
.nx-flow-card:hover { transform:translateY(-8px); background:#0a0d1d; }
.nx-flow-card > span { color:#626d86; font-size:10px; letter-spacing:.18em; }
.nx-flow-card > svg { margin:55px 0 18px; color:#55dcff; }
.nx-flow-card h3 { margin:0 0 9px; font-size:20px; }
.nx-flow-card p { color:#737d94; line-height:1.6; font-size:13px; margin:0; }

.nx-security-section { position:relative; overflow:hidden; min-height:620px; padding:130px 8vw; display:grid; grid-template-columns:1.2fr .8fr; align-items:center; gap:100px; }
.nx-security-section h2 { font-size:clamp(48px,7vw,96px); letter-spacing:-.075em; line-height:.9; margin:22px 0; }
.nx-security-section h2 span { background:linear-gradient(90deg,#55dcff,#b36aff); -webkit-background-clip:text; color:transparent; }
.nx-security-copy { border-left:1px solid rgba(255,255,255,.1); padding-left:45px; color:#8992a8; line-height:1.8; }
.nx-security-copy svg { color:#36e0a1; }
.nx-security-copy p { margin:20px 0 30px; max-width:360px; }
.nx-security-orb { position:absolute; width:500px; height:500px; border-radius:50%; right:-100px; top:40px; background:radial-gradient(circle,#4f28ff22,transparent 67%); border:1px solid #754eff13; box-shadow:0 0 150px #472eff12; animation:nxFloat 8s ease-in-out infinite; }

.nx-final-cta { position:relative; min-height:650px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; overflow:hidden; padding:100px 20px; }
.nx-final-grid { position:absolute; inset:-20%; opacity:.2; background-image:linear-gradient(rgba(82,215,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(147,89,255,.12) 1px,transparent 1px); background-size:55px 55px; transform:perspective(500px) rotateX(62deg) translateY(20%); mask-image:linear-gradient(to bottom,transparent,black,transparent); }
.nx-final-cta h2 { position:relative; font-size:clamp(58px,9vw,132px); letter-spacing:-.08em; line-height:.85; margin:25px 0; }
.nx-final-cta h2 span { color:#ff5a9f; }
.nx-final-cta p { position:relative; color:#7f889f; }
.nx-final-actions { position:relative; display:flex; gap:25px; align-items:center; margin-top:28px; }
.nx-footer { border-top:1px solid rgba(255,255,255,.07); padding:25px 6vw; color:#596278; font-size:10px; display:flex; justify-content:space-between; letter-spacing:.12em; }

.nx-auth { min-height:100vh; position:relative; overflow:hidden; background:#050611; display:grid; place-items:center; padding:40px; }
.nx-auth-bg { position:absolute; inset:0; background:radial-gradient(circle at 70% 45%,#3d1fff18,transparent 30%),radial-gradient(circle at 20% 20%,#00cfff0c,transparent 30%); }
.nx-auth-back { position:absolute; left:30px; top:28px; z-index:10; border:0; background:transparent; color:#8e97ac; display:flex; gap:8px; align-items:center; }
.nx-auth-card { position:relative; z-index:5; width:min(500px,94vw); padding:44px; border:1px solid rgba(255,255,255,.09); background:rgba(8,10,22,.76); backdrop-filter:blur(24px); border-radius:28px; box-shadow:0 30px 100px rgba(0,0,0,.45); }
.auth-brand { margin-bottom:55px; }
.nx-auth-card h1 { font-size:38px; line-height:1; letter-spacing:-.05em; margin:15px 0; }
.nx-auth-card > p { color:#7f899f; line-height:1.65; }
.nx-auth-notice { display:flex; align-items:center; gap:8px; padding:12px 14px; border:1px solid #9a63ff33; color:#bca4ff; background:#9a63ff0b; border-radius:12px; margin-bottom:28px; font-size:12px; }
.nx-auth-form { margin-top:28px; display:grid; gap:18px; }
.nx-auth-form label { color:#8f98ad; font-size:11px; }
.nx-input { margin-top:8px; height:52px; border:1px solid rgba(255,255,255,.09); border-radius:13px; display:flex; align-items:center; gap:10px; padding:0 14px; background:#060814; }
.nx-input svg { color:#5e6880; }
.nx-input input { border:0; outline:0; background:transparent; color:white; width:100%; }
.auth-submit { width:100%; margin-top:5px; }
.nx-auth-switch { text-align:center; color:#6e778c; font-size:12px; margin-top:25px; }
.nx-auth-switch button { border:0; background:transparent; color:#55dcff; font-weight:700; margin-left:5px; }
.nx-demo-note { display:block; color:#4f586d; text-align:center; margin-top:18px; font-size:10px; }
.nx-auth-robot { position:absolute; width:580px; height:580px; right:-90px; top:5vh; opacity:.58; }
.nx-auth-orbit { position:absolute; border:1px solid rgba(111,81,255,.12); border-radius:50%; }
.auth-orbit-a { width:650px; height:650px; right:-100px; top:20px; transform:rotateX(65deg); }
.auth-orbit-b { width:400px; height:400px; left:-160px; bottom:-100px; transform:rotateX(65deg); }

.nx-platform { min-height:100vh; background:#050611; display:flex; color:#f4f6ff; }
.nx-sidebar { width:255px; flex:0 0 255px; border-right:1px solid rgba(255,255,255,.07); background:rgba(6,8,18,.92); min-height:100vh; padding:26px 16px; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; z-index:30; }
.nx-side-brand { padding:0 12px 35px; }
.nx-side-label { color:#4f596f; font-size:9px; letter-spacing:.18em; padding:0 12px 12px; }
.nx-sidebar nav { display:grid; gap:5px; }
.nx-sidebar nav button { border:1px solid transparent; background:transparent; color:#747e95; display:flex; align-items:center; gap:11px; padding:12px; border-radius:11px; text-align:left; font-size:12px; }
.nx-sidebar nav button:hover { color:white; background:#ffffff05; }
.nx-sidebar nav button.active { color:white; background:linear-gradient(90deg,#ffffff0b,#ffffff03); border-color:#ffffff09; box-shadow:inset 2px 0 #55dcff; }
.nx-side-bottom { margin-top:auto; }
.nx-side-status { display:flex; gap:10px; align-items:center; padding:13px; border:1px solid rgba(255,255,255,.07); border-radius:12px; background:#ffffff03; }
.nx-side-status b,.nx-side-status small { display:block; }
.nx-side-status b { font-size:11px; }
.nx-side-status small { color:#5e687e; font-size:9px; margin-top:4px; }
.nx-side-logout { margin-top:10px; width:100%; border:0; background:transparent; color:#656f86; padding:10px; font-size:11px; }
.nx-app-main { flex:1; min-width:0; }
.nx-app-header { height:82px; border-bottom:1px solid rgba(255,255,255,.07); display:flex; align-items:center; justify-content:space-between; padding:0 34px; background:#050611e8; backdrop-filter:blur(16px); position:sticky; top:0; z-index:20; }
.nx-header-kicker { font-size:8px; }
.nx-app-header h1 { font-size:17px; margin:7px 0 0; }
.nx-header-right { display:flex; gap:14px; align-items:center; }
.nx-online { font-size:9px; color:#36e0a1; display:flex; align-items:center; gap:7px; }
.nx-icon-button { width:34px; height:34px; border:1px solid rgba(255,255,255,.07); border-radius:10px; color:#8a93a8; background:#ffffff03; display:grid; place-items:center; }
.nx-avatar { width:34px; height:34px; display:grid; place-items:center; border-radius:10px; background:linear-gradient(135deg,#6147ff,#22d5ff); font-size:10px; font-weight:800; }
.nx-mobile-menu { display:none; border:0; background:transparent; color:white; }
.nx-app-content { padding:36px; max-width:1500px; margin:auto; }
.nx-dashboard-hero { padding:25px 0 45px; display:flex; justify-content:space-between; align-items:center; }
.nx-dashboard-hero h2 { font-size:clamp(40px,5vw,70px); letter-spacing:-.065em; line-height:.93; margin:16px 0; }
.nx-dashboard-hero h2 span { color:#7f8aff; }
.nx-dashboard-hero p { max-width:600px; color:#778197; line-height:1.7; }
.nx-dashboard-core { width:170px; height:170px; border-radius:50%; border:1px solid rgba(86,218,255,.15); display:grid; place-items:center; position:relative; color:#55dcff; background:radial-gradient(circle,#3c2aff16,transparent 65%); box-shadow:0 0 100px #5738ff12; }
.nx-dashboard-core small { position:absolute; bottom:28px; font-size:8px; letter-spacing:.2em; color:#626d83; }
.core-ring { position:absolute; inset:-18px; border:1px dashed #5b55ff22; border-radius:50%; animation:nxOrbit 15s linear infinite; }
.nx-metric-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
.nx-metric-grid.compact { margin-top:18px; }
.nx-metric { min-height:145px; padding:20px; border:1px solid rgba(255,255,255,.07); background:#080a15; border-radius:16px; position:relative; overflow:hidden; }
.nx-metric-icon { position:absolute; right:18px; top:18px; color:#667187; }
.nx-metric > span { display:block; color:#626c83; font-size:10px; letter-spacing:.1em; }
.nx-metric strong { display:block; font-size:34px; margin-top:28px; letter-spacing:-.04em; }
.nx-metric small { color:#485166; font-size:8px; letter-spacing:.15em; }
.nx-dashboard-grid,.nx-work-grid { display:grid; grid-template-columns:1.4fr .9fr; gap:18px; }
.nx-panel { border:1px solid rgba(255,255,255,.07); background:#080a15; border-radius:18px; padding:22px; min-width:0; }
.nx-panel-large { min-height:400px; }
.nx-panel-wide { min-height:430px; }
.nx-panel-head { display:flex; align-items:start; justify-content:space-between; gap:15px; margin-bottom:24px; }
.nx-panel-head span:first-child { color:#5f6980; font-size:8px; letter-spacing:.16em; }
.nx-panel-head h3 { margin:8px 0 0; font-size:17px; }
.nx-panel-status,.nx-live-pill { font-size:8px; color:#36e0a1; display:flex; gap:6px; align-items:center; letter-spacing:.1em; }
.nx-panel-status i,.nx-live-pill i { width:5px; height:5px; border-radius:50%; background:#36e0a1; }
.nx-dashboard-features { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
.nx-dashboard-feature { border:1px solid rgba(255,255,255,.06); background:#ffffff03; color:white; display:grid; grid-template-columns:34px 1fr 16px; gap:10px; align-items:center; padding:15px; border-radius:12px; text-align:left; }
.nx-dashboard-feature:hover { background:#ffffff07; }
.nx-dashboard-feature b,.nx-dashboard-feature small { display:block; }
.nx-dashboard-feature b { font-size:11px; }
.nx-dashboard-feature small { color:#616b81; font-size:9px; margin-top:4px; }
.nx-health-stream { display:grid; gap:6px; }
.nx-health-stream > div { display:grid; grid-template-columns:10px 1fr auto; gap:9px; align-items:center; padding:13px 0; border-bottom:1px solid #ffffff06; font-size:11px; }
.health-dot { width:7px; height:7px; border-radius:50%; box-shadow:0 0 12px currentColor; }
.nx-health-stream b { color:#778197; font-size:9px; }
.nx-feature-workspace { display:grid; gap:18px; }
.nx-workspace-hero { min-height:250px; position:relative; overflow:hidden; border:1px solid rgba(255,255,255,.07); border-radius:20px; background:linear-gradient(120deg,#080a15,#0b0b1a); padding:34px; }
.workspace-glow { position:absolute; width:500px; height:500px; border-radius:50%; background:var(--feature-color); opacity:.08; filter:blur(80px); right:-100px; top:-180px; }
.workspace-heading { position:relative; z-index:2; display:flex; gap:18px; align-items:center; margin-top:22px; }
.workspace-icon { width:60px; height:60px; border:1px solid color-mix(in srgb,var(--feature-color) 40%,transparent); color:var(--feature-color); border-radius:17px; display:grid; place-items:center; background:color-mix(in srgb,var(--feature-color) 7%,transparent); }
.workspace-heading h2 { font-size:40px; letter-spacing:-.05em; margin:0; }
.workspace-heading p { color:#778197; max-width:700px; line-height:1.6; margin:8px 0 0; }
.nx-control-row { display:flex; gap:12px; align-items:end; flex-wrap:wrap; }
.nx-control-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px; }
.nx-select { color:#6d768c; font-size:9px; display:grid; gap:8px; flex:1; min-width:190px; }
.nx-select select { height:46px; border:1px solid rgba(255,255,255,.08); border-radius:10px; background:#050712; color:white; padding:0 12px; outline:none; }
.nx-field input,.nx-field textarea { width:100%; min-height:44px; border:1px solid rgba(255,255,255,.09); border-radius:10px; background:#050712; color:#f7f9ff; padding:11px 12px; outline:none; font-size:12px; resize:vertical; }
.nx-field input:focus,.nx-field textarea:focus,.nx-select select:focus { border-color:rgba(54,217,255,.55); box-shadow:0 0 0 3px rgba(54,217,255,.08); }
.nx-report-tag { display:inline-flex; align-items:center; border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:7px 11px; color:#c8d3ea; background:rgba(255,255,255,.035); font-size:10px; letter-spacing:.06em; }
.nx-report-description,.nx-report-section { border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(255,255,255,.025); padding:16px 18px; margin-top:12px; }
.nx-report-description p,.nx-report-section p { color:#e8edfa; font-size:14px; line-height:1.75; margin:9px 0 0; white-space:pre-wrap; overflow-wrap:anywhere; }
.nx-report-section ul { color:#d9e1f2; font-size:13px; line-height:1.8; margin:10px 0 0; padding-left:20px; }
.nx-report-section li { margin:5px 0; }
.nx-report-action { border-color:rgba(54,224,161,.22); background:rgba(54,224,161,.045); }
.nx-report-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:16px; color:#8490a9; font-size:11px; }

.nx-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px; }
.nx-form-title { margin:18px 0 12px; color:#dfe5f5; font-size:13px; }
.nx-form-divider { height:1px; background:#ffffff10; margin:18px 0; }
.nx-helper-text { color:#667188; font-size:10px; line-height:1.6; margin:14px 0 0; }
.nx-inline-warning { border:1px solid rgba(255,191,63,.22); background:rgba(255,191,63,.06); color:#d7b76d; border-radius:10px; padding:11px 13px; margin:12px 0; font-size:10px; line-height:1.6; }
.nx-primary.small { padding:10px 14px; font-size:11px; }
.nx-primary.full { width:100%; }
.nx-cost-metrics { grid-template-columns:1fr 1fr; }
.nx-cost-metrics .nx-metric { min-height:112px; padding:13px; }
.nx-cost-metrics .nx-metric strong { font-size:22px; margin-top:18px; }
.nx-cost-row { grid-template-columns:20px 1fr auto; }
.nx-cost-row span b,.nx-cost-row span small { display:block; }
.nx-cost-row span small { color:#69748b; font-size:9px; margin-top:4px; }
.nx-cost-row strong { color:#e4e9f5; font-size:11px; }
.nx-secret-row { grid-template-columns:20px 1fr auto; }
.nx-secret-row span b,.nx-secret-row span small { display:block; }
.nx-secret-row span b { color:#e6eafa; font-size:10px; }
.nx-secret-row span small { color:#6c7890; font-size:9px; margin-top:4px; overflow-wrap:anywhere; }
.nx-secret-row strong { color:#ffbf3f; font-size:9px; }
.nx-result { margin-top:20px; border:1px solid rgba(255,255,255,.06); background:#04060c; border-radius:12px; overflow:hidden; }
.nx-result-head { display:flex; justify-content:space-between; padding:10px 13px; border-bottom:1px solid #ffffff07; color:#59637a; font-size:8px; letter-spacing:.12em; }
.nx-result-head span:first-child { color:#36e0a1; display:flex; gap:7px; align-items:center; }
.nx-result pre { margin:0; padding:16px; overflow:auto; max-height:320px; color:#9aa5bd; font-size:10px; line-height:1.6; }
.nx-list { display:grid; gap:4px; }
.nx-list-row { display:grid; grid-template-columns:20px 1fr auto; gap:9px; align-items:center; padding:13px 8px; color:#7e879c; border-bottom:1px solid #ffffff05; font-size:11px; }
.nx-list-row b { color:#36e0a1; font-size:8px; text-transform:uppercase; }
.nx-danger { border:1px solid #ff4d6d44; background:#ff4d6d0b; color:#ff7089; padding:13px 17px; border-radius:999px; display:flex; align-items:center; gap:8px; font-weight:700; }
.nx-empty-state { min-height:250px; display:grid; place-items:center; align-content:center; gap:8px; color:#626c82; text-align:center; }
.nx-empty-state b { color:#b8bfd0; font-size:13px; }
.nx-empty-state.small { min-height:180px; font-size:11px; }
.empty-icon { width:62px; height:62px; border-radius:20px; border:1px solid #ffffff09; display:grid; place-items:center; color:#7e6dff; background:#7e6dff0b; margin-bottom:8px; }
.nx-incident-row { width:100%; border:1px solid transparent; background:transparent; color:#9ca5b9; display:grid; grid-template-columns:28px 1fr 15px; gap:10px; align-items:center; text-align:left; padding:13px 9px; border-radius:11px; }
.nx-incident-row:hover,.nx-incident-row.selected { background:#ffffff05; border-color:#ffffff07; color:white; }
.incident-severity { width:28px; height:28px; border-radius:9px; display:grid; place-items:center; color:#ff6d88; background:#ff4d6d0c; }
.nx-incident-row b,.nx-incident-row small { display:block; }
.nx-incident-row b { font-size:10px; }
.nx-incident-row small { color:#59637a; font-size:8px; margin-top:3px; }
.nx-primary.full { width:100%; margin-top:18px; }
.nx-region-map { min-height:170px; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:center; gap:20px; margin:15px 0 28px; }
.region-node { border:1px solid rgba(255,255,255,.07); background:#ffffff03; border-radius:15px; padding:22px; text-align:center; position:relative; }
.region-node span { width:18px; height:18px; border-radius:50%; display:block; margin:0 auto 12px; background:#36e0a1; box-shadow:0 0 25px #36e0a1; }
.region-node.primary span { background:#ff5a76; box-shadow:0 0 25px #ff5a76; }
.region-node b,.region-node small { display:block; }
.region-node b { font-size:10px; letter-spacing:.12em; }
.region-node small { color:#5e687f; font-size:9px; margin-top:4px; }
.region-connection { height:2px; background:linear-gradient(90deg,#ff5a76,#a478ff,#36e0a1); position:relative; }
.region-connection i { position:absolute; width:30px; height:5px; top:-2px; background:#fff; box-shadow:0 0 20px #fff; animation:nxTravel 2s linear infinite; }
@keyframes nxTravel { from{left:0}to{left:calc(100% - 30px)} }
.nx-cost-visual { min-height:280px; display:grid; grid-template-columns:1.4fr .8fr; gap:35px; align-items:center; }
.cost-bars { height:220px; display:flex; align-items:end; gap:8px; padding:20px; border:1px solid #ffffff06; border-radius:15px; background:linear-gradient(to top,#55dcff06,transparent); }
.cost-bars span { flex:1; border-radius:6px 6px 2px 2px; background:linear-gradient(to top,#ff5ca9,#7c67ff 55%,#55dcff); animation:nxBars 3s ease-in-out infinite alternate; transform-origin:bottom; }
.cost-bars span:nth-child(2n){animation-delay:-1s}.cost-bars span:nth-child(3n){animation-delay:-2s}
@keyframes nxBars { to { transform:scaleY(.55); } }
.cost-copy svg { color:#ffbf3f; }
.cost-copy strong { display:block; font-size:18px; margin-top:15px; }
.cost-copy p { color:#6e788f; font-size:12px; line-height:1.7; margin-bottom:20px; }
.nx-scanner-hero { min-height:240px; display:flex; align-items:center; gap:45px; }
.scanner-core { width:150px; height:150px; border-radius:50%; display:grid; place-items:center; color:#36e0a1; background:radial-gradient(circle,#36e0a112,transparent 68%); border:1px solid #36e0a122; position:relative; box-shadow:0 0 80px #36e0a10c; }
.scanner-ring { position:absolute; inset:-20px; border:1px dashed #36e0a128; border-radius:50%; animation:nxOrbit 8s linear infinite; }
.nx-scanner-hero h3 { font-size:26px; margin:0; }
.nx-scanner-hero p { color:#6f788f; line-height:1.6; max-width:500px; }
@media (max-width: 1000px) {
  .nx-nav-links { display:none; }
  .nx-hero { min-height:950px; }
  .nx-hero-copy { margin-right:0; margin-top:-220px; }
  .nx-robot-stage { width:650px; right:-150px; top:360px; opacity:.7; }
  .nx-systems-intro { display:block; }
  .nx-systems-intro p { margin-top:30px; }
  .nx-feature-scroller { grid-template-columns:1fr; }
  .nx-feature-sticky { position:relative; top:0; height:500px; min-height:0; }
  .nx-feature-progress { display:none; }
  .nx-feature-section { min-height:680px; }
  .nx-mini-visual { opacity:.45; }
  .nx-flow { grid-template-columns:1fr 1fr; }
  .nx-sidebar { position:fixed; left:-260px; transition:left .25s ease; }
  .nx-sidebar.open { left:0; }
  .nx-mobile-menu { display:grid; place-items:center; }
  .nx-app-header { gap:15px; }
  .nx-dashboard-grid,.nx-work-grid { grid-template-columns:1fr; }
}
@media (max-width: 700px) {
  .nx-nav { padding:0 20px; }
  .nx-nav-actions .nx-link-button { display:none; }
  .nx-hero { min-height:930px; padding:120px 20px 60px; align-items:start; }
  .nx-hero h1 { font-size:64px; }
  .nx-hero-copy { margin-top:40px; }
  .nx-hero-copy > p { font-size:14px; }
  .nx-robot-stage { width:520px; height:580px; right:-140px; top:420px; opacity:.6; }
  .chip-one { right:20px; top:570px; }
  .chip-two { right:25px; top:730px; }
  .nx-statement-section,.nx-systems,.nx-flow-section,.nx-security-section { padding-left:20px; padding-right:20px; }
  .nx-statement-section { min-height:520px; padding-top:100px; }
  .nx-systems-intro h2 { font-size:58px; }
  .nx-feature-visual { height:400px; }
  .nx-feature-section { grid-template-columns:35px 1fr; min-height:620px; gap:15px; }
  .nx-feature-number { padding-top:100px; }
  .nx-mini-visual { display:none; }
  .nx-flow { grid-template-columns:1fr; }
  .nx-security-section { grid-template-columns:1fr; gap:30px; min-height:600px; }
  .nx-security-copy { border-left:0; border-top:1px solid #ffffff0e; padding:30px 0 0; }
  .nx-final-cta h2 { font-size:58px; }
  .nx-final-actions { flex-direction:column; }
  .nx-footer { flex-direction:column; gap:8px; }
  .nx-auth { padding:20px; }
  .nx-auth-card { padding:28px 22px; }
  .nx-auth-robot { opacity:.18; right:-180px; }
  .nx-app-content { padding:20px; }
  .nx-header-right .nx-online { display:none; }
  .nx-metric-grid { grid-template-columns:1fr 1fr; }
  .nx-dashboard-hero { display:block; }
  .nx-dashboard-core { margin:30px auto 0; }
  .nx-dashboard-features { grid-template-columns:1fr; }
  .nx-control-grid,.nx-cost-visual,.nx-form-grid { grid-template-columns:1fr; }
  .nx-region-map { grid-template-columns:1fr; }
  .region-connection { height:40px; width:2px; justify-self:center; background:linear-gradient(180deg,#ff5a76,#a478ff,#36e0a1); }
  .region-connection i { width:5px; height:15px; animation:nxTravelY 2s linear infinite; }
  .nx-scanner-hero { display:block; }
  .scanner-core { margin:10px auto 35px; }
}
@keyframes nxTravelY { from{top:0}to{top:25px} }
/* ===== Nexus v3 cinematic three-page landing ===== */
.nx-three-page-site { background:#05060b; color:#f7f8ff; overflow-x:hidden; }
.nx-three-page-site .nx-grid { opacity:.26; }
.nx-minimal-nav { position:fixed; top:0; left:0; right:0; z-index:80; background:linear-gradient(180deg,rgba(4,5,12,.78),transparent); backdrop-filter:blur(12px); }
.nx-page { position:relative; min-height:100svh; width:100%; overflow:hidden; }
.nx-hero-v3 { display:grid; place-items:center; padding:90px 6vw 50px; isolation:isolate; }
.nx-hero-v3-copy { position:relative; z-index:5; width:min(900px,92vw); text-align:center; margin-top:-4vh; transition:transform .08s linear; }
.nx-hero-v3-copy .nx-kicker { margin-bottom:22px; }
.nx-hero-v3-copy h1 { margin:0; font-size:clamp(58px,8.2vw,132px); line-height:.91; letter-spacing:-.075em; font-weight:520; }
.nx-hero-v3-copy h1 span { display:block; color:#f6f7ff; }
.nx-hero-v3-copy h1 em { display:block; font-style:normal; background:linear-gradient(100deg,#36dfff,#9d72ff 42%,#ff4ca7 78%,#ff8a42); -webkit-background-clip:text; background-clip:text; color:transparent; }
.nx-hero-v3-copy p { max-width:650px; margin:28px auto 0; color:#858ca6; font-size:16px; line-height:1.7; }
.nx-hero-v3 .nx-hero-actions { justify-content:center; margin-top:28px; }
.nx-core-stage { position:absolute; z-index:2; width:min(760px,72vw); height:min(760px,72vw); min-width:460px; min-height:460px; pointer-events:none; opacity:.82; transition:transform .08s linear; }
.nx-core-glow { position:absolute; inset:18%; border-radius:50%; background:radial-gradient(circle,rgba(77,226,255,.22),rgba(155,91,255,.11) 34%,rgba(255,66,168,.05) 53%,transparent 70%); filter:blur(22px); animation:nxCorePulse 4.5s ease-in-out infinite; }
.nx-core-card { position:absolute; width:220px; height:150px; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-8deg); border:1px solid rgba(255,255,255,.18); border-radius:28px; background:linear-gradient(145deg,rgba(18,25,43,.82),rgba(5,7,15,.5)); box-shadow:0 0 80px rgba(71,207,255,.12),inset 0 1px rgba(255,255,255,.13); backdrop-filter:blur(18px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; animation:nxCoreFloat 5s ease-in-out infinite; }
.nx-core-label { font-size:9px; letter-spacing:.24em; color:#7cecff; }
.nx-core-card strong { font-size:22px; letter-spacing:-.04em; }
.nx-core-card small { color:#6d748c; font-size:10px; }
.nx-core-bars { display:flex; gap:4px; height:18px; align-items:end; margin-top:3px; }
.nx-core-bars i { width:4px; border-radius:4px; background:linear-gradient(#42eaff,#8c64ff); animation:nxBars 1.3s ease-in-out infinite alternate; }
.nx-core-bars i:nth-child(1){height:6px}.nx-core-bars i:nth-child(2){height:13px;animation-delay:.1s}.nx-core-bars i:nth-child(3){height:9px;animation-delay:.2s}.nx-core-bars i:nth-child(4){height:17px;animation-delay:.3s}.nx-core-bars i:nth-child(5){height:11px;animation-delay:.4s}.nx-core-bars i:nth-child(6){height:15px;animation-delay:.5s}
.nx-core-ring { position:absolute; inset:9%; border:1px solid rgba(69,220,255,.18); border-radius:50%; transform:rotateX(68deg) rotateZ(8deg); animation:nxOrbit 11s linear infinite; }
.nx-core-ring.ring-b { inset:18%; border-color:rgba(173,103,255,.23); transform:rotateY(68deg) rotateZ(-18deg); animation-duration:8s; animation-direction:reverse; }
.nx-core-ring.ring-c { inset:29%; border-color:rgba(255,75,168,.2); transform:rotateX(72deg) rotateY(25deg); animation-duration:6s; }
.nx-core-orbit { position:absolute; left:50%; top:50%; width:100%; height:100%; transform:translate(-50%,-50%); animation:nxOrbit 10s linear infinite; }
.nx-core-orbit i { position:absolute; width:9px; height:9px; border-radius:50%; box-shadow:0 0 20px currentColor; }
.nx-core-orbit.orbit-a i:nth-child(1){left:13%;top:32%;color:#35e8ff;background:#35e8ff}.nx-core-orbit.orbit-a i:nth-child(2){right:11%;top:46%;color:#a36cff;background:#a36cff}.nx-core-orbit.orbit-a i:nth-child(3){left:34%;bottom:8%;color:#ff4ca7;background:#ff4ca7}
.nx-core-orbit.orbit-b { animation-duration:14s; animation-direction:reverse; }.nx-core-orbit.orbit-b i:nth-child(1){left:25%;top:10%;color:#ff9847;background:#ff9847}.nx-core-orbit.orbit-b i:nth-child(2){right:19%;bottom:17%;color:#45e3a0;background:#45e3a0}
.nx-core-orbit.orbit-c { animation-duration:7s; }.nx-core-orbit.orbit-c i{left:74%;top:23%;color:#ffe45c;background:#ffe45c}
.nx-hero-side-label { position:absolute; top:51%; writing-mode:vertical-rl; font-size:9px; letter-spacing:.28em; color:#4d5367; z-index:4; }
.nx-hero-side-label.left{left:24px;transform:rotate(180deg)} .nx-hero-side-label.right{right:24px}
.nx-scroll-cue { position:absolute; z-index:6; bottom:26px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; color:#5f667b; font-size:9px; letter-spacing:.22em; }
.nx-scroll-line { width:42px; height:1px; background:#252a38; overflow:hidden; }.nx-scroll-line i{display:block;width:100%;height:100%;background:linear-gradient(90deg,#37eaff,#9b6dff,#ff4fa8);transform-origin:left;animation:nxScrollLine 1.8s ease-in-out infinite}
.nx-systems-v3 { padding:120px 5vw 70px; display:flex; flex-direction:column; justify-content:center; background:radial-gradient(circle at 50% 40%,rgba(112,79,255,.08),transparent 36%); }
.nx-systems-v3-header { position:relative; z-index:4; text-align:center; max-width:850px; margin:0 auto 45px; }
.nx-systems-v3-header h2 { margin:10px 0 16px; font-size:clamp(55px,7.2vw,108px); line-height:.9; letter-spacing:-.07em; font-weight:520; }
.nx-systems-v3-header h2 span { background:linear-gradient(90deg,#38e6ff,#a477ff,#ff4ba5); -webkit-background-clip:text; background-clip:text; color:transparent; }
.nx-systems-v3-header p { max-width:590px; margin:auto; color:#727990; line-height:1.65; font-size:14px; }
.nx-system-rail { position:relative; z-index:5; display:grid; grid-template-columns:repeat(5,minmax(170px,1fr)); gap:12px; max-width:1450px; width:100%; margin:0 auto; perspective:1300px; }
.nx-system-panel { position:relative; min-height:390px; overflow:hidden; text-align:left; color:#fff; border:1px solid rgba(255,255,255,.1); border-radius:24px; padding:18px; background:linear-gradient(160deg,rgba(17,20,33,.94),rgba(5,7,13,.88)); box-shadow:inset 0 1px rgba(255,255,255,.06),0 20px 60px rgba(0,0,0,.25); cursor:pointer; transition:transform .65s cubic-bezier(.16,1,.3,1),opacity .5s,border-color .4s,box-shadow .4s; transform-style:preserve-3d; }
.nx-system-panel:hover { transform:translateY(-14px) scale(1.02)!important; box-shadow:0 25px 70px rgba(0,0,0,.42),0 0 35px color-mix(in srgb,var(--panel-accent,#7c7cff) 16%,transparent); }
.nx-panel-top{display:flex;justify-content:space-between;align-items:center;color:#61687d;font-size:10px;letter-spacing:.18em}.nx-panel-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid currentColor;border-radius:11px;background:rgba(255,255,255,.03)}
.nx-panel-visual { position:relative; height:190px; margin:8px -4px 12px; overflow:hidden; border-radius:18px; background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--panel-accent) 19%,transparent),transparent 55%),linear-gradient(145deg,rgba(255,255,255,.035),transparent); }
.nx-panel-core{position:absolute;left:50%;top:50%;width:48px;height:48px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff 0 4%,var(--panel-accent) 10%,transparent 65%);box-shadow:0 0 35px var(--panel-accent);animation:nxPanelPulse 2.2s ease-in-out infinite}.nx-panel-orbit{position:absolute;left:50%;top:50%;width:125px;height:70px;transform:translate(-50%,-50%) rotate(25deg);border:1px solid color-mix(in srgb,var(--panel-accent) 45%,transparent);border-radius:50%;animation:nxOrbit 5s linear infinite}.nx-panel-orbit.two{width:165px;height:105px;transform:translate(-50%,-50%) rotate(-42deg);animation-duration:7s;animation-direction:reverse}.nx-panel-scan{position:absolute;left:0;right:0;height:1px;top:0;background:linear-gradient(90deg,transparent,var(--panel-accent),transparent);box-shadow:0 0 18px var(--panel-accent);animation:nxScan 2.8s ease-in-out infinite}
.nx-panel-copy h3{font-size:18px;line-height:1.05;letter-spacing:-.035em;margin:0 0 8px}.nx-panel-copy p{font-size:12px;line-height:1.45;color:#777f94;margin:0}.nx-panel-open{position:absolute;bottom:17px;left:18px;display:flex;align-items:center;gap:6px;color:#70788d;font-size:9px;letter-spacing:.16em}.nx-system-progress{position:relative;z-index:4;display:flex;align-items:center;gap:16px;max-width:1450px;width:100%;margin:30px auto 0;color:#60687c;font-size:9px;letter-spacing:.18em}.nx-progress-track{height:2px;flex:1;background:#1a1d29;overflow:hidden}.nx-progress-track i{display:block;height:100%;background:linear-gradient(90deg,#36e7ff,#a474ff,#ff4ba7);transition:width .7s cubic-bezier(.16,1,.3,1)}
.nx-system-word{position:absolute;bottom:-1.8vw;left:0;font-size:clamp(60px,13vw,200px);font-weight:700;letter-spacing:-.08em;white-space:nowrap;color:rgba(255,255,255,.025);pointer-events:none;transition:transform .1s linear}
.nx-final-v3 { display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 24px 90px;background:radial-gradient(circle at 50% 46%,rgba(102,70,255,.16),rgba(5,6,11,0) 34%),linear-gradient(110deg,#09071c 0%,#05060d 48%,#03131a 100%); }
.nx-final-v3 h2{position:relative;z-index:3;margin:18px 0 14px;font-size:clamp(55px,9vw,138px);line-height:.88;letter-spacing:-.075em;font-weight:500}.nx-final-v3 h2 span{color:#ff4ca8}.nx-final-v3>p{position:relative;z-index:3;margin:0;color:#737a91;font-size:16px}.nx-final-v3 .nx-final-actions{position:relative;z-index:3;display:flex;gap:12px;align-items:center;justify-content:center;margin-top:28px}.nx-final-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:80px 80px;mask-image:linear-gradient(to bottom,transparent 0%,black 30%,black 70%,transparent 100%);animation:nxGridMove 16s linear infinite}.nx-final-glow{position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(90px);opacity:.2;animation:nxGlowDrift 9s ease-in-out infinite}.nx-final-glow.glow-one{background:#5c5cff;left:5%;top:25%}.nx-final-glow.glow-two{background:#ff3e98;right:4%;bottom:12%;animation-delay:-3s}.nx-footer-v3{position:absolute;bottom:0;left:0;right:0;padding:0 6vw 28px;display:flex;justify-content:space-between;color:#4d556c;font-size:10px;letter-spacing:.08em}.nx-auth-core{position:absolute;right:8%;top:50%;width:380px;height:380px;transform:translateY(-50%);border-radius:50%;background:radial-gradient(circle,rgba(63,227,255,.2),rgba(137,89,255,.08) 35%,transparent 66%);filter:blur(.2px);animation:nxCorePulse 4s ease-in-out infinite}.nx-auth-core-ring{position:absolute;inset:15%;border:1px solid rgba(62,225,255,.28);border-radius:50%;transform:rotateX(68deg);animation:nxOrbit 8s linear infinite}.nx-auth-core-ring.two{inset:30%;border-color:rgba(255,71,165,.3);transform:rotateY(70deg);animation-duration:6s;animation-direction:reverse}.nx-auth-core-dot{position:absolute;left:50%;top:50%;width:45px;height:45px;transform:translate(-50%,-50%);border-radius:50%;background:#45eaff;box-shadow:0 0 45px #45eaff}
@keyframes nxCorePulse{0%,100%{transform:scale(.96);opacity:.65}50%{transform:scale(1.04);opacity:1}}@keyframes nxCoreFloat{0%,100%{translate:0 0}50%{translate:0 -12px}}@keyframes nxBars{to{transform:scaleY(.55);opacity:.55}}@keyframes nxOrbit{to{transform:rotate(360deg) rotateX(68deg)}}@keyframes nxScan{0%{top:-5%}50%{top:100%}100%{top:-5%}}@keyframes nxPanelPulse{0%,100%{transform:translate(-50%,-50%) scale(.82);opacity:.7}50%{transform:translate(-50%,-50%) scale(1.16);opacity:1}}@keyframes nxScrollLine{0%{transform:scaleX(0);opacity:.2}45%{transform:scaleX(1);opacity:1}100%{transform:scaleX(0);opacity:.2;transform-origin:right}}@keyframes nxGridMove{to{background-position:80px 80px}}@keyframes nxGlowDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(80px,-45px)}}
@media(max-width:1050px){.nx-system-rail{grid-template-columns:1fr 1fr}.nx-system-panel{min-height:340px}.nx-core-stage{opacity:.42}.nx-hero-v3-copy{margin-top:0}.nx-hero-side-label{display:none}}
@media(max-width:680px){.nx-minimal-nav{padding:18px 18px}.nx-minimal-nav .nx-link-button{display:none}.nx-hero-v3{padding:90px 20px 40px}.nx-hero-v3-copy h1{font-size:clamp(52px,15vw,78px)}.nx-core-stage{width:620px;height:620px;min-width:0;min-height:0;opacity:.3}.nx-system-rail{grid-template-columns:1fr;gap:14px}.nx-system-panel{min-height:300px}.nx-system-panel:not(.is-active){opacity:.7!important;transform:none!important}.nx-systems-v3{padding:100px 18px 70px}.nx-systems-v3-header h2{font-size:58px}.nx-final-v3 h2{font-size:60px}.nx-final-v3 .nx-final-actions{flex-direction:column}.nx-footer-v3{padding:0 18px 22px;font-size:8px}.nx-auth-core{right:-140px;opacity:.35;width:500px;height:500px}}
@media(prefers-reduced-motion:reduce){.nx-three-page-site *,.nx-three-page-site *::before,.nx-three-page-site *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}

/* ===== Nexus v4 — MotionSites / Mindloop inspired three-page landing ===== */

.nx-three-page-site {
  background:#020309;
  color:#f7f8ff;
  overflow-x:hidden;
  --v4-cyan:#35ddff;
  --v4-violet:#9a6cff;
  --v4-pink:#ff4ca8;
  --v4-orange:#ff914d;
  --v4-green:#47e3a5;
  --v4-yellow:#ffe45c;
}

.nx-pill-nav{
  position:fixed;
  top:18px;
  left:24px;
  right:24px;
  height:52px;
  z-index:80;
  padding:0 8px 0 8px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:999px;
  background:rgba(2,3,9,.56);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  box-shadow:inset 0 1px rgba(255,255,255,.08),0 15px 50px rgba(0,0,0,.22);
}
.nx-pill-logo{
  border:0;
  background:transparent;
  color:#fff;
  display:flex;
  align-items:center;
  gap:9px;
  padding:7px 12px;
  font-weight:800;
  letter-spacing:.06em;
}
.nx-pill-logo b{color:var(--v4-cyan)}
.nx-pill-logo-ring{
  width:30px;height:30px;border:1px solid rgba(255,255,255,.62);
  border-radius:50%;display:grid;place-items:center;position:relative;
}
.nx-pill-logo-ring:before{
  content:"";position:absolute;inset:5px;border:1px solid rgba(255,255,255,.35);border-radius:50%;
}
.nx-pill-logo-ring span{
  width:5px;height:5px;border-radius:50%;background:#fff;
  box-shadow:0 0 14px var(--v4-cyan),0 0 22px var(--v4-violet);
}
.nx-pill-links{
  position:absolute;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:12px;
  color:#858b9d;font-size:11px;letter-spacing:.04em;
}
.nx-pill-links button{
  border:0;background:transparent;color:inherit;padding:7px 5px;
}
.nx-pill-links button:hover{color:#fff}
.nx-pill-actions{display:flex;align-items:center;gap:6px;margin-left:auto}
.nx-pill-login{
  border:0;background:transparent;color:#aeb4c4;padding:10px 13px;font-size:12px;
}
.nx-pill-login:hover{color:#fff}
.nx-pill-signup{
  display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.75);
  color:#070810;background:linear-gradient(110deg,#fff,#e7ecff);
  border-radius:999px;padding:10px 15px;font-weight:700;font-size:11px;
  box-shadow:0 0 24px rgba(115,179,255,.12);
  transition:transform .25s ease,box-shadow .25s ease;
}
.nx-pill-signup:hover{transform:translateY(-2px);box-shadow:0 0 28px rgba(110,210,255,.28)}

.nx-hero-v4{
  min-height:100svh;
  display:grid;
  place-items:center;
  padding:100px 5vw 65px;
  isolation:isolate;
  background:#020309;
}
.nx-hero-bg{position:absolute;inset:0;overflow:hidden;z-index:0}
.nx-hero-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.032) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.032) 1px,transparent 1px);
  background-size:76px 76px;
  transform:perspective(700px) rotateX(62deg) scale(1.55) translateY(21%);
  transform-origin:center bottom;
  mask-image:linear-gradient(to bottom,transparent 5%,#000 38%,#000 75%,transparent 100%);
  opacity:.5;
  animation:nxGridMove 18s linear infinite;
}
.nx-hero-haze{
  position:absolute;width:52vw;height:52vw;border-radius:50%;filter:blur(100px);opacity:.16;
  animation:nxHazeDrift 12s ease-in-out infinite alternate;
}
.haze-one{background:#5227ff;left:-16vw;top:-20vw}
.haze-two{background:#00cfff;right:-17vw;top:35vh;animation-delay:-4s}
.nx-thread-field{position:absolute;inset:8% -4% 5%;opacity:.92;mix-blend-mode:screen}
.nx-thread-field svg{width:100%;height:100%;overflow:visible}
.nx-thread-glow .thread{fill:none;stroke-width:10;opacity:.42}
.nx-thread-core .thread{
  fill:none;stroke-width:1.15;stroke-dasharray:13 18;
  animation:nxThreadFlow 10s linear infinite;
}
.nx-thread-core .t2{animation-duration:13s;animation-direction:reverse}
.nx-thread-core .t3{animation-duration:8s}
.nx-thread-core .t4{animation-duration:15s;animation-direction:reverse}
.nx-thread-core .t5{animation-duration:11s}
.nx-floating-orb{
  position:absolute;width:7px;height:7px;border-radius:50%;box-shadow:0 0 24px currentColor;
  animation:nxFloatOrb 5s ease-in-out infinite;
}
.orb-one{left:25%;top:28%;color:var(--v4-green);background:var(--v4-green)}
.orb-two{right:23%;top:34%;color:var(--v4-yellow);background:var(--v4-yellow);animation-delay:-2s}
.orb-three{right:30%;bottom:23%;color:var(--v4-pink);background:var(--v4-pink);animation-delay:-3.5s}

.nx-hero-v4-content{
  position:relative;z-index:5;width:min(1120px,94vw);text-align:center;
  margin-top:-1vh;transition:transform .08s linear;
}
.nx-hero-brandline{
  display:flex;align-items:center;justify-content:center;gap:11px;
  color:#7f879b;font-size:10px;font-weight:700;letter-spacing:.28em;
  margin-bottom:28px;text-transform:uppercase;
}
.nx-brand-pulse{width:7px;height:7px;border-radius:50%;background:var(--v4-green);box-shadow:0 0 16px var(--v4-green);animation:nxPulseDot 2s infinite}
.nx-brand-rule{width:44px;height:1px;background:rgba(255,255,255,.14)}
.nx-hero-v4-content h1{
  margin:0;font-size:clamp(66px,10vw,154px);line-height:.84;
  letter-spacing:-.085em;font-weight:520;
}
.nx-hero-line{display:block}
.nx-gradient-text{
  background:linear-gradient(100deg,var(--v4-cyan) 0%,#6d9cff 25%,var(--v4-violet) 48%,var(--v4-pink) 75%,var(--v4-orange) 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  background-size:180% 100%;animation:nxGradientShift 7s ease-in-out infinite alternate;
}
.nx-hero-v4-content p{
  max-width:620px;margin:30px auto 0;color:#858da1;font-size:15px;line-height:1.7;
}
.nx-hero-v4 .nx-hero-actions{justify-content:center;margin-top:28px}
.nx-hero-micro{
  position:absolute;top:50%;z-index:4;color:#3e4558;font-size:8px;letter-spacing:.3em;writing-mode:vertical-rl;
}
.micro-left{left:24px;transform:rotate(180deg)}
.micro-right{right:24px}
.nx-hero-bottom{
  position:absolute;z-index:6;bottom:24px;left:5vw;right:5vw;
  display:flex;align-items:center;justify-content:space-between;
  color:#4d5568;font-size:8px;letter-spacing:.2em;
}
.nx-scroll-cue{display:flex;align-items:center;gap:9px}
.nx-scroll-cue i{display:block;width:46px;height:1px;background:linear-gradient(90deg,var(--v4-cyan),var(--v4-violet),var(--v4-pink));animation:nxScrollLine 1.7s ease-in-out infinite}



.nx-systems-v4{
  min-height:100svh;
  padding:125px 5vw 65px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  overflow:hidden;
  isolation:isolate;
  background:
    radial-gradient(ellipse at 76% 48%,rgba(107,70,255,.13),transparent 34%),
    radial-gradient(ellipse at 20% 65%,rgba(0,210,255,.08),transparent 30%),
    #03040a;
}

.nx-systems-v4-bg{
  position:absolute;
  inset:0;
  z-index:-1;
  background-image:
    linear-gradient(rgba(255,255,255,.023) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.023) 1px,transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse at center,#000,transparent 78%);
}

.nx-systems-layout{
  position:relative;
  z-index:3;
  width:min(1500px,100%);
  min-height:650px;
  margin:auto;
  display:grid;
  grid-template-columns:minmax(340px,.85fr) minmax(500px,1.15fr);
  align-items:center;
  gap:clamp(25px,5vw,85px);
}

.nx-systems-copy{
  position:relative;
  z-index:5;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  padding:25px 0;
}

.nx-systems-copy .nx-section-eyebrow{
  color:#78869e;
  font-size:9px;
  font-weight:700;
  letter-spacing:.23em;
}

.nx-systems-copy h2{
  margin:24px 0 20px;
  font-size:clamp(54px,6vw,88px);
  line-height:.91;
  letter-spacing:-.08em;
  font-weight:520;
  color:#f8f9ff;
}

.nx-systems-copy h2 span{
  background:linear-gradient(90deg,var(--v4-cyan),var(--v4-violet),var(--v4-pink));
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}

.nx-systems-copy>p{
  max-width:420px;
  margin:0;
  color:#81899b;
  font-size:13px;
  line-height:1.8;
}

.nx-hologram-core{
  position:relative;
  width:190px;
  height:190px;
  margin:45px 0 15px 20px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:radial-gradient(circle,rgba(41,95,137,.25),rgba(6,11,25,.08) 65%,transparent 70%);
}

.nx-hologram-ring{
  position:absolute;
  inset:0;
  border:1px solid rgba(89,218,255,.27);
  border-radius:50%;
}

.nx-hologram-ring.ring-a{
  animation:nxHoloSpin 13s linear infinite;
}

.nx-hologram-ring.ring-b{
  inset:17px -10px;
  border-color:rgba(166,112,255,.38);
  transform:rotate(45deg);
  animation:nxHoloSpinReverse 17s linear infinite;
}

.nx-hologram-ring.ring-c{
  inset:30px;
  border-style:dashed;
  border-color:rgba(70,222,255,.25);
  animation:nxHoloSpin 25s linear infinite;
}

.nx-hologram-pulse{
  position:absolute;
  width:90px;
  height:90px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(59,208,255,.3),rgba(113,83,255,.1) 50%,transparent 75%);
  box-shadow:0 0 55px rgba(61,198,255,.23);
  animation:nxHoloPulse 3s ease-in-out infinite;
}

.nx-hologram-core-text{
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
}

.nx-hologram-core-text span{
  color:#73eaff;
  font-size:15px;
  font-weight:800;
  letter-spacing:.16em;
}

.nx-hologram-core-text strong{
  color:#fff;
  font-size:29px;
  letter-spacing:.12em;
}

.nx-hologram-core-text small{
  color:#7d8da5;
  font-size:7px;
  letter-spacing:.18em;
}

.nx-core-caption{
  display:flex;
  align-items:center;
  gap:9px;
  margin-left:25px;
  color:#7e8ba0;
  font-size:8px;
  letter-spacing:.18em;
}

.nx-core-caption i{
  width:6px;
  height:6px;
  border-radius:50%;
  background:#36e0a1;
  box-shadow:0 0 12px #36e0a1;
  animation:nxPulseDot 1.8s infinite;
}

.nx-energy-network{
  position:relative;
  min-width:0;
  height:650px;
  cursor:grab;
  touch-action:pan-y;
  user-select:none;
}

.nx-energy-network:active{cursor:grabbing}

.nx-energy-path{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  overflow:visible;
  pointer-events:none;
}

.nx-energy-trail{
  fill:none;
  stroke:rgba(117,104,255,.10);
  stroke-width:17;
  filter:blur(12px);
}

.nx-energy-line{
  fill:none;
  stroke:url(#nxEnergyGradient);
  stroke-width:1.5;
  stroke-dasharray:7 10;
  opacity:.65;
  filter:url(#nxEnergyGlow);
  animation:nxEnergyDash 12s linear infinite;
}

.nx-energy-nodes{
  position:absolute;
  inset:0;
}

.nx-energy-node{
  position:absolute;
  width:min(310px,49%);
  min-height:90px;
  display:flex;
  align-items:center;
  gap:15px;
  padding:8px;
  border:0;
  outline:none;
  background:transparent;
  color:#fff;
  text-align:left;
  cursor:pointer;
  animation:nxNodeFloat 5s ease-in-out infinite;
  animation-delay:calc(var(--node-index)*-.7s);
  transition:filter .35s,opacity .35s;
}

.nx-energy-node.node-1{left:1%;top:3%}
.nx-energy-node.node-2{right:0;top:22%}
.nx-energy-node.node-3{left:5%;top:43%}
.nx-energy-node.node-4{right:0;top:64%}
.nx-energy-node.node-5{left:7%;top:83%}

.nx-energy-node-orb{
  position:relative;
  flex:0 0 58px;
  width:58px;
  height:58px;
  display:grid;
  place-items:center;
  border:1px solid color-mix(in srgb,var(--node-accent) 70%,transparent);
  border-radius:50%;
  background:radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--node-accent) 22%,#111827),#080b15 75%);
  color:var(--node-accent);
  box-shadow:0 0 20px color-mix(in srgb,var(--node-accent) 20%,transparent),inset 0 0 15px color-mix(in srgb,var(--node-accent) 10%,transparent);
  transition:transform .35s,box-shadow .35s;
}

.nx-energy-node-icon{
  display:grid;
  place-items:center;
}

.nx-energy-node-icon svg{
  width:23px;
  height:23px;
}

.nx-energy-node-orb>i{
  position:absolute;
  inset:-7px;
  border:1px solid color-mix(in srgb,var(--node-accent) 35%,transparent);
  border-radius:50%;
  animation:nxNodeOrbit 5s linear infinite;
}

.nx-energy-node-copy{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:5px;
}

.nx-energy-node-copy small{
  color:var(--node-accent);
  font:8px ui-monospace,monospace;
  letter-spacing:.16em;
}

.nx-energy-node-copy strong{
  color:#e8ebf5;
  font-size:15px;
  font-weight:650;
  letter-spacing:-.025em;
  transition:color .3s;
}

.nx-energy-node-copy>span{
  color:#788398;
  font-size:10px;
  line-height:1.5;
}

.nx-energy-node-copy em{
  display:flex;
  align-items:center;
  gap:5px;
  margin-top:3px;
  color:var(--node-accent);
  font-size:8px;
  font-style:normal;
  font-weight:700;
  letter-spacing:.12em;
  opacity:.75;
  transition:opacity .3s;
}

.nx-energy-node-pulse{
  position:absolute;
  left:27px;
  top:27px;
  width:4px;
  height:4px;
  border-radius:50%;
  background:var(--node-accent);
  box-shadow:0 0 15px 5px color-mix(in srgb,var(--node-accent) 40%,transparent);
  pointer-events:none;
  animation:nxNodePulse 2.8s ease-in-out infinite;
}

.nx-energy-node:hover .nx-energy-node-orb,
.nx-energy-node.is-active .nx-energy-node-orb{
  transform:scale(1.13);
  box-shadow:0 0 35px color-mix(in srgb,var(--node-accent) 38%,transparent),inset 0 0 20px color-mix(in srgb,var(--node-accent) 18%,transparent);
}

.nx-energy-node:hover .nx-energy-node-copy strong,
.nx-energy-node.is-active .nx-energy-node-copy strong{
  color:#fff;
  text-shadow:0 0 18px color-mix(in srgb,var(--node-accent) 45%,transparent);
}

.nx-energy-node:hover .nx-energy-node-copy em,
.nx-energy-node.is-active .nx-energy-node-copy em{opacity:1}

.nx-system-word{
  position:relative;
  z-index:1;
  margin-top:5px;
  text-align:center;
  color:rgba(255,255,255,.035);
  font-size:clamp(25px,5vw,58px);
  font-weight:800;
  letter-spacing:.12em;
  white-space:nowrap;
  pointer-events:none;
}

@keyframes nxHoloSpin{
  from{transform:rotate(0)}
  to{transform:rotate(360deg)}
}

@keyframes nxHoloSpinReverse{
  from{transform:rotate(360deg)}
  to{transform:rotate(0)}
}

@keyframes nxHoloPulse{
  0%,100%{transform:scale(.9);opacity:.6}
  50%{transform:scale(1.2);opacity:1}
}

@keyframes nxEnergyDash{
  to{stroke-dashoffset:-300}
}

@keyframes nxNodeFloat{
  0%,100%{translate:0 0}
  50%{translate:0 -9px}
}

@keyframes nxNodeOrbit{
  from{transform:rotate(0) scaleX(1.08)}
  to{transform:rotate(360deg) scaleX(1.08)}
}

@keyframes nxNodePulse{
  0%,100%{opacity:.35;transform:scale(.7)}
  50%{opacity:1;transform:scale(1.5)}
}

@media(max-width:1000px){
  .nx-systems-layout{
    grid-template-columns:minmax(280px,.8fr) minmax(400px,1.2fr);
    gap:20px;
  }
  .nx-systems-copy h2{font-size:clamp(48px,6vw,68px)}
  .nx-energy-network{height:600px}
  .nx-energy-node{width:54%}
}

@media(max-width:760px){
  .nx-systems-v4{padding:110px 20px 55px}
  .nx-systems-layout{
    display:flex;
    flex-direction:column;
    align-items:stretch;
    gap:5px;
    min-height:0;
  }
  .nx-systems-copy{padding:10px 0 0}
  .nx-systems-copy h2{
    margin:17px 0 12px;
    font-size:clamp(48px,12vw,70px);
  }
  .nx-systems-copy>p{font-size:12px}
  .nx-hologram-core{
    position:absolute;
    right:0;
    top:25px;
    width:105px;
    height:105px;
    margin:0;
    opacity:.9;
  }
  .nx-hologram-core-text span{font-size:9px}
  .nx-hologram-core-text strong{font-size:18px}
  .nx-hologram-core-text small{font-size:5px}
  .nx-hologram-ring.ring-b{inset:12px -6px}
  .nx-hologram-ring.ring-c{inset:20px}
  .nx-core-caption{margin:12px 0 0}
  .nx-energy-network{
    height:590px;
    width:100%;
    margin-top:15px;
  }
  .nx-energy-node{width:58%;min-height:85px;gap:10px}
  .nx-energy-node.node-1{left:0;top:1%}
  .nx-energy-node.node-2{right:0;top:21%}
  .nx-energy-node.node-3{left:0;top:41%}
  .nx-energy-node.node-4{right:0;top:61%}
  .nx-energy-node.node-5{left:0;top:81%}
  .nx-energy-node-orb{flex-basis:46px;width:46px;height:46px}
  .nx-energy-node-icon svg{width:19px;height:19px}
  .nx-energy-node-copy strong{font-size:12px}
  .nx-energy-node-copy>span{font-size:9px}
  .nx-energy-hint{font-size:7px}
}

@media(prefers-reduced-motion:reduce){
  .nx-hologram-ring,.nx-hologram-pulse,.nx-energy-line,
  .nx-energy-node,.nx-energy-node-orb>i,.nx-energy-node-pulse{
    animation:none!important;
  }
}

.nx-systems-v4{min-height:0;padding-top:95px;padding-bottom:55px}
.nx-systems-layout{min-height:610px}
.nx-how-v4{
  min-height:0;padding:105px 5vw 100px;display:flex;align-items:center;justify-content:center;
  isolation:isolate;background:radial-gradient(ellipse at 50% 45%,rgba(91,75,255,.13),transparent 48%),
  linear-gradient(180deg,#03040a 0%,#050713 52%,#03040a 100%);
}
.nx-how-backdrop{position:absolute;inset:0;z-index:-1;opacity:.45;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at center,#000,transparent 78%)}
.nx-how-inner{width:min(1180px,100%);text-align:center;position:relative;z-index:2}
.nx-how-inner h2{font-size:clamp(42px,6vw,82px);line-height:.98;letter-spacing:-.07em;margin:18px 0 14px;color:#f7f8ff;font-weight:520}
.nx-how-inner h2 span{background:linear-gradient(90deg,var(--v4-cyan),var(--v4-violet),var(--v4-pink));-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-how-intro{max-width:650px;margin:0 auto;color:#858da1;font-size:14px;line-height:1.8}
.nx-how-flow{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:30px;margin:72px 0 35px;text-align:left}
.nx-how-line{position:absolute;left:8%;right:8%;top:35px;height:1px;background:linear-gradient(90deg,#36d9ff,#9b72ff,#ff55b8,#36e0a1);opacity:.65}
.nx-how-line i{position:absolute;top:-3px;width:7px;height:7px;border-radius:50%;background:#a9edff;box-shadow:0 0 16px #55dfff;animation:nxHowTravel 5s linear infinite}
.nx-how-line i:nth-child(2){animation-delay:-1.7s}.nx-how-line i:nth-child(3){animation-delay:-3.4s}
.nx-how-step{position:relative;padding-top:0}
.nx-how-number{font:700 9px ui-monospace,monospace;letter-spacing:.2em;color:#7d879c}
.nx-how-icon{width:70px;height:70px;margin:12px 0 20px;border:1px solid rgba(122,190,255,.28);border-radius:50%;display:grid;place-items:center;color:var(--step-color);background:radial-gradient(circle, color-mix(in srgb,var(--step-color) 18%,transparent),rgba(5,9,22,.8) 70%);box-shadow:0 0 32px color-mix(in srgb,var(--step-color) 16%,transparent);position:relative;z-index:2}
.step-detect{--step-color:#36d9ff}.step-analyze{--step-color:#a77bff}.step-respond{--step-color:#ff69b8}.step-learn{--step-color:#36e0a1}
.nx-how-step h3{font-size:22px;color:#f3f5ff;margin:0 0 9px;letter-spacing:-.04em}
.nx-how-step p{font-size:12px;line-height:1.75;color:#858da1;max-width:220px;margin:0}
.nx-how-foot{display:flex;align-items:center;justify-content:center;gap:10px;color:#667188;font:700 9px ui-monospace,monospace;letter-spacing:.18em}
.nx-how-foot span{width:7px;height:7px;border-radius:50%;background:#36e0a1;box-shadow:0 0 12px #36e0a1}
@keyframes nxHowTravel{from{left:0;opacity:0}15%,85%{opacity:1}to{left:100%;opacity:0}}
.nx-final-v4{min-height:78svh;padding:75px 24px 65px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:100px 24px 90px;
  background:
    radial-gradient(circle at 50% 42%,rgba(92,72,255,.18),transparent 30%),
    radial-gradient(circle at 14% 58%,rgba(0,207,255,.09),transparent 25%),
    radial-gradient(circle at 88% 40%,rgba(255,62,152,.10),transparent 24%),
    #03040a;
}
.nx-final-v4 h2{
  position:relative;z-index:3;margin:18px 0 14px;font-size:clamp(58px,9vw,140px);
  line-height:.87;letter-spacing:-.08em;font-weight:500;
}
.nx-final-v4 h2 span{
  background:linear-gradient(90deg,var(--v4-cyan),var(--v4-violet),var(--v4-pink),var(--v4-orange));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.nx-final-v4>p{position:relative;z-index:3;margin:0;color:#747c90;font-size:15px}
.nx-final-v4 .nx-final-actions{position:relative;z-index:3;display:flex;gap:12px;margin-top:28px}
.nx-final-scan{
  position:absolute;left:0;right:0;top:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--v4-cyan),var(--v4-violet),var(--v4-pink),transparent);
  box-shadow:0 0 30px rgba(117,120,255,.5);animation:nxFinalScan 6s ease-in-out infinite;
}
.nx-footer-v3{z-index:5}

@keyframes nxThreadFlow{to{stroke-dashoffset:-310}}
@keyframes nxHazeDrift{from{transform:translate3d(-3%,-2%,0) scale(.95)}to{transform:translate3d(5%,5%,0) scale(1.1)}}
@keyframes nxFloatOrb{0%,100%{transform:translate3d(0,0,0);opacity:.65}50%{transform:translate3d(18px,-28px,0);opacity:1}}
@keyframes nxPulseDot{50%{transform:scale(1.55);opacity:.65}}
@keyframes nxGradientShift{from{background-position:0% 50%}to{background-position:100% 50%}}
@keyframes nxSignalTravel{0%{transform:translate(0,0);opacity:0}20%{opacity:1}70%{opacity:1}100%{transform:translate(90px,40px);opacity:0}}
@keyframes nxFinalScan{0%{transform:translateY(-10vh);opacity:0}20%{opacity:1}55%{opacity:.8}100%{transform:translateY(100vh);opacity:0}}

@media(max-width:1100px){
  .nx-pill-links{display:none}
  .nx-system-cards{grid-template-columns:repeat(2,minmax(180px,1fr))}
  .nx-system-sidebar{min-height:0}
}
@media(max-width:760px){
  .nx-how-v4{padding:85px 22px 75px}
  .nx-how-flow{grid-template-columns:1fr 1fr;gap:34px 22px;margin:48px 0 30px}
  .nx-how-line{display:none}
  .nx-how-step p{max-width:none}
  .nx-how-inner h2{font-size:clamp(40px,11vw,60px)}
  .nx-how-foot{font-size:7px;letter-spacing:.1em}
  .nx-systems-v4{padding-top:90px;padding-bottom:40px}
  .nx-pill-nav{top:10px;left:10px;right:10px}
  .nx-pill-login{display:none}
  .nx-hero-v4{padding:100px 20px 60px}
  .nx-hero-v4-content h1{font-size:clamp(55px,15vw,82px)}
  .nx-hero-brandline{font-size:8px;letter-spacing:.17em;flex-wrap:wrap}
  .nx-hero-v4-content p{font-size:13px}
  .nx-hero-bottom{left:20px;right:20px}
  .nx-hero-bottom>span{display:none}
  .nx-hero-micro{display:none}
  .nx-thread-field{inset:18% -28% 8%;opacity:.75}
  .nx-system-dashboard{grid-template-columns:1fr}
  .nx-system-sidebar{border-right:0;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:10px}
  .nx-system-sidebar button{display:none}
  .nx-system-sidebar button.active{display:grid}
  .nx-system-sidebar .nx-sidebar-status{display:none}
  .nx-system-cards{grid-template-columns:1fr}
  .nx-dashboard-card{min-height:300px}
  .nx-systems-v4{padding:105px 12px 60px}
  .nx-systems-v4-header h2{font-size:58px}
  .nx-final-v4 h2{font-size:58px}
  .nx-final-v4 .nx-final-actions{flex-direction:column;width:min(330px,90vw)}
  .nx-final-v4 .nx-primary,.nx-final-v4 .nx-ghost{width:100%}
}


`;

export default App;
