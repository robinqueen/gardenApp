export interface WeatherDay {
  date: string;         // YYYY-MM-DD
  tempHighF: number;
  tempLowF: number;
  precipMm: number;
  weatherCode: number;  // WMO weather interpretation code
  isRainy: boolean;     // precipMm > 1
  isFreezing: boolean;  // tempLowF < 35
}

export interface WeatherFeed {
  zipcode: string;
  fetchedAt: string;   // ISO — for cache invalidation
  days: WeatherDay[];  // 7 entries
  lat: number;
  lng: number;
}

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const LATLON_KEY = (zip: string) => `gardenapp-latlon-${zip}`;
const WEATHER_KEY = (zip: string) => `gardenapp-weather-${zip}`;

// WMO code → emoji
export function weatherEmoji(code: number): string {
  if (code === 0)                     return '☀️';
  if (code <= 3)                      return '⛅';
  if (code <= 48)                     return '🌫️';
  if (code <= 67)                     return '🌧️';
  if (code <= 77)                     return '❄️';
  if (code <= 82)                     return '🌦️';
  if (code >= 95)                     return '⛈️';
  return '🌤️';
}

export function getCachedWeather(zipcode: string): WeatherFeed | null {
  try {
    const raw = localStorage.getItem(WEATHER_KEY(zipcode));
    if (!raw) return null;
    const feed = JSON.parse(raw) as WeatherFeed;
    if (Date.now() - new Date(feed.fetchedAt).getTime() > CACHE_TTL_MS) return null;
    return feed;
  } catch {
    return null;
  }
}

export function setCachedWeather(zipcode: string, feed: WeatherFeed): void {
  try {
    localStorage.setItem(WEATHER_KEY(zipcode), JSON.stringify(feed));
  } catch { /* storage full — ignore */ }
}

async function getLatLon(zipcode: string): Promise<{ lat: number; lng: number }> {
  // Check localStorage cache first (lat/lon never changes for a zip)
  const cached = localStorage.getItem(LATLON_KEY(zipcode));
  if (cached) {
    return JSON.parse(cached) as { lat: number; lng: number };
  }

  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipcode)}&countrycodes=us&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GardenApp/1.0 (garden planning app)' },
  });

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json() as Array<{ lat: string; lon: string }>;
  if (!data.length) throw new Error(`No location found for zip: ${zipcode}`);

  const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  localStorage.setItem(LATLON_KEY(zipcode), JSON.stringify(result));
  return result;
}

export async function fetchWeather(zipcode: string): Promise<WeatherFeed> {
  const { lat, lng } = await getLatLon(zipcode);

  const url = [
    'https://api.open-meteo.com/v1/forecast',
    `?latitude=${lat}&longitude=${lng}`,
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
    '&temperature_unit=fahrenheit',
    '&precipitation_unit=mm',
    '&timezone=auto',
    '&forecast_days=7',
  ].join('');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);

  const json = await res.json() as {
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      weathercode: number[];
    };
  };

  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, weathercode } = json.daily;

  const days: WeatherDay[] = time.map((date, i) => ({
    date,
    tempHighF: Math.round(temperature_2m_max[i]),
    tempLowF:  Math.round(temperature_2m_min[i]),
    precipMm:  precipitation_sum[i] ?? 0,
    weatherCode: weathercode[i],
    isRainy:    (precipitation_sum[i] ?? 0) > 1,
    isFreezing: temperature_2m_min[i] < 35,
  }));

  return {
    zipcode,
    fetchedAt: new Date().toISOString(),
    days,
    lat,
    lng,
  };
}
