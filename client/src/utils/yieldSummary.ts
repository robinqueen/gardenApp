import type { ActivityLog, Bed, YieldUnit } from '../types';
import type { CatalogSeed } from '../types';

export interface YieldEntry {
  date: string;
  amount: number;
  unit: YieldUnit;
  bedName?: string;
}

export interface CropYieldSummary {
  plantId: string;
  cropName: string;
  icon: string;
  entries: YieldEntry[];
  /** Total normalized to lbs where possible. null if only count/bunches. */
  totalLbs: number | null;
  totalCount: number | null;
}

function toLbs(amount: number, unit: YieldUnit): number | null {
  if (unit === 'lbs')    return amount;
  if (unit === 'kg')     return amount * 2.20462;
  return null; // count / bunches — not convertible
}

export function summarizeYieldByCrop(
  logs: ActivityLog[],
  seedMap: Map<string, CatalogSeed>,
  beds: Bed[]
): CropYieldSummary[] {
  const harvests = logs.filter(
    (l) => l.type === 'harvested' && l.yieldAmount != null && l.yieldUnit != null
  );

  // Map slotId → plantId using beds
  const slotPlantMap = new Map<string, string>();
  for (const bed of beds) {
    for (const slot of bed.slots) {
      slotPlantMap.set(slot.id, slot.plantId);
    }
  }

  // Map bedId → bed name
  const bedNameMap = new Map<string, string>();
  for (const bed of beds) bedNameMap.set(bed.id, bed.name);

  // Group by plantId
  const byCrop = new Map<string, YieldEntry[]>();

  for (const log of harvests) {
    // Resolve plantId: prefer slotId lookup, fall back to bedId if no slotId
    let plantId: string | undefined;
    if (log.slotId) plantId = slotPlantMap.get(log.slotId);
    if (!plantId) continue; // can't attribute to a crop without a slotId

    if (!byCrop.has(plantId)) byCrop.set(plantId, []);
    byCrop.get(plantId)!.push({
      date: log.date,
      amount: log.yieldAmount!,
      unit: log.yieldUnit!,
      bedName: log.bedId ? bedNameMap.get(log.bedId) : undefined,
    });
  }

  const result: CropYieldSummary[] = [];

  for (const [plantId, entries] of byCrop) {
    const seed = seedMap.get(plantId);
    if (!seed) continue;

    let totalLbs = 0;
    let hasWeight = false;
    let totalCount = 0;
    let hasCount = false;

    for (const e of entries) {
      const lbs = toLbs(e.amount, e.unit);
      if (lbs != null) { totalLbs += lbs; hasWeight = true; }
      else { totalCount += e.amount; hasCount = true; }
    }

    result.push({
      plantId,
      cropName: seed.name,
      icon: seed.icon,
      entries: entries.sort((a, b) => a.date.localeCompare(b.date)),
      totalLbs: hasWeight ? Math.round(totalLbs * 10) / 10 : null,
      totalCount: hasCount ? totalCount : null,
    });
  }

  return result.sort((a, b) => a.cropName.localeCompare(b.cropName));
}
