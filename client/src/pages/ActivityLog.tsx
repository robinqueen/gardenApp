import { useState } from 'react';
import { useGardenStore } from '../store/useGardenStore';
import type { ActivityType } from '../types';
import { toIsoDate, parseIsoDate } from '../catalog/frostDates';

interface ActivityOption {
  type: ActivityType;
  icon: string;
  label: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { type: 'watered', icon: '💧', label: 'Watered' },
  { type: 'fertilized', icon: '🌿', label: 'Fertilized' },
  { type: 'seeded', icon: '🌱', label: 'Seeded' },
  { type: 'transplanted', icon: '🪴', label: 'Transplanted' },
  { type: 'trimmed', icon: '✂️', label: 'Trimmed' },
  { type: 'observed', icon: '🔍', label: 'Observed' },
  { type: 'harvested', icon: '🧺', label: 'Harvested' },
];

export function ActivityLog() {
  const { activityLogs, garden, logActivity, deleteActivityLog } = useGardenStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'watered' as ActivityType,
    date: toIsoDate(new Date()),
    bedId: '',
    note: '',
  });

  const beds = garden?.beds ?? [];

  async function handleSubmit() {
    await logActivity({
      type: form.type,
      date: form.date,
      bedId: form.bedId || undefined,
      note: form.note,
    });
    setForm({ type: 'watered', date: toIsoDate(new Date()), bedId: '', note: '' });
    setShowForm(false);
  }

  // Group logs by date
  const grouped = activityLogs.reduce<Record<string, typeof activityLogs>>((acc, log) => {
    (acc[log.date] = acc[log.date] || []).push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Activity Log</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          + Log
        </button>
      </div>

      {activityLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No activity yet</h3>
          <p>Log watering, fertilizing, observations, and more to track your garden over time.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Log First Activity
          </button>
        </div>
      ) : (
        sortedDates.map((date) => {
          const displayDate = parseIsoDate(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });
          return (
            <div key={date} className="page-section">
              <div className="section-label">{displayDate}</div>
              {grouped[date].map((log) => {
                const opt = ACTIVITY_OPTIONS.find((o) => o.type === log.type);
                const bed = beds.find((b) => b.id === log.bedId);
                return (
                  <div key={log.id} className="log-entry">
                    <span className="log-icon">{opt?.icon ?? '📝'}</span>
                    <div className="log-content">
                      <div className="log-header">
                        <span className="log-type">{opt?.label ?? log.type}</span>
                        {bed && <span className="log-bed">{bed.name}</span>}
                      </div>
                      {log.note && <div className="log-note">{log.note}</div>}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => void deleteActivityLog(log.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Log form sheet */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Log Activity</div>

            <div className="form-group">
              <label className="form-label">What did you do?</label>
              <div className="activity-type-grid">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    className={`activity-type-btn${form.type === opt.type ? ' selected' : ''}`}
                    onClick={() => setForm({ ...form, type: opt.type })}
                  >
                    <span className="at-icon">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {beds.length > 0 && (
              <div className="form-group">
                <label className="form-label">Bed (optional)</label>
                <select
                  className="form-select"
                  value={form.bedId}
                  onChange={(e) => setForm({ ...form, bedId: e.target.value })}
                >
                  <option value="">All / General</option>
                  {beds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Observations, issues noticed, quantities used…"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-full" onClick={handleSubmit}>
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
