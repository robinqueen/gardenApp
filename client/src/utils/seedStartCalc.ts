/**
 * Seed Starting Calculator
 *
 * Converts the garden plan (beds + planted slots) into a dated seed-starting
 * schedule grouped by start timing.
 *
 * ─── Cell-count buffer rationale ─────────────────────────────
 *
 * You sow more cells than you actually need plants for so you can pick the
 * healthiest seedlings and discard weak ones. The base multiplier is per-crop:
 *
 *  1 SEED PER CELL
 *   Tomato / Pepper / Eggplant (60–85% germ)  → ×4 cells
 *   Brassicas / Greens / Onion / Herb          → ×3 cells
 *   Cucumber / Squash / Melon / easy crops     → ×2 cells
 *
 *  2 SEEDS PER CELL
 *   P(≥1 germ per cell) = 1−(1−g)²
 *   Pepper at 60 %: 84 % | Tomato at 80 %: 96 %
 *   → flat ×2 cells across all crops (half the tray space of 1-seed approach)
 *   → requires thinning: cut the weaker seedling ~1–2 wks after germination
 *
 *  OVER-ESTIMATE BUFFER
 *   An optional extra % (10 / 20 / 25) added on top of the base calculation
 *   so you always have a few spare transplants — it's always easier to have
 *   one too many than one too few.
 *
 * ─── Tray choice ─────────────────────────────────────────────
 * It does NOT matter which tray type you use. Any plant — tomato, eggplant,
 * spinach — can share the same 6-cell pack.  The only practical reason to
 * keep plants in separate trays is start-date grouping: plants started on the
 * same date can share a tray and be moved under lights together.
 */

import type { Garden, CatalogSeed } from '../types';

// ─── Per-category buffer multipliers ─────────────────────────

const CATEGORY_BUFFER_1: Record<string, number> = {
  'Tomato':                 4,
  'Pepper':                 4,
  'Eggplant':               4,
  'Cucumber':               2,
  'Summer Squash':          2,
  'Winter Squash':          2,
  'Melon':                  2,
  'Bean':                   2,
  'Pea':                    2,
  'Lettuce & Salad Greens': 3,
  'Spinach':                3,
  'Kale & Cooking Greens':  3,
  'Brassicas':              3,
  'Carrot':                 2,
  'Beet':                   2,
  'Radish':                 2,
  'Onion & Allium':         3,
  'Corn':                   2,
  'Herb':                   3,
  'Companion Flower':       2,
  'Perennial Fruit':        1,
};

export function bufferFor(category: string, seedsPerCell: 1 | 2 = 1): number {
  if (seedsPerCell === 2) return 2; // always ×2 when sowing 2 seeds/cell
  return CATEGORY_BUFFER_1[category] ?? 3;
}

// ─── Types ────────────────────────────────────────────────────

export interface SeedStartEntry {
  seedId: string;
  name: string;
  icon: string;
  category: string;
  /** Slots planned in beds — the number you want to transplant. */
  desiredPlants: number;
  /** Physical cells to fill (after buffer + over-estimate). */
  cellsNeeded: number;
  /** The base buffer multiplier (before over-estimate). */
  bufferMultiplier: number;
  /** cellsNeeded × seedsPerCell — how many individual seeds to have ready. */
  totalSeeds: number;
  weeksBeforeFrost: number;
}

export interface SeedStartBatch {
  weeksBeforeFrost: number;
  /** ISO date (YYYY-MM-DD), null if no frost date is set. */
  startDate: string | null;
  /** Friendly date string e.g. "Feb 15" — or null. */
  startDateFormatted: string | null;
  /** Full label e.g. "Start Feb 15 — 10 weeks before last frost". */
  label: string;
  entries: SeedStartEntry[];
  /** Total cells across all entries in this batch. */
  totalCells: number;
  /** totalCells × seedsPerCell. */
  totalSeeds: number;
}

export interface SeedStartPlan {
  batches: SeedStartBatch[];
  seedsPerCell: 1 | 2;
  overestimatePercent: number;
  totalVarieties: number;
  totalCells: number;
  totalSeeds: number;
  directSowOnly:  { seedId: string; name: string; icon: string; count: number }[];
  alreadyStarted: { seedId: string; name: string; icon: string; count: number }[];
}

// ─── Calendar helpers ─────────────────────────────────────────

function subtractWeeks(isoDate: string, weeks: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Core calculator ──────────────────────────────────────────

export function buildSeedStartPlan(
  garden:              Garden,
  catalog:             CatalogSeed[],
  lastFrostDate:       string | null,
  seedsPerCell:        1 | 2 = 1,
  overestimatePercent: number = 0,
): SeedStartPlan {
  const seedMap = new Map<string, CatalogSeed>(catalog.map((s) => [s.id, s]));

  const tallyDesired  = new Map<string, number>();
  const tallyDirect   = new Map<string, number>();
  const tallyStarted  = new Map<string, number>();

  for (const bed of (garden.beds ?? [])) {
    for (const slot of (bed.slots ?? [])) {
      const seed  = seedMap.get(slot.plantId);
      if (!seed) continue;
      const stage = slot.stage ?? 'planned';

      if (['in-ground', 'store-bought', 'seeds-started', 'ready-to-transplant'].includes(stage)) {
        tallyStarted.set(seed.id, (tallyStarted.get(seed.id) ?? 0) + 1);
        continue;
      }
      if (stage === 'direct-sow' || (!seed.canStartIndoors && seed.canDirectSow)) {
        tallyDirect.set(seed.id, (tallyDirect.get(seed.id) ?? 0) + 1);
        continue;
      }
      if (!seed.canStartIndoors) {
        tallyDirect.set(seed.id, (tallyDirect.get(seed.id) ?? 0) + 1);
        continue;
      }
      tallyDesired.set(seed.id, (tallyDesired.get(seed.id) ?? 0) + 1);
    }
  }

  // Build entries grouped by start-week
  const entriesByWeeks = new Map<number, SeedStartEntry[]>();

  for (const [seedId, desired] of tallyDesired) {
    const seed       = seedMap.get(seedId);
    if (!seed) continue;
    const base       = bufferFor(seed.category, seedsPerCell);
    const baseCells  = Math.ceil(desired * base);
    // Apply over-estimate on top: ceil(baseCells × (1 + pct/100))
    const cells      = overestimatePercent > 0
      ? Math.ceil(baseCells * (1 + overestimatePercent / 100))
      : baseCells;
    const weeks      = seed.indoorStartWeeks ?? 6;

    if (!entriesByWeeks.has(weeks)) entriesByWeeks.set(weeks, []);
    entriesByWeeks.get(weeks)!.push({
      seedId,
      name:             seed.name,
      icon:             seed.icon,
      category:         seed.category,
      desiredPlants:    desired,
      cellsNeeded:      cells,
      bufferMultiplier: base,
      totalSeeds:       cells * seedsPerCell,
      weeksBeforeFrost: weeks,
    });
  }

  // Assemble batches, earliest start date first (= highest weeks value first)
  const batches: SeedStartBatch[] = [];
  const sortedWeeks = [...entriesByWeeks.keys()].sort((a, b) => b - a);

  for (const weeks of sortedWeeks) {
    const entries = entriesByWeeks.get(weeks)!;
    entries.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    const startDate          = lastFrostDate ? subtractWeeks(lastFrostDate, weeks) : null;
    const startDateFormatted = startDate ? formatDateShort(startDate) : null;
    const totalCells         = entries.reduce((s, e) => s + e.cellsNeeded, 0);

    const weeksLabel = `${ordinal(weeks)} week before last frost`;
    const label = startDateFormatted
      ? `${startDateFormatted} — ${weeksLabel}`
      : weeksLabel;

    batches.push({
      weeksBeforeFrost: weeks,
      startDate,
      startDateFormatted,
      label,
      entries,
      totalCells,
      totalSeeds: totalCells * seedsPerCell,
    });
  }

  const directSowOnly = [...tallyDirect.entries()]
    .map(([id, c]) => ({ seedId: id, name: seedMap.get(id)?.name ?? id, icon: seedMap.get(id)?.icon ?? '🌱', count: c }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const alreadyStarted = [...tallyStarted.entries()]
    .map(([id, c]) => ({ seedId: id, name: seedMap.get(id)?.name ?? id, icon: seedMap.get(id)?.icon ?? '🌿', count: c }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalCells     = batches.reduce((s, b) => s + b.totalCells, 0);
  const totalSeeds     = totalCells * seedsPerCell;
  const totalVarieties = tallyDesired.size;

  return {
    batches,
    seedsPerCell,
    overestimatePercent,
    totalVarieties,
    totalCells,
    totalSeeds,
    directSowOnly,
    alreadyStarted,
  };
}
