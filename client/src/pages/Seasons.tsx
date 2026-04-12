import { useState, useMemo } from 'react';
import { useGardenStore } from '../store/useGardenStore';
import { SEED_CATALOG } from '../catalog/seeds';
import { BedGrid } from '../components/BedGrid';
import type { GardenSeason, ActivityLog, ActivityType } from '../types';
import { summarizeYieldByCrop } from '../utils/yieldSummary';

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  watered: '💧',
  fertilized: '🌿',
  seeded: '🌱',
  transplanted: '🪴',
  harvested: '🧺',
  observed: '🔍',
  trimmed: '✂️',
};

export function Seasons() {
  const { seasons, garden, archiveCurrentSeason, importSeason } = useGardenStore();
  const [selectedSeason, setSelectedSeason] = useState<GardenSeason | null>(null);
  const [seasonTab, setSeasonTab] = useState<'layout' | 'plants' | 'log'>('layout');
  const [archiveNotes, setArchiveNotes] = useState('');
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [importConfirm, setImportConfirm] = useState<GardenSeason | null>(null);

  async function handleArchive() {
    await archiveCurrentSeason(archiveNotes);
    setArchiveNotes('');
    setShowArchiveForm(false);
  }

  async function handleImport(season: GardenSeason) {
    await importSeason(season);
    setImportConfirm(null);
    setSelectedSeason(null);
  }

  if (selectedSeason) {
    return <SeasonDetail
      season={selectedSeason}
      tab={seasonTab}
      setTab={setSeasonTab}
      onBack={() => setSelectedSeason(null)}
      onImport={() => setImportConfirm(selectedSeason)}
    />;
  }

  return (
    <div className="page">
      <h1 className="page-title">Season History</h1>

      {/* Archive current year */}
      {garden && (
        <div className="card page-section">
          <div className="card-header">
            <div className="card-title">Archive {garden.year} Season</div>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
            Save a snapshot of this year's layout and activity log. You can review it
            next year and import the bed layout as a starting point.
          </p>

          {showArchiveForm ? (
            <>
              <div className="form-group">
                <label className="form-label">Season notes (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="What went well? What would you change? Yield notes…"
                  value={archiveNotes}
                  onChange={(e) => setArchiveNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowArchiveForm(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleArchive}>
                  📦 Archive {garden.year}
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn btn-secondary btn-full"
              onClick={() => setShowArchiveForm(true)}
            >
              📦 Archive {garden.year} Season
            </button>
          )}
        </div>
      )}

      {/* Season list */}
      {seasons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No archived seasons yet</h3>
          <p>Archive your current season at the end of the year to build your garden history.</p>
        </div>
      ) : (
        <>
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>
            {seasons.length} archived season{seasons.length !== 1 ? 's' : ''}
          </div>

          {seasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              onView={() => { setSelectedSeason(season); setSeasonTab('layout'); }}
              onImport={() => setImportConfirm(season)}
            />
          ))}
        </>
      )}

      {/* Import confirmation sheet */}
      {importConfirm && (
        <div className="modal-overlay" onClick={() => setImportConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Import {importConfirm.year} Layout</div>
            <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              This copies the {importConfirm.year} bed configuration — including all plant placements —
              into a new garden for {new Date().getFullYear()}. You can then adjust what to re-plant.
            </p>
            <div className="alert alert-warn" style={{ marginBottom: '1rem' }}>
              This will <strong>replace</strong> your current garden layout.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setImportConfirm(null)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={() => void handleImport(importConfirm)}>
                Import & Replace →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Season Card ──────────────────────────────────────────────

function SeasonCard({
  season,
  onView,
  onImport,
}: {
  season: GardenSeason;
  onView: () => void;
  onImport: () => void;
}) {
  const totalSlots = season.gardenSnapshot.beds.reduce((n, b) => n + b.slots.length, 0);
  const uniquePlants = new Set(
    season.gardenSnapshot.beds.flatMap((b) => b.slots.map((s) => s.plantId))
  );

  return (
    <div className="season-card">
      <div className="season-card-year">{season.year}</div>
      <div className="season-card-body">
        <div className="season-meta">
          {season.gardenSnapshot.beds.length} beds ·{' '}
          {uniquePlants.size} plant type{uniquePlants.size !== 1 ? 's' : ''} ·{' '}
          {totalSlots} placements ·{' '}
          {(season.activitySnapshot ?? []).length} log entries
        </div>
        {season.notes && (
          <div className="season-notes">"{season.notes}"</div>
        )}
        <div className="season-plant-icons">
          {Array.from(uniquePlants).slice(0, 12).map((id) => {
            const seed = SEED_CATALOG.find((s) => s.id === id);
            return seed ? <span key={id} title={seed.name}>{seed.icon}</span> : null;
          })}
          {uniquePlants.size > 12 && <span className="text-muted">+{uniquePlants.size - 12}</span>}
        </div>
      </div>
      <div className="season-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={onView}>View →</button>
        <button className="btn btn-ghost btn-sm" onClick={onImport} title="Import this layout">
          📥
        </button>
      </div>
    </div>
  );
}

// ─── Season Detail ────────────────────────────────────────────

function SeasonDetail({
  season,
  tab,
  setTab,
  onBack,
  onImport,
}: {
  season: GardenSeason;
  tab: 'layout' | 'plants' | 'log';
  setTab: (t: 'layout' | 'plants' | 'log') => void;
  onBack: () => void;
  onImport: () => void;
}) {
  const { garden: currentGarden } = useGardenStore();

  const uniquePlants = Array.from(
    new Set(season.gardenSnapshot.beds.flatMap((b) => b.slots.map((s) => s.plantId)))
  ).map((id) => SEED_CATALOG.find((s) => s.id === id)).filter(Boolean);

  // Group logs by type for quick stats
  const logStats = season.activitySnapshot.reduce<Record<string, number>>((acc, l) => {
    acc[l.type] = (acc[l.type] ?? 0) + 1;
    return acc;
  }, {});

  const seedMap = useMemo(() => {
    const m = new Map<string, import('../catalog/seeds').CatalogSeed>();
    SEED_CATALOG.forEach(s => m.set(s.id, s));
    return m;
  }, []);

  const yieldSummary = useMemo(() =>
    summarizeYieldByCrop(season.activitySnapshot, seedMap, season.gardenSnapshot.beds),
    [season, seedMap]
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{season.year} Season</h1>
      </div>

      {/* Season summary row */}
      <div className="season-summary-bar">
        <div className="season-summary-stat">
          <span className="stat-n">{season.gardenSnapshot.beds.length}</span>
          <span>beds</span>
        </div>
        <div className="season-summary-stat">
          <span className="stat-n">{uniquePlants.length}</span>
          <span>crops</span>
        </div>
        <div className="season-summary-stat">
          <span className="stat-n">{season.activitySnapshot.length}</span>
          <span>logs</span>
        </div>
        <div className="season-summary-stat">
          <span className="stat-n">{logStats['harvested'] ?? 0}</span>
          <span>🧺 harvests</span>
        </div>
      </div>

      {season.notes && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          📝 {season.notes}
        </div>
      )}

      <div className="tabs">
        <button className={`tab${tab === 'layout' ? ' active' : ''}`} onClick={() => setTab('layout')}>
          Layout
        </button>
        <button className={`tab${tab === 'plants' ? ' active' : ''}`} onClick={() => setTab('plants')}>
          Plants ({uniquePlants.length})
        </button>
        <button className={`tab${tab === 'log' ? ' active' : ''}`} onClick={() => setTab('log')}>
          Activity Log ({season.activitySnapshot.length})
        </button>
      </div>

      {/* Layout tab — read-only bed grids */}
      {tab === 'layout' && (
        <>
          {season.gardenSnapshot.beds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌿</div>
              <h3>No beds in this snapshot</h3>
            </div>
          ) : (
            season.gardenSnapshot.beds.map((bed) => (
              <div key={bed.id} className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header">
                  <div className="card-title">{bed.name}</div>
                  <div className="text-muted text-sm">
                    {bed.widthFt}×{bed.lengthFt} ft · {bed.slots.length} placements
                  </div>
                </div>
                <BedGrid bed={bed} readonly />
              </div>
            ))
          )}
        </>
      )}

      {/* Plants tab */}
      {tab === 'plants' && (
        <div className="seed-grid">
          {uniquePlants.map((seed) => {
            if (!seed) return null;
            // Count how many slots used this seed
            const count = season.gardenSnapshot.beds.reduce(
              (n, b) => n + b.slots.filter((s) => s.plantId === seed.id).length,
              0
            );
            return (
              <div key={seed.id} className="seed-card">
                <div className="seed-icon">{seed.icon}</div>
                <div className="seed-name">{seed.name}</div>
                <div className="seed-family">{count} slot{count !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity log tab */}
      {tab === 'log' && (
        <>
          {/* Quick stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {Object.entries(logStats).map(([type, count]) => (
              <span key={type} className="badge badge-gray">
                {ACTIVITY_ICONS[type as ActivityType] ?? '📝'} {count} {type}
              </span>
            ))}
          </div>

          {yieldSummary.length > 0 && (
            <div className="yield-summary-card">
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>🧺 Harvest totals</div>
              {yieldSummary.map((crop) => (
                <div key={crop.plantId} className="yield-row">
                  <span className="yield-icon">{crop.icon}</span>
                  <span className="yield-crop">{crop.cropName}</span>
                  <span className="yield-total">
                    {crop.totalLbs != null && `${crop.totalLbs} lbs`}
                    {crop.totalLbs != null && crop.totalCount != null && ' + '}
                    {crop.totalCount != null && `${crop.totalCount} ${crop.entries[0]?.unit ?? ''}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {season.activitySnapshot.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No activity logged this season</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {season.activitySnapshot.map((log) => (
                <ActivityLogRow key={log.id} log={log} beds={season.gardenSnapshot.beds} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Compare with current garden */}
      {currentGarden && currentGarden.year !== season.year && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Compare with {currentGarden.year}</div>
          </div>
          <ComparisonRow label="Beds" then={season.gardenSnapshot.beds.length} now={currentGarden.beds.length} />
          <ComparisonRow
            label="Plant types"
            then={new Set(season.gardenSnapshot.beds.flatMap((b) => b.slots.map((s) => s.plantId))).size}
            now={new Set(currentGarden.beds.flatMap((b) => b.slots.map((s) => s.plantId))).size}
          />
          <ComparisonRow
            label="Total placements"
            then={season.gardenSnapshot.beds.reduce((n, b) => n + b.slots.length, 0)}
            now={currentGarden.beds.reduce((n, b) => n + b.slots.length, 0)}
          />
        </div>
      )}

      <button
        className="btn btn-secondary btn-full"
        style={{ marginTop: '1.5rem' }}
        onClick={onImport}
      >
        📥 Import {season.year} layout into {new Date().getFullYear()}
      </button>
    </div>
  );
}

function ActivityLogRow({ log, beds }: { log: ActivityLog; beds: Array<{ id: string; name: string }> }) {
  const bed = beds.find((b) => b.id === log.bedId);
  const displayDate = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="log-entry">
      <span className="log-icon">{ACTIVITY_ICONS[log.type as ActivityType] ?? '📝'}</span>
      <div className="log-content">
        <div className="log-header">
          <span className="log-type">{log.type}</span>
          <span className="log-date">{displayDate}</span>
          {bed && <span className="log-bed">{bed.name}</span>}
        </div>
        {log.note && <div className="log-note">{log.note}</div>}
      </div>
    </div>
  );
}

function ComparisonRow({ label, then, now }: { label: string; then: number; now: number }) {
  const diff = now - then;
  return (
    <div className="flex-between" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm">
        <strong>{then}</strong> → <strong>{now}</strong>
        {diff !== 0 && (
          <span style={{ marginLeft: '0.4rem', color: diff > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
            ({diff > 0 ? '+' : ''}{diff})
          </span>
        )}
      </span>
    </div>
  );
}
