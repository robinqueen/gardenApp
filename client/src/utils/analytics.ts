/**
 * analytics.ts
 *
 * Thin, typed wrapper around the GA4 gtag() function that is loaded in
 * index.html.  All events are no-ops when gtag is not present (e.g. during
 * unit tests or when the user has an ad-blocker).
 *
 * Usage:
 *   import { trackEvent } from '../utils/analytics';
 *   trackEvent('plant_added', { plant_name: 'Tomato', bed_id: '...' });
 */

// gtag is injected globally by the script in index.html
declare function gtag(command: 'event', eventName: string, params?: Record<string, unknown>): void;

function fireEvent(name: string, params?: Record<string, unknown>) {
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', name, params);
    }
  } catch {
    // Silently swallow — analytics must never break the app
  }
}

// ─── Plant events ─────────────────────────────────────────────────────────────

export function trackPlantAdded(plantName: string, plantCategory: string, bedId: string, stage: string) {
  fireEvent('plant_added', { plant_name: plantName, plant_category: plantCategory, bed_id: bedId, stage });
}

export function trackPlantRemoved(plantName: string, bedId: string) {
  fireEvent('plant_removed', { plant_name: plantName, bed_id: bedId });
}

export function trackSeedTrayPlantAdded(plantName: string, plantCategory: string, bedId: string) {
  fireEvent('seed_tray_plant_added', { plant_name: plantName, plant_category: plantCategory, bed_id: bedId });
}

// ─── Bed events ───────────────────────────────────────────────────────────────

export function trackBedCreated(bedType: string, widthFt: number, lengthFt: number, sunExposure: string) {
  fireEvent('bed_created', { bed_type: bedType, width_ft: widthFt, length_ft: lengthFt, sun_exposure: sunExposure });
}

export function trackBedResized(bedType: string, widthFt: number, lengthFt: number) {
  fireEvent('bed_resized', { bed_type: bedType, width_ft: widthFt, length_ft: lengthFt });
}

// ─── View events ──────────────────────────────────────────────────────────────

export function trackSeedTrayOpened() {
  fireEvent('seed_tray_opened');
}

export function track3DViewOpened() {
  fireEvent('3d_view_opened');
}

// ─── Gap suggestions ──────────────────────────────────────────────────────────

/** Fired when the user clicks a gap suggestion chip (signals intent/interest). */
export function trackGapSuggestionClicked(plantName: string, bedName: string, method: string) {
  fireEvent('gap_suggestion_clicked', { plant_name: plantName, bed_name: bedName, method });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function trackSetupCompleted(zipcode: string, bedCount: number, plotTopEdge: string) {
  fireEvent('setup_completed', { zipcode, bed_count: bedCount, plot_top_edge: plotTopEdge });
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export function trackWeatherChecked(zipcode: string) {
  fireEvent('weather_checked', { zipcode });
}

// ─── Seasons ──────────────────────────────────────────────────────────────────

export function trackSeasonViewed(seasonName: string) {
  fireEvent('season_viewed', { season_name: seasonName });
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export function trackShareLinkCreated() {
  fireEvent('share_link_created');
}
