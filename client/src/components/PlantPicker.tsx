import { useState } from 'react';
import { SEED_CATALOG } from '../catalog/seeds';
import type { Bed, CatalogSeed } from '../types';
import { blockSizeLabel, buildSlot } from '../utils/spacingCalc';
import { sunCompatibilityWarning, SUN_ICONS } from '../utils/sunWarnings';

interface PlantPickerProps {
  cellX: number;
  cellY: number;
  bed: Bed;
  onPlace: (slot: ReturnType<typeof buildSlot>) => void;
  onCancel: () => void;
}

// IDs of seeds already in this bed
function plantedIds(bed: Bed): string[] {
  return [...new Set(bed.slots.map((s) => s.plantId))];
}

export function PlantPicker({ cellX, cellY, bed, onPlace, onCancel }: PlantPickerProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogSeed | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const alreadyPlanted = plantedIds(bed);

  const filtered = SEED_CATALOG.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.family.toLowerCase().includes(query.toLowerCase())
  );

  // Companion relationship relative to what's already in the bed
  function companionStatus(seed: CatalogSeed): 'good' | 'bad' | 'neutral' {
    const isGood = alreadyPlanted.some((id) => seed.companionsWith.includes(id));
    const isBad  = alreadyPlanted.some((id) => seed.antagonistsWith.includes(id));
    if (isBad)  return 'bad';
    if (isGood) return 'good';
    return 'neutral';
  }

  const sunWarning = selected ? sunCompatibilityWarning(selected, bed) : null;
  const selectedCompanion = selected ? companionStatus(selected) : 'neutral';

  function handlePlace() {
    if (!selected) return;
    onPlace(buildSlot(selected, cellX, cellY, weekOffset));
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">
          {selected ? `Place: ${selected.icon} ${selected.name}` : 'Choose a plant'}
        </div>

        {selected ? (
          // ── Confirm placement ─────────────────────────────
          <>
            {/* Sun compatibility warning */}
            {sunWarning && (
              <div className="alert alert-warn" style={{ marginBottom: '0.75rem' }}>
                {sunWarning}
              </div>
            )}

            <div className="slot-detail">
              <div className="slot-detail-row">
                <span>Plant</span>
                <span>{selected.icon} {selected.name}</span>
              </div>
              <div className="slot-detail-row">
                <span>Sun needs</span>
                <span>{SUN_ICONS[selected.sunNeeds]} {selected.sunNeeds.replace('-', ' ')}</span>
              </div>
              <div className="slot-detail-row">
                <span>This bed</span>
                <span>{SUN_ICONS[bed.sunExposure]} {bed.sunExposure.replace('-', ' ')}</span>
              </div>
              <div className="slot-detail-row">
                <span>Grid footprint</span>
                <span>{blockSizeLabel(selected)}</span>
              </div>
              <div className="slot-detail-row">
                <span>Days to harvest</span>
                <span>~{selected.daysToMaturity} days</span>
              </div>
              {selected.needsSupport && (
                <div className="slot-detail-row">
                  <span>Support needed</span>
                  <span>{selected.needsTrellis ? '🌿 Trellis' : '🪵 Stake/cage'}</span>
                </div>
              )}
              {selected.heightCategory === 'tall' || selected.heightCategory === 'vine' ? (
                <div className="slot-detail-row">
                  <span>Height</span>
                  <span>🌿 {selected.heightCategory === 'tall' ? 'Tall (may cast shade)' : 'Vine'}</span>
                </div>
              ) : null}
              {alreadyPlanted.length > 0 && selectedCompanion !== 'neutral' && (
                <div className="slot-detail-row">
                  <span>Neighbours</span>
                  <span>
                    {selectedCompanion === 'good'
                      ? '💚 Good companion with something in this bed'
                      : '💔 Conflicts with something already planted here'}
                  </span>
                </div>
              )}
            </div>

            {/* Succession offset */}
            {selected.successionIntervalDays > 0 && (
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Succession offset (weeks)</label>
                <select
                  className="form-select"
                  value={weekOffset}
                  onChange={(e) => setWeekOffset(Number(e.target.value))}
                >
                  <option value={0}>On schedule (week 0)</option>
                  <option value={1}>+1 week</option>
                  <option value={2}>+2 weeks</option>
                  <option value={3}>+3 weeks</option>
                  <option value={4}>+4 weeks</option>
                </select>
                <p className="form-hint">
                  Stagger this slot's entire timeline by N weeks for a succession harvest.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                ← Back
              </button>
              <button className="btn btn-primary btn-full" onClick={handlePlace}>
                Place {selected.icon} here
              </button>
            </div>
          </>
        ) : (
          // ── Seed picker ────────────────────────────────────
          <>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                className="form-input"
                placeholder="Search plants…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Bed sun badge */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {SUN_ICONS[bed.sunExposure ?? 'full-sun']} Bed: {(bed.sunExposure ?? 'full-sun').replace('-', ' ')}
              {alreadyPlanted.length > 0 && ' · 💚 = good neighbour · 💔 = bad neighbour'}
            </div>

            <div className="modal-scroll">
              <div className="picker-grid">
                {/* Sort: good companions first, then sun-compatible, then neutral, antagonists last */}
                {[
                  ...filtered.filter((s) => companionStatus(s) === 'good'),
                  ...filtered.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds === bed.sunExposure),
                  ...filtered.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds !== bed.sunExposure),
                  ...filtered.filter((s) => companionStatus(s) === 'bad'),
                ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i) // dedupe
                .map((seed) => {
                  const warn   = sunCompatibilityWarning(seed, bed);
                  const status = companionStatus(seed);
                  return (
                    <button
                      key={seed.id}
                      className={`picker-item${warn ? ' picker-mismatch' : ''}${status === 'good' ? ' picker-companion' : ''}${status === 'bad' ? ' picker-antagonist' : ''}`}
                      onClick={() => setSelected(seed)}
                    >
                      <div className="p-icon">{seed.icon}</div>
                      <div className="p-name">{seed.name}</div>
                      {status === 'good' && <div className="p-companion">💚</div>}
                      {status === 'bad'  && <div className="p-companion">💔</div>}
                      {warn && status !== 'bad' && <div className="p-warn">⚠️</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
