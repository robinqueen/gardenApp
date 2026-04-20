import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { getFrostDateObjects, formatDate } from '../catalog/frostDates';
import type { ExportBundle } from '../types';
import { buildShareUrl } from '../utils/shareLink';
import {
  notificationsSupported,
  requestNotificationPermission,
  getNotificationPermission,
  notifyTodayTasks,
} from '../utils/notifications';
import { getHouseholdId, setHouseholdId, generateNewHouseholdId } from '../utils/household';
import { clearAdapterCache, AUTH_ENABLED } from '../adapters';
import { RemoteAdapter } from '../adapters/RemoteAdapter';
import { trackShareLinkCreated } from '../utils/analytics';
import { useAuth } from '../context/AuthContext';

const APP_VERSION = __APP_VERSION__;

export function Settings() {
  const navigate = useNavigate();
  const { settings, saveSettings, exportToFile, importFromFile, garden, resetAll, adapter } = useGardenStore();
  const { user } = AUTH_ENABLED ? useAuth() : { user: null };
  const isUsingRemote = adapter instanceof RemoteAdapter;

  const [form, setForm] = useState({
    zipcode: settings.zipcode,
    lastFrostDate: settings.lastFrostDate ?? '',
    firstFallFrostDate: settings.firstFallFrostDate ?? '',
    apiBaseUrl: settings.apiBaseUrl,
  });
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  // Household state
  const [currentHouseholdId, setCurrentHouseholdId] = useState(getHouseholdId);
  const [joinCode, setJoinCode] = useState('');
  const [householdCopied, setHouseholdCopied] = useState(false);
  const [householdMsg, setHouseholdMsg] = useState<string | null>(null);

  const derived = form.zipcode.length >= 3 ? getFrostDateObjects(form.zipcode) : null;

  async function handleSave() {
    await saveSettings({
      ...settings,
      ...form,
      lastFrostDate: form.lastFrostDate || null,
      firstFallFrostDate: form.firstFallFrostDate || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as ExportBundle;
      await importFromFile(bundle);
      alert('Import successful! Your data has been restored.');
    } catch (err) {
      setImportError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleGenerateShare() {
    if (!garden) return;
    const url = buildShareUrl(garden, settings);
    setShareUrl(url);
    trackShareLinkCreated();
  }

  async function handleCopyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleEnableNotifications() {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      await saveSettings({ ...settings, notificationsEnabled: true });
    }
  }

  async function handleDisableNotifications() {
    await saveSettings({ ...settings, notificationsEnabled: false, weeklyDigestEnabled: false });
  }

  async function handleToggleWeeklyDigest() {
    await saveSettings({ ...settings, weeklyDigestEnabled: !settings.weeklyDigestEnabled });
  }

  async function handleTestNotification() {
    // Fire a test today-tasks notification with dummy data
    await notifyTodayTasks([{
      id: 'test',
      title: 'Test notification',
      description: 'My Living Garden notifications are working!',
      date: new Date().toISOString().slice(0, 10),
      type: 'custom',
    }]);
  }

  // ── Reset handler ──────────────────────────────────────────

  async function handleResetAll() {
    const confirmed = confirm(
      'Reset everything?\n\n' +
      'This will permanently delete:\n' +
      '• All garden beds and plantings\n' +
      '• All tasks and activity logs\n' +
      '• Your seed inventory\n' +
      '• All season archives\n\n' +
      'Your settings (zipcode, frost dates, API URL) will be cleared too.\n\n' +
      'TIP: Export a backup first if you want to save your data.\n\n' +
      'Type OK to confirm — this cannot be undone.'
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      await resetAll();
      navigate('/setup');
    } finally {
      setResetting(false);
    }
  }

  // ── Household handlers ─────────────────────────────────────

  async function handleCopyHouseholdCode() {
    await navigator.clipboard.writeText(currentHouseholdId);
    setHouseholdCopied(true);
    setTimeout(() => setHouseholdCopied(false), 2000);
  }

  function handleGenerateNewCode() {
    if (!confirm(
      'Generate a new household code?\n\n' +
      'Any devices on your current code will no longer sync until they join the new code.'
    )) return;
    const id = generateNewHouseholdId();
    setCurrentHouseholdId(id);
    clearAdapterCache();
    setHouseholdMsg('New code generated. The app will reload to connect to your new household.');
    setTimeout(() => window.location.reload(), 1800);
  }

  function handleJoinHousehold() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setHouseholdMsg('Please enter a valid household code (at least 4 characters).');
      return;
    }
    setHouseholdId(code);
    setCurrentHouseholdId(code);
    clearAdapterCache();
    setJoinCode('');
    setHouseholdMsg(`Joined household "${code}". Reloading to sync data…`);
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      {/* Location & Frost */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Location & Frost Dates</div>
        </div>

        <div className="form-group">
          <label className="form-label">Zip Code</label>
          <input
            className="form-input"
            value={form.zipcode}
            onChange={(e) => setForm({ ...form, zipcode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            inputMode="numeric"
            maxLength={5}
          />
        </div>

        {derived && (
          <div className="frost-display" style={{ marginBottom: '1rem' }}>
            <div className="frost-box">
              <div className="frost-label">Derived Last Frost</div>
              <div className="frost-date">{formatDate(derived.lastFrost)}</div>
            </div>
            <div className="frost-box">
              <div className="frost-label">Derived First Frost</div>
              <div className="frost-date">{formatDate(derived.firstFrost)}</div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Override last spring frost</label>
          <input
            type="date"
            className="form-input"
            value={form.lastFrostDate}
            onChange={(e) => setForm({ ...form, lastFrostDate: e.target.value })}
          />
          <p className="form-hint">Leave blank to use the zip-based estimate.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Override first fall frost</label>
          <input
            type="date"
            className="form-input"
            value={form.firstFallFrostDate}
            onChange={(e) => setForm({ ...form, firstFallFrostDate: e.target.value })}
          />
        </div>
      </div>

      {/* Notifications */}
      {notificationsSupported() && (
        <div className="card page-section">
          <div className="card-header">
            <div className="card-title">Notifications</div>
          </div>

          {notifPermission === 'denied' ? (
            <div className="alert alert-warn">
              Notifications are blocked in your browser. Enable them in your browser settings to use this feature.
            </div>
          ) : !settings.notificationsEnabled ? (
            <>
              <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                Get reminders when garden tasks are due. No account or server needed — notifications are local to this device.
              </p>
              <button className="btn btn-secondary btn-full" onClick={() => void handleEnableNotifications()}>
                🔔 Enable Notifications
              </button>
            </>
          ) : (
            <>
              <div className="alert alert-info" style={{ marginBottom: '0.75rem' }}>
                ✅ Notifications enabled — you'll be reminded about tasks due today when you open the app.
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.weeklyDigestEnabled ?? false}
                    onChange={() => void handleToggleWeeklyDigest()}
                  />
                  Weekly digest (Sunday evenings)
                </label>
                <p className="form-hint">A summary of tasks coming up in the next 7 days.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => void handleTestNotification()}>
                  Test notification
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => void handleDisableNotifications()}>
                  Disable
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Account & Plan — auth mode, cloud sync users only */}
      {AUTH_ENABLED && user && isUsingRemote ? (
        <div className="card page-section">
          <div className="card-header">
            <div className="card-title">Account & Plan</div>
          </div>

          {/* Tier badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {(() => {
              const isWhitelisted = isUsingRemote && !user.isAdmin && user.tier !== 'paid';
              const label = user.isAdmin ? '⭐ Admin'
                : user.tier === 'paid' ? '✨ Pro'
                : isWhitelisted ? '🌿 Whitelisted'
                : 'Free';
              const bg = user.isAdmin ? 'var(--color-primary-dark)'
                : user.tier === 'paid' ? 'var(--color-accent)'
                : isWhitelisted ? 'var(--color-primary)'
                : 'var(--color-surface-alt)';
              const color = user.isAdmin || user.tier === 'paid' || isWhitelisted
                ? '#fff'
                : 'var(--color-text-muted)';
              return (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: bg,
                  color,
                  border: '1px solid var(--color-border)',
                }}>
                  {label}
                </span>
              );
            })()}
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {user.email}
            </span>
          </div>

          {/* Sync info */}
          <div className="alert alert-info" style={{ marginBottom: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>☁️ Cloud sync active</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Your data syncs to <code>{window.location.origin}/api</code>
            </div>
          </div>
        </div>
      ) : !isUsingRemote ? (
        /* Anyone on local storage: self-hosted, not signed in, or free tier */
        <div className="card page-section">
          <div className="card-header">
            <div className="card-title">Backend (Optional)</div>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
            Leave blank to store everything locally in this browser. Set to your own API server
            address to sync across devices — auto-detected on next app load.
          </p>
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input
              className="form-input"
              placeholder="http://192.168.1.100:5000"
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
            />
          </div>
          <div className="alert alert-info">
            Currently using:{' '}
            <strong>Local storage (this device)</strong>
          </div>
        </div>
      ) : null}

      <button
        className={`btn btn-full${saved ? ' btn-secondary' : ' btn-primary'}`}
        onClick={handleSave}
        style={{ marginBottom: '1.5rem' }}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      {/* Backup & Restore */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Backup & Restore</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          Export downloads a single <code>.json</code> file containing your entire garden —
          beds, plants, tasks, activity logs, and season history. Import restores from
          any prior export.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-full" onClick={exportToFile}>
            ⬇️ Export Backup (JSON)
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing…' : '⬆️ Import from Backup'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />

          {importError && (
            <div className="alert alert-warn">{importError}</div>
          )}
        </div>
      </div>

      {/* Share Garden */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Share Garden</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          Generate a read-only link anyone can open — no account needed. The link
          encodes your current bed layout and plant placements.
        </p>

        {!shareUrl ? (
          <button
            className="btn btn-secondary btn-full"
            onClick={handleGenerateShare}
            disabled={!garden}
          >
            🔗 Generate Share Link
          </button>
        ) : (
          <>
            <div className="share-link-row">
              <input
                className="form-input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
              <button
                className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => void handleCopyShare()}
                style={{ flexShrink: 0 }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {shareUrl.length > 6000 && (
              <div className="alert alert-warn" style={{ marginTop: '0.5rem' }}>
                This link is very long. Some apps may truncate it.
              </div>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShareUrl(null)}
              style={{ marginTop: '0.5rem' }}
            >
              ✕ Clear
            </button>
          </>
        )}
      </div>

      {/* Household / Multi-device Sync — self-hosted only */}
      {!AUTH_ENABLED && <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Household Sync</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          Share your garden data across multiple devices or with a partner.
          Everyone using the same <strong>household code</strong> sees the same garden
          (requires the remote API backend to be configured above).
        </p>

        {/* Current code */}
        <div className="form-group">
          <label className="form-label">Your Household Code</label>
          <div className="household-code-row">
            <span className="household-code">{currentHouseholdId}</span>
            <button
              className={`btn btn-sm ${householdCopied ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => void handleCopyHouseholdCode()}
            >
              {householdCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="form-hint">
            Enter this code on other devices to sync your garden.
          </p>
        </div>

        {/* Join a different household */}
        <div className="form-group">
          <label className="form-label">Join a Different Household</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-input"
              placeholder="Enter household code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={16}
              style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}
            />
            <button
              className="btn btn-primary"
              onClick={handleJoinHousehold}
              disabled={joinCode.trim().length < 4}
              style={{ flexShrink: 0 }}
            >
              Join
            </button>
          </div>
        </div>

        {/* Generate a new code */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleGenerateNewCode}
          style={{ marginBottom: '0.25rem' }}
        >
          🔄 Generate new household code
        </button>

        {householdMsg && (
          <div className="alert alert-info" style={{ marginTop: '0.5rem' }}>
            {householdMsg}
          </div>
        )}
      </div>}

      {/* Season History */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Season History</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Archive and browse past growing seasons — layouts, plant lists, and activity logs.
        </p>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/seasons')}>
          📚 View Season History →
        </button>
      </div>

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/setup')}
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        Re-run Setup Wizard
      </button>

      {/* Help & Resources */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Help &amp; Resources</div>
        </div>
        <div className="about-legal-list">
          <Link to="/tutorial" className="about-legal-row">
            <span>🎓 Interactive App Tutorial</span>
            <span className="about-legal-chevron">›</span>
          </Link>
          <Link to="/guide" className="about-legal-row">
            <span>📖 Garden Planning Guide</span>
            <span className="about-legal-chevron">›</span>
          </Link>
        </div>
      </div>

      {/* About & Legal */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">About My Living Garden</div>
          <div className="text-muted text-sm">v{APP_VERSION} · Early access</div>
        </div>
        <div className="about-legal-list">
          <Link to="/terms" className="about-legal-row">
            <span>📄 Terms of Service</span>
            <span className="about-legal-chevron">›</span>
          </Link>
          <Link to="/privacy" className="about-legal-row">
            <span>🔒 Privacy Policy</span>
            <span className="about-legal-chevron">›</span>
          </Link>
          <Link to="/credits" className="about-legal-row">
            <span>🙏 Credits &amp; Licenses</span>
            <span className="about-legal-chevron">›</span>
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card page-section danger-zone" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title" style={{ color: 'var(--color-danger)' }}>Danger Zone</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          Permanently wipe all garden data and start over from scratch. Export a backup first
          if you want to keep a copy of your data.
        </p>
        <button
          className="btn btn-full"
          style={{ background: 'var(--color-danger)', color: '#fff', opacity: resetting ? 0.6 : 1 }}
          onClick={() => void handleResetAll()}
          disabled={resetting}
        >
          {resetting ? 'Resetting…' : '🗑️ Reset Everything & Start Fresh'}
        </button>
      </div>
    </div>
  );
}
