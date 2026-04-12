import type { CatalogSeed, PlantingWindow, PlantingWindowStatus } from '../types';

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Returns the current planting window status for a seed given frost dates and today.
 *
 * Logic (evaluated in order):
 *  1. too-late     — today is past first fall frost, or there isn't enough time to harvest before it
 *  2. in-season    — plant is already in its growing window (past transplant/sow, before harvest deadline)
 *  3. transplant-now — within ±10 days of the ideal transplant date (last frost + 1 week)
 *  4. direct-sow-now — within ±7 days of the ideal direct sow date
 *  5. start-indoors  — within the indoor start window
 *  6. too-early    — before any window opens
 */
export function getPlantingWindow(
  seed: CatalogSeed,
  lastFrost: Date,
  firstFallFrost: Date,
  today: Date
): PlantingWindow {
  // Key dates
  const indoorStartDate   = new Date(lastFrost.getTime() - seed.indoorStartWeeks * 7 * 86_400_000);
  const indoorWindowOpen  = new Date(indoorStartDate.getTime() - 7 * 86_400_000);  // 1 week early
  const indoorWindowClose = new Date(indoorStartDate.getTime() + 14 * 86_400_000); // 2 week window
  const transplantDate    = new Date(lastFrost.getTime() + 7 * 86_400_000);
  const directSowDate     = new Date(lastFrost.getTime() + seed.directSowWeeks * 7 * 86_400_000);
  // Latest date to START planting and still harvest before first fall frost
  const harvestDeadline   = new Date(firstFallFrost.getTime() - seed.daysToMaturity * 86_400_000);

  const status = ((): PlantingWindowStatus => {
    // 1. Too late — past first fall frost or no time to harvest
    if (today >= firstFallFrost || today > harvestDeadline) return 'too-late';

    // 2. In season — past the planting window, actively growing
    const establishedBy = seed.canStartIndoors ? transplantDate : directSowDate;
    if (today > new Date(establishedBy.getTime() + 14 * 86_400_000)) return 'in-season';

    // 3. Transplant window (indoor-started plants)
    if (seed.canStartIndoors) {
      const daysFromTransplant = diffDays(today, transplantDate);
      if (Math.abs(daysFromTransplant) <= 10) return 'transplant-now';
    }

    // 4. Direct sow window
    if (seed.canDirectSow) {
      const daysFromDirectSow = diffDays(today, directSowDate);
      if (Math.abs(daysFromDirectSow) <= 7) return 'direct-sow-now';
    }

    // 5. Indoor start window
    if (seed.canStartIndoors && today >= indoorWindowOpen && today <= indoorWindowClose) {
      return 'start-indoors';
    }

    // 6. Default: too early
    return 'too-early';
  })();

  // Build label and color
  const config: Record<PlantingWindowStatus, { label: string; color: PlantingWindow['color'] }> = {
    'too-early':       { label: 'Too early',        color: 'gray'   },
    'start-indoors':   { label: 'Start indoors',    color: 'yellow' },
    'direct-sow-now':  { label: 'Direct sow now',   color: 'green'  },
    'transplant-now':  { label: 'Transplant now',   color: 'green'  },
    'in-season':       { label: 'In season',        color: 'blue'   },
    'too-late':        { label: 'Too late',         color: 'red'    },
  };

  // Compute daysOffset — how many days until/since the most relevant window
  let daysOffset = 0;
  if (status === 'too-early') {
    daysOffset = seed.canStartIndoors
      ? diffDays(indoorWindowOpen, today)
      : diffDays(directSowDate, today);
  } else if (status === 'start-indoors') {
    daysOffset = diffDays(indoorStartDate, today);
  } else if (status === 'direct-sow-now' || status === 'transplant-now') {
    daysOffset = 0;
  } else if (status === 'in-season') {
    // Days until harvest deadline
    daysOffset = diffDays(harvestDeadline, today);
  } else if (status === 'too-late') {
    daysOffset = diffDays(today, firstFallFrost); // how long past fall frost
  }

  return {
    status,
    daysOffset,
    label: config[status].label,
    color: config[status].color,
  };
}

/**
 * Resolves frost dates from settings, returning null if not configured.
 */
export function resolveFrostDates(
  lastFrostDate: string | null,
  firstFallFrostDate: string | null,
  zipcode: string,
  year: number,
  getFrostDateObjects: (zip: string, year?: number) => { lastFrost: Date; firstFrost: Date }
): { lastFrost: Date; firstFrost: Date } | null {
  try {
    const derived = zipcode.length >= 3 ? getFrostDateObjects(zipcode, year) : null;
    return {
      lastFrost:  lastFrostDate      ? new Date(lastFrostDate + 'T00:00:00')      : (derived?.lastFrost  ?? null!),
      firstFrost: firstFallFrostDate ? new Date(firstFallFrostDate + 'T00:00:00') : (derived?.firstFrost ?? null!),
    };
  } catch {
    return null;
  }
}
