import { describe, it, expect } from 'vitest';
import { geoToLocal, localToGeo, rotateXZ } from './geo';

describe('geoToLocal / localToGeo', () => {
  const origin = { lat: 47.3769, lon: 8.5417 }; // Zürich

  it('Ursprung selbst gibt (0, 0)', () => {
    const p = geoToLocal(origin.lat, origin.lon, origin);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('1° Länge nach Osten ≈ 75.5 km bei 47° Breite', () => {
    const p = geoToLocal(origin.lat, origin.lon + 1, origin);
    expect(p.x).toBeGreaterThan(75000);
    expect(p.x).toBeLessThan(76000);
    expect(p.z).toBeCloseTo(0, 0);
  });

  it('1° Breite nach Norden ≈ 111 km, gibt negatives z', () => {
    const p = geoToLocal(origin.lat + 1, origin.lon, origin);
    expect(p.z).toBeLessThan(-110000);
    expect(p.z).toBeGreaterThan(-112000);
  });

  it('Round-trip bleibt sub-Millimeter genau in der Nähe des Ursprungs', () => {
    const testPoints = [
      { lat: 47.3770, lon: 8.5420 }, // ~25 m
      { lat: 47.3850, lon: 8.5500 }, // ~1 km
      { lat: 47.4000, lon: 8.5700 }, // ~3 km
    ];
    for (const tp of testPoints) {
      const local = geoToLocal(tp.lat, tp.lon, origin);
      const back = localToGeo(local, origin);
      expect(back.lat).toBeCloseTo(tp.lat, 8);
      expect(back.lon).toBeCloseTo(tp.lon, 8);
    }
  });

  it('Distanz CH144-Demo Süd-Punkt nach Nord-Punkt: ~20 m für 10m+10m Box', () => {
    // FOROL CH144 Demo verwendet ±10m × ±15m
    const south = geoToLocal(47.3769 - 10 / 111000, 8.5417, origin);
    const north = geoToLocal(47.3769 + 10 / 111000, 8.5417, origin);
    const dist = Math.abs(south.z - north.z);
    expect(dist).toBeCloseTo(20, 1);
  });
});

describe('rotateXZ', () => {
  it('Identität bei rad = 0', () => {
    expect(rotateXZ(3, 5, 0)).toEqual({ x: 3, z: 5 });
  });

  it('90° dreht +X (Ost) nach -Z (Nord)', () => {
    const r = rotateXZ(1, 0, Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.z).toBeCloseTo(-1, 10);
  });

  it('90° dreht +Z (Süd) nach +X (Ost)', () => {
    const r = rotateXZ(0, 1, Math.PI / 2);
    expect(r.x).toBeCloseTo(1, 10);
    expect(r.z).toBeCloseTo(0, 10);
  });

  it('180° invertiert beide Achsen', () => {
    const r = rotateXZ(2, -3, Math.PI);
    expect(r.x).toBeCloseTo(-2, 10);
    expect(r.z).toBeCloseTo(3, 10);
  });

  it('Rotation erhält die Länge (isometrisch)', () => {
    const r = rotateXZ(3, 4, 0.7);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(5, 10);
  });
});
