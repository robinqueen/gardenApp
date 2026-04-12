import type { CatalogSeed, PlantSlot, PlantStage } from '../types';

// ─── Slot Size ────────────────────────────────────────────────
//
// Each plant slot occupies exactly ONE grid cell regardless of spacing.
//
// Why: a 4×8 raised bed has ~32 meaningful planting positions.  If a
// tomato (24″ spacing) were allowed to claim a 2×2 block, you could only
// fit 8 plants on that entire visual grid — which makes it impossible to
// plan a realistically planted bed.  Instead:
//
//   • 1 cell = 1 planting position (one plant, one spot in the row).
//   • spacing info is kept as metadata for task generation, companion
//     plant warnings, and the density label (×N for tight crops).
//
// The user can decide how many plants to place: they drag-and-drop each
// one individually, which directly maps to the count they intend to grow.

export function slotWidthCells(_seed: CatalogSeed): number {
  return 1;
}

export function slotLengthCells(_seed: CatalogSeed): number {
  return 1;
}

// ─── Density ─────────────────────────────────────────────────

/**
 * For tight-spacing plants (< 12 in), how many plants fit in one
 * 1 sq-ft cell (Square Foot Gardening formula).
 *
 * For all other plants: 1 — each cell represents one individual plant.
 */
export function plantsPerSqFt(seed: CatalogSeed): number {
  if (seed.spacingInches < 12) {
    return Math.max(1, Math.floor((12 / seed.spacingInches) ** 2));
  }
  return 1;
}

// ─── Slot Builder ─────────────────────────────────────────────

export function buildSlot(
  seed: CatalogSeed,
  cellX: number,
  cellY: number,
  weekOffset = 0,
  stage: PlantStage = 'planned',
  stageDate?: string
): Omit<PlantSlot, 'id'> {
  return {
    cellX,
    cellY,
    plantId: seed.id,
    widthCells:    1,
    lengthCells:   1,
    plantsPerSqFt: plantsPerSqFt(seed),
    weekOffset,
    stage,
    stageDate,
  };
}

// ─── Cell Geometry ────────────────────────────────────────────

/**
 * Returns every {x, y} cell that this slot occupies.
 * Always a single cell (1×1) — widthCells/lengthCells stored on old
 * records may be >1, but we normalise here so the grid renders correctly.
 */
export function occupiedCells(slot: PlantSlot): Array<{ x: number; y: number }> {
  return [{ x: slot.cellX, y: slot.cellY }];
}

/** True if this cell coordinate is the origin of the slot (always true now). */
export function isOriginCell(slot: PlantSlot, x: number, y: number): boolean {
  return slot.cellX === x && slot.cellY === y;
}

// ─── Display Labels ───────────────────────────────────────────

/**
 * Human-readable count for the cell label.
 *
 * Tight plants (< 12 in spacing):  "×9"  (9 carrots per sq ft)
 * Everything else:                  ""   (one plant, no count needed)
 */
export function densityLabel(slot: PlantSlot): string {
  return slot.plantsPerSqFt > 1 ? `×${slot.plantsPerSqFt}` : '';
}

/**
 * Hint shown in the seed detail / slot confirmation UI.
 * e.g. "9 per sq ft (3 in spacing)" or "1 per sq ft (24 in spacing)"
 */
export function blockSizeLabel(seed: CatalogSeed): string {
  const ppsf = plantsPerSqFt(seed);
  if (ppsf > 1) {
    return `${ppsf} plants per sq ft (${seed.spacingInches}" spacing)`;
  }
  return `1 plant per cell (${seed.spacingInches}" spacing)`;
}
