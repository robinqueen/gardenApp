import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { getFrostDates, getFrostDateObjects, formatDate } from '../catalog/frostDates';
import { NORTH_EDGE_OPTIONS } from '../utils/sunWarnings';
import type { Bed, BedType, SunExposure, NorthEdge } from '../types';
import { v4 as uuidv4 } from 'uuid';

type Step = 'location' | 'frost' | 'beds';

interface BedDraft {
  name: string;
  widthFt: string;
  lengthFt: string;
  type: BedType;
  sunExposure: SunExposure;
  northEdge: NorthEdge;
}

const EMPTY_BED_DRAFT: BedDraft = {
  name: '',
  widthFt: '4',
  lengthFt: '8',
  type: 'raised',
  sunExposure: 'full-sun',
  northEdge: 'top',
};

export function Setup() {
  const navigate = useNavigate();
  const { settings, saveSettings, addBed } = useGardenStore();

  const [step, setStep] = useState<Step>('location');
  const [zipcode, setZipcode] = useState(settings.zipcode || '');
  const [lastFrostOverride, setLastFrostOverride] = useState(settings.lastFrostDate || '');
  const [firstFrostOverride, setFirstFrostOverride] = useState(settings.firstFallFrostDate || '');

  const derivedFrost = zipcode.length >= 3 ? getFrostDates(zipcode) : null;
  const frostObjects = zipcode.length >= 3 ? getFrostDateObjects(zipcode) : null;

  const [beds, setBeds] = useState<Bed[]>([]);
  const [draft, setDraft] = useState<BedDraft>(EMPTY_BED_DRAFT);
  const [showBedForm, setShowBedForm] = useState(false);

  const stepIndex = (['location', 'frost', 'beds'] as Step[]).indexOf(step);

  async function handleFrostNext() {
    await saveSettings({
      ...settings,
      zipcode,
      lastFrostDate: lastFrostOverride || null,
      firstFallFrostDate: firstFrostOverride || null,
    });
    setStep('beds');
  }

  function handleAddBed() {
    if (!draft.name.trim()) return;
    const bed: Bed = {
      id: uuidv4(),
      name: draft.name.trim(),
      widthFt: Math.max(1, parseInt(draft.widthFt) || 4),
      lengthFt: Math.max(1, parseInt(draft.lengthFt) || 8),
      type: draft.type,
      sunExposure: draft.sunExposure,
      northEdge: draft.northEdge,
      slots: [],
    };
    setBeds([...beds, bed]);
    setDraft(EMPTY_BED_DRAFT);
    setShowBedForm(false);
  }

  async function handleFinish() {
    for (const bed of beds) await addBed(bed);
    await saveSettings({
      ...settings,
      zipcode,
      lastFrostDate: lastFrostOverride || null,
      firstFallFrostDate: firstFrostOverride || null,
      setupComplete: true,
    });
    navigate('/planner');
  }

  return (
    <div className="setup-page">
      <div className="setup-logo">🌱</div>
      <h1 className="setup-title">GardenApp</h1>
      <p className="setup-subtitle">Let's get your garden set up</p>

      <div className="step-indicator">
        {(['location', 'frost', 'beds'] as Step[]).map((s, i) => (
          <div key={s} className={`step-dot${i === stepIndex ? ' active' : i < stepIndex ? ' done' : ''}`} />
        ))}
      </div>

      {/* ── Step 1: Location ───────────────────────────────── */}
      {step === 'location' && (
        <div className="setup-card">
          <h2>Your Location</h2>
          <p>Enter your US zip code so we can estimate your frost dates and build your planting schedule.</p>

          <div className="form-group">
            <label className="form-label">Zip Code</label>
            <input
              className="form-input"
              placeholder="e.g. 10001"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              inputMode="numeric"
              maxLength={5}
              autoFocus
            />
          </div>

          {derivedFrost && (
            <div className="frost-display">
              <div className="frost-box">
                <div className="frost-label">Last Spring Frost</div>
                <div className="frost-date">{frostObjects ? formatDate(frostObjects.lastFrost) : derivedFrost.lastFrost}</div>
              </div>
              <div className="frost-box">
                <div className="frost-label">First Fall Frost</div>
                <div className="frost-date">{frostObjects ? formatDate(frostObjects.firstFrost) : derivedFrost.firstFrost}</div>
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={() => setStep('frost')} disabled={zipcode.length < 5}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Frost Date Confirmation ────────────────── */}
      {step === 'frost' && (
        <div className="setup-card">
          <h2>Confirm Frost Dates</h2>
          <p>These dates drive your entire planting schedule. Override them if you know your local averages.</p>

          <div className="frost-display" style={{ marginBottom: '1rem' }}>
            <div className="frost-box">
              <div className="frost-label">Last Spring Frost</div>
              <div className="frost-date">{frostObjects ? formatDate(frostObjects.lastFrost) : '—'}</div>
            </div>
            <div className="frost-box">
              <div className="frost-label">First Fall Frost</div>
              <div className="frost-date">{frostObjects ? formatDate(frostObjects.firstFrost) : '—'}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Override last spring frost (optional)</label>
            <input type="date" className="form-input" value={lastFrostOverride} onChange={(e) => setLastFrostOverride(e.target.value)} />
            <p className="form-hint">Leave blank to use the zip-based estimate.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Override first fall frost (optional)</label>
            <input type="date" className="form-input" value={firstFrostOverride} onChange={(e) => setFirstFrostOverride(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep('location')}>← Back</button>
            <button className="btn btn-primary btn-full" onClick={handleFrostNext}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Garden Beds ────────────────────────────── */}
      {step === 'beds' && (
        <div className="setup-card">
          <h2>Your Garden Beds</h2>
          <p>Add each raised bed, in-ground plot, or container. Sun direction helps detect shading issues.</p>

          {beds.length > 0 && (
            <div className="bed-list">
              {beds.map((bed) => (
                <div key={bed.id} className="bed-item">
                  <div className="bed-item-info">
                    <div className="bed-item-name">{bed.name}</div>
                    <div className="bed-item-desc">
                      {bed.widthFt}×{bed.lengthFt} ft · {bed.widthFt * bed.lengthFt} sq ft ·{' '}
                      {bed.sunExposure.replace('-', ' ')} · {bed.type}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setBeds(beds.filter((b) => b.id !== bed.id))}>✕</button>
                </div>
              ))}
            </div>
          )}

          {showBedForm ? (
            <>
              <div className="form-group">
                <label className="form-label">Bed Name</label>
                <input className="form-input" placeholder="e.g. North Raised Bed" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Width (ft)</label>
                  <input className="form-input" type="number" min={1} max={20} value={draft.widthFt} onChange={(e) => setDraft({ ...draft, widthFt: e.target.value })} inputMode="numeric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Length (ft)</label>
                  <input className="form-input" type="number" min={1} max={20} value={draft.lengthFt} onChange={(e) => setDraft({ ...draft, lengthFt: e.target.value })} inputMode="numeric" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as BedType })}>
                  <option value="raised">Raised Bed</option>
                  <option value="inground">In-Ground Plot</option>
                  <option value="container">Container / Pot</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">☀️ Sun exposure</label>
                <select className="form-select" value={draft.sunExposure} onChange={(e) => setDraft({ ...draft, sunExposure: e.target.value as SunExposure })}>
                  <option value="full-sun">☀️ Full Sun (6+ hours/day)</option>
                  <option value="partial-sun">⛅ Partial Sun (3–6 hours/day)</option>
                  <option value="shade">🌥️ Shade (less than 3 hours/day)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">🧭 Which edge faces north?</label>
                <select className="form-select" value={draft.northEdge} onChange={(e) => setDraft({ ...draft, northEdge: e.target.value as NorthEdge })}>
                  {NORTH_EDGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setShowBedForm(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleAddBed} disabled={!draft.name.trim()}>Add Bed</button>
              </div>
            </>
          ) : (
            <button className="btn btn-secondary btn-full" style={{ marginBottom: '1rem' }} onClick={() => setShowBedForm(true)}>
              + Add a Bed
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep('frost')}>← Back</button>
            <button className="btn btn-primary btn-full" onClick={handleFinish}>
              {beds.length === 0 ? 'Skip & Finish →' : `Finish Setup (${beds.length} bed${beds.length !== 1 ? 's' : ''}) →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
