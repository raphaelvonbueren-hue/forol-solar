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
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

export interface GoogleTilesOptions {
  apiKey: string;
  /** Geographic origin (where the local 3D coordinate system is centered). */
  origin: { lat: number; lon: number };
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
 * Die Tiles werden via WGS84-Koordinaten geladen und müssen zu unserem
 * lokalen ENU-Koordinatensystem transformiert werden.
 */
export function initGoogleTiles(opts: GoogleTilesOptions): GoogleTilesHandle {
  const { apiKey, origin, scene, camera, renderer } = opts;

  // TilesRenderer instanziieren
  const tiles = new TilesRenderer();
  tiles.registerPlugin(
    new GoogleCloudAuthPlugin({
      apiToken: apiKey,
      autoRefreshToken: true,
    }),
  );

  // Renderer-Konfiguration
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  // Origin-Setup: Tiles sind in ECEF (Earth-Centered Earth-Fixed) Koordinaten.
  // Wir müssen einen Frame definieren, der unseren lokalen Origin zur
  // Geo-Position macht.
  // 3d-tiles-renderer bietet hierfür eine `setLatLonToYUp()` Methode.
  tiles.group.rotation.x = -Math.PI / 2;

  // ENU-Frame zentrieren — verwenden wir LatLonToYUp Helper
  // (Variation: manche Versionen haben diese als Plugin "ReorientationPlugin")
  if ((tiles as any).setLatLonToYUp) {
    (tiles as any).setLatLonToYUp(
      origin.lat * Math.PI / 180,
      origin.lon * Math.PI / 180,
    );
  }

  // Tag für Cleanup
  tiles.group.userData.googleTiles = true;
  // Im Hintergrund rendern (hinter eigenem Gebäude)
  tiles.group.renderOrder = -1;
  scene.add(tiles.group);

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
