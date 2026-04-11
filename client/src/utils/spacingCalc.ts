import type { CatalogSeed, PlantSlot, PlantStage } from '../types';

// ─── Rectangle Dimensions ─────────────────────────────────────

/**
 * How many grid columns (width) one planting of this seed occupies.
 *
 * Formula: ceil(spacingInches / 12)
 *   Carrot  3"  → 1 col   (fits multiple per sqft)
 *   Lettuce 8"  → 1 col
 *   Pepper  18" → 2 cols
 *   Tomato  24" → 2 cols
 *   Squash  36" → 3 cols
 */
export function slotWidthCells(seed: CatalogSeed): number {
  return Math.max(1, Math.ceil(seed.spacingInches / 12));
}

/**
 * How many grid rows (length) one planting of this seed occupies.
 *
 * Formula: ceil(rowSpacingInches / 12)
 *   Carrot  rows 12" → 1 row
 *   Tomato  rows 36" → 3 rows
 *   Squash  rows 48" → 4 rows
 */
export function slotLengthCells(seed: CatalogSeed): number {
  return Math.max(1, Math.ceil(seed.rowSpacingInches / 12));
}

// ─── Density ─────────────────────────────────────────────────

/**
 * For plants where both widthCells and lengthCells are 1 (tight spacing),
 * how many individual plants fit in that one square foot?
 *
 * Uses the Square Foot Gardening formula: (12 / spacingInches)²
 * Clamped to integers ≥ 1.
 */
export function plantsPerSqFt(seed: CatalogSeed): number {
  if (slotWidthCells(seed) > 1 || slotLengthCells(seed) > 1) {
    // Large plant — one plant per the entire rectangle
    return 1;
  }
  return Math.max(1, Math.floor((12 / seed.spacingInches) ** 2));
}

// ─── Slot Builder ─────────────────────────────────────────────

/**
 * Builds the data portion of a PlantSlot from seed + position.
 * All spacing-derived fields are calculated here so the rest
 * of the app never has to repeat the math.
 */
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
    widthCells: slotWidthCells(seed),
    lengthCells: slotLengthCells(seed),
    plantsPerSqFt: plantsPerSqFt(seed),
    weekOffset,
    stage,
    stageDate,
  };
}

// ─── Cell Geometry ────────────────────────────────────────────

/**
 * Returns every {x, y} cell that this slot occupies, as a proper rectangle.
 * The origin (cellX, cellY) is always included.
 */
export function occupiedCells(slot: PlantSlot): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < slot.lengthCells; dy++) {
    for (let dx = 0; dx < slot.widthCells; dx++) {
      cells.push({ x: slot.cellX + dx, y: slot.cellY + dy });
    }
  }
  return cells;
}

/** True if this cell coordinate is the origin (top-left) of the slot. */
export function isOriginCell(slot: PlantSlot, x: number, y: number): boolean {
  return slot.cellX === x && slot.cellY === y;
}

// ─── Display Labels ───────────────────────────────────────────

/**
 * Human-readable count for the origin cell label.
 *
 * Tight plants (1×1):  "×16"   (16 carrots per sqft)
 * Large plants (2×3):  "×1"    (one tomato per 6 sqft block)
 */
export function densityLabel(slot: PlantSlot): string {
  if (slot.widthCells === 1 && slot.lengthCells === 1 && slot.plantsPerSqFt > 1) {
    return `×${slot.plantsPerSqFt}`;
  }
  return '×1';
}

/**
 * Block-size label for the seed detail / slot confirmation screen.
 * e.g. "1 plant per 6 sq ft (2×3 block)"
 */
export function blockSizeLabel(seed: CatalogSeed): string {
  const w = slotWidthCells(seed);
  const l = slotLengthCells(seed);
  const ppsf = plantsPerSqFt(seed);

  if (w === 1 && l === 1) {
    return ppsf > 1 ? `${ppsf} plants per sq ft` : '1 plant per sq ft';
  }
  return `1 plant per ${w * l} sq ft (${w}×${l} block)`;
}
