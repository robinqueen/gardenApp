import { useState } from 'react';
import { SEED_CATALOG } from '../catalog/seeds';
import type { Bed, CatalogSeed, PlantStage } from '../types';
import { blockSizeLabel, buildSlot } from '../utils/spacingCalc';
import { sunCompatibilityWarning, SUN_ICONS } from '../utils/sunWarnings';
import { toIsoDate } from '../catalog/frostDates';

interface PlantPickerProps {
  cellX: number;
  cellY: number;
  bed: Bed;
  onPlace: (slot: ReturnType<typeof buildSlot>) => void;
  onCancel: () => void;
}

// ─── Stage metadata ───────────────────────────────────────────

interface StageOption {
  value: PlantStage;
  label: string;
  icon: string;
  hint: string;
  needsDate: boolean;
  dateLabel?: string;
}

const STAGE_OPTIONS: StageOption[] = [
  {
    value: 'planned',
    label: 'Not started yet',
    icon: '📋',
    hint: 'Seeds not started — tasks scheduled from frost dates.',
    needsDate: false,
  },
  {
    value: 'seeds-started',
    label: 'Seeds in tray',
    icon: '🌱',
    hint: 'Already started indoors — transplant tasks calculated from start date.',
    needsDate: true,
    dateLabel: 'Date seeds were started',
  },
  {
    value: 'ready-to-transplant',
    label: 'Ready to transplant',
    icon: '🪴',
    hint: 'Hardened off and ready to go in the ground.',
    needsDate: false,
  },
  {
    value: 'direct-sow',
    label: 'Will direct sow',
    icon: '🌾',
    hint: 'Will sow directly at the frost-relative date.',
    needsDate: false,
  },
  {
    value: 'in-ground',
    label: 'Already in ground',
    icon: '🌿',
    hint: 'Already transplanted — only monitoring and harvest tasks generated.',
    needsDate: true,
    dateLabel: 'Date planted / transplanted',
  },
  {
    value: 'store-bought',
    label: 'Store-bought starter',
    icon: '🏪',
    hint: 'Purchased as a started plant — tasks from planting date.',
    needsDate: true,
    dateLabel: 'Date planted',
  },
];

// IDs of seeds already in this bed
function plantedIds(bed: Bed): string[] {
  return [...new Set(bed.slots.map((s) => s.plantId))];
}

export function PlantPicker({ cellX, cellY, bed, onPlace, onCancel }: PlantPickerProps) {
  const [query, setQuery]           = useState('');
  const [selected, setSelected]     = useState<CatalogSeed | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [stage, setStage]           = useState<PlantStage>('planned');
  const [stageDate, setStageDate]   = useState(toIsoDate(new Date()));

  const alreadyPlanted = plantedIds(bed);

  const filtered = SEED_CATALOG.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.family.toLowerCase().includes(query.toLowerCase())
  );

  function companionStatus(seed: CatalogSeed): 'good' | 'bad' | 'neutral' {
    const isGood = alreadyPlanted.some((id) => seed.companionsWith.includes(id));
    const isBad  = alreadyPlanted.some((id) => seed.antagonistsWith.includes(id));
    if (isBad)  return 'bad';
    if (isGood) return 'good';
    return 'neutral';
  }

  const sunWarning       = selected ? sunCompatibilityWarning(selected, bed) : null;
  const selectedCompanion = selected ? companionStatus(selected) : 'neutral';

  // Only show stage options relevant to this seed's capabilities
  function availableStages(seed: CatalogSeed): StageOption[] {
    return STAGE_OPTIONS.filter((opt) => {
      if (opt.value === 'seeds-started' && !seed.canStartIndoors) return false;
      if (opt.value === 'ready-to-transplant' && !seed.canStartIndoors) return false;
      if (opt.value === 'direct-sow' && !seed.canDirectSow) return false;
      return true;
    });
  }

  const stageOpts = selected ? availableStages(selected) : [];
  const stageMeta = STAGE_OPTIONS.find((o) => o.value === stage)!;

  function handlePlace() {
    if (!selected) return;
    const resolvedDate = stageMeta.needsDate ? stageDate : undefined;
    onPlace(buildSlot(selected, cellX, cellY, weekOffset, stage, resolvedDate));
  }

  // Reset stage to sensible default when switching plants
  function handleSelectSeed(seed: CatalogSeed) {
    setSelected(seed);
    // Default: planned for indoor-capable plants, direct-sow for others
    setStage(seed.canStartIndoors ? 'planned' : 'direct-sow');
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">
          {selected ? `Place: ${selected.icon} ${selected.name}` : 'Choose a plant'}
        </div>

        {selected ? (
          <>
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

            {/* ── Plant Stage ─────────────────────────────────── */}
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Where is this plant right now?</label>
              <div className="stage-grid">
                {stageOpts.map((opt) => (
                  <button
                    key={opt.value}
                    className={`stage-btn${stage === opt.value ? ' selected' : ''}`}
                    onClick={() => setStage(opt.value)}
                    type="button"
                  >
                    <span className="stage-icon">{opt.icon}</span>
                    <span className="stage-label">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="form-hint">{stageMeta.hint}</p>
            </div>

            {/* Date input when stage requires one */}
            {stageMeta.needsDate && (
              <div className="form-group">
                <label className="form-label">{stageMeta.dateLabel}</label>
                <input
                  type="date"
                  className="form-input"
                  value={stageDate}
                  onChange={(e) => setStageDate(e.target.value)}
                />
              </div>
            )}

            {/* Succession offset */}
            {selected.successionIntervalDays > 0 && (
              <div className="form-group">
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

            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {SUN_ICONS[bed.sunExposure ?? 'full-sun']} Bed: {(bed.sunExposure ?? 'full-sun').replace('-', ' ')}
              {alreadyPlanted.length > 0 && ' · 💚 = good neighbour · 💔 = bad neighbour'}
            </div>

            <div className="modal-scroll">
              <div className="picker-grid">
                {[
                  ...filtered.filter((s) => companionStatus(s) === 'good'),
                  ...filtered.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds === bed.sunExposure),
                  ...filtered.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds !== bed.sunExposure),
                  ...filtered.filter((s) => companionStatus(s) === 'bad'),
                ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
                .map((seed) => {
                  const warn   = sunCompatibilityWarning(seed, bed);
                  const status = companionStatus(seed);
                  return (
                    <button
                      key={seed.id}
                      className={`picker-item${warn ? ' picker-mismatch' : ''}${status === 'good' ? ' picker-companion' : ''}${status === 'bad' ? ' picker-antagonist' : ''}`}
                      onClick={() => handleSelectSeed(seed)}
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
