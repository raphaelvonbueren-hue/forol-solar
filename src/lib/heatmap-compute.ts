/**
 * Berechnungs-Logik für die Verschattungs-Heatmap.
 *
 * Diese Funktionen erzeugen Datums-Listen und Fassaden-Sample-Punkte unabhängig
 * von Three.js. Das eigentliche Raycasting muss aus Performance-Gründen mit
 * Three.js auf einer 3D-Geometrie gemacht werden und befindet sich in
 * src/three/heatmap.ts.
 */

import type { AnalysisPrecision, BoxBuilding, BoundingBox2D, Massing } from '@/types';
import { geoToLocal, type GeoOrigin } from './geo';

/** Ein 3D-Sample-Punkt auf einer Fassade mit Normalen-Vektor. */
export interface FacadeSample {
  /** Position in lokalen Metern */
  position: { x: number; y: number; z: number };
  /** Normalen-Vektor in xz-Ebene (y=0), zeigt von Wand weg */
  normal: { x: number; z: number };
  /** ID des Massings ('box' oder Massing.id) */
  massingId: string;
  /** Identifier für die Wand (z.B. 'o3' = outline edge 3, 'h0_2' = hole 0 edge 2) */
  wallId: string;
  /** True wenn dies eine Innenhof-Wand ist */
  isHole: boolean;
}

interface Point2D {
  x: number;
  z: number;
}

function polygonCentroid(points: Point2D[]): Point2D {
  let cx = 0, cz = 0;
  for (const p of points) { cx += p.x; cz += p.z; }
  return { x: cx / points.length, z: cz / points.length };
}

function addWallSamples(
  samples: FacadeSample[],
  p1: Point2D, p2: Point2D,
  refCentroid: Point2D,
  zOff: number, height: number,
  spacing: number,
  isHole: boolean,
  massingId: string, wallId: string,
): void {
  const dx = p2.x - p1.x, dz = p2.z - p1.z;
  const wallLen = Math.sqrt(dx*dx + dz*dz);
  if (wallLen < 0.1) return;

  // Normalenvektor in xz-Ebene
  let nx = dz / wallLen, nz = -dx / wallLen;
  const mx = (p1.x + p2.x) / 2, mz = (p1.z + p2.z) / 2;

  if (!isHole) {
    // Außenwand: Normale soll vom Centroid weg zeigen
    const fcX = mx - refCentroid.x, fcZ = mz - refCentroid.z;
    if (nx * fcX + nz * fcZ < 0) { nx = -nx; nz = -nz; }
  } else {
    // Innenhof: Normale soll zum Hof-Zentrum zeigen
    const tcX = refCentroid.x - mx, tcZ = refCentroid.z - mz;
    if (nx * tcX + nz * tcZ < 0) { nx = -nx; nz = -nz; }
  }

  const horizSamples = Math.max(2, Math.ceil(wallLen / spacing));
  const vertSamples = Math.max(2, Math.ceil(height / spacing));

  for (let h = 0; h < horizSamples; h++) {
    for (let v = 0; v < vertSamples; v++) {
      const u = (h + 0.5) / horizSamples;
      const yU = (v + 0.5) / vertSamples;
      samples.push({
        position: {
          x: p1.x + dx * u + nx * 0.12,
          y: zOff + yU * height,
          z: p1.z + dz * u + nz * 0.12,
        },
        normal: { x: nx, z: nz },
        massingId, wallId, isHole,
      });
    }
  }
}

/** Erzeugt Fassaden-Sample-Punkte für eine Etage (Polygon-Modus). */
export function generateMassingSamples(
  massing: Massing,
  spacing: number,
  origin: GeoOrigin,
): FacadeSample[] {
  const samples: FacadeSample[] = [];
  if (massing.outline.length < 3) return samples;

  const outline = massing.outline.map(([lat, lon]) => geoToLocal(lat, lon, origin));
  const outlineCentroid = polygonCentroid(outline);

  for (let i = 0; i < outline.length; i++) {
    const p1 = outline[i];
    const p2 = outline[(i + 1) % outline.length];
    addWallSamples(samples, p1, p2, outlineCentroid, massing.zOffset, massing.height,
                   spacing, false, massing.id, `o${i}`);
  }

  for (let hi = 0; hi < massing.holes.length; hi++) {
    const hole = massing.holes[hi].map(([lat, lon]) => geoToLocal(lat, lon, origin));
    if (hole.length < 3) continue;
    const holeCentroid = polygonCentroid(hole);
    for (let i = 0; i < hole.length; i++) {
      const p1 = hole[i];
      const p2 = hole[(i + 1) % hole.length];
      addWallSamples(samples, p1, p2, holeCentroid, massing.zOffset, massing.height,
                     spacing, true, massing.id, `h${hi}_${i}`);
    }
  }
  return samples;
}

/** Erzeugt Fassaden-Sample-Punkte für einen Quader (Box-Modus). */
export function generateBoxSamples(box: BoxBuilding, spacing: number): FacadeSample[] {
  const samples: FacadeSample[] = [];
  const L = box.length / 2, W = box.width / 2, H = box.height;
  const rotRad = -box.rotationDeg * Math.PI / 180;
  const cos = Math.cos(rotRad), sin = Math.sin(rotRad);

  const walls = [
    { p1: { x: -L, z:  W }, p2: { x:  L, z:  W } },
    { p1: { x:  L, z:  W }, p2: { x:  L, z: -W } },
    { p1: { x:  L, z: -W }, p2: { x: -L, z: -W } },
    { p1: { x: -L, z: -W }, p2: { x: -L, z:  W } },
  ];
  const centroid = { x: 0, z: 0 };

  for (let wi = 0; wi < walls.length; wi++) {
    const w = walls[wi];
    const r1 = { x: w.p1.x * cos - w.p1.z * sin, z: w.p1.x * sin + w.p1.z * cos };
    const r2 = { x: w.p2.x * cos - w.p2.z * sin, z: w.p2.x * sin + w.p2.z * cos };
    addWallSamples(samples, r1, r2, centroid, 0, H, spacing, false, 'box', `w${wi}`);
  }
  return samples;
}

/** Erzeugt Stichproben-Daten für die Verschattungs-Analyse. */
export function buildAnalysisTimestamps(
  precision: AnalysisPrecision,
  year: number,
): { dates: Date[]; scaleFactor: number } {
  const dayList: Array<{ year: number; month: number; day: number }> = [];

  if (precision === 'fast') {
    for (let m = 0; m < 12; m++) dayList.push({ year, month: m, day: 21 });
  } else if (precision === 'medium') {
    const start = new Date(Date.UTC(year, 0, 1));
    for (let i = 0; i < 52; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i * 7);
      dayList.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() });
    }
  } else {
    for (let dy = 0; dy < 365; dy++) {
      const d = new Date(Date.UTC(year, 0, dy + 1));
      dayList.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() });
    }
  }

  const dates: Date[] = [];
  for (const day of dayList) {
    for (let h = 4; h <= 22; h++) {
      dates.push(new Date(Date.UTC(day.year, day.month, day.day, h, 0)));
    }
  }
  const scaleFactor = 365 / dayList.length;
  return { dates, scaleFactor };
}

/** Bestimmt für ein Sample die Wohnung anhand der Bounding-Boxes. */
export interface ApartmentLookup {
  subzoneId: string;
  subzoneName: string;
  massingName: string;
}

export function findApartmentForSample(
  sample: FacadeSample,
  massings: Massing[],
): ApartmentLookup | null {
  if (sample.massingId === 'box') return null;
  const massing = massings.find(m => m.id === sample.massingId);
  if (!massing || massing.subzones.length === 0) return null;
  for (const sz of massing.subzones) {
    if (pointInBox2D(sample.position.x, sample.position.z, sz.bbox)) {
      return {
        subzoneId: sz.id,
        subzoneName: sz.name,
        massingName: massing.name,
      };
    }
  }
  return null;
}

function pointInBox2D(x: number, z: number, bbox: BoundingBox2D): boolean {
  return x >= bbox.xMin && x <= bbox.xMax && z >= bbox.zMin && z <= bbox.zMax;
}

/** Farbverlauf für Heatmap-Werte (viridis-ähnlich). */
export function sunHoursToRGB(hours: number, maxHours: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, hours / Math.max(maxHours, 1)));
  const stops: Array<[number, [number, number, number]]> = [
    [0,    [0.10, 0.08, 0.31]],
    [0.25, [0.23, 0.37, 0.75]],
    [0.50, [0.32, 0.72, 0.53]],
    [0.75, [1.00, 0.82, 0.40]],
    [1.0,  [0.84, 0.16, 0.16]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t1, c1] = stops[i];
    const [t2, c2] = stops[i+1];
    if (t >= t1 && t <= t2) {
      const localT = (t - t1) / (t2 - t1);
      return [
        c1[0] + (c2[0] - c1[0]) * localT,
        c1[1] + (c2[1] - c1[1]) * localT,
        c1[2] + (c2[2] - c1[2]) * localT,
      ];
    }
  }
  return stops[stops.length - 1][1];
}
