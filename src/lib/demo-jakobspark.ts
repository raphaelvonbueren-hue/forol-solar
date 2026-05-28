/**
 * FOROL Jakobspark Demo-Preset — Wohnüberbauung an der Jakobstrasse in Rorschach,
 * direkt am Bodensee. Bauherrschaft: Koller Family Immobilien.
 *
 * GEOMETRIE (aus Stockwerkplänen vom 28.05.2026 rekonstruiert):
 * L-förmiger Komplex aus 2 Trakten:
 *   - Süd-Trakt: lang, breit, leicht trapezoid, parallel zur Jakobstrasse,
 *     im 4.OG mit Attika-Rücksprung
 *   - Nord-Trakt: kleinerer Anbau nördlich davon, L-förmig, etwas vom Süd-Trakt versetzt,
 *     wirkt im oberen Geschoss stärker
 * Ausrichtung: leicht gedreht gegen Nord-Süd (~15-20° gegen Uhrzeigersinn,
 * da die Jakobstrasse leicht von SW nach NO verläuft).
 *
 * 30 Eigentumswohnungen (2.5–4.5 Zi) auf 5 Etagen (EG + 4 OG),
 * dazu 1 Gewerbefläche im EG.
 *
 * Daten gescrapt von jakobspark.swiss am 28.05.2026.
 */

import type { LatLon, Massing, Project, ApartmentSales } from '@/types';
import { autoSplitMassing } from './apartments';

// Adresse: Jakobstrasse 90, 9400 Rorschach
const JAKOBSPARK_LAT = 47.47875;
const JAKOBSPARK_LON = 9.49095;

/** Rechteck-Polygon, in Metern um Origin gedreht. */
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

const FLOOR_LABELS = ['EG', '1.OG', '2.OG', '3.OG', '4.OG'];

interface JakobsparkApt {
  nr: number;
  rooms: number;
  floor: number;
  areaSqm: number;
  outside: string;
  price: number | null;
  status: ApartmentSales['status'];
  isGewerbe?: boolean;
}

const JAKOBSPARK_APARTMENTS: JakobsparkApt[] = [
  // EG
  { nr: 0, rooms: 0,   floor: 0, areaSqm: 380, outside: '—',           price: null,    status: 'reserved', isGewerbe: true },
  { nr: 1, rooms: 4.5, floor: 0, areaSqm: 102, outside: 'Sitzplatz',   price: null,    status: 'reserved' },
  { nr: 2, rooms: 2.5, floor: 0, areaSqm:  77, outside: '—',           price: null,    status: 'reserved' },
  // 1.OG
  { nr: 3, rooms: 4.5, floor: 1, areaSqm: 102, outside: 'Loggia',      price: null,    status: 'sold' },
  { nr: 4, rooms: 4.5, floor: 1, areaSqm: 106, outside: 'Terrasse',    price: null,    status: 'reserved' },
  { nr: 5, rooms: 3.5, floor: 1, areaSqm:  90, outside: 'Loggia',      price: 690000,  status: 'available' },
  { nr: 6, rooms: 3.5, floor: 1, areaSqm:  92, outside: 'Loggia',      price: 765000,  status: 'available' },
  { nr: 7, rooms: 3.5, floor: 1, areaSqm:  80, outside: 'Loggia',      price: 675000,  status: 'available' },
  { nr: 8, rooms: 3.5, floor: 1, areaSqm:  83, outside: '2 Loggias',   price: 700000,  status: 'available' },
  { nr: 9, rooms: 2.5, floor: 1, areaSqm:  86, outside: 'Loggia',      price: 765000,  status: 'available' },
  { nr:10, rooms: 3.5, floor: 1, areaSqm:  94, outside: 'Terrasse',    price: 910000,  status: 'available' },
  // 2.OG
  { nr:11, rooms: 4.5, floor: 2, areaSqm: 102, outside: 'Loggia',      price: null,    status: 'reserved' },
  { nr:12, rooms: 4.5, floor: 2, areaSqm: 106, outside: 'Terrasse',    price: null,    status: 'reserved' },
  { nr:13, rooms: 3.5, floor: 2, areaSqm:  97, outside: 'Terrasse',    price: 900000,  status: 'available' },
  { nr:14, rooms: 3.5, floor: 2, areaSqm:  92, outside: 'Loggia',      price: 785000,  status: 'available' },
  { nr:15, rooms: 3.5, floor: 2, areaSqm:  81, outside: 'Loggia',      price: 695000,  status: 'available' },
  { nr:16, rooms: 3.5, floor: 2, areaSqm:  84, outside: '2 Loggias',   price: 720000,  status: 'available' },
  { nr:17, rooms: 2.5, floor: 2, areaSqm:  87, outside: 'Loggia',      price: 795000,  status: 'available' },
  { nr:18, rooms: 3.5, floor: 2, areaSqm:  92, outside: 'Loggia',      price: 890000,  status: 'available' },
  // 3.OG
  { nr:19, rooms: 4.5, floor: 3, areaSqm: 108, outside: 'Loggia',      price: null,    status: 'sold' },
  { nr:20, rooms: 3.5, floor: 3, areaSqm:  99, outside: 'Terrasse',    price: 925000,  status: 'available' },
  { nr:21, rooms: 3.5, floor: 3, areaSqm:  93, outside: 'Loggia',      price: null,    status: 'reserved' },
  { nr:22, rooms: 4.5, floor: 3, areaSqm: 111, outside: 'Loggia',      price: 965000,  status: 'available' },
  { nr:23, rooms: 3.5, floor: 3, areaSqm: 151, outside: 'Loggia/Terr.',price: null,    status: 'available' },
  { nr:24, rooms: 2.5, floor: 3, areaSqm:  84, outside: 'Loggia',      price: null,    status: 'reserved' },
  { nr:25, rooms: 3.5, floor: 3, areaSqm:  92, outside: 'Loggia',      price: null,    status: 'reserved' },
  // 4.OG / Attika
  { nr:26, rooms: 3.5, floor: 4, areaSqm: 137, outside: 'Terrasse',    price: null,    status: 'available' },
  { nr:27, rooms: 3.5, floor: 4, areaSqm:  91, outside: 'Loggia',      price: 850000,  status: 'available' },
  { nr:28, rooms: 4.5, floor: 4, areaSqm: 101, outside: 'Loggia',      price: 995000,  status: 'available' },
  { nr:29, rooms: 3.5, floor: 4, areaSqm:  95, outside: 'Terrasse',    price: null,    status: 'available' },
  { nr:30, rooms: 2.5, floor: 4, areaSqm:  50, outside: 'Terrasse',    price: null,    status: 'reserved' },
];

function aptColor(apt: JakobsparkApt): string {
  if (apt.isGewerbe) return '#8B7355';
  const palette = ['#5E8FB8', '#7FA88C', '#D4A574', '#B87878', '#9B7BB8', '#7BB8A4', '#A88EBF'];
  return palette[apt.nr % palette.length];
}

function makeSales(apt: JakobsparkApt): ApartmentSales {
  return {
    price: apt.price ?? undefined,
    areaSqm: apt.areaSqm,
    rooms: apt.rooms,
    status: apt.status,
    floorLabel: FLOOR_LABELS[apt.floor],
    thumbnailColor: aptColor(apt),
  };
}

export function createJakobsparkDemo(): Project {
  const origin = { lat: JAKOBSPARK_LAT, lon: JAKOBSPARK_LON };
  const massings: Massing[] = [];

  // ====== GEBÄUDE-GEOMETRIE (aus Stockwerkplänen) ======
  // Anlage ist L-förmig, leicht gedreht gegen Nord-Süd-Achse (Jakobstrasse-Richtung)
  // 2 Trakte:
  //   Süd-Trakt: lang, breit, parallel zur Jakobstrasse
  //   Nord-Trakt: kleiner L-förmig, nördlich-westlich versetzt
  //
  // Koordinaten-System: +X = Osten (Strassen-Achse), +Z = Süden, -Z = Norden (See)
  // Origin im Zentrum der Anlage
  // Rotation ~15° im Uhrzeigersinn = Süd-West nach Nord-Ost

  const ENS_ROT_DEG = -15; // Anlage gegen Uhrzeigersinn gedreht (Jakobstrasse-Ausrichtung)
  const FLOOR_H = 2.85;

  // Süd-Trakt (Haupt-Block): zentral südlich
  const SUED_CX = 0;
  const SUED_CZ = +8;     // 8m südlich vom Zentrum
  const SUED_W = 50;      // ~50m lang (Ost-West vor Rotation)
  const SUED_D = 14;      // ~14m tief

  // Nord-Trakt (kleinerer Block): nördlich + leicht versetzt nach Osten
  const NORD_CX = +5;
  const NORD_CZ = -14;    // ~14m nördlich
  const NORD_W = 22;      // kürzer
  const NORD_D = 18;      // tiefer

  const traktConfigs = [
    { name: 'Süd-Trakt', cx: SUED_CX, cz: SUED_CZ, w: SUED_W, d: SUED_D },
    { name: 'Nord-Trakt', cx: NORD_CX, cz: NORD_CZ, w: NORD_W, d: NORD_D },
  ] as const;

  // Pro [Etage][Trakt] welcher Split-Mode wird verwendet
  // Süd-Trakt: long4 oder long5 für ~4-5 Wohnungen pro Etage
  // Nord-Trakt: cross2 für 2 Wohnungen pro Etage
  // 4.OG: Süd-Trakt schrumpft (Attika) -> long3
  const splitMatrix: ('none' | 'long2' | 'long3' | 'long4' | 'cross2' | 'cross3')[][] = [
    ['long3', 'none'],          // EG: 3 Einheiten (Gewerbe + 2 Whg) im Süd, 0 im Nord
    ['long4', 'cross2'],        // 1.OG: 4+2 = 6 (statt 8) -- die anderen 2 erweitern wir
    ['long4', 'cross2'],        // 2.OG: 4+2 = 6
    ['long3', 'cross2'],        // 3.OG: 3+2 = 5
    ['long3', 'cross2'],        // 4.OG: 3+2 = 5
  ];

  // Wohnungs-Zuordnung pro [Floor]-[Trakt]
  // Wir haben 31 Einheiten zu verteilen
  // Schichten der Tabelle:
  //   EG: 3 Einheiten (G, 1, 2) -> alle in Süd-Trakt
  //   1.OG: 8 Einheiten (3-10) -> 4 in Süd + 2 in Nord + 2 weitere ungerendert in DB
  //   2.OG: 8 Einheiten (11-18) -> wie 1.OG
  //   3.OG: 7 Einheiten (19-25) -> 3 in Süd + 2 in Nord + 2 weitere
  //   4.OG: 5 Einheiten (26-30) -> 3 in Süd + 2 in Nord
  // Idee: Wohnungen die "über"-zählig sind (nicht in Massings) bleiben in der DB sichtbar
  // aber nicht im 3D-Modell selektierbar -- das ist akzeptabel für Demo

  const aptAssignment: { [key: string]: number[] } = {
    // EG
    '0-0': [0, 1, 2], '0-1': [],
    // 1.OG
    '1-0': [3, 5, 6, 10], '1-1': [4, 7],  // andere: 8,9 = sichtbar in DB-Liste, aber nicht im 3D selektiert
    // 2.OG
    '2-0': [11, 13, 14, 18], '2-1': [12, 17],
    // 3.OG
    '3-0': [19, 20, 22], '3-1': [23, 24],
    // 4.OG
    '4-0': [26, 27, 28], '4-1': [29, 30],
  };

  for (let floor = 0; floor < 5; floor++) {
    for (let traktIdx = 0; traktIdx < 2; traktIdx++) {
      const trakt = traktConfigs[traktIdx];
      const splitMode = splitMatrix[floor][traktIdx];

      // Im 4.OG: Süd-Trakt etwas schmaler (Attika-Effekt)
      let w = trakt.w;
      let d = trakt.d;
      if (floor === 4 && traktIdx === 0) {
        w = trakt.w * 0.7;  // ~35m statt 50m im Attika-Geschoss
        d = trakt.d * 0.8;
      }

      const outline = rectPolygon(trakt.cx, trakt.cz, w, d, ENS_ROT_DEG, origin);
      const massingId = newId('m');

      const m: Massing = {
        id: massingId,
        name: `${trakt.name} · ${FLOOR_LABELS[floor]}`,
        outline,
        holes: [],
        height: FLOOR_H,
        zOffset: floor * FLOOR_H,
        splitMode,
        subzones: [],
      };

      if (splitMode !== 'none') {
        const subzones = autoSplitMassing(m, splitMode, origin);
        const aptNumbers = aptAssignment[`${floor}-${traktIdx}`] ?? [];
        subzones.forEach((sz, i) => {
          const aptNr = aptNumbers[i];
          if (aptNr === undefined) {
            sz.name = `${FLOOR_LABELS[floor].replace('.', '')}-${i+1}`;
            return;
          }
          const apt = JAKOBSPARK_APARTMENTS.find((a) => a.nr === aptNr);
          if (!apt) return;
          sz.name = apt.isGewerbe ? 'G' : String(apt.nr).padStart(2, '0');
          sz.sales = makeSales(apt);
        });
        m.subzones = subzones;
      }
      massings.push(m);
    }
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    location: {
      lat: JAKOBSPARK_LAT,
      lon: JAKOBSPARK_LON,
      label: 'Jakobspark Rorschach · Jakobstrasse 90',
    },
    buildingMode: 'polygon',
    box: { length: 50, width: 18, height: 14, rotationDeg: -15 },
    massings,
    dateTime: {
      year: 2026,
      month: 5,
      day: 21,
      localMinutes: 12 * 60,
    },
    osmRadius: 250,
  };
}
