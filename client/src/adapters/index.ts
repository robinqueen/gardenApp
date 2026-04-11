import type { StorageAdapter } from './StorageAdapter';
import { LocalAdapter } from './LocalAdapter';
import { RemoteAdapter, pingApi } from './RemoteAdapter';

/**
 * Resolves which storage adapter to use at startup.
 *
 * Logic:
 *  1. Read VITE_API_BASE_URL from the build-time env.
 *  2. If a URL is configured AND the backend responds on /health → use RemoteAdapter.
 *  3. Otherwise → fall back to LocalAdapter (IndexedDB, single-user, offline-first).
 *
 * The result is cached so the same instance is reused for the app lifetime.
 */

let cachedAdapter: StorageAdapter | null = null;

export async function resolveAdapter(): Promise<StorageAdapter> {
  if (cachedAdapter) return cachedAdapter;

  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (apiBase && apiBase.trim() !== '') {
    const reachable = await pingApi(apiBase);
    if (reachable) {
      cachedAdapter = new RemoteAdapter(apiBase);
      return cachedAdapter;
    }
  }

  cachedAdapter = new LocalAdapter();
  return cachedAdapter;
}

export type { StorageAdapter };
