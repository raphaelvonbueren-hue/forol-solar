/**
 * FOROL CH144 Demo-Preset: zwei Holz-MFH über gemeinsamer Tiefgarage in der Schweiz.
 * Inklusive realistischer Vertriebs-Daten für Wohnungen.
 */

import type { LatLon, Massing, Project, ApartmentSales } from '@/types';
import { autoSplitMassing } from './apartments';

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

const FLOOR_LABELS = ['EG', '1.OG', '2.OG', 'Attika'];
const APT_COLORS = ['#5E8FB8', '#7FA88C', '#D4A574', '#B87878', '#9B7BB8', '#7BB8A4'];

/**
 * Realistische Wohnungs-Vertriebsdaten generieren.
 * Höhere Etagen = höhere Preise (Aussicht). Größere Wohnungen kosten mehr.
 */
function makeSales(
  floor: number, // 0..3
  isLeft: boolean, // halbiert die Etage in 2 Wohnungen
  house: 'A' | 'B',
): ApartmentSales {
  // Basis-Preise pro m² steigen mit Etage
  const pricePerSqm = 11500 + floor * 800;
  // Wohnungen sind etwa 110m² (EG/OG) bzw. 135m² (Attika, weil größer)
  const areaSqm = floor === 3 ? 135 : 110 + (isLeft ? 0 : 8);
  const rooms = floor === 3 ? 4.5 : (isLeft ? 3.5 : 4.5);
  const price = Math.round((pricePerSqm * areaSqm) / 10000) * 10000;

  // Verfügbarkeits-Verteilung: Mix aus available/reserved/sold für realistisches Bild
  // Deterministisch via Indizes, damit es bei jedem Aufruf gleich aussieht
  const idx = (house === 'A' ? 0 : 4) + floor * 2 + (isLeft ? 0 : 1);
  let status: ApartmentSales['status'] = 'available';
  if (idx === 0 || idx === 5) status = 'sold';
  else if (idx === 2 || idx === 7) status = 'reserved';

  return {
    price,
    areaSqm,
    rooms,
    status,
    floorLabel: FLOOR_LABELS[floor],
    thumbnailColor: APT_COLORS[idx % APT_COLORS.length],
  };
}

export function createCH144Demo(): Project {
  const origin = { lat: CH144_LAT, lon: CH144_LON };
  const massings: Massing[] = [];

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
    const houseLabel = house === 0 ? 'A' : 'B';
    const houseName = `Haus ${houseLabel}`;
    for (let floor = 0; floor < NUM_FLOORS; floor++) {
      const outline = rectPolygon(cx, HOUSE_CZ, HOUSE_W, HOUSE_D, HOUSE_ROT, origin);
      const massingId = newId('m');
      const m: Massing = {
        id: massingId,
        name: `${houseName} · ${FLOOR_LABELS[floor]}`,
        outline,
        holes: [],
        height: FLOOR_H,
        zOffset: floor * FLOOR_H,
        splitMode: 'cross2',
        subzones: [],
      };

      // Subzones direkt berechnen — beim Import des Stores werden sie sowieso nochmal aktualisiert,
      // aber das spart einen Roundtrip
      const subzones = autoSplitMassing(m, 'cross2', origin);
      // Wohnungs-Daten anreichern
      subzones.forEach((sz, i) => {
        const isLeft = i === 0;
        const aptNum = floor * 2 + i + 1;
        sz.name = `${houseLabel}${String(aptNum).padStart(2, '0')}`;
        sz.sales = makeSales(floor, isLeft, houseLabel as 'A' | 'B');
      });
      m.subzones = subzones;
      massings.push(m);
    }
  }

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
      localMinutes: 12 * 60,
    },
    osmRadius: 200,
  };
}
