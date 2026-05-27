import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import { findSunEvents, formatMinutes, swissOffsetHours } from '@/lib/solar';

export function StatsBar() {
  const dateTime = useProjectStore((s) => s.dateTime);
  const location = useProjectStore((s) => s.location);

  const stats = useMemo(() => {
    const events = findSunEvents(dateTime.year, dateTime.month, dateTime.day, location.lat, location.lon);
    const offsetH = swissOffsetHours(new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 12)));
    const tzLabel = offsetH === 2 ? 'MESZ' : 'MEZ';
    const dayLength =
      events.sunrise !== null && events.sunset !== null ? events.sunset - events.sunrise : null;
    return {
      sunrise: events.sunrise !== null ? formatMinutes(events.sunrise, offsetH) : '—',
      sunset: events.sunset !== null ? formatMinutes(events.sunset, offsetH) : '—',
      maxAltitude: events.maxAltitude.toFixed(1) + '°',
      dayLength: dayLength !== null ? `${Math.floor(dayLength / 60)}h ${Math.round(dayLength % 60)}min` : '—',
      tzLabel,
    };
  }, [dateTime, location]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 1,
        background: 'var(--border)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {[
        ['Sonnenaufgang', stats.sunrise],
        ['Sonnenuntergang', stats.sunset],
        ['Tageslänge', stats.dayLength],
        ['Sonnenhöchststand', stats.maxAltitude],
        ['Lokalzeit', stats.tzLabel],
      ].map(([label, value]) => (
        <div key={label} style={{ background: 'var(--white)', padding: '8px 14px' }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: 'var(--gray)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--dark)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
