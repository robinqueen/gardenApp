import type { Settings, Garden, UserSeed, Task, ActivityLog, GardenSeason, CatalogSeed } from '../types';

/**
 * Contract that both LocalAdapter (Dexie/IndexedDB) and RemoteAdapter (REST API)
 * must satisfy. The rest of the app talks only to this interface.
 */
export interface StorageAdapter {
  // ── Settings ──────────────────────────────────────────────
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  // ── Garden ────────────────────────────────────────────────
  getGarden(): Promise<Garden | null>;
  saveGarden(garden: Garden): Promise<void>;

  // ── Seed Inventory ────────────────────────────────────────
  getUserSeeds(): Promise<UserSeed[]>;
  saveUserSeed(seed: UserSeed): Promise<void>;
  deleteUserSeed(id: string): Promise<void>;

  // ── Tasks ─────────────────────────────────────────────────
  getTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<void>;
  deleteTask(id: string): Promise<void>;
  /** Replace all tasks — used when regenerating from scratch. */
  replaceAllTasks(tasks: Task[]): Promise<void>;

  // ── Activity Log ──────────────────────────────────────────
  getActivityLogs(): Promise<ActivityLog[]>;
  saveActivityLog(log: ActivityLog): Promise<void>;
  deleteActivityLog(id: string): Promise<void>;

  // ── Custom Seeds ──────────────────────────────────────────
  /** User-created seed varieties not in the built-in catalog. */
  getCustomSeeds(): Promise<CatalogSeed[]>;
  saveCustomSeed(seed: CatalogSeed): Promise<void>;
  deleteCustomSeed(id: string): Promise<void>;

  // ── Season Archive ────────────────────────────────────────
  getSeasons(): Promise<GardenSeason[]>;
  saveSeason(season: GardenSeason): Promise<void>;

  /**
   * Wipe all user data — garden, tasks, activity logs, seeds, seasons, settings.
   * Used by "Reset / Start Fresh". Implementations should do this as efficiently
   * as possible (e.g. table.clear() in Dexie, or DELETE FROM in SQLite).
   */
  resetAll(): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  zipcode: '',
  lastFrostDate: null,
  firstFallFrostDate: null,
  storageMode: 'local',
  apiBaseUrl: '',
  setupComplete: false,
  notificationsEnabled: false,
  weeklyDigestEnabled: false,
};
