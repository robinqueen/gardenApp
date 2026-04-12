import type { Bed, Task, GapSuggestion } from '../types';
import { SEED_CATALOG } from '../catalog/seeds';

function parseDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

interface CropWindow {
  slotId: string;
  plantId: string;
  sowDate: Date;
  harvestDate: Date;
}

/**
 * Detects gaps in a bed's planting timeline and suggests crops to fill them.
 *
 * Algorithm:
 * 1. Build (sowDate, harvestDate) for each slot from tasks or stageDate fallback
 * 2. Sort by sowDate
 * 3. Find gaps ≥ MIN_GAP_DAYS between consecutive crops (or between last crop and firstFrostDate)
 * 4. For each gap, find catalog crops whose full cycle fits in the gap before firstFrostDate
 * 5. Return up to MAX_SUGGESTIONS per gap, sorted by daysToMaturity ascending
 */
export function detectGaps(
  bed: Bed,
  tasks: Task[],
  firstFrostDate: Date,
  today: Date
): GapSuggestion {
  const MIN_GAP_DAYS    = 14;
  const MAX_SUGGESTIONS = 5;
  const FROST_BUFFER    = 7; // days before frost that harvest must complete

  // Build crop windows from tasks
  const windows: CropWindow[] = [];

  for (const slot of bed.slots) {
    const slotTasks = tasks.filter(t => t.slotId === slot.id);

    // Resolve sow date: prefer task, fall back to stageDate
    const sowTask = slotTasks.find(t => t.type === 'sow-indoor' || t.type === 'sow-direct' || t.type === 'transplant');
    let sowDate: Date | null = sowTask ? parseDate(sowTask.date) : null;
    if (!sowDate && slot.stageDate) sowDate = parseDate(slot.stageDate);
    if (!sowDate) continue;

    // Resolve harvest date: prefer task, fall back to sowDate + daysToMaturity
    const harvestTask = slotTasks.find(t => t.type === 'harvest');
    let harvestDate: Date | null = harvestTask ? parseDate(harvestTask.date) : null;
    if (!harvestDate) {
      const seed = SEED_CATALOG.find(s => s.id === slot.plantId);
      if (seed) harvestDate = addDays(sowDate, seed.daysToMaturity);
    }
    if (!harvestDate) continue;

    // Only include crops that haven't fully completed yet (or started this season)
    // Include crops that end before or after today (we want the full picture)
    windows.push({ slotId: slot.id, plantId: slot.plantId, sowDate, harvestDate });
  }

  // Sort by sow date
  windows.sort((a, b) => a.sowDate.getTime() - b.sowDate.getTime());

  // Crops already in this bed
  const existingPlantIds = new Set(bed.slots.map(s => s.plantId));

  // Find gap candidates
  interface GapCandidate {
    gapStart: Date;
    gapEnd: Date;
  }

  const candidates: GapCandidate[] = [];

  if (windows.length === 0) {
    // Empty bed — the whole growing season is a gap (from today to frost)
    if (diffDays(firstFrostDate, today) >= MIN_GAP_DAYS + 14) {
      candidates.push({ gapStart: today, gapEnd: addDays(firstFrostDate, -1) });
    }
  } else {
    // Gaps between consecutive crops
    for (let i = 0; i < windows.length - 1; i++) {
      const gapStart = addDays(windows[i].harvestDate, 1);
      const gapEnd   = addDays(windows[i + 1].sowDate, -1);
      if (diffDays(gapEnd, gapStart) >= MIN_GAP_DAYS) {
        candidates.push({ gapStart, gapEnd });
      }
    }

    // Gap after last crop (to first frost)
    const lastHarvest = windows[windows.length - 1].harvestDate;
    const gapStart    = addDays(lastHarvest, 1);
    const gapEnd      = addDays(firstFrostDate, -1);
    if (diffDays(gapEnd, gapStart) >= MIN_GAP_DAYS) {
      candidates.push({ gapStart, gapEnd });
    }
  }

  // Build suggestions for each gap candidate
  const allSuggestions: GapSuggestion['suggestedCrops'] = [];

  for (const { gapStart, gapEnd } of candidates) {
    const frostDeadline = addDays(firstFrostDate, -FROST_BUFFER);

    for (const seed of SEED_CATALOG) {
      // Don't suggest what's already in the bed
      if (existingPlantIds.has(seed.id)) continue;

      // Try direct sow
      if (seed.canDirectSow) {
        const sowDate     = gapStart;
        const harvestDate = addDays(sowDate, seed.daysToMaturity);
        if (harvestDate <= frostDeadline && diffDays(gapEnd, harvestDate) >= 0) {
          allSuggestions.push({
            seed,
            method: 'direct-sow',
            harvestBy: toIso(harvestDate),
          });
          continue; // Don't double-add via transplant path
        }
      }

      // Try transplant (indoor start)
      if (seed.canStartIndoors) {
        // Assume transplant-ready seedlings are available (staggered start)
        // Gap start = transplant date; harvest = gapStart + daysToMaturity
        const transplantDate = gapStart;
        const harvestDate    = addDays(transplantDate, seed.daysToMaturity - Math.round(seed.indoorStartWeeks * 7 / 2));
        if (harvestDate <= frostDeadline && diffDays(gapEnd, harvestDate) >= 0) {
          allSuggestions.push({
            seed,
            method: 'transplant',
            harvestBy: toIso(harvestDate),
          });
        }
      }
    }
  }

  // Deduplicate (same seed may appear from multiple gaps — keep earliest harvestBy)
  const deduped = new Map<string, GapSuggestion['suggestedCrops'][0]>();
  for (const s of allSuggestions) {
    const existing = deduped.get(s.seed.id);
    if (!existing || s.harvestBy < existing.harvestBy) {
      deduped.set(s.seed.id, s);
    }
  }

  // Sort by daysToMaturity (fastest first)
  const suggestedCrops = Array.from(deduped.values())
    .sort((a, b) => a.seed.daysToMaturity - b.seed.daysToMaturity)
    .slice(0, MAX_SUGGESTIONS);

  // Use the first gap's dates for the main GapSuggestion
  const firstCandidate = candidates[0];

  return {
    bedId:         bed.id,
    bedName:       bed.name,
    gapStartDate:  firstCandidate ? toIso(firstCandidate.gapStart) : toIso(today),
    gapEndDate:    firstCandidate ? toIso(firstCandidate.gapEnd)   : toIso(addDays(firstFrostDate, -1)),
    gapDays:       firstCandidate ? diffDays(firstCandidate.gapEnd, firstCandidate.gapStart) : 0,
    suggestedCrops,
  };
}

/**
 * Runs gap detection for every bed and returns results that have at least one suggestion.
 */
export function detectAllGaps(
  beds: Bed[],
  tasks: Task[],
  firstFrostDate: Date,
  today: Date
): GapSuggestion[] {
  return beds
    .map(bed => detectGaps(bed, tasks, firstFrostDate, today))
    .filter(g => g.suggestedCrops.length > 0);
}
