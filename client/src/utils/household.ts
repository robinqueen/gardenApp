/**
 * Household ID utilities.
 *
 * The household ID is the shared secret that groups devices / users together
 * when using the remote API backend.  It is stored in localStorage so it
 * survives page refreshes and is available synchronously at adapter init time
 * — before any async settings load can happen.
 *
 * When no backend is in use (LocalAdapter / IndexedDB mode) the household ID
 * is still generated and stored but never sent anywhere.
 */

const STORAGE_KEY = 'garden-household-id';

/** 8-character alphanumeric code, uppercase. */
function newCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Returns the current household ID from localStorage, generating and persisting
 * a fresh one if this is the first run.
 */
export function getHouseholdId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = newCode();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Overwrites the stored household ID.  After calling this the caller should
 * reload the page (or re-initialise the adapter) so the new ID takes effect.
 */
export function setHouseholdId(id: string): void {
  const clean = id.trim().toUpperCase();
  if (!clean) throw new Error('Household ID cannot be empty');
  localStorage.setItem(STORAGE_KEY, clean);
}

/**
 * Generates a brand-new household ID, stores it, and returns it.
 * Use this when the user wants to "create a new household".
 */
export function generateNewHouseholdId(): string {
  const id = newCode();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
