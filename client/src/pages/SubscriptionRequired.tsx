import { useAuth } from '../context/AuthContext';
import { AUTH_ENABLED } from '../adapters';

/**
 * Shown when the API returns 403 — the user is authenticated but their
 * account is free-tier and not whitelisted.
 */
export function SubscriptionRequired() {
  const { user, signOut } = AUTH_ENABLED
    ? useAuth()
    : { user: null, signOut: async () => {} };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2rem',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>

        <h1 style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          color: 'var(--color-primary-dark)',
          marginBottom: '0.5rem',
        }}>
          Subscription required
        </h1>

        {user && (
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            marginBottom: '0.75rem',
          }}>
            Signed in as <strong>{user.email}</strong>
          </p>
        )}

        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Your account doesn't currently have an active subscription.
          Upgrade to access your garden data across all your devices.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Placeholder — swap in your real pricing/upgrade URL when ready */}
          <a
            href="mailto:support@mylivinggarden.com?subject=Subscription"
            style={{
              display: 'block',
              padding: '0.875rem',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Contact us to upgrade →
          </a>

          <button
            onClick={() => void signOut()}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
