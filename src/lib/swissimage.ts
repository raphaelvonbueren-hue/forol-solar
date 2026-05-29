/**
 * Swisstopo-Luftbild (swissimage) als Boden-Textur für die 3D-Szene.
 *
 * Lädt WMTS-Kacheln (EPSG:3857 / Web Mercator) rund um den Standort, stitcht sie
 * auf ein Offscreen-Canvas und liefert Maße + Offset, damit das Canvas als
 * THREE.CanvasTexture auf ein Boden-Mesh gelegt werden kann — so platziert, dass
 * der Standort auf lokales (0,0) fällt und Bildoben = Norden (-Z) ist.
 *
 * Reuse des WMTS-Templates aus src/components/Map.tsx (Leaflet-Layer).
 */

/** Kachel-Kantenlänge in Pixel (Standard-Slippy-Map). */
const TILE_SIZE = 256;

/** Web-Mercator-Bodenauflösung am Äquator bei z=0 (Meter/Pixel). */
const EQUATOR_MPP = 156543.03392;

/** WMTS-URL einer swissimage-Kachel. */
export function swissimageTileUrl(z: number, x: number, y: number): string {
  return `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/${z}/${x}/${y}.jpeg`;
}

/**
 * WGS84 → fraktionale Web-Mercator-Kachelkoordinaten (Standard-Slippy-Map).
 * Ganzzahliger Anteil = Kachelindex, Nachkommaanteil = Position in der Kachel.
 */
export function lonLatToTileFloat(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Inverse: fraktionale Kachelkoordinaten → WGS84 (lon/lat). */
export function tileToLonLat(x: number, y: number, z: number): { lon: number; lat: number } {
  const n = 2 ** z;
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lon, lat: (latRad * 180) / Math.PI };
}

/**
 * Bodenauflösung in Meter/Pixel bei gegebener Breite und Zoomstufe (Web Mercator).
 * Über kleine Distanzen (< 300 m) als konstant angenommen — Skalenfehler < 0,1 %.
 */
export function metersPerPixel(lat: number, z: number): number {
  return (EQUATOR_MPP * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

export interface SwissimageGround {
  /** Gestitchtes Luftbild als Offscreen-Canvas (Bildoben = Norden). */
  canvas: HTMLCanvasElement;
  /** Breite des Boden-Mesh in Metern (Ost-West). */
  widthMeters: number;
  /** Tiefe des Boden-Mesh in Metern (Nord-Süd). */
  heightMeters: number;
  /** Welt-X (Ost) der Mesh-Mitte, sodass der Standort auf x=0 fällt. */
  offsetX: number;
  /** Welt-Z (Süd) der Mesh-Mitte, sodass der Standort auf z=0 fällt. */
  offsetZ: number;
}

interface BuildGroundOpts {
  lat: number;
  lon: number;
  /** Mindest-Kantenlänge des Bodens in Metern (Default 300). */
  extentMeters?: number;
  /** Zoomstufe (Default 19 — swissimage scharf). */
  zoom?: number;
}

function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // CORS nötig, damit das Canvas nicht "tainted" wird (sonst SecurityError beim
    // WebGL-Texture-Upload). Swisstopo liefert Access-Control-Allow-Origin.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`swissimage-Kachel fehlgeschlagen: ${url}`));
    img.src = url;
  });
}

/**
 * Baut die Luftbild-Bodentextur rund um (lat, lon).
 *
 * Wirft, falls eine Kachel nicht (CORS-konform) lädt — der Aufrufer fällt dann
 * auf den grauen Default-Boden zurück.
 */
export async function buildSwissimageGround(opts: BuildGroundOpts): Promise<SwissimageGround> {
  const { lat, lon, extentMeters = 300, zoom = 19 } = opts;

  const mpp = metersPerPixel(lat, zoom);
  const tileMeters = mpp * TILE_SIZE;
  const halfTiles = Math.max(1, Math.ceil(extentMeters / 2 / tileMeters));

  const center = lonLatToTileFloat(lon, lat, zoom);
  const cxTile = Math.floor(center.x);
  const cyTile = Math.floor(center.y);
  const xMin = cxTile - halfTiles;
  const xMax = cxTile + halfTiles;
  const yMin = cyTile - halfTiles;
  const yMax = cyTile + halfTiles;
  const numX = xMax - xMin + 1;
  const numY = yMax - yMin + 1;

  const canvas = document.createElement('canvas');
  canvas.width = numX * TILE_SIZE;
  canvas.height = numY * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D-Canvas-Context nicht verfügbar');

  const draws: Promise<void>[] = [];
  for (let tx = xMin; tx <= xMax; tx++) {
    for (let ty = yMin; ty <= yMax; ty++) {
      const px = (tx - xMin) * TILE_SIZE;
      const py = (ty - yMin) * TILE_SIZE;
      draws.push(
        loadTileImage(swissimageTileUrl(zoom, tx, ty)).then((img) => {
          ctx.drawImage(img, px, py);
        }),
      );
    }
  }
  await Promise.all(draws);

  // Standort-Position innerhalb des Canvas (Pixel ab linker/oberer Kante).
  const pxFromLeft = (center.x - xMin) * TILE_SIZE;
  const pxFromTop = (center.y - yMin) * TILE_SIZE;
  const widthMeters = canvas.width * mpp;
  const heightMeters = canvas.height * mpp;

  // Mesh wird zentriert platziert. Linke Kante = Westen, obere Kante = Norden.
  // Standort liegt bei Welt (0,0) → Mesh-Mitte entsprechend verschieben.
  const offsetX = widthMeters / 2 - pxFromLeft * mpp;
  const offsetZ = heightMeters / 2 - pxFromTop * mpp;

  return { canvas, widthMeters, heightMeters, offsetX, offsetZ };
}
