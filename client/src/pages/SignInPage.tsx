import { Link } from 'react-router-dom';

interface Props {
  onSignIn: () => void;
  onSkip: () => void;
}

export function SignInPage({ onSignIn, onSkip }: Props) {
  return (
    <div className="landing">

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand">
            <span className="landing-nav-logo">🌿</span>
            <span className="landing-nav-name">My Living Garden</span>
          </div>
        </div>
      </header>

      {/* ── Sign-in card ─────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100dvh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌿</div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            marginBottom: '0.5rem',
          }}>
            Welcome back
          </h1>

          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.95rem',
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}>
            Sign in to access your garden from any device, keep your data backed up, and sync across browsers.
          </p>

          {/* Google sign-in button */}
          <button
            onClick={onSignIn}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.875rem 1.5rem',
              background: '#ffffff',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#333333',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            }}
            onMouseOver={e => {
              const el = e.currentTarget;
              el.style.boxShadow = 'var(--shadow-md)';
              el.style.borderColor = '#999999';
            }}
            onMouseOut={e => {
              const el = e.currentTarget;
              el.style.boxShadow = 'none';
              el.style.borderColor = 'var(--color-border)';
            }}
          >
            {/* Google "G" logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
          }}>
            By signing in you agree to our{' '}
            <Link to="/terms" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </p>

          {/* Divider */}
          <div style={{
            margin: '1.5rem 0 1rem',
            borderTop: '1px solid var(--color-border)',
          }} />

          {/* Local-only bypass */}
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Continue without signing in (local device only)
          </button>
          <p style={{
            marginTop: '0.4rem',
            fontSize: '0.72rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}>
            Your data will only be saved on this device and won't sync across browsers.
          </p>
        </div>
      </section>
    </div>
  );
}
