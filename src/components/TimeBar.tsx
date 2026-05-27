import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/lib/store';
import { formatMinutes } from '@/lib/solar';

export function TimeBar() {
  const dateTime = useProjectStore((s) => s.dateTime);
  const setDateTime = useProjectStore((s) => s.setDateTime);
  const animating = useProjectStore((s) => s.animating);
  const animMode = useProjectStore((s) => s.animMode);
  const setAnimating = useProjectStore((s) => s.setAnimating);
  const setAnimMode = useProjectStore((s) => s.setAnimMode);

  const frameRef = useRef<number | null>(null);
  const yearTickRef = useRef(0);

  useEffect(() => {
    if (!animating) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      return;
    }
    function tick() {
      const s = useProjectStore.getState();
      if (s.animMode === 'day') {
        const next = (s.dateTime.localMinutes + 5) % 1440;
        s.setDateTime({ localMinutes: next });
      } else {
        yearTickRef.current++;
        if (yearTickRef.current >= 3) {
          yearTickRef.current = 0;
          const d = new Date(Date.UTC(s.dateTime.year, s.dateTime.month, s.dateTime.day));
          d.setUTCDate(d.getUTCDate() + 1);
          s.setDateTime({
            year: d.getUTCFullYear(),
            month: d.getUTCMonth(),
            day: d.getUTCDate(),
          });
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [animating]);

  const iso = `${dateTime.year}-${String(dateTime.month + 1).padStart(2, '0')}-${String(dateTime.day).padStart(2, '0')}`;
  const dateLabel = new Date(dateTime.year, dateTime.month, dateTime.day).toLocaleDateString('de-CH', {
    day: '2-digit', month: 'short',
  });

  return (
    <div className="timebar">
      <div className="timebar-row">
        <span className="timebar-label">Datum</span>
        <input
          type="date"
          value={iso}
          style={{ flex: 1, maxWidth: 140 }}
          onChange={(e) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            setDateTime({ year: y, month: m - 1, day: d });
          }}
        />
        <span className="timebar-value">{dateLabel}</span>
      </div>
      <div className="timebar-row">
        <span className="timebar-label">Uhrzeit</span>
        <span className="timebar-value">{formatMinutes(dateTime.localMinutes)}</span>
        <input
          type="range" min={0} max={1439} step={5}
          value={dateTime.localMinutes}
          style={{ flex: 1 }}
          onChange={(e) => setDateTime({ localMinutes: parseInt(e.target.value, 10) })}
        />
      </div>
      <div className="timebar-row">
        <button className="play-btn" onClick={() => setAnimating(!animating)}>
          {animating ? '⏸' : '▶'}
        </button>
        <select
          className="animation-mode"
          value={animMode}
          onChange={(e) => setAnimMode(e.target.value as 'day' | 'year')}
        >
          <option value="day">Tagesablauf</option>
          <option value="year">Jahresablauf</option>
        </select>
        <span className="timebar-value">{animating ? 'Läuft …' : 'Pausiert'}</span>
      </div>
    </div>
  );
}
