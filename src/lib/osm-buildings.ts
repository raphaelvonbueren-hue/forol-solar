/**
 * OSM Buildings Loader
 *
 * Holt Nachbargebäude aus OpenStreetMap via Overpass API und
 * konvertiert sie zu lokalen 3D-Koordinaten relativ zur Origin.
 *
 * Funktioniert nur für reale Adressen mit OSM-Daten. Bei neuen
 * Baustellen kann das eigene Gebäude noch nicht in OSM sein —
 * deshalb wird per Distanz-Filter dafür gesorgt dass es nicht
 * doppelt gerendert wird.
 */

import { geoToLocal } from './geo';
import type { LatLon } from '@/types';

export interface OSMBuilding {
  id: string;
  /** Outline in lokalen Metern (relativ zu origin) */
  outline: { x: number; z: number }[];
  /** Geschätzte Höhe in Metern */
  height: number;
  /** Etagen-Anzahl (falls aus OSM bekannt) */
  levels?: number;
  /** OSM-Tag building=yes/residential/commercial/etc. */
  buildingType?: string;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}
interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements: (OverpassNode | OverpassWay)[];
}

/** Default-Höhe wenn weder height noch building:levels gesetzt ist. */
const DEFAULT_HEIGHT_M = 8;
/** Höhe pro Geschoss falls building:levels gesetzt ist. */
const METERS_PER_LEVEL = 3;

function parseHeight(tags: Record<string, string> | undefined): { height: number; levels?: number } {
  if (!tags) return { height: DEFAULT_HEIGHT_M };
  // 1) height=12.5
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) {
      const levels = tags['building:levels'] ? parseInt(tags['building:levels'], 10) : undefined;
      return { height: h, levels };
    }
  }
  // 2) building:levels=4
  if (tags['building:levels']) {
    const lv = parseInt(tags['building:levels'], 10);
    if (!isNaN(lv) && lv > 0) {
      return { height: lv * METERS_PER_LEVEL, levels: lv };
    }
  }
  return { height: DEFAULT_HEIGHT_M };
}

/**
 * Lädt Gebäude im Umkreis um einen Punkt von OpenStreetMap Overpass API.
 *
 * @param lat Breitengrad des Zentrums
 * @param lon Längengrad des Zentrums
 * @param radiusM Radius in Metern (Default 250m)
 * @param excludeOwn Wenn true, wird das innerste Gebäude (oder Gebäude die
 *   sich mit der Origin überlappen) ausgefiltert, da das wahrscheinlich
 *   das eigene noch nicht gebaute Projekt ist.
 */
export async function fetchOSMBuildings(
  lat: number,
  lon: number,
  radiusM: number = 250,
  excludeOwn: boolean = true,
): Promise<OSMBuilding[]> {
  const query = `
    [out:json][timeout:25];
    (
      way["building"](around:${radiusM},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `.trim();

  // Fallback-Reihenfolge: Hauptserver, Mirror DE, Mirror FR
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  let data: OverpassResponse | null = null;
  let lastError: Error | null = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) {
        lastError = new Error(`${url} → ${res.status} ${res.statusText}`);
        continue;
      }
      data = await res.json();
      break;
    } catch (e) {
      lastError = e as Error;
      continue;
    }
  }

  if (!data) {
    throw lastError ?? new Error('Alle Overpass-Endpoints fehlgeschlagen');
  }
  const nodes = new Map<number, { lat: number; lon: number }>();
  const ways: OverpassWay[] = [];
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  const origin = { lat, lon };
  const buildings: OSMBuilding[] = [];

  for (const way of ways) {
    if (!way.nodes || way.nodes.length < 3) continue;
    const outline = way.nodes
      .map((nId) => nodes.get(nId))
      .filter((p): p is { lat: number; lon: number } => p !== undefined)
      .map((p) => geoToLocal(p.lat, p.lon, origin));
    if (outline.length < 3) continue;

    const { height, levels } = parseHeight(way.tags);

    buildings.push({
      id: `osm-${way.id}`,
      outline,
      height,
      levels,
      buildingType: way.tags?.building,
    });
  }

  if (excludeOwn) {
    // Eigenes Gebäude (am nächsten zur Origin) ausfiltern
    return buildings.filter((b) => {
      const center = polygonCenter(b.outline);
      const distToOrigin = Math.sqrt(center.x ** 2 + center.z ** 2);
      // Wenn Center sehr nah an Origin (≤ 25m) → vermutlich das eigene Gebäude
      return distToOrigin > 25;
    });
  }

  return buildings;
}

function polygonCenter(pts: { x: number; z: number }[]): { x: number; z: number } {
  let sx = 0;
  let sz = 0;
  for (const p of pts) {
    sx += p.x;
    sz += p.z;
  }
  return { x: sx / pts.length, z: sz / pts.length };
}

/** Helper für Outline-Polygon-Vertices als LatLon-Array (für UmgebungView Map). */
export function buildingOutlineToLatLon(
  building: OSMBuilding,
  origin: { lat: number; lon: number },
): LatLon[] {
  // Inverse Umkehrung aus geoToLocal:
  // dLat = -z / R, dLon = x / (R*cos(lat))
  const R = 6371000;
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  return building.outline.map((p) => {
    const dLat = -p.z / R;
    const dLon = p.x / (R * cosLat);
    return [origin.lat + (dLat * 180) / Math.PI, origin.lon + (dLon * 180) / Math.PI] as LatLon;
  });
}
