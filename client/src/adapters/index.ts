import type { StorageAdapter } from './StorageAdapter';
import { LocalAdapter } from './LocalAdapter';
import { RemoteAdapter, pingApi } from './RemoteAdapter';
import { getHouseholdId } from '../utils/household';

/**
 * Resolves which storage adapter to use at startup.
 *
 * Modes:
 *
 * 1. **Auth / hosted** (VITE_AUTH_ENABLED=true, set at Docker build time):
 *    - Signed in  → RemoteAdapter (same origin, JWT cookie carries identity)
 *    - Not signed in → LocalAdapter (device-only, user guided to setup)
 *
 * 2. **Self-hosted** (VITE_API_BASE_URL set, no auth):
 *    Pings the configured API URL. If reachable, uses RemoteAdapter with
 *    the local household ID in the X-Household-Id header.
 *
 * 3. **Fully local** (no env vars):
 *    Uses LocalAdapter (IndexedDB, offline-first, single-device).
 *
 * The resolved adapter is cached for the app lifetime.
 * Pass `isAuthenticated` from the AuthContext result.
 */

export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true';

let cachedAdapter: StorageAdapter | null = null;

export async function resolveAdapter(isAuthenticated = false): Promise<StorageAdapter> {
  if (cachedAdapter) return cachedAdapter;

  // ── Hosted / auth mode ─────────────────────────────────────────
  if (AUTH_ENABLED) {
    // Signed in: use the API with the JWT cookie for identity
    // Not signed in: fall through to LocalAdapter so the app still works
    if (isAuthenticated) {
      cachedAdapter = new RemoteAdapter('', '');
      return cachedAdapter;
    }
    // Not signed in → local device storage, fall through below
  }

  // ── Self-hosted mode ───────────────────────────────────────────
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (apiBase && apiBase.trim() !== '') {
    const reachable = await pingApi(apiBase);
    if (reachable) {
      const householdId = getHouseholdId();
      cachedAdapter = new RemoteAdapter(apiBase, householdId);
      return cachedAdapter;
    }
  }

  // ── Local fallback ─────────────────────────────────────────────
  cachedAdapter = new LocalAdapter();
  return cachedAdapter;
}

/** Clear the cached adapter — call before reloading after sign-in/sign-out. */
export function clearAdapterCache(): void {
  cachedAdapter = null;
}

export type { StorageAdapter };
