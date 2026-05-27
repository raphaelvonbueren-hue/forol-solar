import { describe, it, expect } from 'vitest';
import {
  generateBoxSamples,
  generateMassingSamples,
  buildAnalysisTimestamps,
  sunHoursToRGB,
} from './heatmap-compute';
import type { BoxBuilding, LatLon, Massing } from '@/types';

const origin = { lat: 47.3769, lon: 8.5417 };

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

describe('generateBoxSamples', () => {
  const box: BoxBuilding = { length: 20, width: 10, height: 6, rotationDeg: 0 };

  it('erzeugt Samples für alle vier Wände', () => {
    const samples = generateBoxSamples(box, 1);
    const wallIds = new Set(samples.map(s => s.wallId));
    expect(wallIds.size).toBe(4);
  });

  it('alle Samples liegen über Grund', () => {
    const samples = generateBoxSamples(box, 1);
    for (const s of samples) {
      expect(s.position.y).toBeGreaterThanOrEqual(0);
      expect(s.position.y).toBeLessThanOrEqual(box.height);
    }
  });

  it('Normalen sind Einheitsvektoren', () => {
    const samples = generateBoxSamples(box, 1.5);
    for (const s of samples) {
      const len = Math.sqrt(s.normal.x * s.normal.x + s.normal.z * s.normal.z);
      expect(len).toBeCloseTo(1, 4);
    }
  });

  it('feinerer Spacing → mehr Samples', () => {
    const coarse = generateBoxSamples(box, 2.0);
    const fine = generateBoxSamples(box, 1.0);
    expect(fine.length).toBeGreaterThan(coarse.length);
  });

  it('Massing-ID ist "box" für alle Samples', () => {
    const samples = generateBoxSamples(box, 1.5);
    for (const s of samples) expect(s.massingId).toBe('box');
  });
});

describe('generateMassingSamples', () => {
  it('Etage ohne Innenhof: erzeugt Samples', () => {
    const m: Massing = {
      id: 'm1',
      name: 'EG',
      outline: rectFootprint(20, 10),
      holes: [],
      height: 3,
      zOffset: 0,
      splitMode: 'none',
      subzones: [],
    };
    const samples = generateMassingSamples(m, 1.5, origin);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every(s => !s.isHole)).toBe(true);
  });

  it('Etage mit Innenhof: erzeugt isHole-Samples', () => {
    const m: Massing = {
      id: 'm1',
      name: '1.OG',
      outline: rectFootprint(20, 20),
      holes: [rectFootprint(8, 8)],
      height: 3,
      zOffset: 3,
      splitMode: 'none',
      subzones: [],
    };
    const samples = generateMassingSamples(m, 1.5, origin);
    const outerSamples = samples.filter(s => !s.isHole);
    const holeSamples = samples.filter(s => s.isHole);
    expect(outerSamples.length).toBeGreaterThan(0);
    expect(holeSamples.length).toBeGreaterThan(0);
  });

  it('z-Offset wird auf y-Position addiert', () => {
    const m: Massing = {
      id: 'm1', name: 'Attika',
      outline: rectFootprint(10, 10),
      holes: [],
      height: 3,
      zOffset: 6,
      splitMode: 'none',
      subzones: [],
    };
    const samples = generateMassingSamples(m, 1.5, origin);
    for (const s of samples) {
      expect(s.position.y).toBeGreaterThanOrEqual(6);
      expect(s.position.y).toBeLessThanOrEqual(9);
    }
  });
});

describe('buildAnalysisTimestamps', () => {
  it('fast: 12 Tage × 19 Stunden', () => {
    const { dates, scaleFactor } = buildAnalysisTimestamps('fast', 2026);
    expect(dates.length).toBe(12 * 19);
    expect(scaleFactor).toBeCloseTo(365 / 12, 4);
  });

  it('medium: 52 Tage × 19 Stunden', () => {
    const { dates, scaleFactor } = buildAnalysisTimestamps('medium', 2026);
    expect(dates.length).toBe(52 * 19);
    expect(scaleFactor).toBeCloseTo(365 / 52, 4);
  });

  it('accurate: 365 Tage × 19 Stunden', () => {
    const { dates, scaleFactor } = buildAnalysisTimestamps('accurate', 2026);
    expect(dates.length).toBe(365 * 19);
    expect(scaleFactor).toBe(1);
  });
});

describe('sunHoursToRGB', () => {
  it('0 Stunden gibt dunkelblau', () => {
    const [r, , b] = sunHoursToRGB(0, 2000);
    expect(r).toBeLessThan(0.2);
    expect(b).toBeGreaterThan(0.2);
  });

  it('Max-Wert gibt rot', () => {
    const [r, g, b] = sunHoursToRGB(2000, 2000);
    expect(r).toBeGreaterThan(0.7);
    expect(b).toBeLessThan(0.3);
    expect(g).toBeLessThan(0.3);
  });

  it('Mittelwert ist Grün-Ton', () => {
    const [r, g, b] = sunHoursToRGB(1000, 2000);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });
});