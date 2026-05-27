import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import { findSunEvents, formatMinutes, swissOffsetHours } from '@/lib/solar';

/**
 * Kompakter Sonnenstand-Slider oben mittig, im Vertriebs-Modus.
 * Geht von Sonnenaufgang bis Sonnenuntergang des gewählten Tages.
 */
export function SunBar() {
  const dateTime = useProjectStore((s) => s.dateTime);
  const setDateTime = useProjectStore((s) => s.setDateTime);
  const location = useProjectStore((s) => s.location);

  const events = useMemo(() => {
    const e = findSunEvents(dateTime.year, dateTime.month, dateTime.day, location.lat, location.lon);
    const offsetH = swissOffsetHours(new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 12)));
    return { ...e, offsetH };
  }, [dateTime.year, dateTime.month, dateTime.day, location.lat, location.lon]);

  // Sonnenaufgang/Untergang in lokaler Zeit
  const sunriseLocal = events.sunrise !== null ? events.sunrise + events.offsetH * 60 : 4 * 60;
  const sunsetLocal = events.sunset !== null ? events.sunset + events.offsetH * 60 : 22 * 60;
  // Auf nächste 30-Min-Marke runden für saubere Skala
  const start = Math.floor(sunriseLocal / 30) * 30;
  const end = Math.ceil(sunsetLocal / 30) * 30;

  return (
    <div className="sunbar">
      <div className="sunbar-row">
        <div className="sunbar-icon" title="Sonnenaufgang">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="14" r="4" fill="#F5A623" />
            <path d="M12 4v3M4 14h2M18 14h2M6 8l1.5 1.5M16.5 9.5L18 8M3 18h18" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="sunbar-time-left">{formatMinutes(start)}</div>
        <input
          className="sunbar-slider"
          type="range"
          min={start}
          max={end}
          step={5}
          value={Math.min(end, Math.max(start, dateTime.localMinutes))}
          onChange={(e) => setDateTime({ localMinutes: parseInt(e.target.value, 10) })}
        />
        <div className="sunbar-time-right">{formatMinutes(end)}</div>
        <div className="sunbar-icon" title="Sonnenuntergang">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="14" r="4" fill="#D4682B" />
            <path d="M12 4v3M4 14h2M18 14h2M6 8l1.5 1.5M16.5 9.5L18 8M3 18h18" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="sunbar-label">
        <span className="sunbar-value">{formatMinutes(dateTime.localMinutes)}</span>
        <span className="sunbar-tz">{events.offsetH === 2 ? 'MESZ' : 'MEZ'}</span>
      </div>
    </div>
  );
}
