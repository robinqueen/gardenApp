import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { getFrostDateObjects, formatDate } from '../catalog/frostDates';
import type { ExportBundle } from '../types';

export function Settings() {
  const navigate = useNavigate();
  const { settings, saveSettings, exportToFile, importFromFile } = useGardenStore();

  const [form, setForm] = useState({
    zipcode: settings.zipcode,
    lastFrostDate: settings.lastFrostDate ?? '',
    firstFallFrostDate: settings.firstFallFrostDate ?? '',
    apiBaseUrl: settings.apiBaseUrl,
  });
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {/* Backend */}
      <div className="card page-section">
        <div className="card-header">
          <div className="card-title">Backend (Optional)</div>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
          Leave blank to store everything locally in this browser. Set to your API server
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
          <strong>{settings.storageMode === 'remote' ? 'Remote API' : 'Local storage (browser)'}</strong>
        </div>
      </div>

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
    </div>
  );
}
