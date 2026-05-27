import { describe, it, expect } from 'vitest';
import { createCH144Demo } from './demo-ch144';

describe('createCH144Demo', () => {
  it('liefert ein gültiges Projekt', () => {
    const p = createCH144Demo();
    expect(p.version).toBe('1.0');
    expect(p.buildingMode).toBe('polygon');
    expect(p.location.label).toMatch(/CH144/);
  });

  it('hat zwei Häuser à 4 Etagen = 8 Massings', () => {
    const p = createCH144Demo();
    expect(p.massings).toHaveLength(8);
  });

  it('alle Etagen haben Aufteilungsmodus cross2', () => {
    const p = createCH144Demo();
    for (const m of p.massings) {
      expect(m.splitMode).toBe('cross2');
    }
  });

  it('Etagen stapeln sich vertikal mit korrekten z-Offsets', () => {
    const p = createCH144Demo();
    const hausA = p.massings.filter(m => m.name.startsWith('Haus A'));
    expect(hausA).toHaveLength(4);
    // EG bei 0, 1.OG bei 2.85, 2.OG bei 5.70, 3.OG bei 8.55
    expect(hausA[0].zOffset).toBeCloseTo(0, 2);
    expect(hausA[1].zOffset).toBeCloseTo(2.85, 2);
    expect(hausA[2].zOffset).toBeCloseTo(5.7, 2);
    expect(hausA[3].zOffset).toBeCloseTo(8.55, 2);
  });

  it('Außenkonturen sind geschlossene Vierecke', () => {
    const p = createCH144Demo();
    for (const m of p.massings) {
      expect(m.outline).toHaveLength(4);
      expect(m.holes).toEqual([]);
    }
  });

  it('Datum/Uhrzeit ist Sommer-Mittag (Bestrahlungs-Showcase)', () => {
    const p = createCH144Demo();
    expect(p.dateTime.month).toBe(5); // Juni
    expect(p.dateTime.localMinutes).toBe(12 * 60); // Mittag
  });

  it('Haus A und Haus B haben unterschiedliche Lage', () => {
    const p = createCH144Demo();
    const a = p.massings.find(m => m.name === 'Haus A · EG')!;
    const b = p.massings.find(m => m.name === 'Haus B · EG')!;
    // Zentroide der beiden Außenkonturen unterscheiden sich in Längengrad
    const aCenterLon = a.outline.reduce((s, p) => s + p[1], 0) / a.outline.length;
    const bCenterLon = b.outline.reduce((s, p) => s + p[1], 0) / b.outline.length;
    expect(Math.abs(aCenterLon - bCenterLon)).toBeGreaterThan(0);
  });
});
