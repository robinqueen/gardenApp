import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SEED_CATALOG, SEED_CATEGORIES } from '../catalog/seeds';
import type { Bed, CatalogSeed, PlantStage } from '../types';
import { blockSizeLabel, buildSlot } from '../utils/spacingCalc';
import { sunCompatibilityWarning, SUN_ICONS } from '../utils/sunWarnings';
import { toIsoDate } from '../catalog/frostDates';
import { useGardenStore } from '../store/useGardenStore';
import { trackPlantAdded, trackPlantRemoved, trackSeedTrayPlantAdded } from '../utils/analytics';
import { PlantIcon } from './PlantIcon';

interface PlantPickerProps {
  cellX: number;
  cellY: number;
  bed: Bed;
  onPlace: (slot: ReturnType<typeof buildSlot>) => void;
  onCancel: () => void;
  /** If provided, opens directly in edit/view mode for an existing slot. */
  editingSlot?: import('../types').PlantSlot;
  /** Called when the user removes the plant in edit mode. */
  onRemove?: () => void;
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

// ─── Custom seed blank template ───────────────────────────────

function blankCustomSeed(): CatalogSeed {
  return {
    id: `custom-${uuidv4()}`,
    name: '',
    category: 'Custom',
    family: '',
    icon: '🌿',
    indoorStartWeeks: 6,
    directSowWeeks: 0,
    canDirectSow: true,
    canStartIndoors: true,
    spacingInches: 12,
    rowSpacingInches: 12,
    daysToMaturity: 60,
    needsTrellis: false,
    needsSupport: false,
    sunNeeds: 'full-sun',
    heightCategory: 'medium',
    companionsWith: [],
    antagonistsWith: [],
    successionIntervalDays: 0,
    notes: '',
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function plantedIds(bed: Bed): string[] {
  return [...new Set(bed.slots.map((s) => s.plantId))];
}

// ─── Component ────────────────────────────────────────────────

export function PlantPicker({ cellX, cellY, bed, onPlace, onCancel, editingSlot, onRemove }: PlantPickerProps) {
  const customSeeds   = useGardenStore((s) => s.customSeeds);
  const addCustomSeed = useGardenStore((s) => s.addCustomSeed);
  const delCustomSeed = useGardenStore((s) => s.deleteCustomSeed);

  const isEditing = !!editingSlot;

  const [query, setQuery]           = useState('');
  // When editing, pre-select the existing plant from the slot
  const [selected, setSelected]     = useState<CatalogSeed | null>(() => {
    if (!editingSlot) return null;
    return [...SEED_CATALOG, ...customSeeds].find((s) => s.id === editingSlot.plantId) ?? null;
  });
  const [weekOffset, setWeekOffset] = useState(editingSlot?.weekOffset ?? 0);
  const [stage, setStage]           = useState<PlantStage>(() => editingSlot?.stage ?? 'planned');
  const [stageDate, setStageDate]   = useState(editingSlot?.stageDate ?? toIsoDate(new Date()));

  // View: 'browse' | 'add-custom'
  const [view, setView] = useState<'browse' | 'add-custom'>('browse');
  const [customDraft, setCustomDraft] = useState<CatalogSeed>(blankCustomSeed);
  const [customSaving, setCustomSaving] = useState(false);

  const alreadyPlanted = plantedIds(bed);

  // Combined catalog: built-in + user custom
  const allSeeds: CatalogSeed[] = [...SEED_CATALOG, ...customSeeds];

  // All categories in display order, plus any extra custom categories
  const customCategoryNames = [...new Set(customSeeds.map((s) => s.category))].filter(
    (c) => !SEED_CATEGORIES.includes(c)
  );
  const allCategories = [...SEED_CATEGORIES, ...customCategoryNames];

  function companionStatus(seed: CatalogSeed): 'good' | 'bad' | 'neutral' {
    const isGood = alreadyPlanted.some((id) => seed.companionsWith.includes(id));
    const isBad  = alreadyPlanted.some((id) => seed.antagonistsWith.includes(id));
    if (isBad)  return 'bad';
    if (isGood) return 'good';
    return 'neutral';
  }

  // Filter logic: match query against name, category, family, notes
  const queryLc = query.toLowerCase();
  const filtered = queryLc
    ? allSeeds.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLc) ||
          s.category.toLowerCase().includes(queryLc) ||
          s.family.toLowerCase().includes(queryLc) ||
          s.notes.toLowerCase().includes(queryLc)
      )
    : allSeeds;

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
  const sunWarning        = selected ? sunCompatibilityWarning(selected, bed) : null;
  const selectedCompanion = selected ? companionStatus(selected) : 'neutral';

  function handlePlace() {
    if (!selected) return;
    const resolvedDate = stageMeta.needsDate ? stageDate : undefined;
    onPlace(buildSlot(selected, cellX, cellY, weekOffset, stage, resolvedDate));
    if (stage === 'seeds-started') {
      trackSeedTrayPlantAdded(selected.name, selected.category ?? 'Unknown', bed.id);
    } else {
      trackPlantAdded(selected.name, selected.category ?? 'Unknown', bed.id, stage);
    }
  }

  function handleSelectSeed(seed: CatalogSeed) {
    setSelected(seed);
    setStage(seed.canStartIndoors ? 'planned' : 'direct-sow');
  }

  async function handleSaveCustom() {
    if (!customDraft.name.trim()) return;
    setCustomSaving(true);
    await addCustomSeed({ ...customDraft, name: customDraft.name.trim() });
    setCustomSaving(false);
    setView('browse');
    setCustomDraft(blankCustomSeed());
  }

  // ── Add-custom view ──────────────────────────────────────────
  if (view === 'add-custom') {
    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">Add Custom Variety</div>
          <div className="modal-scroll">

            <div className="form-group">
              <label className="form-label">Variety name *</label>
              <input
                className="form-input"
                placeholder="e.g. Mortgage Lifter"
                value={customDraft.name}
                onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  placeholder="e.g. Tomato"
                  value={customDraft.category}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, category: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Icon (emoji)</label>
                <input
                  className="form-input"
                  placeholder="🌿"
                  value={customDraft.icon}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, icon: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Family / type</label>
                <input
                  className="form-input"
                  placeholder="e.g. Solanaceae"
                  value={customDraft.family}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, family: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Days to maturity</label>
                <input
                  type="number"
                  className="form-input"
                  value={customDraft.daysToMaturity}
                  min={1}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, daysToMaturity: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Spacing (inches)</label>
                <input
                  type="number"
                  className="form-input"
                  value={customDraft.spacingInches}
                  min={1}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, spacingInches: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sun needs</label>
                <select
                  className="form-select"
                  value={customDraft.sunNeeds}
                  onChange={(e) =>
                    setCustomDraft((d) => ({
                      ...d,
                      sunNeeds: e.target.value as CatalogSeed['sunNeeds'],
                    }))
                  }
                >
                  <option value="full-sun">Full sun</option>
                  <option value="partial-sun">Partial sun</option>
                  <option value="shade">Shade</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Indoor start (wks before frost)</label>
                <input
                  type="number"
                  className="form-input"
                  value={customDraft.indoorStartWeeks}
                  min={0}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, indoorStartWeeks: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Direct sow (wks from frost)</label>
                <input
                  type="number"
                  className="form-input"
                  value={customDraft.directSowWeeks}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, directSowWeeks: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Can start indoors / direct sow</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customDraft.canStartIndoors}
                    onChange={(e) => setCustomDraft((d) => ({ ...d, canStartIndoors: e.target.checked }))}
                  />
                  Indoors
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customDraft.canDirectSow}
                    onChange={(e) => setCustomDraft((d) => ({ ...d, canDirectSow: e.target.checked }))}
                  />
                  Direct sow
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Optional growing tips, source, etc."
                value={customDraft.notes}
                onChange={(e) => setCustomDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={() => setView('browse')}>
              ← Cancel
            </button>
            <button
              className="btn btn-primary btn-full"
              onClick={() => void handleSaveCustom()}
              disabled={customSaving || !customDraft.name.trim()}
            >
              {customSaving ? 'Saving…' : 'Save Variety'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail / place view ──────────────────────────────────────
  if (selected) {
    const isCustom = customSeeds.some((c) => c.id === selected.id);
    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">
            <PlantIcon seed={selected} /> {selected.name}
            <span className="picker-category-badge">{selected.category}</span>
          </div>

          {sunWarning && (
            <div className="alert alert-warn" style={{ marginBottom: '0.75rem' }}>
              {sunWarning}
            </div>
          )}

          <div className="slot-detail">
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
            {selected.spacingInches >= 24 && (
              <div className="slot-detail-row">
                <span>Real space needed</span>
                <span style={{ color: '#b45309' }}>
                  📐 ~{(selected.spacingInches / 12).toFixed(1).replace(/\.0$/, '')}×{(selected.rowSpacingInches / 12).toFixed(1).replace(/\.0$/, '')} ft — plan for sprawl or trellis
                </span>
              </div>
            )}
            <div className="slot-detail-row">
              <span>Days to harvest</span>
              <span>~{selected.daysToMaturity} days</span>
            </div>
            {selected.family && (
              <div className="slot-detail-row">
                <span>Family</span>
                <span>{selected.family}</span>
              </div>
            )}
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
            {selected.notes && (
              <div className="slot-detail-row" style={{ flexDirection: 'column', gap: '0.2rem' }}>
                <span>Notes</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{selected.notes}</span>
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
            <button className="btn btn-ghost" onClick={isEditing ? onCancel : () => setSelected(null)}>
              ← Back
            </button>
            {isEditing && onRemove && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (selected) trackPlantRemoved(selected.name, bed.id);
                  onRemove();
                }}
              >
                Remove
              </button>
            )}
            {!isEditing && isCustom && (
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--color-danger)' }}
                onClick={() => {
                  void delCustomSeed(selected.id);
                  setSelected(null);
                }}
              >
                Delete
              </button>
            )}
            <button className="btn btn-primary btn-full" onClick={handlePlace}>
              <PlantIcon seed={selected} />{' '}{isEditing ? `Update ${selected.name}` : `Place ${selected.name} here`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Browse view ──────────────────────────────────────────────

  // Group filtered results by category
  const byCategory = new Map<string, CatalogSeed[]>();
  for (const seed of filtered) {
    const cat = seed.category ?? 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(seed);
  }

  // Sort seeds within each category: companions first, then by sun match, then antagonists last
  for (const [cat, seeds] of byCategory) {
    byCategory.set(cat, [
      ...seeds.filter((s) => companionStatus(s) === 'good'),
      ...seeds.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds === bed.sunExposure),
      ...seeds.filter((s) => companionStatus(s) === 'neutral' && s.sunNeeds !== bed.sunExposure),
      ...seeds.filter((s) => companionStatus(s) === 'bad'),
    ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i));
  }

  // Display categories in canonical order (built-in first, then custom)
  const displayCategories = allCategories.filter((c) => byCategory.has(c));
  // Also show any leftover categories not in allCategories (edge case)
  for (const cat of byCategory.keys()) {
    if (!displayCategories.includes(cat)) displayCategories.push(cat);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Choose a plant</div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="form-input"
            placeholder="Search varieties, categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {SUN_ICONS[bed.sunExposure ?? 'full-sun']} Bed: {(bed.sunExposure ?? 'full-sun').replace('-', ' ')}
            {alreadyPlanted.length > 0 && ' · 💚 companion · 💔 conflict'}
          </span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
            onClick={() => { setCustomDraft(blankCustomSeed()); setView('add-custom'); }}
          >
            + Add custom
          </button>
        </div>

        <div className="modal-scroll">
          {displayCategories.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>
              No varieties match "{query}"
            </p>
          )}

          {displayCategories.map((category) => {
            const seeds = byCategory.get(category)!;
            return (
              <div key={category} className="picker-category-group">
                <div className="picker-category-header">
                  <span>{category}</span>
                  <span className="picker-category-count">{seeds.length}</span>
                </div>
                <div className="picker-grid">
                  {seeds.map((seed) => {
                    const warn   = sunCompatibilityWarning(seed, bed);
                    const status = companionStatus(seed);
                    const isCustom = customSeeds.some((c) => c.id === seed.id);
                    return (
                      <button
                        key={seed.id}
                        className={[
                          'picker-item',
                          warn                  ? 'picker-mismatch'   : '',
                          status === 'good'     ? 'picker-companion'  : '',
                          status === 'bad'      ? 'picker-antagonist' : '',
                          isCustom              ? 'picker-custom'     : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleSelectSeed(seed)}
                      >
                        <div className="p-icon"><PlantIcon seed={seed} /></div>
                        <div className="p-name">{seed.name}</div>
                        <div className="p-meta">{seed.daysToMaturity}d</div>
                        {status === 'good' && <div className="p-companion">💚</div>}
                        {status === 'bad'  && <div className="p-companion">💔</div>}
                        {warn && status !== 'bad' && <div className="p-warn">⚠️</div>}
                        {isCustom && <div className="p-custom-badge">✎</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
