/**
 * SeedStartPlan — "🌱 Starts" tab in the Planner
 */

import { useMemo, useState } from 'react';
import { useGardenStore } from '../store/useGardenStore';
import { SEED_CATALOG } from '../catalog/seeds';
import { getFrostDateObjects } from '../catalog/frostDates';
import { buildSeedStartPlan } from '../utils/seedStartCalc';
import type { SeedStartBatch } from '../utils/seedStartCalc';

// ─── Resolve the best available frost date ────────────────────
// Priority: manually-entered date > ZIP-derived > null

function resolveFrostDate(lastFrostDate: string | null, zipcode: string): {
  date: string | null;
  source: 'manual' | 'zip' | 'none';
} {
  if (lastFrostDate) return { date: lastFrostDate, source: 'manual' };
  if (zipcode && zipcode.length >= 3) {
    const derived = getFrostDateObjects(zipcode);
    return {
      date: derived.lastFrost.toISOString().slice(0, 10),
      source: 'zip',
    };
  }
  return { date: null, source: 'none' };
}

// ─── How it works guide ───────────────────────────────────────

function HowItWorks({ seedsPerCell, overPct }: { seedsPerCell: 1 | 2; overPct: number }) {
  return (
    <div className="ssp-guide">
      <div className="ssp-guide-step">
        <div className="ssp-guide-num">1</div>
        <div>
          <strong>Where this comes from</strong>
          <p>
            Everything here is pulled directly from what you've laid out in the{' '}
            <strong>Beds</strong> tab. Any plant whose stage is "planned" counts as
            something you need to start from seed. Plants already marked "in ground,"
            "store-bought," or "seeds started" are listed at the bottom but excluded
            from the cell counts.
          </p>
        </div>
      </div>

      <div className="ssp-guide-step">
        <div className="ssp-guide-num">2</div>
        <div>
          <strong>Why more cells than plants?</strong>
          <p>
            Not every seed germinates and not every seedling is worth transplanting.
            You sow extra cells so you can pick the strongest plants and discard weak ones.
          </p>
          {seedsPerCell === 1 ? (
            <p>
              With <strong>1 seed per cell</strong>: tomatoes and peppers use a ×4 buffer
              (pepper germination can be as low as 60%). Fast crops like squash use ×2.
            </p>
          ) : (
            <p>
              With <strong>2 seeds per cell</strong>: two chances per cell means even at
              60% germination (peppers), each cell still has an 84% chance of producing
              a plant. So only ×2 cells are needed — half the space, same odds.
            </p>
          )}
          {overPct > 0 && (
            <p>
              Your <strong>+{overPct}% extra buffer</strong> rounds every variety's cells
              up a little further. It's always easier to have a spare transplant than
              come up short.
            </p>
          )}
        </div>
      </div>

      {seedsPerCell === 2 && (
        <div className="ssp-guide-step ssp-guide-step--highlight">
          <div className="ssp-guide-num">✂</div>
          <div>
            <strong>Thinning — the one extra step with 2 seeds/cell</strong>
            <p>
              When seedlings are about 1–2 inches tall (first true leaves, ~1–2 weeks
              after germination), snip the weaker one in each cell <em>at soil level
              with scissors — don't pull it</em>, or the roots will disturb the one
              you're keeping.
            </p>
          </div>
        </div>
      )}

      <div className="ssp-guide-step">
        <div className="ssp-guide-num">3</div>
        <div>
          <strong>Start dates</strong>
          <p>
            Plants are grouped by when to start them before your last frost date.
            Peppers and eggplant need 10–12 weeks of lead time; cucumbers only 3–4.
            Frost dates are auto-estimated from your ZIP code — you can override them
            in <strong>Settings → Location</strong>.
          </p>
        </div>
      </div>

      <div className="ssp-guide-step">
        <div className="ssp-guide-num">4</div>
        <div>
          <strong>Does tray type matter?</strong>
          <p>
            No — tomato, eggplant, spinach, and cucumbers can all share the same
            6-cell pack. The only reason to separate batches into different trays
            is timing: plants started on the same date can share a tray and be
            moved under lights together. Label each tray with its start date.
          </p>
        </div>
      </div>

      <div className="ssp-guide-step">
        <div className="ssp-guide-num">5</div>
        <div>
          <strong>After germination</strong>
          <p>
            Keep seedlings under grow lights or in a bright south-facing window,
            watering from the bottom. About one week before transplanting, start{' '}
            <em>hardening off</em>: set trays outside for a few hours a day,
            increasing over 7 days. Transplant after your last frost date when
            nights stay above 50°F.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Batch card ───────────────────────────────────────────────

function BatchCard({ batch, seedsPerCell, defaultOpen }:
  { batch: SeedStartBatch; seedsPerCell: 1 | 2; defaultOpen: boolean }) {

  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="ssp-batch-card">
      <button className="ssp-batch-header" onClick={() => setOpen(o => !o)} type="button">
        <span className="ssp-batch-chevron">{open ? '▾' : '▸'}</span>
        <div className="ssp-batch-header-main">
          <div className="ssp-batch-date-row">
            {batch.startDateFormatted
              ? <span className="ssp-batch-date-cal">{batch.startDateFormatted}</span>
              : <span className="ssp-batch-date-cal ssp-batch-date-unknown">Set frost date →</span>
            }
            <span className="ssp-batch-date-rel">
              {batch.weeksBeforeFrost} wks before last frost
            </span>
          </div>
          <div className="ssp-batch-meta">
            {batch.entries.length} {batch.entries.length === 1 ? 'variety' : 'varieties'} · sow{' '}
            <strong>{batch.totalCells} cells</strong>
            {seedsPerCell === 2 ? ` (${batch.totalSeeds} seeds)` : ''}
          </div>
        </div>
      </button>

      {open && (
        <div className="ssp-batch-body">
          <table className="ssp-entry-table">
            <thead>
              <tr>
                <th></th>
                <th>Variety</th>
                <th className="ssp-col-num">Want</th>
                <th className="ssp-col-num">Sow cells</th>
                {seedsPerCell === 2 && <th className="ssp-col-num">Seeds</th>}
              </tr>
            </thead>
            <tbody>
              {batch.entries.map(entry => (
                <tr key={entry.seedId}>
                  <td className="ssp-col-icon">{entry.icon}</td>
                  <td>
                    <div className="ssp-entry-name">{entry.name}</div>
                    <div className="ssp-entry-category">{entry.category}</div>
                  </td>
                  <td className="ssp-col-num ssp-col-want">{entry.desiredPlants}</td>
                  <td className="ssp-col-num ssp-col-cells">{entry.cellsNeeded}</td>
                  {seedsPerCell === 2 && (
                    <td className="ssp-col-num ssp-col-seeds">{entry.totalSeeds}</td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={seedsPerCell === 2 ? 3 : 3} />
                <td className="ssp-col-num ssp-total-cells">{batch.totalCells}</td>
                {seedsPerCell === 2 && (
                  <td className="ssp-col-num ssp-total-cells">{batch.totalSeeds}</td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

const OVER_PCT_OPTIONS: { value: 0 | 10 | 20 | 25; label: string }[] = [
  { value: 0,  label: 'None'  },
  { value: 10, label: '+10%'  },
  { value: 20, label: '+20%'  },
  { value: 25, label: '+25%'  },
];

export function SeedStartPlan() {
  const garden       = useGardenStore(s => s.garden);
  const settings     = useGardenStore(s => s.settings);
  const saveSettings = useGardenStore(s => s.saveSettings);
  const customSeeds  = useGardenStore(s => s.customSeeds);

  const [showGuide, setShowGuide] = useState(false);

  const allCatalog = useMemo(() => [...SEED_CATALOG, ...customSeeds], [customSeeds]);
  const seedsPerCell: 1 | 2           = settings.seedsPerCell ?? 1;
  const overPct: 0|10|20|25           = settings.seedOverestimatePercent ?? 0;

  const { date: frostDate, source: frostSource } = useMemo(
    () => resolveFrostDate(settings.lastFrostDate ?? null, settings.zipcode ?? ''),
    [settings.lastFrostDate, settings.zipcode]
  );

  function setSeedsPerCell(v: 1 | 2)          { void saveSettings({ ...settings, seedsPerCell: v }); }
  function setOverPct(v: 0|10|20|25)           { void saveSettings({ ...settings, seedOverestimatePercent: v }); }

  const plan = useMemo(
    () => garden
      ? buildSeedStartPlan(garden, allCatalog, frostDate, seedsPerCell, overPct)
      : null,
    [garden, allCatalog, frostDate, seedsPerCell, overPct]
  );

  if (!garden || !plan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌱</div>
        <p>Add beds and plants in the Planner first — this tab generates from your layout.</p>
      </div>
    );
  }

  if (plan.batches.length === 0 && plan.directSowOnly.length === 0) {
    return (
      <div className="ssp-root">
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌱</div>
          <p>No plants are scheduled for indoor starting yet.<br />
             Plants marked "planned" in your beds will appear here.</p>
        </div>
      </div>
    );
  }

  // Format the resolved frost date for display
  const frostDateDisplay = frostDate
    ? new Date(`${frostDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="ssp-root">

      {/* Frost date status banner */}
      {frostSource === 'none' ? (
        <div className="alert alert-warn">
          ⚠️ No ZIP code or frost date set — start dates can't be calculated.
          Add your ZIP in <strong>Settings → Location</strong>.
        </div>
      ) : frostSource === 'zip' ? (
        <div className="ssp-frost-notice">
          📍 Frost dates estimated from your ZIP code — last frost{' '}
          <strong>{frostDateDisplay}</strong>.
          Verify or override in <strong>Settings → Location</strong>.
        </div>
      ) : null}

      {/* Summary */}
      <div className="ssp-summary">
        <div className="ssp-summary-stat">
          <span className="ssp-summary-num">{plan.totalVarieties}</span>
          <span className="ssp-summary-lbl">varieties</span>
        </div>
        <div className="ssp-summary-div" />
        <div className="ssp-summary-stat">
          <span className="ssp-summary-num">{plan.totalCells}</span>
          <span className="ssp-summary-lbl">cells to fill</span>
        </div>
        {seedsPerCell === 2 && <>
          <div className="ssp-summary-div" />
          <div className="ssp-summary-stat">
            <span className="ssp-summary-num">{plan.totalSeeds}</span>
            <span className="ssp-summary-lbl">total seeds</span>
          </div>
        </>}
        <div className="ssp-summary-div" />
        <div className="ssp-summary-stat">
          <span className="ssp-summary-num">{plan.batches.length}</span>
          <span className="ssp-summary-lbl">start dates</span>
        </div>
      </div>

      {/* Options */}
      <div className="ssp-options">
        <div className="ssp-option-group">
          <span className="ssp-option-label">Seeds / cell</span>
          <div className="unit-toggle">
            <button type="button" className={`unit-btn${seedsPerCell === 1 ? ' active' : ''}`} onClick={() => setSeedsPerCell(1)}>1</button>
            <button type="button" className={`unit-btn${seedsPerCell === 2 ? ' active' : ''}`} onClick={() => setSeedsPerCell(2)}>2</button>
          </div>
        </div>
        <div className="ssp-option-group">
          <span className="ssp-option-label">Extra buffer</span>
          <div className="unit-toggle">
            {OVER_PCT_OPTIONS.map(o => (
              <button key={o.value} type="button"
                className={`unit-btn${overPct === o.value ? ' active' : ''}`}
                onClick={() => setOverPct(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <button className="btn btn-ghost ssp-config-btn" type="button"
          onClick={() => setShowGuide(v => !v)}>
          ❓ How does this work?
          <span style={{ marginLeft: 'auto' }}>{showGuide ? '▲' : '▼'}</span>
        </button>
        {showGuide && <HowItWorks seedsPerCell={seedsPerCell} overPct={overPct} />}
      </div>

      {/* Batch cards */}
      <div className="ssp-batches">
        {plan.batches.map((batch, i) => (
          <BatchCard key={batch.weeksBeforeFrost} batch={batch}
            seedsPerCell={seedsPerCell} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Already started */}
      {plan.alreadyStarted.length > 0 && (
        <div className="ssp-aside-section">
          <div className="ssp-aside-header">✅ Already started or in ground — not counted above</div>
          <div className="ssp-aside-list">
            {plan.alreadyStarted.map(item => (
              <div key={item.seedId} className="ssp-aside-item">
                <span>{item.icon}</span>
                <span className="ssp-aside-name">{item.name}</span>
                <span className="ssp-aside-count">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct sow */}
      {plan.directSowOnly.length > 0 && (
        <div className="ssp-aside-section">
          <div className="ssp-aside-header">🌾 Direct sow outdoors — no indoor starting needed</div>
          <div className="ssp-aside-list">
            {plan.directSowOnly.map(item => (
              <div key={item.seedId} className="ssp-aside-item">
                <span>{item.icon}</span>
                <span className="ssp-aside-name">{item.name}</span>
                <span className="ssp-aside-count">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
