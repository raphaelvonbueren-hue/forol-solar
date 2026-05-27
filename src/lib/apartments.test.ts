import { describe, it, expect } from 'vitest';
import { autoSplitMassing, pointInBox } from './apartments';
import type { LatLon } from '@/types';

const origin = { lat: 47.3769, lon: 8.5417 };

/**
 * Hilfsfunktion: rechteckiges Footprint um origin, Breite x in Ost-West-Richtung,
 * Tiefe z in Nord-Süd-Richtung, beides in Metern.
 */
function rectFootprint(widthM: number, depthM: number): LatLon[] {
  const lat2m = 1 / 111000;
  const lon2m = 1 / (111000 * Math.cos((origin.lat * Math.PI) / 180));
  const halfW = (widthM / 2) * lon2m;
  const halfD = (depthM / 2) * lat2m;
  return [
    [origin.lat - halfD, origin.lon - halfW],
    [origin.lat - halfD, origin.lon + halfW],
    [origin.lat + halfD, origin.lon + halfW],
    [origin.lat + halfD, origin.lon - halfW],
  ];
}

describe('autoSplitMassing', () => {
  it('Mode "none" gibt leeres Array', () => {
    const m = { id: 'm1', outline: rectFootprint(30, 15) };
    expect(autoSplitMassing(m, 'none', origin)).toEqual([]);
  });

  it('Polygon mit <3 Punkten gibt leeres Array', () => {
    const m = { id: 'm1', outline: [[47, 8], [47.001, 8.001]] as LatLon[] };
    expect(autoSplitMassing(m, 'long4', origin)).toEqual([]);
  });

  it('long4 auf 30x15m Footprint: 4 Wohnungen entlang langer Achse', () => {
    const m = { id: 'm1', outline: rectFootprint(30, 15) };
    const apts = autoSplitMassing(m, 'long4', origin);
    expect(apts).toHaveLength(4);
    // Lange Achse ist x (Ost-West), also sollte sich die x-Ausdehnung pro Wohnung
    // ungefähr auf 30/4 = 7.5 m belaufen
    for (const apt of apts) {
      const xExtent = apt.bbox.xMax - apt.bbox.xMin;
      expect(xExtent).toBeCloseTo(7.5, 1);
    }
  });

  it('cross2 auf 30x15m: 2 Wohnungen quer zur langen Achse (also entlang z)', () => {
    const m = { id: 'm1', outline: rectFootprint(30, 15) };
    const apts = autoSplitMassing(m, 'cross2', origin);
    expect(apts).toHaveLength(2);
    // Quer zur langen Achse = entlang z, also sollte z-Ausdehnung halbiert sein
    for (const apt of apts) {
      const zExtent = apt.bbox.zMax - apt.bbox.zMin;
      expect(zExtent).toBeCloseTo(7.5, 1);
    }
  });

  it('grid2x2: 4 Wohnungen in 2x2-Anordnung', () => {
    const m = { id: 'm1', outline: rectFootprint(20, 20) };
    const apts = autoSplitMassing(m, 'grid2x2', origin);
    expect(apts).toHaveLength(4);
    for (const apt of apts) {
      expect(apt.bbox.xMax - apt.bbox.xMin).toBeCloseTo(10, 1);
      expect(apt.bbox.zMax - apt.bbox.zMin).toBeCloseTo(10, 1);
    }
  });

  it('grid2x3: 6 Wohnungen', () => {
    const m = { id: 'm1', outline: rectFootprint(30, 20) };
    expect(autoSplitMassing(m, 'grid2x3', origin)).toHaveLength(6);
  });

  it('Wohnungen haben eindeutige IDs', () => {
    const m = { id: 'm1', outline: rectFootprint(20, 20) };
    const apts = autoSplitMassing(m, 'grid2x2', origin);
    const ids = new Set(apts.map(a => a.id));
    expect(ids.size).toBe(apts.length);
  });

  it('Bei "tieferem als breitem" Footprint: long teilt entlang der z-Achse', () => {
    const m = { id: 'm1', outline: rectFootprint(10, 30) }; // schmal, tief
    const apts = autoSplitMassing(m, 'long3', origin);
    expect(apts).toHaveLength(3);
    // z ist jetzt die lange Achse, also sollte die z-Ausdehnung pro Wohnung ~10m sein
    for (const apt of apts) {
      const zExtent = apt.bbox.zMax - apt.bbox.zMin;
      expect(zExtent).toBeCloseTo(10, 1);
    }
  });
});

describe('pointInBox', () => {
  const bbox = { xMin: 0, xMax: 10, zMin: -5, zMax: 5 };

  it('innerer Punkt liegt drin', () => {
    expect(pointInBox(5, 0, bbox)).toBe(true);
  });

  it('Randpunkt liegt drin (inklusiv)', () => {
    expect(pointInBox(0, -5, bbox)).toBe(true);
    expect(pointInBox(10, 5, bbox)).toBe(true);
  });

  it('außerhalb wird abgelehnt', () => {
    expect(pointInBox(-0.1, 0, bbox)).toBe(false);
    expect(pointInBox(11, 0, bbox)).toBe(false);
    expect(pointInBox(5, -6, bbox)).toBe(false);
    expect(pointInBox(5, 6, bbox)).toBe(false);
  });
});
