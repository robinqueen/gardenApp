import { useState, useMemo } from 'react';
import type { Bed, PlantSlot } from '../types';
import { SEED_CATALOG } from '../catalog/seeds';
import { occupiedCells, isOriginCell, densityLabel, buildSlot } from '../utils/spacingCalc';
import { shadowWarning, sunArrow, SUN_ICONS } from '../utils/sunWarnings';
import { PlantPicker } from './PlantPicker';
import { useGardenStore } from '../store/useGardenStore';

interface BedGridProps {
  bed: Bed;
  readonly?: boolean;
}

export function BedGrid({ bed, readonly = false }: BedGridProps) {
  const placeSlot = useGardenStore((s) => s.placeSlot);
  const removeSlot = useGardenStore((s) => s.removeSlot);

  const [pickerCell, setPickerCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null);

  // ── Defensive defaults for beds saved before these fields existed ─────
  const sunExposure = bed.sunExposure ?? 'full-sun';
  const northEdge   = bed.northEdge   ?? 'top';

  // ── Cell map: "x,y" → owning PlantSlot ────────────────────
  const cellMap = useMemo(() => {
    const map = new Map<string, PlantSlot>();
    for (const slot of bed.slots) {
      for (const cell of occupiedCells(slot)) {
        map.set(`${cell.x},${cell.y}`, slot);
      }
    }
    return map;
  }, [bed.slots]);

  // ── Companion / antagonist highlights ─────────────────────
  const companionMap = useMemo(() => {
    const companions  = new Set<string>();
    const antagonists = new Set<string>();
    if (!hoverSlotId) return { companions, antagonists };
    const hoveredSlot = bed.slots.find((s) => s.id === hoverSlotId);
    if (!hoveredSlot) return { companions, antagonists };
    const hoveredSeed = SEED_CATALOG.find((s) => s.id === hoveredSlot.plantId);
    if (!hoveredSeed) return { companions, antagonists };
    for (const slot of bed.slots) {
      if (slot.id === hoverSlotId) continue;
      if (hoveredSeed.companionsWith.includes(slot.plantId))   companions.add(slot.id);
      if (hoveredSeed.antagonistsWith.includes(slot.plantId)) antagonists.add(slot.id);
    }
    return { companions, antagonists };
  }, [hoverSlotId, bed.slots]);

  // ── Shadow warnings per slot ───────────────────────────────
  const slotWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    // Use a normalised bed with guaranteed fields to avoid crashes on old data
    const safeBed = { ...bed, sunExposure: sunExposure, northEdge: northEdge };
    for (const slot of bed.slots) {
      const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
      if (!seed) continue;
      const warning = shadowWarning(seed, safeBed, slot);
      if (warning) warnings.set(slot.id, warning);
    }
    return warnings;
  }, [bed, sunExposure, northEdge]);

  const cols = bed.widthFt;
  const rows = bed.lengthFt;

  function handleCellClick(x: number, y: number) {
    if (readonly) return;
    const slot = cellMap.get(`${x},${y}`);
    if (slot) {
      void removeSlot(bed.id, slot.id);
    } else {
      setPickerCell({ x, y });
    }
  }

  function handlePlace(slotData: ReturnType<typeof buildSlot>) {
    void placeSlot(bed.id, slotData);
    setPickerCell(null);
  }

  // ── Compass labels — one letter per edge, no duplicates ───
  // northEdge tells us which physical edge faces north.
  // We derive all four cardinal directions from that.
  const compassLabels = {
    top:    { top: 'N', bottom: 'S', left: 'W', right: 'E' },
    bottom: { top: 'S', bottom: 'N', left: 'E', right: 'W' },
    left:   { top: 'E', bottom: 'W', left: 'N', right: 'S' },
    right:  { top: 'W', bottom: 'E', left: 'S', right: 'N' },
  }[northEdge];

  return (
    <>
      {/* Sun exposure + direction summary */}
      <div className="bed-sun-header">
        <span>{SUN_ICONS[sunExposure]} {sunExposure.replace('-', ' ')}</span>
        <span className="bed-sun-dir">
          Sun {sunArrow(northEdge)}
        </span>
      </div>

      {/* Grid with compass labels */}
      <div className="bed-grid-outer">
        {/* Top label */}
        <div className="compass-top">{compassLabels.top}</div>

        <div className="bed-grid-row">
          {/* Left label */}
          <div className="compass-side">{compassLabels.left}</div>

          {/* The actual grid */}
          <div className="bed-grid-wrapper">
            <div
              className="bed-grid"
              style={{ gridTemplateColumns: `repeat(${cols}, 52px)` }}
            >
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: cols }, (_, col) => {
                  const key = `${col},${row}`;
                  const slot = cellMap.get(key);
                  const seed = slot ? SEED_CATALOG.find((s) => s.id === slot.plantId) : null;
                  const origin = slot ? isOriginCell(slot, col, row) : false;
                  const hasWarning = slot ? slotWarnings.has(slot.id) : false;
                  const isHovered = slot ? slot.id === hoverSlotId : false;

                  const isCompanion   = slot ? companionMap.companions.has(slot.id)   : false;
                  const isAntagonist  = slot ? companionMap.antagonists.has(slot.id)  : false;

                  let cellClass = 'bed-cell';
                  if (slot) {
                    if (slot.weekOffset > 0) cellClass += ' succession';
                    else cellClass += ' occupied';
                    if (hasWarning) cellClass += ' has-warning';
                    if (isHovered) cellClass += ' hovered';
                    if (!origin) cellClass += ' claimed';
                    if (isCompanion)  cellClass += ' companion-glow';
                    if (isAntagonist) cellClass += ' antagonist-glow';
                  }

                  return (
                    <div
                      key={key}
                      className={cellClass}
                      onClick={() => handleCellClick(col, row)}
                      onMouseEnter={() => slot && setHoverSlotId(slot.id)}
                      onMouseLeave={() => setHoverSlotId(null)}
                      title={
                        seed
                          ? `${seed.name}${slot!.weekOffset > 0 ? ` (+${slot!.weekOffset}w succession)` : ''}${hasWarning ? ' ⚠️ shadow risk' : ''}${readonly ? '' : ' — tap to remove'}`
                          : readonly ? '' : `(${col + 1},${row + 1}) — tap to plant`
                      }
                    >
                      {seed && origin && (
                        <>
                          <span className="cell-icon">{seed.icon}</span>
                          <span className="cell-count">{densityLabel(slot!)}</span>
                          {slot!.weekOffset > 0 && (
                            <span className="cell-offset">+{slot!.weekOffset}w</span>
                          )}
                          {hasWarning && <span className="cell-warn">⚠️</span>}
                        </>
                      )}
                      {/* Non-origin occupied cells: show a faint ownership indicator */}
                      {seed && !origin && (
                        <span className="cell-claimed-dot">{seed.icon}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right label */}
          <div className="compass-side">{compassLabels.right}</div>
        </div>

        {/* Bottom label */}
        <div className="compass-bottom">{compassLabels.bottom}</div>
      </div>

      {/* Shadow warnings */}
      {slotWarnings.size > 0 && (
        <div className="shadow-warnings">
          {Array.from(slotWarnings.values()).map((w, i) => (
            <div key={i} className="shadow-warn-item">{w}</div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="bed-legend">
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#d4edda', borderColor: '#3a7d44' }} />
          Planted
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#fff3cd', borderColor: '#e8a430' }} />
          Succession
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#fdecea', borderColor: '#c0392b' }} />
          ⚠️ Shadow risk
        </div>
      </div>

      {!readonly && (
        <p className="planner-info">Tap empty cell to plant · Tap planted cell to remove</p>
      )}

      {pickerCell && (
        <PlantPicker
          cellX={pickerCell.x}
          cellY={pickerCell.y}
          bed={bed}
          onPlace={handlePlace}
          onCancel={() => setPickerCell(null)}
        />
      )}
    </>
  );
}
