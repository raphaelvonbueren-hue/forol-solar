import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';
import type { FacadeSample } from '@/lib/heatmap-compute';
import { sunPosition } from '@/lib/solar';
import { rotateXZ } from '@/lib/geo';

/**
 * BVH-Beschleunigung global aktivieren.
 * three-mesh-bvh patcht den Raycaster, sobald BufferGeometry.computeBoundsTree
 * für eine Geometrie aufgerufen wurde.
 */
let bvhInstalled = false;
function ensureBVHInstalled(): void {
  if (bvhInstalled) return;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  bvhInstalled = true;
}

/** Baut BVH-Tree für eine Geometrie, falls noch nicht vorhanden. */
export function attachBVH(geometry: THREE.BufferGeometry | undefined | null): void {
  ensureBVHInstalled();
  if (!geometry) return;
  const g = geometry as THREE.BufferGeometry & { boundsTree?: unknown };
  if (g.boundsTree) return;
  try {
    g.computeBoundsTree();
  } catch {
    // Manche Geometrien (z.B. mit indexierten attributes ohne position) failen still
  }
}

/** Löscht BVH-Tree einer Geometrie. */
export function disposeBVH(geometry: THREE.BufferGeometry | undefined | null): void {
  const g = geometry as (THREE.BufferGeometry & { disposeBoundsTree?: () => void }) | null | undefined;
  if (g && g.disposeBoundsTree) g.disposeBoundsTree();
}

export interface ComputeOptions {
  samples: FacadeSample[];
  dates: Date[];
  scaleFactor: number;
  lat: number;
  lon: number;
  targets: THREE.Object3D[];
  onProgress?: (progress: number) => void;
  /** Liefert true wenn der Aufrufer die Berechnung abbrechen möchte. */
  shouldCancel?: () => boolean;
  /** Yields nach so vielen Samples pro Datum für Browser-Responsiveness. */
  yieldEvery?: number;
  /**
   * Feste Modell-Drehung um Y (rad), entspricht worldRoot.rotation.y.
   * Samples werden damit in den Welt-Frame der gedrehten Gebäude überführt,
   * während sunDir im echten Azimut bleibt (korrigierende Ausrichtung).
   */
  orientationRad?: number;
}

export class CancellationError extends Error {
  constructor() {
    super('Berechnung wurde abgebrochen');
    this.name = 'CancellationError';
  }
}

/**
 * Hauptfunktion: berechnet pro Sample die Anzahl direkter Sonnenstunden pro Jahr.
 *
 * Yields periodisch via setTimeout(0), damit die UI während der Berechnung
 * reagibel bleibt. Browser-Hauptthread-Variante.
 *
 * Bricht ab und wirft CancellationError, wenn shouldCancel() true zurückgibt.
 */
export async function computeShadowAnalysis(opts: ComputeOptions): Promise<Float32Array> {
  ensureBVHInstalled();
  const { samples, dates, scaleFactor, lat, lon, targets, onProgress, shouldCancel, orientationRad = 0 } = opts;

  const raycaster = new THREE.Raycaster();
  raycaster.far = 600;
  (raycaster as THREE.Raycaster & { firstHitOnly: boolean }).firstHitOnly = true;

  // Targets zu Meshes flachklopfen
  const meshes: THREE.Mesh[] = [];
  for (const t of targets) {
    t.traverse(n => {
      if ((n as THREE.Mesh).isMesh) meshes.push(n as THREE.Mesh);
    });
  }

  const results = new Float32Array(samples.length);
  const yieldEvery = opts.yieldEvery ?? Math.max(1, Math.floor(dates.length / 80));
  const sunDir = new THREE.Vector3();
  const origin = new THREE.Vector3();

  // Samples einmalig in den Welt-Frame der (ggf. um orientationRad gedrehten)
  // Gebäude überführen. sunDir bleibt im echten Azimut → Drehung wirkt korrigierend.
  const wpx = new Float32Array(samples.length);
  const wpy = new Float32Array(samples.length);
  const wpz = new Float32Array(samples.length);
  const wnx = new Float32Array(samples.length);
  const wnz = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const rp = rotateXZ(s.position.x, s.position.z, orientationRad);
    const rn = rotateXZ(s.normal.x, s.normal.z, orientationRad);
    wpx[i] = rp.x; wpy[i] = s.position.y; wpz[i] = rp.z;
    wnx[i] = rn.x; wnz[i] = rn.z;
  }

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    const pos = sunPosition(date, lat, lon);
    if (pos.altitude <= 0) {
      if (di % yieldEvery === 0) {
        onProgress?.((di + 1) / dates.length);
        await new Promise(r => setTimeout(r, 0));
        if (shouldCancel?.()) throw new CancellationError();
      }
      continue;
    }
    const azRad = pos.azimuth * Math.PI / 180;
    const altRad = pos.altitude * Math.PI / 180;
    sunDir.set(
       Math.cos(altRad) * Math.sin(azRad),
       Math.sin(altRad),
      -Math.cos(altRad) * Math.cos(azRad),
    );

    for (let si = 0; si < samples.length; si++) {
      // Backface-Culling: Sonne muss von vorne kommen
      if (wnx[si] * sunDir.x + wnz[si] * sunDir.z <= 0) continue;
      origin.set(wpx[si], wpy[si], wpz[si]);
      raycaster.set(origin, sunDir);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) results[si] += 1.0;
    }

    if (di % yieldEvery === 0) {
      onProgress?.((di + 1) / dates.length);
      await new Promise(r => setTimeout(r, 0));
      if (shouldCancel?.()) throw new CancellationError();
    }
  }

  // Skalierung auf Jahresstunden
  for (let i = 0; i < results.length; i++) results[i] *= scaleFactor;
  return results;
}
