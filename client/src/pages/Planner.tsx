import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { BedGrid } from '../components/BedGrid';
import { GardenPlot } from '../components/GardenPlot';
import { Garden3DView } from '../components/Garden3DView';
import { SEED_CATALOG } from '../catalog/seeds';
import { NORTH_EDGE_OPTIONS, sunLabel, SUN_ICONS } from '../utils/sunWarnings';
import type { Bed, BedType, SunExposure, NorthEdge } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ─── Default bed form values ──────────────────────────────────

interface BedFormValues {
  name: string;
  widthFt: string;
  lengthFt: string;
  type: BedType;
  sunExposure: SunExposure;
  northEdge: NorthEdge;
}

const DEFAULT_BED_FORM: BedFormValues = {
  name: '',
  widthFt: '4',
  lengthFt: '8',
  type: 'raised',
  sunExposure: 'full-sun',
  northEdge: 'top',
};

type PlannerView = 'plot' | 'beds' | '3d';

export function Planner() {
  const navigate = useNavigate();
  const { garden, addBed, updateBed, deleteBed } = useGardenStore();

  const [view, setView] = useState<PlannerView>('plot');
  const [selectedBedId, setSelectedBedId] = useState<string | null>(
    garden?.beds[0]?.id ?? null
  );
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [bedForm, setBedForm] = useState<BedFormValues>(DEFAULT_BED_FORM);

  function openBedFromPlot(bedId: string) {
    setSelectedBedId(bedId);
    setView('beds');
  }

  const beds = garden?.beds ?? [];
  const selectedBed = beds.find((b) => b.id === selectedBedId) ?? beds[0] ?? null;

  function openAddForm() {
    setBedForm(DEFAULT_BED_FORM);
    setEditingBed(null);
    setShowBedForm(true);
  }

  function openEditForm(bed: Bed) {
    setBedForm({
      name: bed.name,
      widthFt: String(bed.widthFt),
      lengthFt: String(bed.lengthFt),
      type: bed.type,
      sunExposure: bed.sunExposure,
      northEdge: bed.northEdge,
    });
    setEditingBed(bed);
    setShowBedForm(true);
  }

  async function handleSaveBed() {
    const data = {
      name: bedForm.name.trim(),
      widthFt: Math.max(1, Math.min(20, parseInt(bedForm.widthFt) || 4)),
      lengthFt: Math.max(1, Math.min(20, parseInt(bedForm.lengthFt) || 8)),
      type: bedForm.type,
      sunExposure: bedForm.sunExposure,
      northEdge: bedForm.northEdge,
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

  if (beds.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Garden Planner</h1>
        <div className="empty-state">
          <div className="empty-icon">🌿</div>
          <h3>No beds yet</h3>
          <p>Add your first garden bed to start planning your layout.</p>
          <button className="btn btn-primary" onClick={openAddForm}>+ Add a Bed</button>
        </div>
        {showBedForm && (
          <BedFormSheet
            form={bedForm}
            setForm={setBedForm}
            onSave={handleSaveBed}
            onCancel={() => setShowBedForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Garden Planner</h1>
        <button className="btn btn-secondary btn-sm" onClick={openAddForm}>+ Bed</button>
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
          <GardenPlot onSelectBed={openBedFromPlot} />
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
                      {selectedBed.widthFt}×{selectedBed.lengthFt} ft ·{' '}
                      {selectedBed.widthFt * selectedBed.lengthFt} sq ft ·{' '}
                      {selectedBed.slots.length} planting{selectedBed.slots.length !== 1 ? 's' : ''}
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
                            col {slot.cellX + 1}, row {slot.cellY + 1} ·{' '}
                            {slot.widthCells}×{slot.lengthCells} block
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
          onSave={handleSaveBed}
          onCancel={() => { setShowBedForm(false); setEditingBed(null); }}
          isEdit={!!editingBed}
        />
      )}
    </div>
  );
}

// ─── Bed Form Sheet ───────────────────────────────────────────

function BedFormSheet({
  form,
  setForm,
  onSave,
  onCancel,
  isEdit = false,
}: {
  form: BedFormValues;
  setForm: (f: BedFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const sqFt = (parseInt(form.widthFt) || 0) * (parseInt(form.lengthFt) || 0);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? 'Edit Bed' : 'Add a Bed'}</div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            placeholder="e.g. Front Raised Bed"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Width (ft)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={20}
              value={form.widthFt}
              onChange={(e) => setForm({ ...form, widthFt: e.target.value })}
              inputMode="numeric"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Length (ft)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={20}
              value={form.lengthFt}
              onChange={(e) => setForm({ ...form, lengthFt: e.target.value })}
              inputMode="numeric"
            />
          </div>
        </div>

        {sqFt > 0 && (
          <p className="text-sm text-muted" style={{ marginBottom: '0.75rem', marginTop: '-0.5rem' }}>
            {sqFt} sq ft total ({form.widthFt}×{form.lengthFt} grid of 1-ft cells)
          </p>
        )}

        <div className="form-group">
          <label className="form-label">Bed type</label>
          <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BedType })}>
            <option value="raised">Raised Bed</option>
            <option value="inground">In-Ground Plot</option>
            <option value="container">Container / Pot</option>
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
            Used to detect when tall plants are placed where they'd cast shade over shorter neighbours.
          </p>
        </div>

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
