/**
 * FOROL CH144 Demo-Preset: zwei Holz-MFH über gemeinsamer Tiefgarage in der Schweiz.
 * Wird über den "CH144 laden"-Button im Header geladen.
 */

import type { LatLon, Massing, Project } from '@/types';

const CH144_LAT = 47.4239;
const CH144_LON = 9.3767; // Beispielkoordinate Ostschweiz

/** Erzeugt ein Rechteck-Polygon zentriert um (cx,cz) in Metern, gedreht um Y. */
function rectPolygon(
  cx: number, cz: number,
  width: number, depth: number,
  rotDeg: number,
  origin: { lat: number; lon: number },
): LatLon[] {
  const rot = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const halfW = width / 2, halfD = depth / 2;
  const corners = [
    [-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD],
  ];
  const lat2m = 1 / 111000;
  const lon2m = 1 / (111000 * Math.cos((origin.lat * Math.PI) / 180));
  return corners.map(([x, z]) => {
    const rx = x * cos - z * sin + cx;
    const rz = x * sin + z * cos + cz;
    return [origin.lat - rz * lat2m, origin.lon + rx * lon2m] as LatLon;
  });
}

function newId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 8);
}

export function createCH144Demo(): Project {
  const origin = { lat: CH144_LAT, lon: CH144_LON };
  const massings: Massing[] = [];

  // Haus A: 4-stöckig, 22×12m, gedreht 15° (sympathische Nicht-Achsentreue)
  // Haus B: 4-stöckig, 22×12m, daneben (20m Abstand), gleiche Orientierung
  // Beide auf gemeinsamer Tiefgarage — die wir hier nicht visualisieren da unterirdisch.

  const HOUSE_A_CX = -15;
  const HOUSE_B_CX = 15;
  const HOUSE_CZ = 0;
  const HOUSE_W = 22;
  const HOUSE_D = 12;
  const HOUSE_ROT = 15;
  const FLOOR_H = 2.85;
  const NUM_FLOORS = 4;

  for (let house = 0; house < 2; house++) {
    const cx = house === 0 ? HOUSE_A_CX : HOUSE_B_CX;
    const houseName = house === 0 ? 'Haus A' : 'Haus B';
    for (let floor = 0; floor < NUM_FLOORS; floor++) {
      const outline = rectPolygon(cx, HOUSE_CZ, HOUSE_W, HOUSE_D, HOUSE_ROT, origin);
      massings.push({
        id: newId('m'),
        name: `${houseName} · ${floor === 0 ? 'EG' : `${floor}.OG`}`,
        outline,
        holes: [],
        height: FLOOR_H,
        zOffset: floor * FLOOR_H,
        splitMode: 'cross2', // Pro Etage 2 Wohnungen, quer zur langen Achse
        subzones: [],
      });
    }
  }

  // Subzones werden vom Store beim Import nicht automatisch berechnet,
  // deshalb hier die Bounding-Boxes vorberechnen — das passiert ohnehin
  // beim ersten Render via recomputeAllSubzones in der App.
  // Wir lassen das Feld leer, der Store füllt es.

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    location: {
      lat: CH144_LAT,
      lon: CH144_LON,
      label: 'CH144 · FOROL Demo-Projekt',
    },
    buildingMode: 'polygon',
    box: { length: 25, width: 15, height: 12, rotationDeg: 0 },
    massings,
    dateTime: {
      year: 2026,
      month: 5, // Juni
      day: 21,
      localMinutes: 12 * 60, // Mittag
    },
    osmRadius: 200,
  };
}
