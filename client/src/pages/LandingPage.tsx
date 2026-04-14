import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';

const FEATURES = [
  {
    icon: '🛏️',
    title: 'Visual Bed Planner',
    body: 'Map every raised bed, container, and in-ground plot on an interactive grid. Get automatic spacing warnings and companion planting suggestions as you build.',
  },
  {
    icon: '🌱',
    title: 'Seed Starting Calculator',
    body: 'Enter your zip code and get exact dates for starting each variety indoors. Peppers, tomatoes, cucumbers — every crop calculated from your local last frost date.',
  },
  {
    icon: '📅',
    title: 'Planting Calendar',
    body: 'Your full season schedule auto-generates the moment you add plants — from seed tray prep through transplant, harvest, and succession sowing.',
  },
  {
    icon: '🌦️',
    title: '7-Day Weather',
    body: 'Local forecast with freeze alerts tied to your garden. Know before you transplant whether tonight will dip below 50°F.',
  },
  {
    icon: '🔄',
    title: 'Succession Gap Finder',
    body: 'After you harvest a crop, the app detects the open window in your bed and suggests fast-maturing varieties you can still squeeze in before first fall frost.',
  },
  {
    icon: '📋',
    title: 'Activity Log',
    body: 'Track waterings, fertilizing, harvests, and observations. Build a season-over-season record of what worked — and what didn\'t.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Enter your zip code',
    body: 'We estimate your last spring frost and first fall frost automatically. Override them any time with your own local knowledge.',
  },
  {
    n: '2',
    title: 'Map your garden',
    body: 'Add your raised beds, containers, and plots. Drop in vegetables, herbs, and flowers. The planner handles spacing and layout warnings.',
  },
  {
    n: '3',
    title: 'Get your full schedule',
    body: 'Seed-starting dates, transplant windows, and harvest estimates generate automatically — then update whenever you change your plan.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { settings } = useGardenStore();

  // Logged-in users go straight to their garden
  useEffect(() => {
    if (settings.setupComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [settings.setupComplete, navigate]);

  // Don't flash the landing page while redirecting
  if (settings.setupComplete) return null;

  return (
    <div className="landing">

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <span className="landing-nav-logo">🌿</span>
            <span className="landing-nav-name">My Living Garden</span>
          </div>
          <Link to="/setup" className="btn btn-primary landing-nav-cta">
            Start free →
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-eyebrow">Free · No account needed · Works offline</div>
          <h1 className="landing-hero-h1">
            Your vegetable garden,<br />planned down to the seed
          </h1>
          <p className="landing-hero-sub">
            Map your raised beds, calculate seed-starting dates, and build a full
            planting calendar — all from your zip code. Free forever, no sign-up required.
          </p>
          <div className="landing-hero-actions">
            <Link to="/setup" className="btn btn-primary landing-cta-primary">
              🌱 Start planning for free
            </Link>
            <a href="#how-it-works" className="btn btn-ghost landing-cta-ghost">
              See how it works ↓
            </a>
          </div>
          <div className="landing-hero-tags">
            <span className="landing-tag">Raised beds</span>
            <span className="landing-tag">Seed starting</span>
            <span className="landing-tag">Frost dates</span>
            <span className="landing-tag">Succession planting</span>
            <span className="landing-tag">Harvest tracking</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="landing-section-inner">
          <h2 className="landing-section-h2">Everything your garden season needs</h2>
          <p className="landing-section-sub">
            From the first seed tray in February to the last harvest in October —
            one app tracks it all.
          </p>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="landing-section landing-section--alt" id="how-it-works">
        <div className="landing-section-inner">
          <h2 className="landing-section-h2">Set up in under 2 minutes</h2>
          <p className="landing-section-sub">
            No account. No credit card. Just your zip code and your garden.
          </p>
          <div className="landing-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="landing-step">
                <div className="landing-step-num">{s.n}</div>
                <div>
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="landing-step-body">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works everywhere ─────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-section-inner landing-split">
          <div className="landing-split-text">
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              Install it like an app.<br />Use it without internet.
            </h2>
            <p className="landing-section-sub" style={{ textAlign: 'left' }}>
              My Living Garden is a Progressive Web App — add it to your home screen
              on iPhone or Android and it works exactly like a native app, even when
              you're outside with no signal. All your garden data lives on your device.
            </p>
            <ul className="landing-check-list">
              <li>✅ Works on iPhone, Android, and desktop</li>
              <li>✅ Install to home screen — no App Store needed</li>
              <li>✅ Fully offline after first load</li>
              <li>✅ Your data never leaves your device</li>
            </ul>
          </div>
          <div className="landing-split-visual">
            <div className="landing-phone-mock">
              <div className="landing-phone-screen">
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌿</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>My Living Garden</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Your garden in your pocket
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌱</div>
          <h2 className="landing-cta-h2">Ready to plan your best garden yet?</h2>
          <p className="landing-cta-sub">
            Free to use. No account. Your data stays on your device.
          </p>
          <Link to="/setup" className="btn btn-primary landing-cta-primary">
            Start planning for free →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span>🌿</span> My Living Garden
          </div>
          <div className="landing-footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/credits">Credits</Link>
          </div>
          <div className="landing-footer-copy">
            © {new Date().getFullYear()} My Living Garden · Early access
          </div>
        </div>
      </footer>

    </div>
  );
}
