import type { Settings, Garden, UserSeed, Task, ActivityLog, GardenSeason, CatalogSeed } from '../types';
import type { StorageAdapter } from './StorageAdapter';
import { DEFAULT_SETTINGS } from './StorageAdapter';

/**
 * REST adapter that talks to the ASP.NET Core Minimal API backend.
 * Mirrors the same interface as LocalAdapter so the app code is identical
 * regardless of which storage is active.
 *
 * Every request carries an `X-Household-Id` header so the server can scope
 * all data to the correct household.  This allows multiple households (families,
 * partners) to share a single API instance without seeing each other's data.
 */
export class RemoteAdapter implements StorageAdapter {
  private readonly base: string;
  private readonly householdId: string;

  constructor(apiBaseUrl: string, householdId: string) {
    // Strip trailing slash for clean URL building
    this.base        = apiBaseUrl.replace(/\/$/, '');
    this.householdId = householdId;
  }

  /** Base headers added to every request. */
  private baseHeaders(): Record<string, string> {
    return {
      'X-Household-Id': this.householdId,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      headers: this.baseHeaders(),
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { ...this.baseHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async put(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'PUT',
      headers: { ...this.baseHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  }

  private async del(path: string): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'DELETE',
      headers: this.baseHeaders(),
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  }

  // ── Settings ──────────────────────────────────────────────

  async getSettings(): Promise<Settings> {
    try {
      return await this.get<Settings>('/api/settings');
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.put('/api/settings', settings);
  }

  // ── Garden ────────────────────────────────────────────────

  async getGarden(): Promise<Garden | null> {
    try {
      return await this.get<Garden>('/api/garden');
    } catch {
      return null;
    }
  }

  async saveGarden(garden: Garden): Promise<void> {
    await this.put('/api/garden', garden);
  }

  // ── Seed Inventory ────────────────────────────────────────

  async getUserSeeds(): Promise<UserSeed[]> {
    return this.get<UserSeed[]>('/api/seeds');
  }

  async saveUserSeed(seed: UserSeed): Promise<void> {
    await this.put(`/api/seeds/${seed.id}`, seed);
  }

  async deleteUserSeed(id: string): Promise<void> {
    await this.del(`/api/seeds/${id}`);
  }

  // ── Tasks ─────────────────────────────────────────────────

  async getTasks(): Promise<Task[]> {
    return this.get<Task[]>('/api/tasks');
  }

  async saveTask(task: Task): Promise<void> {
    await this.put(`/api/tasks/${task.id}`, task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.del(`/api/tasks/${id}`);
  }

  async replaceAllTasks(tasks: Task[]): Promise<void> {
    await this.post('/api/tasks/replace-auto', tasks);
  }

  // ── Activity Log ──────────────────────────────────────────

  async getActivityLogs(): Promise<ActivityLog[]> {
    return this.get<ActivityLog[]>('/api/activity');
  }

  async saveActivityLog(log: ActivityLog): Promise<void> {
    await this.put(`/api/activity/${log.id}`, log);
  }

  async deleteActivityLog(id: string): Promise<void> {
    await this.del(`/api/activity/${id}`);
  }

  // ── Custom Seeds ──────────────────────────────────────────

  async getCustomSeeds(): Promise<CatalogSeed[]> {
    try {
      return await this.get<CatalogSeed[]>('/api/custom-seeds');
    } catch {
      return [];
    }
  }

  async saveCustomSeed(seed: CatalogSeed): Promise<void> {
    await this.put(`/api/custom-seeds/${seed.id}`, seed);
  }

  async deleteCustomSeed(id: string): Promise<void> {
    await this.del(`/api/custom-seeds/${id}`);
  }

  // ── Season Archive ────────────────────────────────────────

  async getSeasons(): Promise<GardenSeason[]> {
    return this.get<GardenSeason[]>('/api/seasons');
  }

  async saveSeason(season: GardenSeason): Promise<void> {
    await this.put(`/api/seasons/${season.id}`, season);
  }

  async resetAll(): Promise<void> {
    // Wipe each collection by fetching all IDs and deleting them, plus
    // send a replace-auto with an empty array to clear tasks.
    const [seeds, logs, seasons, tasks] = await Promise.all([
      this.get<Array<{ id: string }>>('/api/seeds'),
      this.get<Array<{ id: string }>>('/api/activity'),
      this.get<Array<{ id: string }>>('/api/seasons'),
      this.get<Array<{ id: string }>>('/api/tasks'),
    ]);
    await Promise.all([
      ...seeds.map((s)   => this.del(`/api/seeds/${s.id}`)),
      ...logs.map((l)    => this.del(`/api/activity/${l.id}`)),
      // Tasks: use replace-auto to clear, then delete any custom ones
      this.post('/api/tasks/replace-auto', []),
      ...tasks.filter((t: { id: string; isAutoGenerated?: boolean }) => !t.isAutoGenerated)
              .map((t) => this.del(`/api/tasks/${t.id}`)),
      // Seasons don't have a delete endpoint yet — reset just empties local state
      void seasons,
    ]);
    // Wipe the garden document by saving an empty one
    await this.put('/api/garden', { id: crypto.randomUUID(), name: 'My Garden', year: new Date().getFullYear(), beds: [], plotFeatures: [] });
  }
}

/** Pings the API health endpoint. Returns true if the backend is reachable. */
export async function pingApi(baseUrl: string): Promise<boolean> {
  try {
    const url = baseUrl.replace(/\/$/, '');
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
