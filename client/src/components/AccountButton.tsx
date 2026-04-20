import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AUTH_ENABLED } from '../adapters';
import type { AuthUser } from '../context/AuthContext';

interface Props {
  authUser: AuthUser | null;
}

/**
 * Fixed top-right account control.
 * Shows the user's avatar (signed in) or a sign-in button (signed out).
 * Completely independent of the bottom nav.
 */
export function AccountButton({ authUser }: Props) {
  if (!AUTH_ENABLED) return null;

  return authUser ? <UserMenu user={authUser} /> : <SignInChip />;
}

// ── Signed-in: avatar + dropdown ───────────────────────────────

function UserMenu({ user }: { user: AuthUser }) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const initials = user.displayName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div style={{ position: 'relative' }}>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        />
      )}

      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title={user.displayName}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '999px',
          padding: '4px 10px 4px 4px',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'box-shadow 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
        onMouseOut={e  => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 800,
            flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--color-text)',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {user.displayName.split(' ')[0]}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          minWidth: '200px',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Identity */}
          <div style={{
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
              {user.email}
            </div>
            {user.tier === 'paid' && (
              <span style={{
                display: 'inline-block',
                marginTop: '0.4rem',
                padding: '0.1rem 0.5rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}>
                Pro
              </span>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={() => { void signOut(); }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              fontSize: '0.875rem',
              color: 'var(--color-danger)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Not signed in: compact sign-in chip ────────────────────────

function SignInChip() {
  const { signIn } = useAuth();

  return (
    <button
      onClick={signIn}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: '999px',
        padding: '6px 14px 6px 10px',
        fontSize: '0.82rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'opacity 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseOut={e  => (e.currentTarget.style.opacity = '1')}
    >
      {/* Google G */}
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="rgba(255,255,255,0.8)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="rgba(255,255,255,0.8)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="rgba(255,255,255,0.8)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in
    </button>
  );
}
