import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGardenStore } from './store/useGardenStore';
import { resolveAdapter } from './adapters';
import { registerServiceWorker, notifyTodayTasks, maybeFireWeeklyDigest } from './utils/notifications';
import { Nav } from './components/Nav';
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

export default function App() {
  const { init, settings, loading } = useGardenStore();
  const [adapterReady, setAdapterReady] = useState(false);

  useEffect(() => {
    resolveAdapter().then((adapter) => {
      init(adapter).then(() => setAdapterReady(true));
    });
  }, [init]);

  useEffect(() => {
    if (!adapterReady) return;

    // Register service worker and fire today's notifications
    void (async () => {
      await registerServiceWorker();

      const { tasks, settings: s } = useGardenStore.getState();
      if (!s.notificationsEnabled) return;

      const todayIso = new Date().toISOString().slice(0, 10);
      const todayTasks = tasks.filter(t => !t.completed && t.date === todayIso);

      if (todayTasks.length > 0) {
        await notifyTodayTasks(todayTasks);
      }

      if (s.weeklyDigestEnabled) {
        await maybeFireWeeklyDigest(tasks);
      }
    })();
  }, [adapterReady]);

  if (!adapterReady || loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--color-primary)',
      }}>
        <div style={{ fontSize: '3rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🌱</div>
        <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/share/:data" element={<ShareView />} />
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
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/planner"  element={<Planner />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/seeds"    element={<Seeds />} />
                  <Route path="/log"      element={<ActivityLog />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/seasons"  element={<Seasons />} />
                  <Route path="*"         element={<Navigate to="/dashboard" replace />} />
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
