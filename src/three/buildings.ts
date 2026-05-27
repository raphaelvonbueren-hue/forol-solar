import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { BoxBuilding, Massing } from '@/types';
import type { OSMBuilding } from '@/lib/osm';
import { geoToLocal, type GeoOrigin } from '@/lib/geo';
import { attachBVH } from './heatmap';

const BUILDING_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xE8E4DC, roughness: 0.7 });
const BUILDING_EDGE_MATERIAL = new THREE.LineBasicMaterial({ color: 0x666666 });
const NEIGHBOR_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xC4BEB2, roughness: 0.85 });
const NEIGHBOR_EDGE_MATERIAL = new THREE.LineBasicMaterial({ color: 0x888888 });

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

/** Erzeugt 3D-Geometrie für eine OSM-Building. */
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

  const mesh = new THREE.Mesh(extrudeGeom, NEIGHBOR_MATERIAL);
  mesh.position.y = b.height;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.EdgesGeometry(extrudeGeom, 30);
  const lines = new THREE.LineSegments(edges, NEIGHBOR_EDGE_MATERIAL);
  lines.position.y = b.height;

  const grp = new THREE.Group();
  grp.add(mesh, lines);
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
