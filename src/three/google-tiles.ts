/**
 * Google Photorealistic 3D Tiles Layer.
 *
 * Lädt photorealistische 3D-Stadtmodelle direkt von Google Maps Tile API.
 * Optional: nur aktiv wenn API Key vorhanden (via VITE_GOOGLE_TILES_KEY env var
 * oder ?gkey=... URL-Parameter).
 *
 * Setup für User:
 *   1. https://console.cloud.google.com → neues Projekt erstellen
 *   2. APIs & Services → "Map Tiles API" aktivieren
 *   3. Credentials → API Key erstellen, auf Map Tiles API beschränken
 *   4. Key als ?gkey=AIzaSy... an die URL anhängen
 *      ODER in Vercel ENV als VITE_GOOGLE_TILES_KEY setzen
 *
 * Free Tier: ~28k Anfragen/Monat gratis, danach $4 pro 1000 Tiles.
 */

import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin, ReorientationPlugin } from '3d-tiles-renderer/plugins';

export interface GoogleTilesOptions {
  apiKey: string;
  /** Geographic origin (where the local 3D coordinate system is centered). */
  origin: { lat: number; lon: number };
  /** Height above ellipsoid (meters above sea level). For Bodensee/Rorschach ~400m. */
  heightAboveEllipsoid?: number;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
}

export interface GoogleTilesHandle {
  tiles: TilesRenderer;
  update: () => void;
  dispose: () => void;
}

/**
 * Initialisiert Google 3D Tiles und positioniert sie relativ zur Origin-Location.
 *
 * Die Tiles kommen in WGS84-Ellipsoid-Koordinaten. Der ReorientationPlugin
 * zentriert das Tileset auf eine Lat/Lon/Height-Position und richtet die
 * Achsen zu Three.js (+Y up) aus.
 */
export function initGoogleTiles(opts: GoogleTilesOptions): GoogleTilesHandle {
  const { apiKey, origin, heightAboveEllipsoid = 400, scene, camera, renderer } = opts;

  // TilesRenderer instanziieren
  const tiles = new TilesRenderer();

  // Aggressives Tile-Loading für sichtbares Resultat
  tiles.errorTarget = 2;        // Sehr aggressiv: kleine Pixel-Fehler-Toleranz erzwingt Detail-Tiles
  tiles.errorThreshold = 60;    // Großer Threshold → Tiles werden auch geladen wenn Camera weit weg
  tiles.maxDepth = Infinity;    // Keine Tiefenbegrenzung
  tiles.displayActiveTiles = true;
  tiles.loadSiblings = true;

  // Auth-Plugin: API-Token für Google Cloud
  tiles.registerPlugin(
    new GoogleCloudAuthPlugin({
      apiToken: apiKey,
      autoRefreshToken: true,
    }),
  );

  // Reorientation: Tileset auf unsere Origin zentrieren und in lokales Koord-System bringen
  // Lat/Lon müssen in RADIAN sein, height in Metern über WGS84-Ellipsoid
  // Rorschach am Bodensee liegt bei ca. 400m über Meer
  tiles.registerPlugin(
    new ReorientationPlugin({
      lat: (origin.lat * Math.PI) / 180,
      lon: (origin.lon * Math.PI) / 180,
      height: heightAboveEllipsoid,
      recenter: true,
    }),
  );

  // Renderer-Konfiguration
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  // Debug: Event-Listener für Tile-Loading
  let loadStartCount = 0;
  let loadEndCount = 0;
  let firstBoundsLogged = false;
  tiles.addEventListener('load-tile-set', () => {
    console.log('[GoogleTiles] load-tile-set');
    if (!firstBoundsLogged) {
      firstBoundsLogged = true;
      // Bounding-Sphere des Tilesets nach kurzer Verzögerung holen
      setTimeout(() => {
        const sphere = new THREE.Sphere();
        const hasBounds = tiles.getBoundingSphere(sphere);
        const box = new THREE.Box3();
        const hasBox = tiles.getBoundingBox(box);
        console.log('[GoogleTiles] Bounds:', {
          hasSphere: hasBounds,
          sphereCenter: hasBounds ? [sphere.center.x.toFixed(1), sphere.center.y.toFixed(1), sphere.center.z.toFixed(1)] : null,
          sphereRadius: hasBounds ? sphere.radius.toFixed(1) : null,
          hasBox,
          boxMin: hasBox ? [box.min.x.toFixed(1), box.min.y.toFixed(1), box.min.z.toFixed(1)] : null,
          boxMax: hasBox ? [box.max.x.toFixed(1), box.max.y.toFixed(1), box.max.z.toFixed(1)] : null,
          cameraPos: [camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1)],
          groupPos: [tiles.group.position.x.toFixed(1), tiles.group.position.y.toFixed(1), tiles.group.position.z.toFixed(1)],
          groupChildren: tiles.group.children.length,
        });
        // Expose globally for inspection
        (window as any).__tiles = tiles;
        (window as any).__camera = camera;
      }, 2000);
    }
  });
  tiles.addEventListener('tile-download-start', () => {
    loadStartCount++;
    if (loadStartCount <= 5 || loadStartCount % 20 === 0) {
      console.log(`[GoogleTiles] tile-download-start #${loadStartCount}`);
    }
  });
  tiles.addEventListener('load-model', () => {
    loadEndCount++;
    if (loadEndCount <= 5 || loadEndCount % 20 === 0) {
      console.log(`[GoogleTiles] load-model #${loadEndCount}`);
    }
  });
  tiles.addEventListener('load-error', (e: any) => {
    console.warn('[GoogleTiles] load-error:', e?.error?.message, e?.url);
  });

  // Tag für Cleanup
  tiles.group.userData.googleTiles = true;
  // renderOrder NICHT setzen (default 0) — Tiles werden mit normalem Z-Order gerendert
  scene.add(tiles.group);

  // Initial-Update sofort triggern
  tiles.update();

  // Update-Funktion (in Render-Loop aufrufen)
  const update = () => {
    if (camera instanceof THREE.PerspectiveCamera) {
      tiles.setResolutionFromRenderer(camera, renderer);
    }
    tiles.update();
  };

  const dispose = () => {
    scene.remove(tiles.group);
    tiles.dispose();
  };

  return { tiles, update, dispose };
}

/** Liest den Google API Key aus URL-Parameter oder Vite ENV. */
export function getGoogleApiKey(): string | null {
  const urlParam = new URLSearchParams(window.location.search).get('gkey');
  if (urlParam) return urlParam;
  const envKey = import.meta.env.VITE_GOOGLE_TILES_KEY;
  if (envKey && typeof envKey === 'string') return envKey;
  return null;
}
