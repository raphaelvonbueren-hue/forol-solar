import { describe, it, expect } from 'vitest';
import { sunPosition, swissOffsetHours, findSunEvents, formatMinutes } from './solar';

describe('sunPosition', () => {
  /**
   * Referenz: Zürich (47.3769° N, 8.5417° E) solarer Mittag am 21. Juni 2026.
   * Solarer Mittag liegt ca. 11:26 UTC (Längengrad 8.54° entspricht +34 Min vor UTC,
   * dazu Equation of Time im Juni ~-1.5 Min).
   * Erwartung: Azimut ≈ 180°, Höhe ≈ 90° - 47.3769° + 23.44° = 66.06°
   */
  it('liefert korrekte Sonnenhöhe am Sommer-Mittag in Zürich', () => {
    const pos = sunPosition(new Date('2026-06-21T11:26:00Z'), 47.3769, 8.5417);
    expect(pos.altitude).toBeGreaterThan(65);
    expect(pos.altitude).toBeLessThan(67);
    expect(pos.azimuth).toBeGreaterThan(178);
    expect(pos.azimuth).toBeLessThan(182);
  });

  /**
   * Winter-Sonnenwende: Sonne im Süden, niedrig.
   * Erwartung: Höhe ≈ 90° - 47.3769° - 23.44° = 19.18°
   */
  it('liefert korrekte Sonnenhöhe am Winter-Mittag in Zürich', () => {
    const pos = sunPosition(new Date('2026-12-21T11:30:00Z'), 47.3769, 8.5417);
    expect(pos.altitude).toBeGreaterThan(18);
    expect(pos.altitude).toBeLessThan(20);
    expect(pos.azimuth).toBeGreaterThan(178);
    expect(pos.azimuth).toBeLessThan(184);
  });

  /**
   * Tagundnachtgleiche: Höhe ≈ 90° - Breite = 42.62°
   */
  it('liefert korrekte Sonnenhöhe an Tagundnachtgleiche', () => {
    const pos = sunPosition(new Date('2026-03-21T11:30:00Z'), 47.3769, 8.5417);
    expect(pos.altitude).toBeGreaterThan(41);
    expect(pos.altitude).toBeLessThan(44);
  });

  /**
   * Im Hochsommer geht die Sonne in der Schweiz im Nordosten auf (Az ~50-60°)
   * und im Nordwesten unter (Az ~300-310°).
   */
  it('Sommer-Sonnenaufgang in Zürich liegt im Nordosten', () => {
    const pos = sunPosition(new Date('2026-06-21T03:30:00Z'), 47.3769, 8.5417);
    expect(pos.azimuth).toBeGreaterThan(45);
    expect(pos.azimuth).toBeLessThan(65);
    expect(pos.altitude).toBeGreaterThan(-2);
    expect(pos.altitude).toBeLessThan(5);
  });

  it('Azimut bleibt im Bereich [0, 360)', () => {
    for (let h = 0; h < 24; h++) {
      const pos = sunPosition(new Date(Date.UTC(2026, 5, 21, h)), 47.3769, 8.5417);
      expect(pos.azimuth).toBeGreaterThanOrEqual(0);
      expect(pos.azimuth).toBeLessThan(360);
    }
  });
});

describe('swissOffsetHours', () => {
  it('liefert MEZ (UTC+1) für Januar', () => {
    expect(swissOffsetHours(new Date('2026-01-15T12:00:00Z'))).toBe(1);
  });

  it('liefert MESZ (UTC+2) für Juni', () => {
    expect(swissOffsetHours(new Date('2026-06-15T12:00:00Z'))).toBe(2);
  });

  it('wechselt am letzten Sonntag im März', () => {
    // 2026: 29. März ist letzter Sonntag
    expect(swissOffsetHours(new Date('2026-03-29T00:30:00Z'))).toBe(1);
    expect(swissOffsetHours(new Date('2026-03-29T01:30:00Z'))).toBe(2);
  });

  it('wechselt am letzten Sonntag im Oktober', () => {
    // 2026: 25. Oktober ist letzter Sonntag
    expect(swissOffsetHours(new Date('2026-10-25T00:30:00Z'))).toBe(2);
    expect(swissOffsetHours(new Date('2026-10-25T01:30:00Z'))).toBe(1);
  });
});

describe('findSunEvents', () => {
  it('21. Juni in Zürich: lange Tageslänge (>15 Stunden)', () => {
    const events = findSunEvents(2026, 5, 21, 47.3769, 8.5417);
    expect(events.sunrise).not.toBeNull();
    expect(events.sunset).not.toBeNull();
    const dayLengthMin = events.sunset! - events.sunrise!;
    expect(dayLengthMin).toBeGreaterThan(15 * 60);
    expect(dayLengthMin).toBeLessThan(17 * 60);
  });

  it('21. Dezember in Zürich: kurze Tageslänge (<9 Stunden)', () => {
    const events = findSunEvents(2026, 11, 21, 47.3769, 8.5417);
    expect(events.sunrise).not.toBeNull();
    expect(events.sunset).not.toBeNull();
    const dayLengthMin = events.sunset! - events.sunrise!;
    expect(dayLengthMin).toBeGreaterThan(8 * 60);
    expect(dayLengthMin).toBeLessThan(9 * 60);
  });

  it('Max-Höhe im Sommer ist höher als im Winter', () => {
    const summer = findSunEvents(2026, 5, 21, 47.3769, 8.5417);
    const winter = findSunEvents(2026, 11, 21, 47.3769, 8.5417);
    expect(summer.maxAltitude).toBeGreaterThan(winter.maxAltitude);
    expect(summer.maxAltitude - winter.maxAltitude).toBeCloseTo(46.88, 0); // 2 × 23.44°
  });
});

describe('formatMinutes', () => {
  it('formatiert ohne Offset', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(60)).toBe('01:00');
    expect(formatMinutes(750)).toBe('12:30');
    expect(formatMinutes(1439)).toBe('23:59');
  });

  it('berücksichtigt Zeitzonen-Offset', () => {
    expect(formatMinutes(600, 1)).toBe('11:00'); // 10:00 UTC + 1h = 11:00
    expect(formatMinutes(600, 2)).toBe('12:00'); // 10:00 UTC + 2h = 12:00
  });

  it('wickelt um Mitternacht korrekt um', () => {
    expect(formatMinutes(1380, 2)).toBe('01:00'); // 23:00 UTC + 2h = 01:00 nächster Tag
    expect(formatMinutes(60, -2)).toBe('23:00'); // 01:00 UTC - 2h = 23:00 Vortag
  });
});
