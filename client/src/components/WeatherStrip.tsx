import { useWeather } from '../hooks/useWeather';
import { weatherEmoji } from '../utils/weather';

interface WeatherStripProps {
  zipcode: string;
  /** Show frost warning banner if any of next 5 days is below 35°F */
  hasInGroundPlants: boolean;
}

export function WeatherStrip({ zipcode, hasInGroundPlants }: WeatherStripProps) {
  const { feed, loading, error } = useWeather(zipcode);

  if (!zipcode || zipcode.length < 5) return null;
  if (loading) return <div className="weather-loading">🌤️ Loading weather…</div>;
  if (error)   return null; // Fail silently — weather is a nice-to-have

  if (!feed) return null;

  const today = new Date().toISOString().slice(0, 10);

  // Frost risk in next 5 days
  const frostRisk = hasInGroundPlants && feed.days
    .slice(0, 5)
    .some(d => d.isFreezing);

  const frostRiskDay = frostRisk
    ? feed.days.slice(0, 5).find(d => d.isFreezing)
    : null;

  // Rain in next 2 days
  const rainSoon = feed.days.slice(0, 2).some(d => d.isRainy);

  return (
    <div className="weather-block">
      {/* Frost warning */}
      {frostRisk && frostRiskDay && (
        <div className="weather-banner weather-banner--frost">
          🌡️ <strong>Frost risk</strong> — low of {frostRiskDay.tempLowF}°F forecast.
          Protect tender plants.
        </div>
      )}

      {/* Skip watering */}
      {rainSoon && (
        <div className="weather-banner weather-banner--rain">
          🌧️ <strong>Rain forecast</strong> — you may be able to skip watering.
        </div>
      )}

      {/* 7-day strip */}
      <div className="weather-strip">
        {feed.days.map((day) => {
          const dayLabel = day.date === today
            ? 'Today'
            : new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <div key={day.date} className={`weather-day${day.date === today ? ' weather-day--today' : ''}`}>
              <div className="weather-day-label">{dayLabel}</div>
              <div className="weather-day-icon">{weatherEmoji(day.weatherCode)}</div>
              <div className="weather-day-high">{day.tempHighF}°</div>
              <div className="weather-day-low">{day.tempLowF}°</div>
              {day.isRainy && <div className="weather-day-rain">💧</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
