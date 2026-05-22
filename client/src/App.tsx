import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGardenStore } from './store/useGardenStore';
import { resolveAdapter, clearAdapterCache, AUTH_ENABLED } from './adapters';
import { registerServiceWorker, notifyTodayTasks, maybeFireWeeklyDigest } from './utils/notifications';
import { AuthProvider, useAuth, type AuthUser } from './context/AuthContext';
import { Nav } from './components/Nav';
import { AccountButton } from './components/AccountButton';
import { Setup } from './pages/Setup';
import { Planner } from './pages/Planner';
import { Calendar } from './pages/Calendar';
import { Seeds } from './pages/Seeds';
import { ActivityLog } from './pages/ActivityLog';
import { Settings } from './pages/Settings';
import { Seasons } from './pages/Seasons';
import { Dashboard } from './pages/Dashboard';
import { ShareView } from './pages/ShareView';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Credits } from './pages/Credits';
import { LandingPage } from './pages/LandingPage';
import { GuidePage } from './pages/GuidePage';
import { TutorialPage } from './pages/TutorialPage';

// ── Root ───────────────────────────────────────────────────────
// In hosted mode the whole app sits inside AuthProvider so every
// component can call useAuth(). There is no sign-in wall — the app
// is always accessible. Sign-in lives in the bottom nav and is opt-in.

export default function App() {
  if (AUTH_ENABLED) {
    return (
      <AuthProvider>
        <AuthShell />
      </AuthProvider>
    );
  }
  return <GardenApp authUser={null} />;
}

// ── Auth shell ─────────────────────────────────────────────────
// Silently checks whether the user is already logged in (JWT cookie).
// Passes the result to GardenApp — no wall, no forced redirect.
// If logged in  → RemoteAdapter (cloud data)
// If not logged in → LocalAdapter (device data, guided to setup)

function AuthShell() {
  const { user, checking } = useAuth();

  // Show a brief spinner only while the /auth/me check is in-flight.
  // This is typically <200ms on the same origin.
  if (checking) return <LoadingSpinner />;

  return <GardenApp authUser={user} />;
}

// ── Garden app ─────────────────────────────────────────────────
// Core app — identical in auth mode and self-hosted mode.
// authUser is null when not signed in; the adapter falls back to LocalAdapter.

function GardenApp({ authUser }: { authUser: AuthUser | null }) {
  const { init, settings, loading } = useGardenStore();
  const [adapterReady, setAdapterReady] = useState(false);

  useEffect(() => {
    resolveAdapter(authUser !== null).then((adapter) => {
      init(adapter)
        .then(() => setAdapterReady(true))
        .catch((err: unknown) => {
          if (err instanceof Error && err.message === 'SUBSCRIPTION_REQUIRED') {
            // Signed in but not on a paid/whitelisted account.
            // Fall back to local storage silently — they still get the full app,
            // just without cloud sync.
            clearAdapterCache();
            resolveAdapter(false).then(localAdapter =>
              init(localAdapter)
                .then(() => setAdapterReady(true))
                .catch(() => setAdapterReady(true))
            );
          } else {
            console.error('Adapter init error:', err);
            setAdapterReady(true);
          }
        });
    });
  }, [init, authUser]);

  useEffect(() => {
    if (!adapterReady) return;

    void (async () => {
      await registerServiceWorker();

      const { tasks, settings: s } = useGardenStore.getState();
      if (!s.notificationsEnabled) return;

      const todayIso = new Date().toISOString().slice(0, 10);
      const todayTasks = tasks.filter(t => !t.completed && t.date === todayIso);

      if (todayTasks.length > 0) await notifyTodayTasks(todayTasks);
      if (s.weeklyDigestEnabled)  await maybeFireWeeklyDigest(tasks);
    })();
  }, [adapterReady]);

  if (!adapterReady || loading) return <LoadingSpinner />;

  return (
    <div className="app-shell">
      <Routes>
        {/* "/" → skip landing if already authenticated */}
        <Route path="/" element={
          AUTH_ENABLED && authUser !== null
            ? <Navigate to={settings.setupComplete ? '/dashboard' : '/setup'} replace />
            : <LandingPage />
        } />
        <Route path="/setup" element={<Setup />} />
        <Route path="/share/:data" element={<ShareView />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/credits" element={<Credits />} />
        <Route
          path="/*"
          element={
            !settings.setupComplete ? (
              <Navigate to="/setup" replace />
            ) : (
              <>
                {/* Account control — fixed, aligned with .page content right edge */}
                <div className="account-btn-frame">
                  <AccountButton authUser={authUser} />
                </div>

                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/planner"   element={<Planner />} />
                  <Route path="/calendar"  element={<Calendar />} />
                  <Route path="/seeds"     element={<Seeds />} />
                  <Route path="/log"       element={<ActivityLog />} />
                  <Route path="/settings"  element={<Settings />} />
                  <Route path="/seasons"   element={<Seasons />} />
                  <Route path="*"          element={<Navigate to="/dashboard" replace />} />
                </Routes>
                <Nav />
              </>
            )
          }
        />
      </Routes>
    </div>
  );
}

// ── Loading spinner ────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ fontSize: '3rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🌱</div>
      <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>Loading…</div>
    </div>
  );
}
