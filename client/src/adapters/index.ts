import type { StorageAdapter } from './StorageAdapter';
import { LocalAdapter } from './LocalAdapter';
import { RemoteAdapter, pingApi } from './RemoteAdapter';
import { getHouseholdId } from '../utils/household';

/**
 * Resolves which storage adapter to use at startup.
 *
 * Logic:
 *  1. Read VITE_API_BASE_URL from the build-time env.
 *  2. If a URL is configured AND the backend responds on /health → use RemoteAdapter,
 *     injecting the household ID so all requests are scoped to this household.
 *  3. Otherwise → fall back to LocalAdapter (IndexedDB, single-user, offline-first).
 *
 * The result is cached so the same instance is reused for the app lifetime.
 * Call `clearAdapterCache()` before reloading if the household ID changes.
 */

let cachedAdapter: StorageAdapter | null = null;

export async function resolveAdapter(): Promise<StorageAdapter> {
  if (cachedAdapter) return cachedAdapter;

  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (apiBase && apiBase.trim() !== '') {
    const reachable = await pingApi(apiBase);
    if (reachable) {
      const householdId = getHouseholdId();
      cachedAdapter = new RemoteAdapter(apiBase, householdId);
      return cachedAdapter;
    }
  }

  cachedAdapter = new LocalAdapter();
  return cachedAdapter;
}

/** Clear the cached adapter (call before window.location.reload() on household change). */
export function clearAdapterCache(): void {
  cachedAdapter = null;
}

export type { StorageAdapter };
