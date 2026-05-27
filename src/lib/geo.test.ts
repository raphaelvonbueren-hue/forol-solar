import { describe, it, expect } from 'vitest';
import { geoToLocal, localToGeo } from './geo';

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
