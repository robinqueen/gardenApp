import type { Bed, PlantSlot, CatalogSeed, NorthEdge, SunExposure } from '../types';

// ─── Sun / Exposure Helpers ───────────────────────────────────

const SUN_LABELS: Record<SunExposure, string> = {
  'full-sun': 'Full Sun (6+ hrs)',
  'partial-sun': 'Partial Sun (3–6 hrs)',
  'shade': 'Shade (<3 hrs)',
};

export const SUN_ICONS: Record<SunExposure, string> = {
  'full-sun': '☀️',
  'partial-sun': '⛅',
  'shade': '🌥️',
};

export function sunLabel(exposure: SunExposure): string {
  return SUN_LABELS[exposure];
}

/**
 * Returns a warning if a plant's sun needs don't match the bed's exposure.
 * Returns null if compatible.
 */
export function sunCompatibilityWarning(
  seed: CatalogSeed,
  bed: Bed
): string | null {
  if (seed.sunNeeds === 'full-sun' && bed.sunExposure === 'shade') {
    return `${seed.name} needs full sun but this bed is shaded.`;
  }
  if (seed.sunNeeds === 'full-sun' && bed.sunExposure === 'partial-sun') {
    return `${seed.name} prefers full sun — may under-produce in partial shade.`;
  }
  if (seed.sunNeeds === 'shade' && bed.sunExposure === 'full-sun') {
    return `${seed.name} prefers shade and may bolt or stress in full sun.`;
  }
  return null;
}

// ─── Shadow / Height Warnings ─────────────────────────────────

/**
 * The "sunny side" of a bed is the opposite of where north is.
 * In the Northern Hemisphere the sun is in the southern sky, so:
 *   northEdge = 'top'    → sunny side = 'bottom' (tall plants at bottom are fine,
 *                           tall plants at top cast shade over the bed southward ✗)
 *
 * We define the "shadow risk rows/cols" as the edge that faces AWAY from the sun
 * (i.e., the north edge itself). Tall plants there block the sun path across the bed.
 */

function shadowRiskRowOrCol(
  bed: Bed,
  slot: PlantSlot
): boolean {
  const { northEdge, widthFt, lengthFt } = bed;
  const { cellX, cellY } = slot;
  const maxRow = lengthFt - 1;
  const maxCol = widthFt - 1;

  switch (northEdge) {
    // North is the top — sun comes from the bottom.
    // Tall plants on the TOP (row 0) are on the north/shady side and cast shade south → bad.
    case 'top':    return cellY === 0;
    // North is the bottom — sun comes from top.
    // Tall plants on the BOTTOM (last row) cast shade north → bad.
    case 'bottom': return cellY === maxRow;
    // North is left — sun comes from the right.
    // Tall plants on the LEFT (col 0) cast shade east → bad.
    case 'left':   return cellX === 0;
    // North is right — sun comes from the left.
    // Tall plants on the RIGHT (last col) cast shade west → bad.
    case 'right':  return cellX === maxCol;
  }
}

/**
 * Returns a shadow warning string if a tall/vine plant is placed where it
 * would cast shade over the rest of the bed.
 */
export function shadowWarning(
  seed: CatalogSeed,
  bed: Bed,
  slot: PlantSlot
): string | null {
  if (seed.heightCategory !== 'tall' && seed.heightCategory !== 'vine') return null;
  if (shadowRiskRowOrCol(bed, slot)) {
    return `⚠️ ${seed.name} is ${seed.heightCategory} and placed on the north side — it may shade the rest of the bed.`;
  }
  return null;
}

/**
 * Returns the compass label for where the sun comes FROM based on northEdge.
 * e.g. northEdge = 'top' → sun comes from the south → "Sun from ↓ South"
 */
export function sunDirectionLabel(northEdge: NorthEdge): string {
  const map: Record<NorthEdge, string> = {
    top:    '↓ South',
    bottom: '↑ North',
    left:   '→ East',
    right:  '← West',
  };
  return `Sun from ${map[northEdge]}`;
}

/** Arrow emoji indicating the sun direction for compact display. */
export function sunArrow(northEdge: NorthEdge): string {
  return { top: '↓', bottom: '↑', left: '→', right: '←' }[northEdge];
}

export const NORTH_EDGE_OPTIONS: { value: NorthEdge; label: string }[] = [
  { value: 'top',    label: 'Top edge faces North (sun comes from bottom)' },
  { value: 'bottom', label: 'Bottom edge faces North (sun comes from top)' },
  { value: 'left',   label: 'Left edge faces North (sun comes from right)' },
  { value: 'right',  label: 'Right edge faces North (sun comes from left)' },
];
