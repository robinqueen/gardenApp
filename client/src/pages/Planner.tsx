import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useGardenStore } from '../store/useGardenStore';
import { BedGrid } from '../components/BedGrid';
import { GardenPlot } from '../components/GardenPlot';
import { Garden3DView } from '../components/Garden3DView';
import { SEED_CATALOG } from '../catalog/seeds';
import { NORTH_EDGE_OPTIONS, sunLabel, SUN_ICONS } from '../utils/sunWarnings';
import type { Bed, BedType, SunExposure, NorthEdge, TrellisType, PlotFeature, PlotFeatureType } from '../types';

// ─── Bed Form ─────────────────────────────────────────────────

interface BedFormValues {
  name: string;
  widthVal: string;   // raw number the user types
  lengthVal: string;
  unit: 'ft' | 'in';
  type: BedType;
  sunExposure: SunExposure;
  northEdge: NorthEdge;
  trellisType: TrellisType;
  trellisPartnerId: string;
}

const DEFAULT_BED_FORM: BedFormValues = {
  name: '',
  widthVal: '4',
  lengthVal: '8',
  unit: 'ft',
  type: 'raised',
  sunExposure: 'full-sun',
  northEdge: 'top',
  trellisType: 'none',
  trellisPartnerId: '',
};

/** Convert a user-entered dimension + unit to decimal feet. */
function toFeet(val: string, unit: 'ft' | 'in'): number {
  const n = parseFloat(val) || 0;
  return unit === 'in' ? n / 12 : n;
}

// ─── Plot Feature Form ────────────────────────────────────────

interface FeatureFormValues {
  name: string;
  icon: string;
  type: PlotFeatureType;
  plantedDate: string;
  notes: string;
}

const DEFAULT_FEATURE_FORM: FeatureFormValues = {
  name: '',
  icon: '🌿',
  type: 'perennial-berry',
  plantedDate: '',
  notes: '',
};

const FEATURE_TYPE_OPTIONS: { value: PlotFeatureType; label: string; icon: string }[] = [
  { value: 'perennial-vine',   label: 'Perennial Vine',    icon: '🥝' },
  { value: 'perennial-berry',  label: 'Berry Bush',        icon: '🫐' },
  { value: 'perennial-fruit',  label: 'Fruit Tree/Plant',  icon: '🍓' },
  { value: 'tree',             label: 'Tree',              icon: '🌳' },
  { value: 'shrub',            label: 'Shrub',             icon: '🌿' },
  { value: 'herb-perennial',   label: 'Perennial Herb',    icon: '🌱' },
];

const COMMON_PERENNIALS = [
  { name: 'Kiwi Vine',   icon: '🥝', type: 'perennial-vine'  as PlotFeatureType },
  { name: 'Raspberry',   icon: '🍇', type: 'perennial-berry' as PlotFeatureType },
  { name: 'Blueberry',   icon: '🫐', type: 'perennial-berry' as PlotFeatureType },
  { name: 'Strawberry',  icon: '🍓', type: 'perennial-fruit' as PlotFeatureType },
  { name: 'Blackberry',  icon: '🍇', type: 'perennial-berry' as PlotFeatureType },
  { name: 'Apple Tree',  icon: '🍎', type: 'tree'            as PlotFeatureType },
  { name: 'Pear Tree',   icon: '🍐', type: 'tree'            as PlotFeatureType },
  { name: 'Rhubarb',     icon: '🌿', type: 'perennial-fruit' as PlotFeatureType },
  { name: 'Asparagus',   icon: '🌿', type: 'herb-perennial'  as PlotFeatureType },
  { name: 'Lavender',    icon: '💜', type: 'herb-perennial'  as PlotFeatureType },
];

// ─── View ─────────────────────────────────────────────────────

type PlannerView = 'plot' | 'beds' | '3d';

export function Planner() {
  const navigate = useNavigate();
  const { garden, addBed, updateBed, deleteBed, addPlotFeature, updatePlotFeature, removePlotFeature } = useGardenStore();

  const [view, setView] = useState<PlannerView>('plot');
  const [selectedBedId, setSelectedBedId] = useState<string | null>(
    garden?.beds[0]?.id ?? null
  );

  // ── Bed form ──────────────────────────────────────────────
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [bedForm, setBedForm] = useState<BedFormValues>(DEFAULT_BED_FORM);

  // ── Plot feature form ─────────────────────────────────────
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlotFeature | null>(null);
  const [featureForm, setFeatureForm] = useState<FeatureFormValues>(DEFAULT_FEATURE_FORM);

  function openBedFromPlot(bedId: string) {
    setSelectedBedId(bedId);
    setView('beds');
  }

  const beds = garden?.beds ?? [];
  const plotFeatures = garden?.plotFeatures ?? [];
  const selectedBed = beds.find((b) => b.id === selectedBedId) ?? beds[0] ?? null;

  // ── Bed form handlers ────────────────────────────────────

  function openAddForm() {
    setBedForm(DEFAULT_BED_FORM);
    setEditingBed(null);
    setShowBedForm(true);
  }

  function openEditForm(bed: Bed) {
    // Detect if stored value is likely already in inches (>20 suggests inches)
    const storedW = bed.widthFt;
    const storedL = bed.lengthFt;
    const isLikelyInches = storedW > 20 || storedL > 20;
    setBedForm({
      name: bed.name,
      widthVal:  isLikelyInches ? String(Math.round(storedW * 12)) : String(storedW),
      lengthVal: isLikelyInches ? String(Math.round(storedL * 12)) : String(storedL),
      unit: isLikelyInches ? 'in' : 'ft',
      type: bed.type,
      sunExposure: bed.sunExposure,
      northEdge: bed.northEdge,
      trellisType: bed.trellisType ?? 'none',
      trellisPartnerId: bed.trellisPartnerId ?? '',
    });
    setEditingBed(bed);
    setShowBedForm(true);
  }

  async function handleSaveBed() {
    const wFt = toFeet(bedForm.widthVal, bedForm.unit);
    const lFt = toFeet(bedForm.lengthVal, bedForm.unit);
    const data = {
      name:            bedForm.name.trim(),
      widthFt:         Math.max(0.5, Math.min(40, Math.round(wFt * 100) / 100)),
      lengthFt:        Math.max(0.5, Math.min(40, Math.round(lFt * 100) / 100)),
      type:            bedForm.type,
      sunExposure:     bedForm.sunExposure,
      northEdge:       bedForm.northEdge,
      trellisType:     bedForm.trellisType,
      trellisPartnerId: bedForm.trellisPartnerId || undefined,
    };
    if (!data.name) return;

    if (editingBed) {
      await updateBed({ ...editingBed, ...data });
    } else {
      const newBed: Bed = { id: uuidv4(), ...data, slots: [] };
      await addBed(newBed);
      setSelectedBedId(newBed.id);
    }
    setShowBedForm(false);
    setEditingBed(null);
  }

  async function handleDeleteBed(id: string) {
    if (!confirm('Remove this bed and all its planted slots?')) return;
    await deleteBed(id);
    if (selectedBedId === id) {
      setSelectedBedId(beds.find((b) => b.id !== id)?.id ?? null);
    }
  }

  // ── Feature form handlers ─────────────────────────────────

  function openAddFeature() {
    setFeatureForm(DEFAULT_FEATURE_FORM);
    setEditingFeature(null);
    setShowFeatureForm(true);
  }

  function openEditFeature(feature: PlotFeature) {
    setFeatureForm({
      name:        feature.name,
      icon:        feature.icon,
      type:        feature.type,
      plantedDate: feature.plantedDate ?? '',
      notes:       feature.notes ?? '',
    });
    setEditingFeature(feature);
    setShowFeatureForm(true);
  }

  async function handleSaveFeature() {
    if (!featureForm.name.trim()) return;
    if (editingFeature) {
      await updatePlotFeature({
        ...editingFeature,
        name:        featureForm.name.trim(),
        icon:        featureForm.icon,
        type:        featureForm.type,
        plantedDate: featureForm.plantedDate || undefined,
        notes:       featureForm.notes || undefined,
      });
    } else {
      const feature: PlotFeature = {
        id:          uuidv4(),
        name:        featureForm.name.trim(),
        icon:        featureForm.icon,
        type:        featureForm.type,
        plotX:       2,
        plotY:       2,
        plantedDate: featureForm.plantedDate || undefined,
        notes:       featureForm.notes || undefined,
      };
      await addPlotFeature(feature);
    }
    setShowFeatureForm(false);
    setEditingFeature(null);
  }

  async function handleDeleteFeature(id: string) {
    if (!confirm('Remove this in-ground plant from your garden?')) return;
    await removePlotFeature(id);
  }

  // ── Dimension preview label ────────────────────────────────

  function dimPreview() {
    const w = toFeet(bedForm.widthVal, bedForm.unit);
    const l = toFeet(bedForm.lengthVal, bedForm.unit);
    if (w <= 0 || l <= 0) return null;
    const cols = Math.max(1, Math.round(w));
    const rows = Math.max(1, Math.round(l));
    const sqFt = Math.round(w * l * 10) / 10;
    if (bedForm.unit === 'in') {
      return `${Math.round(w * 12)}" × ${Math.round(l * 12)}" = ${sqFt} sq ft · ${cols}×${rows} planting grid`;
    }
    return `${sqFt} sq ft · ${cols}×${rows} planting grid`;
  }

  if (beds.length === 0 && plotFeatures.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Garden Planner</h1>
        <div className="empty-state">
          <div className="empty-icon">🌿</div>
          <h3>No beds yet</h3>
          <p>Add your first garden bed or in-ground plant to start planning your layout.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAddForm}>+ Add a Bed</button>
            <button className="btn btn-secondary" onClick={openAddFeature}>+ In-Ground Plant</button>
          </div>
        </div>
        {showBedForm && (
          <BedFormSheet form={bedForm} setForm={setBedForm} beds={beds}
            onSave={handleSaveBed} onCancel={() => setShowBedForm(false)} dimPreview={dimPreview()} />
        )}
        {showFeatureForm && (
          <FeatureFormSheet form={featureForm} setForm={setFeatureForm}
            onSave={handleSaveFeature} onCancel={() => setShowFeatureForm(false)}
            isEdit={!!editingFeature} />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Garden Planner</h1>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={openAddFeature} title="Add in-ground plant">🌳</button>
          <button className="btn btn-secondary btn-sm" onClick={openAddForm}>+ Bed</button>
        </div>
      </div>

      {/* View toggle */}
      <div className="view-toggle" style={{ marginBottom: '1rem' }}>
        <button className={`view-toggle-btn${view === 'plot' ? ' active' : ''}`} onClick={() => setView('plot')}>
          🗺️ Plot
        </button>
        <button className={`view-toggle-btn${view === 'beds' ? ' active' : ''}`} onClick={() => setView('beds')}>
          🌿 Beds
        </button>
        <button className={`view-toggle-btn${view === '3d' ? ' active' : ''}`} onClick={() => setView('3d')}>
          🌳 3D
        </button>
      </div>

      {/* ── PLOT VIEW ── */}
      {view === 'plot' && (
        <div className="card">
          <GardenPlot onSelectBed={openBedFromPlot} onEditFeature={openEditFeature} />
        </div>
      )}

      {/* ── 3D VIEW ── */}
      {view === '3d' && (
        <Garden3DView onExit={() => setView('plot')} />
      )}

      {/* ── BEDS VIEW ── */}
      {view === 'beds' && (
        <>
          {/* Bed selector chips */}
          <div className="bed-selector">
            {beds.map((bed) => (
              <button
                key={bed.id}
                className={`bed-chip${bed.id === selectedBed?.id ? ' active' : ''}`}
                onClick={() => setSelectedBedId(bed.id)}
              >
                {SUN_ICONS[bed.sunExposure ?? 'full-sun']} {bed.name}
                {(bed.trellisType && bed.trellisType !== 'none') && (
                  <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem' }}>
                    {bed.trellisType === 'arch' ? '🌿' : '🪝'}
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedBed && (
            <>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{selectedBed.name}</div>
                    <div className="text-muted text-sm">
                      {selectedBed.widthFt !== Math.round(selectedBed.widthFt)
                        ? `${Math.round(selectedBed.widthFt * 12)}" × ${Math.round(selectedBed.lengthFt * 12)}" ·`
                        : `${selectedBed.widthFt} × ${selectedBed.lengthFt} ft ·`}{' '}
                      {Math.round(selectedBed.widthFt * selectedBed.lengthFt)} sq ft ·{' '}
                      {selectedBed.slots.length} planting{selectedBed.slots.length !== 1 ? 's' : ''}
                      {selectedBed.trellisType && selectedBed.trellisType !== 'none' && (
                        <span style={{ marginLeft: '0.4rem' }}>
                          · {selectedBed.trellisType === 'arch' ? '🌿 Arch trellis' : '🪝 Wall trellis'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditForm(selectedBed)} title="Edit">✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => void handleDeleteBed(selectedBed.id)} title="Delete">🗑️</button>
                  </div>
                </div>
                <BedGrid bed={selectedBed} />
              </div>

              {selectedBed.slots.length > 0 && (
                <div className="card">
                  <div className="section-label" style={{ marginBottom: '0.5rem' }}>
                    Planted in {selectedBed.name}
                  </div>
                  {selectedBed.slots.map((slot) => {
                    const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
                    return (
                      <div key={slot.id} className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div>
                          <span style={{ marginRight: '0.4rem' }}>{seed?.icon ?? '?'}</span>
                          <span className="fw-bold">{seed?.name ?? slot.plantId}</span>
                          <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>
                            col {slot.cellX + 1}, row {slot.cellY + 1}
                            {slot.plantsPerSqFt > 1 && ` · ×${slot.plantsPerSqFt} per sq ft`}
                            {slot.weekOffset > 0 && ` · +${slot.weekOffset}w succession`}
                          </span>
                        </div>
                        {seed?.sunNeeds && (
                          <span title={sunLabel(seed.sunNeeds)}>{SUN_ICONS[seed.sunNeeds]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── In-Ground Plants (Plot Features) ── */}
          {plotFeatures.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-header">
                <div className="card-title">In-Ground Plants</div>
                <button className="btn btn-ghost btn-sm" onClick={openAddFeature}>+ Add</button>
              </div>
              {plotFeatures.map((feature) => (
                <div key={feature.id} className="plot-feature-row">
                  <span className="plot-feature-icon">{feature.icon}</span>
                  <div className="plot-feature-info">
                    <div className="plot-feature-name">{feature.name}</div>
                    <div className="plot-feature-meta">
                      {FEATURE_TYPE_OPTIONS.find(o => o.value === feature.type)?.label ?? feature.type}
                      {feature.plantedDate && ` · planted ${feature.plantedDate}`}
                      {feature.notes && ` · ${feature.notes}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditFeature(feature)}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => void handleDeleteFeature(feature.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2">
            <button className="btn btn-secondary btn-full" onClick={() => navigate('/calendar')}>
              📅 View Planting Schedule
            </button>
          </div>
        </>
      )}

      {showBedForm && (
        <BedFormSheet
          form={bedForm}
          setForm={setBedForm}
          beds={beds}
          onSave={handleSaveBed}
          onCancel={() => { setShowBedForm(false); setEditingBed(null); }}
          isEdit={!!editingBed}
          dimPreview={dimPreview()}
        />
      )}

      {showFeatureForm && (
        <FeatureFormSheet
          form={featureForm}
          setForm={setFeatureForm}
          onSave={handleSaveFeature}
          onCancel={() => { setShowFeatureForm(false); setEditingFeature(null); }}
          isEdit={!!editingFeature}
        />
      )}
    </div>
  );
}

// ─── Bed Form Sheet ───────────────────────────────────────────

function BedFormSheet({
  form, setForm, beds, onSave, onCancel, isEdit = false, dimPreview,
}: {
  form: BedFormValues;
  setForm: (f: BedFormValues) => void;
  beds: Bed[];
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  dimPreview: string | null;
}) {
  const otherBeds = beds.filter(() => true); // all beds available as trellis partners

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? 'Edit Bed' : 'Add a Bed'}</div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            placeholder="e.g. Left Raised Bed"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>

        {/* Dimensions with unit toggle */}
        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label">Dimensions</label>
            <div className="unit-toggle">
              <button
                className={`unit-btn${form.unit === 'ft' ? ' active' : ''}`}
                onClick={() => setForm({ ...form, unit: 'ft' })}
              >ft</button>
              <button
                className={`unit-btn${form.unit === 'in' ? ' active' : ''}`}
                onClick={() => setForm({ ...form, unit: 'in' })}
              >in</button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Width ({form.unit})</label>
              <input
                className="form-input"
                type="number"
                min={form.unit === 'in' ? 6 : 0.5}
                max={form.unit === 'in' ? 480 : 40}
                step={form.unit === 'in' ? 1 : 0.5}
                value={form.widthVal}
                onChange={(e) => setForm({ ...form, widthVal: e.target.value })}
                inputMode="decimal"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Length ({form.unit})</label>
              <input
                className="form-input"
                type="number"
                min={form.unit === 'in' ? 6 : 0.5}
                max={form.unit === 'in' ? 480 : 40}
                step={form.unit === 'in' ? 1 : 0.5}
                value={form.lengthVal}
                onChange={(e) => setForm({ ...form, lengthVal: e.target.value })}
                inputMode="decimal"
              />
            </div>
          </div>
          {dimPreview && (
            <p className="form-hint" style={{ marginTop: '0.4rem' }}>{dimPreview}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Bed type</label>
          <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BedType })}>
            <option value="raised">🪵 Raised Bed</option>
            <option value="inground">🌍 In-Ground Plot</option>
            <option value="container">🪴 Container / Large Pot</option>
            <option value="planter-box">📦 Planter Box (rectangular pot)</option>
            <option value="bucket">🪣 Bucket / Small Container</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">☀️ Sun exposure</label>
          <select className="form-select" value={form.sunExposure} onChange={(e) => setForm({ ...form, sunExposure: e.target.value as SunExposure })}>
            <option value="full-sun">☀️ Full Sun (6+ hours/day)</option>
            <option value="partial-sun">⛅ Partial Sun (3–6 hours/day)</option>
            <option value="shade">🌥️ Shade (less than 3 hours/day)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">🧭 Which edge of this bed faces north?</label>
          <select className="form-select" value={form.northEdge} onChange={(e) => setForm({ ...form, northEdge: e.target.value as NorthEdge })}>
            {NORTH_EDGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="form-hint">
            Used to detect when tall plants cast shade over shorter neighbours.
          </p>
        </div>

        {/* Trellis */}
        <div className="form-group">
          <label className="form-label">🌿 Trellis structure</label>
          <select className="form-select" value={form.trellisType} onChange={(e) => setForm({ ...form, trellisType: e.target.value as TrellisType, trellisPartnerId: '' })}>
            <option value="none">None</option>
            <option value="wall">Wall trellis (along one side)</option>
            <option value="arch">Arch trellis (spans overhead, connects to another bed)</option>
          </select>
        </div>

        {form.trellisType === 'arch' && otherBeds.length > 0 && (
          <div className="form-group">
            <label className="form-label">Connected to bed</label>
            <select
              className="form-select"
              value={form.trellisPartnerId}
              onChange={(e) => setForm({ ...form, trellisPartnerId: e.target.value })}
            >
              <option value="">— select partner bed —</option>
              {otherBeds.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="form-hint">The arch runs overhead between this bed and its partner.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={onSave} disabled={!form.name.trim()}>
            {isEdit ? 'Save Changes' : 'Add Bed'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plot Feature Form Sheet ──────────────────────────────────

function FeatureFormSheet({
  form, setForm, onSave, onCancel, isEdit = false,
}: {
  form: FeatureFormValues;
  setForm: (f: FeatureFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? 'Edit Plant' : 'Add In-Ground Plant'}</div>

        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
          For perennials, trees, and berry bushes planted directly in the ground — not in a bed.
          They'll appear as draggable markers on the plot map.
        </p>

        {/* Quick-pick common perennials */}
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Quick pick</label>
            <div className="quick-pick-grid">
              {COMMON_PERENNIALS.map((p) => (
                <button
                  key={p.name}
                  className={`quick-pick-btn${form.name === p.name ? ' active' : ''}`}
                  onClick={() => setForm({ ...form, name: p.name, icon: p.icon, type: p.type })}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Name</label>
            <input
              className="form-input"
              placeholder="e.g. Raspberry patch"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ width: '5rem', flexShrink: 0 }}>
            <label className="form-label">Icon</label>
            <input
              className="form-input"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              style={{ textAlign: 'center', fontSize: '1.5rem', padding: '0.2rem' }}
              maxLength={4}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Plant type</label>
          <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PlotFeatureType })}>
            {FEATURE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date planted (optional)</label>
          <input
            type="date"
            className="form-input"
            value={form.plantedDate}
            onChange={(e) => setForm({ ...form, plantedDate: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <input
            className="form-input"
            placeholder="e.g. 2 canes planted along fence"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={onSave} disabled={!form.name.trim()}>
            {isEdit ? 'Save Changes' : 'Add to Garden'}
          </button>
        </div>
      </div>
    </div>
  );
}
