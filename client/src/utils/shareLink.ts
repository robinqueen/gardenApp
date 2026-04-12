import LZString from 'lz-string';
import type { Garden, Settings } from '../types';

export interface SharePayload {
  version: 1;
  garden: Garden;
  lastFrostDate: string | null;
  firstFallFrostDate: string | null;
  zipcode: string;
  plotWidthFt?: number;
  plotLengthFt?: number;
  exportedAt: string;
}

/**
 * Encodes the current garden + relevant settings into a URL-safe compressed string.
 */
export function encodeSharePayload(garden: Garden, settings: Settings): string {
  const payload: SharePayload = {
    version: 1,
    garden,
    lastFrostDate:      settings.lastFrostDate      ?? null,
    firstFallFrostDate: settings.firstFallFrostDate ?? null,
    zipcode:            settings.zipcode,
    plotWidthFt:        settings.plotWidthFt,
    plotLengthFt:       settings.plotLengthFt,
    exportedAt:         new Date().toISOString(),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

/**
 * Decodes a share payload from a URL-safe compressed string.
 * Returns null if the string is invalid or cannot be decompressed.
 */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as SharePayload;
    if (parsed.version !== 1 || !parsed.garden) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Returns the full shareable URL for the current origin.
 */
export function buildShareUrl(garden: Garden, settings: Settings): string {
  const encoded = encodeSharePayload(garden, settings);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/share/${encoded}`;
}
