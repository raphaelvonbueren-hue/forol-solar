/**
 * Lädt Gebäudegrundrisse aus OpenStreetMap via Overpass API.
 */

export interface OSMBuilding {
  /** Außenring als [lat, lon]-Paare. */
  outline: Array<[number, number]>;
  /** Geschätzte Höhe in Metern, aus building:height, height oder building:levels abgeleitet. */
  height: number;
}

interface OSMWay {
  type: 'way';
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}
interface OSMRelation {
  type: 'relation';
  members?: Array<{
    type: string;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
  tags?: Record<string, string>;
}
type OSMElement = OSMWay | OSMRelation;
interface OSMResponse {
  elements: OSMElement[];
}

function parseHeight(tags: Record<string, string> | undefined): number {
  if (!tags) return 9;
  if (tags['building:height']) {
    const v = parseFloat(tags['building:height']);
    if (!isNaN(v)) return v;
  }
  if (tags['height']) {
    const v = parseFloat(tags['height']);
    if (!isNaN(v)) return v;
  }
  if (tags['building:levels']) {
    const v = parseFloat(tags['building:levels']);
    if (!isNaN(v)) return v * 3.0 + 1.0;
  }
  const t = tags.building;
  if (t === 'house' || t === 'detached' || t === 'residential') return 7;
  if (t === 'apartments' || t === 'commercial') return 12;
  if (t === 'church' || t === 'cathedral') return 20;
  if (t === 'garage' || t === 'shed') return 3;
  return 9;
}

function wayToBuilding(way: OSMWay): OSMBuilding | null {
  const geom = way.geometry;
  if (!geom || geom.length < 3) return null;
  const outline: Array<[number, number]> = geom.map(g => [g.lat, g.lon]);
  // Schließenden Punkt entfernen falls vorhanden
  if (outline.length > 1) {
    const f = outline[0], l = outline[outline.length - 1];
    if (Math.abs(f[0] - l[0]) < 1e-7 && Math.abs(f[1] - l[1]) < 1e-7) outline.pop();
  }
  if (outline.length < 3) return null;
  return { outline, height: parseHeight(way.tags) };
}

export interface LoadOSMOptions {
  lat: number;
  lon: number;
  radiusMeters: number;
  /** Optional anderer Overpass-Endpoint. */
  endpoint?: string;
  timeoutSeconds?: number;
}

export async function loadOSMBuildings(opts: LoadOSMOptions): Promise<OSMBuilding[]> {
  const endpoint = opts.endpoint ?? 'https://overpass-api.de/api/interpreter';
  const timeout = opts.timeoutSeconds ?? 25;
  const query = `[out:json][timeout:${timeout}];
(
  way["building"](around:${opts.radiusMeters},${opts.lat},${opts.lon});
  relation["building"](around:${opts.radiusMeters},${opts.lat},${opts.lon});
);
out body geom;`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
  });
  if (!resp.ok) throw new Error('Overpass-Antwort: ' + resp.status);

  const data = (await resp.json()) as OSMResponse;
  const buildings: OSMBuilding[] = [];

  for (const el of data.elements || []) {
    if (el.type === 'way') {
      const b = wayToBuilding(el);
      if (b) buildings.push(b);
    } else if (el.type === 'relation') {
      for (const mem of el.members || []) {
        if (mem.type === 'way' && mem.role === 'outer' && mem.geometry && mem.geometry.length >= 3) {
          const fakeWay: OSMWay = { type: 'way', tags: el.tags, geometry: mem.geometry };
          const b = wayToBuilding(fakeWay);
          if (b) buildings.push(b);
        }
      }
    }
  }
  return buildings;
}
