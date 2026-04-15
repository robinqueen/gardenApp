import { useState, useEffect } from 'react';
import { fetchWeather, getCachedWeather, setCachedWeather, type WeatherFeed } from '../utils/weather';
import { trackWeatherChecked } from '../utils/analytics';

export function useWeather(zipcode: string) {
  const [feed, setFeed]       = useState<WeatherFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!zipcode || zipcode.length < 5) {
      setFeed(null);
      return;
    }

    const cached = getCachedWeather(zipcode);
    if (cached) {
      setFeed(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWeather(zipcode)
      .then((f) => {
        if (cancelled) return;
        setCachedWeather(zipcode, f);
        setFeed(f);
        trackWeatherChecked(zipcode);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [zipcode]);

  return { feed, loading, error };
}
