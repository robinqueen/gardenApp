// ─── Enums / Union Types ──────────────────────────────────────

export type BedType = 'raised' | 'inground' | 'container';
export type StorageMode = 'local' | 'remote';
export type TaskType =
  | 'prep'
  | 'sow-indoor'
  | 'sow-direct'
  | 'transplant'
  | 'water'
  | 'fertilize'
  | 'trim'
  | 'harvest'
  | 'restart'
  | 'custom';
export type ActivityType =
  | 'watered'
  | 'fertilized'
  | 'seeded'
  | 'transplanted'
  | 'harvested'
  | 'observed'
  | 'trimmed';

/** How much direct sun a plant needs or a bed receives. */
export type SunExposure = 'full-sun' | 'partial-sun' | 'shade';

/**
 * Which edge of the bed grid faces north.
 * Used to detect tall plants that would shade their neighbours.
 * 'top'    = row 0 is the north edge (sun comes from bottom of the visual grid)
 * 'bottom' = row 0 is the south edge (sun comes from top of the visual grid)
 * 'left'   = col 0 is the west edge
 * 'right'  = col 0 is the east edge
 */
export type NorthEdge = 'top' | 'bottom' | 'left' | 'right';

/**
 * The current growth stage of a planting slot.
 * This drives which tasks get auto-generated and from what date.
 */
export type PlantStage =
  | 'planned'               // seeds not yet started — full cycle from frost-date schedule
  | 'seeds-started'         // seeds already in trays; stageDate = when they were started
  | 'ready-to-transplant'   // hardened off and ready to go in ground
  | 'direct-sow'            // will direct sow at the frost-relative date
  | 'in-ground'             // already transplanted; stageDate = when planted
  | 'store-bought';         // purchased starter plant; stageDate = when planted

/** How tall a plant grows at maturity — affects shadow casting warnings. */
export type HeightCategory = 'low' | 'medium' | 'tall' | 'vine';

// ─── Garden Layout ────────────────────────────────────────────

/**
 * A plant placement anchored at (cellX, cellY).
 *
 * widthCells  = ceil(spacingInches / 12) — how many columns this occupies
 * lengthCells = ceil(rowSpacingInches / 12) — how many rows this occupies
 *
 * Together they form a clean rectangle, never an odd L-shape.
 * Tight plants (carrots, radishes) get 1×1 and show a ×N count inside.
 * Large plants (tomatoes, squash) get e.g. 2×3 and show one icon spanning the block.
 */
export interface PlantSlot {
  id: string;
  cellX: number;
  cellY: number;
  plantId: string;
  /** Cells wide (cols). Derived from spacingInches. */
  widthCells: number;
  /** Cells tall (rows). Derived from rowSpacingInches. */
  lengthCells: number;
  /** How many plants fit when widthCells=1 and lengthCells=1 (tight spacing). */
  plantsPerSqFt: number;
  /** Links slots that belong to a succession group. */
  successionGroupId?: string;
  /** 0 = on base schedule. +N = N weeks offset for succession planting. */
  weekOffset: number;
  /**
   * What stage this planting is currently at.
   * Controls which tasks are generated and from what anchor date.
   * Defaults to 'planned' if absent (full frost-relative schedule).
   */
  stage?: PlantStage;
  /**
   * ISO date (YYYY-MM-DD) relevant to the stage:
   *   seeds-started      → date seeds were sown into tray
   *   in-ground          → date plant went into the ground
   *   store-bought       → date purchased/planted
   *   ready-to-transplant → date hardened off (optional, defaults to today)
   * Not used for 'planned' or 'direct-sow'.
   */
  stageDate?: string;
}

export interface Bed {
  id: string;
  name: string;
  widthFt: number;
  lengthFt: number;
  type: BedType;
  /** How much direct sunlight this bed receives each day. */
  sunExposure: SunExposure;
  /**
   * Which edge of the visual grid faces north.
   * Knowing this lets us warn when tall plants are placed on the sunny (south) side
   * where they would shade shorter plants.
   */
  northEdge: NorthEdge;
  slots: PlantSlot[];
  /** Position on the garden plot overview canvas (feet from top-left corner). */
  plotX?: number;
  plotY?: number;
}

export interface Garden {
  id: string;
  name: string;
  year: number;
  beds: Bed[];
}

/** A frozen snapshot of a full garden for year-over-year import. */
export interface GardenSeason {
  id: string;
  year: number;
  gardenSnapshot: Garden;
  /** Activity logs from that season, embedded for self-contained history. */
  activitySnapshot: ActivityLog[];
  notes: string;
  createdAt: string; // ISO
}

// ─── Seed Catalog ─────────────────────────────────────────────

export interface CatalogSeed {
  id: string;
  name: string;
  family: string;
  icon: string;
  /** Weeks before last frost to start seeds indoors. */
  indoorStartWeeks: number;
  /** Weeks relative to last frost for direct sow. Negative = before frost. */
  directSowWeeks: number;
  canDirectSow: boolean;
  canStartIndoors: boolean;
  /** Center-to-center spacing in inches (drives widthCells). */
  spacingInches: number;
  /** Row-to-row spacing in inches (drives lengthCells). */
  rowSpacingInches: number;
  daysToMaturity: number;
  needsTrellis: boolean;
  needsSupport: boolean;
  /** How much sun this plant needs to thrive. */
  sunNeeds: SunExposure;
  /** Approximate height at maturity — used for shadow-casting warnings. */
  heightCategory: HeightCategory;
  companionsWith: string[]; // CatalogSeed ids
  antagonistsWith: string[]; // CatalogSeed ids
  /** 0 means succession planting is not useful for this crop. */
  successionIntervalDays: number;
  notes: string;
}

export interface UserSeed {
  id: string;
  seedId: string;
  owned: boolean;
  purchaseYear: number;
  notes: string;
}

// ─── Settings ─────────────────────────────────────────────────

export interface Settings {
  zipcode: string;
  lastFrostDate: string | null;
  firstFallFrostDate: string | null;
  storageMode: StorageMode;
  apiBaseUrl: string;
  setupComplete: boolean;
  /** Dimensions of the whole garden plot for the overhead view (feet). */
  plotWidthFt?: number;
  plotLengthFt?: number;
  /**
   * Which real-world direction appears at the TOP of the plot overview.
   * Default 'north'. Set to 'east' if you view your yard with East at the top.
   */
  plotTopEdge?: 'north' | 'east' | 'south' | 'west';
}

// ─── Tasks ────────────────────────────────────────────────────

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  type: TaskType;
  plantId?: string;
  bedId?: string;
  slotId?: string;
  title: string;
  description: string;
  completed: boolean;
  isAutoGenerated: boolean;
}

// ─── Activity Log ─────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  date: string; // YYYY-MM-DD
  bedId?: string;
  slotId?: string;
  type: ActivityType;
  note: string;
}

// ─── Export Bundle ────────────────────────────────────────────

/** The shape of a full data export file (gardenapp-export.json). */
export interface ExportBundle {
  version: 2;
  exportedAt: string;
  settings: Settings;
  garden: Garden | null;
  userSeeds: UserSeed[];
  tasks: Task[];
  activityLogs: ActivityLog[];
  seasons: GardenSeason[];
}
