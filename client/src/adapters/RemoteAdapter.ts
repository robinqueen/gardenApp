import type { Settings, Garden, UserSeed, Task, ActivityLog, GardenSeason } from '../types';
import type { StorageAdapter } from './StorageAdapter';
import { DEFAULT_SETTINGS } from './StorageAdapter';

/**
 * REST adapter that talks to the ASP.NET Core Minimal API backend.
 * Mirrors the same interface as LocalAdapter so the app code is identical
 * regardless of which storage is active.
 */
export class RemoteAdapter implements StorageAdapter {
  private readonly base: string;

  constructor(apiBaseUrl: string) {
    // Strip trailing slash for clean URL building
    this.base = apiBaseUrl.replace(/\/$/, '');
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async put(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  }

  private async del(path: string): Promise<void> {
    const res = await fetch(`${this.base}${path}`, { method: 'DELETE' });
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

  // ── Season Archive ────────────────────────────────────────

  async getSeasons(): Promise<GardenSeason[]> {
    return this.get<GardenSeason[]>('/api/seasons');
  }

  async saveSeason(season: GardenSeason): Promise<void> {
    await this.put(`/api/seasons/${season.id}`, season);
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
