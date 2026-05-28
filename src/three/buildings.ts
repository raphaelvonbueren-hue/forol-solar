import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { BoxBuilding, Massing } from '@/types';
import type { OSMBuilding } from '@/lib/osm';
import { geoToLocal, type GeoOrigin } from '@/lib/geo';
import { attachBVH } from './heatmap';

// Palette warmer Putzfarben für OSM-Nachbargebäude (Schweizer Häuser-Look)
const NEIGHBOR_PALETTE = [
  0xE8DCC4, // warmes Beige
  0xD9CFC0, // Steingrau-Beige
  0xC9C0AE, // Khaki
  0xE3D4B8, // Champagner
  0xD1C7B0, // gedämpftes Beige
  0xBFB6A0, // Olivgrau
  0xE0D2BE, // helles Sandbeige
  0xCFC0AC, // gedämpftes Khaki
];

// Pre-allocated Materials (one per palette color, reuse for performance)
const NEIGHBOR_MATERIALS = NEIGHBOR_PALETTE.map((c) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }),
);
const ROOF_MATERIALS = [
  new THREE.MeshStandardMaterial({ color: 0x8B4A3A, roughness: 0.9 }), // Terracotta
  new THREE.MeshStandardMaterial({ color: 0x6B4232, roughness: 0.9 }), // Dunkelbraun
  new THREE.MeshStandardMaterial({ color: 0x4D3A2D, roughness: 0.9 }), // Schiefer
  new THREE.MeshStandardMaterial({ color: 0x7A5240, roughness: 0.9 }), // Mittelbraun
];

const BUILDING_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xE8E4DC, roughness: 0.7 });
const BUILDING_EDGE_MATERIAL = new THREE.LineBasicMaterial({ color: 0x666666 });
const NEIGHBOR_EDGE_MATERIAL = new THREE.LineBasicMaterial({ color: 0x6E665A, transparent: true, opacity: 0.6 });

/** Stabiler Hash für Position → 0..1 (deterministisch). */
function posHash(x: number, z: number): number {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * Erzeugt eine prozedurale Fenster-Textur für Fassaden.
 * Horizontale Reihen von Fenstern pro Geschoss (~3m hoch).
 * Aktuell nicht aktiv verwendet — Reserve für späteren Detail-Modus.
 */
// @ts-expect-error reserved for future detail mode
function makeFacadeTexture(heightM: number, wallColor: number): THREE.Texture {
  const floors = Math.max(1, Math.round(heightM / 3));
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const c = cvs.getContext('2d')!;

  // Hintergrund: Wandfarbe
  const hex = wallColor.toString(16).padStart(6, '0');
  c.fillStyle = '#' + hex;
  c.fillRect(0, 0, 256, 256);

  // Pro Geschoss: 4 Fenster nebeneinander
  const winsPerFloor = 4;
  const floorH = 256 / floors;
  const winH = floorH * 0.55;
  const winW = (256 / winsPerFloor) * 0.55;
  const padX = (256 / winsPerFloor - winW) / 2;
  const padY = (floorH - winH) / 2;
  for (let f = 0; f < floors; f++) {
    for (let w = 0; w < winsPerFloor; w++) {
      const x = w * (256 / winsPerFloor) + padX;
      const y = f * floorH + padY;
      // Fenster: bläulich-grau mit schwachem Glanz
      c.fillStyle = '#5A6878';
      c.fillRect(x, y, winW, winH);
      // Fensterrahmen
      c.strokeStyle = '#2A2A2A';
      c.lineWidth = 1.5;
      c.strokeRect(x, y, winW, winH);
      // Sprosse (Kreuz)
      c.beginPath();
      c.moveTo(x + winW / 2, y);
      c.lineTo(x + winW / 2, y + winH);
      c.moveTo(x, y + winH / 2);
      c.lineTo(x + winW, y + winH / 2);
      c.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Erzeugt ein Walm-/Satteldach für einen rechteckigen Footprint. */
function makeRoof(
  pts: Array<{ x: number; z: number }>,
  baseHeight: number,
  roofMaterial: THREE.Material,
): THREE.Mesh | null {
  // Funktioniert nur für annähernd rechteckige Footprints (4 Ecken)
  if (pts.length < 4 || pts.length > 8) return null;

  // Bounding-Box-Approximation
  let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
  for (const p of pts) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.z < zMin) zMin = p.z;
    if (p.z > zMax) zMax = p.z;
  }
  const w = xMax - xMin;
  const d = zMax - zMin;
  const cx = (xMin + xMax) / 2;
  const cz = (zMin + zMax) / 2;
  const ridgeHeight = Math.min(2.5, Math.max(1.0, Math.min(w, d) * 0.25));

  // Satteldach entlang der längeren Achse
  const ridgeAlongX = w >= d;
  const ridgeY = baseHeight + ridgeHeight;

  const geom = new THREE.BufferGeometry();
  let verts: number[];

  if (ridgeAlongX) {
    // Firstlinie parallel zu X, Dach kippt zu +Z und -Z
    verts = [
      // Süd-Seite (zMin)
      xMin, baseHeight, zMin,  xMax, baseHeight, zMin,  xMax, ridgeY, cz,
      xMin, baseHeight, zMin,  xMax, ridgeY, cz,        xMin, ridgeY, cz,
      // Nord-Seite (zMax)
      xMax, baseHeight, zMax,  xMin, baseHeight, zMax,  xMin, ridgeY, cz,
      xMax, baseHeight, zMax,  xMin, ridgeY, cz,        xMax, ridgeY, cz,
      // Giebelwand West
      xMin, baseHeight, zMin,  xMin, ridgeY, cz,        xMin, baseHeight, zMax,
      // Giebelwand Ost
      xMax, baseHeight, zMax,  xMax, ridgeY, cz,        xMax, baseHeight, zMin,
    ];
  } else {
    // Firstlinie parallel zu Z
    verts = [
      // West-Seite (xMin)
      xMin, baseHeight, zMax,  xMin, baseHeight, zMin,  cx, ridgeY, zMin,
      xMin, baseHeight, zMax,  cx, ridgeY, zMin,        cx, ridgeY, zMax,
      // Ost-Seite (xMax)
      xMax, baseHeight, zMin,  xMax, baseHeight, zMax,  cx, ridgeY, zMax,
      xMax, baseHeight, zMin,  cx, ridgeY, zMax,        cx, ridgeY, zMin,
      // Giebelwand Süd
      xMax, baseHeight, zMin,  cx, ridgeY, zMin,        xMin, baseHeight, zMin,
      // Giebelwand Nord
      xMin, baseHeight, zMax,  cx, ridgeY, zMax,        xMax, baseHeight, zMax,
    ];
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, roofMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Erzeugt einen Quader-Mesh mit Schatten und BVH. */
export function buildBoxMesh(box: BoxBuilding): THREE.Group {
  const geom = new THREE.BoxGeometry(box.length, box.height, box.width);
  attachBVH(geom);
  const mesh = new THREE.Mesh(geom, BUILDING_MATERIAL);
  mesh.position.y = box.height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const edges = new THREE.EdgesGeometry(geom);
  const lines = new THREE.LineSegments(edges, BUILDING_EDGE_MATERIAL);
  lines.position.y = box.height / 2;
  const grp = new THREE.Group();
  grp.add(mesh, lines);
  grp.rotation.y = -box.rotationDeg * Math.PI / 180;
  return grp;
}

/** Erzeugt 3D-Geometrie für eine einzelne Etage (Massing). */
export function buildMassingMesh(m: Massing, origin: GeoOrigin): THREE.Group | null {
  if (m.outline.length < 3) return null;
  const outline = m.outline.map(([lat, lon]) => geoToLocal(lat, lon, origin));

  const shape = new THREE.Shape();
  shape.moveTo(outline[0].x, outline[0].z);
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i].x, outline[i].z);
  shape.closePath();

  for (const h of m.holes) {
    if (h.length < 3) continue;
    const holeLocal = h.map(([lat, lon]) => geoToLocal(lat, lon, origin));
    const holePath = new THREE.Path();
    holePath.moveTo(holeLocal[0].x, holeLocal[0].z);
    for (let i = 1; i < holeLocal.length; i++) holePath.lineTo(holeLocal[i].x, holeLocal[i].z);
    holePath.closePath();
    shape.holes.push(holePath);
  }

  const extrudeGeom = new THREE.ExtrudeGeometry(shape, { depth: m.height, bevelEnabled: false });
  extrudeGeom.rotateX(-Math.PI / 2);
  attachBVH(extrudeGeom);

  const mesh = new THREE.Mesh(extrudeGeom, BUILDING_MATERIAL);
  mesh.position.y = m.zOffset + m.height;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.EdgesGeometry(extrudeGeom, 30);
  const lines = new THREE.LineSegments(edges, BUILDING_EDGE_MATERIAL);
  lines.position.y = m.zOffset + m.height;

  const grp = new THREE.Group();
  grp.add(mesh, lines);
  return grp;
}

/** Erzeugt 3D-Geometrie für eine OSM-Building mit Variation: Putzfarbe, Dach, Kanten. */
export function buildOSMMesh(b: OSMBuilding, origin: GeoOrigin): THREE.Group | null {
  if (b.outline.length < 3) return null;
  const pts = b.outline.map(([lat, lon]) => geoToLocal(lat, lon, origin));

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);
  shape.closePath();

  const extrudeGeom = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
  extrudeGeom.rotateX(-Math.PI / 2);
  attachBVH(extrudeGeom);

  // Deterministische Farb-Auswahl basierend auf erster Footprint-Position
  // → gleiches Haus bekommt immer gleiche Farbe (auch beim Neu-Laden)
  const hashSeed = posHash(pts[0].x, pts[0].z);
  const materialIdx = Math.floor(hashSeed * NEIGHBOR_MATERIALS.length);
  const wallMat = NEIGHBOR_MATERIALS[materialIdx];

  const mesh = new THREE.Mesh(extrudeGeom, wallMat);
  mesh.position.y = b.height;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.EdgesGeometry(extrudeGeom, 30);
  const lines = new THREE.LineSegments(edges, NEIGHBOR_EDGE_MATERIAL);
  lines.position.y = b.height;

  const grp = new THREE.Group();
  grp.add(mesh, lines);

  // ----- DACH-HEURISTIK -----
  // Wenn 4-6 Eckpunkte und Footprint nicht zu groß (Wohnhaus, nicht Industrie):
  // Walm-/Satteldach drauf. Sonst Flachdach (= nichts zusätzlich)
  if (pts.length >= 4 && pts.length <= 6) {
    let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
    for (const p of pts) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.z < zMin) zMin = p.z;
      if (p.z > zMax) zMax = p.z;
    }
    const footW = xMax - xMin;
    const footD = zMax - zMin;
    const maxDim = Math.max(footW, footD);
    const minDim = Math.min(footW, footD);
    // Nur für kleine bis mittlere Häuser (max 25m): Satteldach
    // Größere Gebäude bleiben flach (Bürogebäude / Mehrfamilienhaus)
    if (maxDim <= 25 && minDim >= 4) {
      const roofMat = ROOF_MATERIALS[Math.floor(posHash(pts[1].x, pts[1].z) * ROOF_MATERIALS.length)];
      const roof = makeRoof(pts, b.height, roofMat);
      if (roof) grp.add(roof);
    }
  }

  return grp;
}

/** Lädt ein 3D-Modell aus einer Datei. */
export async function loadModelFile(
  file: File,
): Promise<{ object: THREE.Object3D; size: THREE.Vector3 }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const url = URL.createObjectURL(file);
  try {
    let object: THREE.Object3D;
    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      object = gltf.scene;
    } else if (ext === 'obj') {
      const loader = new OBJLoader();
      object = await loader.loadAsync(url);
    } else {
      throw new Error('Format nicht unterstützt: ' + ext);
    }
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    object.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        const m = n as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        attachBVH(m.geometry);
      }
    });
    return { object, size };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lädt eine GLB-Datei für Nachbarbebauung. */
export async function loadNeighborGLB(file: File): Promise<{ object: THREE.Object3D; meshCount: number }> {
  if (!/\.(glb|gltf)$/i.test(file.name)) {
    throw new Error('Nur GLB/GLTF werden für Nachbarbebauung unterstützt');
  }
  const url = URL.createObjectURL(file);
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    let meshCount = 0;
    gltf.scene.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        const m = n as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        attachBVH(m.geometry);
        meshCount++;
      }
    });
    return { object: gltf.scene, meshCount };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Räumt eine Group rekursiv auf — Geometrie und Materialien disposen. */
export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (mesh.geometry) {
      const g = mesh.geometry as THREE.BufferGeometry & { disposeBoundsTree?: () => void };
      if (g.disposeBoundsTree) g.disposeBoundsTree();
      g.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
      else mat.dispose();
    }
  });
}
