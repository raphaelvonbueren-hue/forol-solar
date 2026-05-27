import type { Apartment, BoundingBox2D, LatLon, Massing, SplitMode } from '@/types';
import { geoToLocal, type GeoOrigin } from './geo';

/**
 * Teilt eine Etage in mehrere Wohnungen anhand des Aufteilungs-Modus.
 *
 * Aufteilung erfolgt auf der achsenparallelen Bounding-Box des Footprints —
 * für nicht-rechteckige Gebäude können einzelne Wohnungen daher kleiner als
 * erwartet ausfallen (außerhalb der Außenkontur liegende Bereiche werden
 * von den Fassaden-Samples nicht erreicht und tragen nicht zur Statistik bei).
 */
export function autoSplitMassing(
  massing: Pick<Massing, 'id' | 'outline'>,
  mode: SplitMode,
  origin: GeoOrigin,
): Apartment[] {
  if (mode === 'none' || massing.outline.length < 3) return [];

  const local = massing.outline.map(([lat, lon]: LatLon) => geoToLocal(lat, lon, origin));
  const xMin = Math.min(...local.map(p => p.x));
  const xMax = Math.max(...local.map(p => p.x));
  const zMin = Math.min(...local.map(p => p.z));
  const zMax = Math.max(...local.map(p => p.z));
  const width = xMax - xMin;
  const depth = zMax - zMin;
  const longAxisIsX = width >= depth;

  const zones: Apartment[] = [];
  const mk = (i: number, bbox: BoundingBox2D): Apartment => ({
    id: `${massing.id}_w${i}`,
    name: `Whg ${i + 1}`,
    bbox,
  });

  const gridMatch = mode.match(/^grid(\d+)x(\d+)$/);
  if (gridMatch) {
    const cols = parseInt(gridMatch[1], 10);
    const rows = parseInt(gridMatch[2], 10);
    const stepX = width / cols;
    const stepZ = depth / rows;
    let n = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        zones.push(
          mk(n, {
            xMin: xMin + col * stepX,
            xMax: xMin + (col + 1) * stepX,
            zMin: zMin + row * stepZ,
            zMax: zMin + (row + 1) * stepZ,
          }),
        );
        n++;
      }
    }
    return zones;
  }

  const direction = mode.startsWith('long') ? 'long' : 'cross';
  const count = parseInt(mode.replace(/[a-z]/g, ''), 10);
  const useXAxis = direction === 'long' ? longAxisIsX : !longAxisIsX;

  if (useXAxis) {
    const step = width / count;
    for (let i = 0; i < count; i++) {
      zones.push(mk(i, { xMin: xMin + i * step, xMax: xMin + (i + 1) * step, zMin, zMax }));
    }
  } else {
    const step = depth / count;
    for (let i = 0; i < count; i++) {
      zones.push(mk(i, { xMin, xMax, zMin: zMin + i * step, zMax: zMin + (i + 1) * step }));
    }
  }
  return zones;
}

/**
 * Prüft ob ein lokaler 2D-Punkt innerhalb einer Bounding-Box liegt.
 */
export function pointInBox(x: number, z: number, bbox: BoundingBox2D): boolean {
  return x >= bbox.xMin && x <= bbox.xMax && z >= bbox.zMin && z <= bbox.zMax;
}
