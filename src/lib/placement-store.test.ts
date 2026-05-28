import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredPlacement,
  setStoredPlacement,
  clearStoredPlacement,
  formatPlacementAsCode,
} from './placement-store';

describe('placement-store', () => {
  beforeEach(() => {
    // Reset localStorage mock for each test
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
  });

  it('gibt null zurück wenn nichts gespeichert ist', () => {
    expect(getStoredPlacement('Jakobspark Rorschach')).toBeNull();
  });

  it('speichert und liest Placement-Werte korrekt', () => {
    setStoredPlacement('Jakobspark Rorschach', { rotationDeg: -15, offsetX: 10, offsetZ: -5 });
    const loaded = getStoredPlacement('Jakobspark Rorschach');
    expect(loaded).toEqual({ rotationDeg: -15, offsetX: 10, offsetZ: -5 });
  });

  it('isoliert Werte nach Projekt-Label', () => {
    setStoredPlacement('Projekt A', { rotationDeg: 10, offsetX: 0, offsetZ: 0 });
    setStoredPlacement('Projekt B', { rotationDeg: 20, offsetX: 0, offsetZ: 0 });
    expect(getStoredPlacement('Projekt A')?.rotationDeg).toBe(10);
    expect(getStoredPlacement('Projekt B')?.rotationDeg).toBe(20);
  });

  it('clear entfernt nur das gewünschte Projekt', () => {
    setStoredPlacement('A', { rotationDeg: 1, offsetX: 0, offsetZ: 0 });
    setStoredPlacement('B', { rotationDeg: 2, offsetX: 0, offsetZ: 0 });
    clearStoredPlacement('A');
    expect(getStoredPlacement('A')).toBeNull();
    expect(getStoredPlacement('B')).not.toBeNull();
  });

  it('formatPlacementAsCode produziert gültigen TS-Snippet', () => {
    const code = formatPlacementAsCode(
      { rotationDeg: -15.5, offsetX: 12.3, offsetZ: -4.7 },
      'Jakobspark Rorschach',
    );
    expect(code).toContain('rotationDeg: -15.50');
    expect(code).toContain('offsetX: 12.30');
    expect(code).toContain('offsetZ: -4.70');
    expect(code).toContain('demo-jakobspark-rorschach.ts');
  });

  it('behandelt korrupte JSON-Daten gracefully', () => {
    localStorage.setItem('forol-solar:placement:test-projekt', '{not valid json');
    expect(getStoredPlacement('Test Projekt')).toBeNull();
  });

  it('behandelt fehlende Felder gracefully', () => {
    localStorage.setItem(
      'forol-solar:placement:test-projekt',
      JSON.stringify({ rotationDeg: 10 }), // offsetX/offsetZ fehlen
    );
    expect(getStoredPlacement('Test Projekt')).toBeNull();
  });
});
