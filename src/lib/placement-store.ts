/**
 * Per-Projekt persistierte Anlage-Position (Rotation + Offset).
 *
 * Wenn ein Admin das Demo-Projekt mit den Slidern eindreht, kann er
 * die Position als 'Default' speichern. Das überschreibt die hardcodierten
 * Demo-Werte beim nächsten Laden — im selben Browser/User.
 *
 * Für globale Defaults muss Raphael die Werte manuell in den Source-
 * Code (demo-jakobspark.ts) übernehmen — dafür gibt es einen "Code
 * exportieren"-Knopf in PlacementSection.
 */

const STORAGE_KEY_PREFIX = 'forol-solar:placement:';

export interface Placement {
  rotationDeg: number;
  offsetX: number;
  offsetZ: number;
}

function getKey(projectLabel: string): string {
  return STORAGE_KEY_PREFIX + slugify(projectLabel);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/** Liest gespeicherte Placement-Werte für ein Projekt. */
export function getStoredPlacement(projectLabel: string): Placement | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getKey(projectLabel));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rotationDeg !== 'number') return null;
    if (typeof parsed?.offsetX !== 'number') return null;
    if (typeof parsed?.offsetZ !== 'number') return null;
    return {
      rotationDeg: parsed.rotationDeg,
      offsetX: parsed.offsetX,
      offsetZ: parsed.offsetZ,
    };
  } catch {
    return null;
  }
}

/** Speichert Placement-Werte für ein Projekt. */
export function setStoredPlacement(projectLabel: string, placement: Placement): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getKey(projectLabel), JSON.stringify(placement));
  } catch {
    // ignore quota errors
  }
}

/** Entfernt gespeicherte Placement-Werte für ein Projekt. */
export function clearStoredPlacement(projectLabel: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(getKey(projectLabel));
  } catch {
    // ignore
  }
}

/** Formatiert ein Placement als TypeScript-Code-Snippet für demo-*.ts. */
export function formatPlacementAsCode(placement: Placement, projectLabel: string): string {
  return `// Kalibrierte Default-Position für ${projectLabel}
// Übernehmen in demo-${slugify(projectLabel)}.ts → location:
location: {
  lat: <bestehender Wert>,
  lon: <bestehender Wert>,
  label: '<bestehender Wert>',
  rotationDeg: ${placement.rotationDeg.toFixed(2)},
  offsetX: ${placement.offsetX.toFixed(2)},
  offsetZ: ${placement.offsetZ.toFixed(2)},
},`;
}
