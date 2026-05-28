import { describe, it, expect } from 'vitest';
import { computeApartmentSunHours } from './apartment-sun';
import type { Apartment, Massing } from '@/types';

describe('computeApartmentSunHours', () => {
  // Jakobspark Rorschach: 47.4790°N, 9.4910°E
  // Sommer-Sonnenwende: 21. Juni 2026

  function makeApt(id: string, bbox: { xMin: number; xMax: number; zMin: number; zMax: number }): Apartment {
    return {
      id,
      name: id,
      bbox,
    };
  }

  function makeMassing(zOffset: number, subzones: Apartment[]): Massing {
    return {
      id: 'm1',
      name: 'm1',
      outline: [],
      holes: [],
      height: 3,
      zOffset,
      splitMode: 'long2',
      subzones,
    };
  }

  it('Süd-Wohnung an Sommer-Sonnenwende hat viele Sonnenstunden', () => {
    // Subzone im Süden des Massings (positiver Z)
    const southApt = makeApt('s', { xMin: -5, xMax: 5, zMin: 4, zMax: 10 });
    const northApt = makeApt('n', { xMin: -5, xMax: 5, zMin: -10, zMax: -4 });
    const massing = makeMassing(0, [southApt, northApt]);

    const result = computeApartmentSunHours(
      southApt,
      massing,
      { year: 2026, month: 6, day: 21 },
      47.4790,
      9.4910,
      0,
      0,
    );

    expect(result.facingLabel).toBe('Süd');
    expect(result.totalSunnyHours).toBeGreaterThanOrEqual(7);
  });

  it('Nord-Wohnung hat weniger Sonnenstunden', () => {
    const southApt = makeApt('s', { xMin: -5, xMax: 5, zMin: 4, zMax: 10 });
    const northApt = makeApt('n', { xMin: -5, xMax: 5, zMin: -10, zMax: -4 });
    const massing = makeMassing(0, [southApt, northApt]);

    const result = computeApartmentSunHours(
      northApt,
      massing,
      { year: 2026, month: 6, day: 21 },
      47.4790,
      9.4910,
      0,
      0,
    );

    expect(result.facingLabel).toBe('Nord');
    // Nord-Wohnungen haben realistisch 4-6h früh/spät Sommer-Sonne
    expect(result.totalSunnyHours).toBeLessThanOrEqual(6);
  });

  it('Höhere Etage bekommt mehr Sonne (Etagen-Bonus)', () => {
    const apt = makeApt('a', { xMin: -5, xMax: 5, zMin: 4, zMax: 10 });
    const other = makeApt('b', { xMin: -5, xMax: 5, zMin: -10, zMax: -4 });
    const massing = makeMassing(0, [apt, other]);

    const eg = computeApartmentSunHours(
      apt,
      massing,
      { year: 2026, month: 3, day: 15 },
      47.4790,
      9.4910,
      0,
      0,
    );
    const top = computeApartmentSunHours(
      apt,
      massing,
      { year: 2026, month: 3, day: 15 },
      47.4790,
      9.4910,
      0,
      3,
    );

    expect(top.totalSunnyHours).toBeGreaterThanOrEqual(eg.totalSunnyHours);
  });

  it('West-Wohnung hat Sonne am Nachmittag', () => {
    const westApt = makeApt('w', { xMin: -10, xMax: -4, zMin: -5, zMax: 5 });
    const eastApt = makeApt('e', { xMin: 4, xMax: 10, zMin: -5, zMax: 5 });
    const massing = makeMassing(0, [westApt, eastApt]);

    const result = computeApartmentSunHours(
      westApt,
      massing,
      { year: 2026, month: 6, day: 21 },
      47.4790,
      9.4910,
      0,
      0,
    );

    expect(result.facingLabel).toBe('West');
    // Nachmittagssonne 14-19h
    const afternoonSunny = result.hourly.filter((h) => h.hour >= 14 && h.hour <= 19 && h.sunny).length;
    expect(afternoonSunny).toBeGreaterThanOrEqual(2);
  });

  it('Best-Hour-Range zeigt zusammenhängende Sonne', () => {
    const apt = makeApt('a', { xMin: -5, xMax: 5, zMin: 4, zMax: 10 });
    const other = makeApt('b', { xMin: -5, xMax: 5, zMin: -10, zMax: -4 });
    const massing = makeMassing(0, [apt, other]);

    const result = computeApartmentSunHours(
      apt,
      massing,
      { year: 2026, month: 6, day: 21 },
      47.4790,
      9.4910,
      0,
      0,
    );

    expect(result.bestHourRange).not.toBeNull();
    if (result.bestHourRange) {
      expect(result.bestHourRange.end).toBeGreaterThan(result.bestHourRange.start);
    }
  });
});
