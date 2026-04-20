import { Link } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { AUTH_ENABLED } from '../adapters';

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
  const { settings } = useGardenStore();

  return (
    <div className="landing">

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <span className="landing-nav-logo">🌿</span>
            <span className="landing-nav-name">My Living Garden</span>
          </div>
          {AUTH_ENABLED ? (
            <a href="/auth/google" className="btn btn-primary landing-nav-cta">
              Sign in →
            </a>
          ) : settings.setupComplete ? (
            <Link to="/dashboard" className="btn btn-primary landing-nav-cta">
              My garden →
            </Link>
          ) : (
            <Link to="/setup" className="btn btn-primary landing-nav-cta">
              Start free →
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          {AUTH_ENABLED ? (
            <div className="landing-hero-eyebrow">Cloud-synced · Multi-device · Always backed up</div>
          ) : (
            <div className="landing-hero-eyebrow">Free · No account needed · Works offline</div>
          )}
          <h1 className="landing-hero-h1">
            Your vegetable garden,<br />planned down to the seed
          </h1>
          <p className="landing-hero-sub">
            Map your raised beds, calculate seed-starting dates, and build a full
            planting calendar — all from your zip code.{' '}
            {AUTH_ENABLED
              ? 'Your data syncs across all your devices automatically.'
              : 'Free forever, no sign-up required.'}
          </p>
          <div className="landing-hero-actions">
            {AUTH_ENABLED ? (
              <a href="/auth/google" className="btn btn-primary landing-cta-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </a>
            ) : settings.setupComplete ? (
              <Link to="/dashboard" className="btn btn-primary landing-cta-primary">
                🌿 Go to my garden
              </Link>
            ) : (
              <Link to="/setup" className="btn btn-primary landing-cta-primary">
                🌱 Start planning for free
              </Link>
            )}
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
          {settings.setupComplete ? (
            <Link to="/dashboard" className="btn btn-primary landing-cta-primary">
              Go to my garden →
            </Link>
          ) : (
            <Link to="/setup" className="btn btn-primary landing-cta-primary">
              Start planning for free →
            </Link>
          )}
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
