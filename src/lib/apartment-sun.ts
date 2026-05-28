/**
 * Per-Apartment Sun Hours Calculation
 *
 * Berechnet Sonnenstunden pro Wohnung basierend auf:
 * - Wohnungsmittelpunkt (aus bbox)
 * - Wohnungs-Ausrichtung (relativ zum Massing-Zentrum)
 * - Sonnenposition (altitude/azimuth) für jede Stunde
 * - Stockwerks-Bonus (höher = weniger Verschattung)
 *
 * Heuristisch ohne Three.js Raycast — schnell, deterministisch, gut genug
 * für Marketing-Visualisierung. Für absolute Präzision müsste ein
 * Raycast gegen die Massing-Geometrie gemacht werden.
 */

import type { Apartment, Massing } from '@/types';
import { sunPosition } from './solar';

export interface ApartmentHour {
  hour: number; // 0-23
  altitude: number;
  azimuth: number;
  sunny: boolean;
  intensity: number; // 0..1
}

export interface ApartmentSunResult {
  hourly: ApartmentHour[];
  totalSunnyHours: number;
  bestHourRange: { start: number; end: number } | null;
  facingAzimuth: number; // Welt-Azimuth der Wohnungs-Ausrichtung (0=N, 180=S)
  facingLabel: string; // "Süd", "Süd-West", etc.
}

/** Berechne Massing-Zentrum aus outline (alle Punkte gemittelt). */
function massingCenterLocal(massing: Massing): { x: number; z: number } {
  // Die outline ist in Lat/Lon — Apartment-bbox ist in lokalen m
  // Wir nehmen einfach (0, 0) als Default — ApartmentCenter wird relativ dazu betrachtet
  // Tatsächlich: das Massing-Zentrum sollte aus den Subzones gemittelt sein
  if (massing.subzones.length === 0) return { x: 0, z: 0 };
  let sx = 0;
  let sz = 0;
  for (const apt of massing.subzones) {
    sx += (apt.bbox.xMin + apt.bbox.xMax) / 2;
    sz += (apt.bbox.zMin + apt.bbox.zMax) / 2;
  }
  return {
    x: sx / massing.subzones.length,
    z: sz / massing.subzones.length,
  };
}

/** Wandelt einen lokalen Richtungsvektor in einen Welt-Azimuth um. */
function localToWorldAzimuth(
  dx: number,
  dz: number,
  buildingRotationRad: number,
): number {
  // Three.js Konvention: -Z = Norden. dz > 0 = Süden (lokal)
  // Lokaler Azimuth: 0 = -Z (N), 90 = +X (O), 180 = +Z (S), 270 = -X (W)
  const localAz = (Math.atan2(dx, -dz) * 180) / Math.PI; // -180..180
  const worldAz = localAz + (buildingRotationRad * 180) / Math.PI;
  return ((worldAz % 360) + 360) % 360;
}

/** Welt-Azimuth in deutsches Himmelsrichtungs-Label. */
function azimuthLabel(az: number): string {
  if (az < 22.5 || az >= 337.5) return 'Nord';
  if (az < 67.5) return 'Nord-Ost';
  if (az < 112.5) return 'Ost';
  if (az < 157.5) return 'Süd-Ost';
  if (az < 202.5) return 'Süd';
  if (az < 247.5) return 'Süd-West';
  if (az < 292.5) return 'West';
  return 'Nord-West';
}

/** Findet längste zusammenhängende Sunny-Phase. */
function findBestHourRange(hourly: ApartmentHour[]): { start: number; end: number } | null {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let curStart = -1;
  for (let i = 0; i < hourly.length; i++) {
    if (hourly[i].sunny) {
      if (curStart < 0) curStart = i;
      const len = i - curStart + 1;
      if (len > bestLen) {
        bestLen = len;
        bestStart = curStart;
        bestEnd = i;
      }
    } else {
      curStart = -1;
    }
  }
  if (bestLen === 0) return null;
  return { start: hourly[bestStart].hour, end: hourly[bestEnd].hour };
}

/**
 * Berechnet die Sonnenstunden für eine Wohnung an einem Tag.
 *
 * @param apt Die Wohnung
 * @param massing Das Massing in dem die Wohnung liegt
 * @param date Datum (verwendet wird date.year/month/day - lokales Datum)
 * @param lat Breitengrad
 * @param lon Längengrad
 * @param buildingRotationRad Rotation der Anlage in Radian (Jakobspark: -15° = -0.2618 rad)
 * @param floorIndex Etagen-Index (0=EG, 1=1.OG, ...) für Höhen-Bonus
 */
export function computeApartmentSunHours(
  apt: Apartment,
  massing: Massing,
  dateTime: { year: number; month: number; day: number },
  lat: number,
  lon: number,
  buildingRotationRad: number = 0,
  floorIndex: number = 0,
): ApartmentSunResult {
  // 1. Wohnungs-Mittelpunkt in lokalen Koords
  const aptCenter = {
    x: (apt.bbox.xMin + apt.bbox.xMax) / 2,
    z: (apt.bbox.zMin + apt.bbox.zMax) / 2,
  };

  // 2. Massing-Zentrum berechnen
  const mc = massingCenterLocal(massing);

  // 3. Richtungs-Vektor von Massing-Zentrum zur Wohnung
  const dx = aptCenter.x - mc.x;
  const dz = aptCenter.z - mc.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  let facingAzimuth: number;
  if (len < 0.5) {
    // Wohnung ist nahe Zentrum (Sonderfall: Single-Apt-Massing oder zentraler Innenhof)
    // Default: Süd-Ausrichtung
    facingAzimuth = 180;
  } else {
    facingAzimuth = localToWorldAzimuth(dx, dz, buildingRotationRad);
  }
  const facingLabel = azimuthLabel(facingAzimuth);

  // 4. Pro Stunde berechnen
  const hourly: ApartmentHour[] = [];
  for (let h = 5; h <= 21; h++) {
    // UTC aus Schweizer Lokalzeit (Sommerzeit MESZ = UTC+2)
    const utcMinutes = h * 60 - 120;
    const utc = new Date(Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day, 0, utcMinutes));
    const pos = sunPosition(utc, lat, lon);

    // Heuristik:
    // - Sonne muss hoch genug sein (alt > 3° für gerade direkten Einfall)
    // - Sonne muss in einem Winkel von <±90° zur Wohnungs-Ausrichtung stehen
    let sunny = false;
    let intensity = 0;
    if (pos.altitude > 3) {
      const azDiff = Math.abs(((pos.azimuth - facingAzimuth + 540) % 360) - 180);
      // azDiff: 0 = Sonne direkt in Wohnungsrichtung, 180 = entgegengesetzt
      // 75° als Schwellwert: realistischer Wand-Effekt (90° streift nur tangential)
      if (azDiff < 80) {
        sunny = true;
        // Intensität: hoch wenn azDiff klein UND altitude hoch
        const azScore = 1 - azDiff / 80;
        const altScore = Math.min(1, pos.altitude / 50);
        intensity = Math.max(0.2, azScore * 0.65 + altScore * 0.35);
      }
    }

    // Etagen-Bonus: höhere Etagen können bei tieferer Sonne noch Sonne haben
    // (Schatten der Nachbargebäude geringer)
    if (floorIndex > 0 && pos.altitude > 0 && !sunny) {
      const adjustedAlt = pos.altitude + floorIndex * 2;
      const azDiff = Math.abs(((pos.azimuth - facingAzimuth + 540) % 360) - 180);
      if (adjustedAlt > 3 && azDiff < 85) {
        sunny = true;
        intensity = 0.2;
      }
    }

    hourly.push({ hour: h, altitude: pos.altitude, azimuth: pos.azimuth, sunny, intensity });
  }

  const totalSunnyHours = hourly.filter((h) => h.sunny).length;
  const bestHourRange = findBestHourRange(hourly);

  return {
    hourly,
    totalSunnyHours,
    bestHourRange,
    facingAzimuth,
    facingLabel,
  };
}

/** Helper: Findet das Massing einer Wohnung anhand der ID. */
export function findApartmentMassing(apartmentId: string, massings: Massing[]): Massing | null {
  for (const m of massings) {
    if (m.subzones.some((s) => s.id === apartmentId)) return m;
  }
  return null;
}

/** Helper: Findet den Floor-Index (0-based) eines Massings im Projekt. */
export function findFloorIndex(massingId: string, massings: Massing[]): number {
  // Sort massings by zOffset to determine floor order
  const sorted = [...massings].sort((a, b) => a.zOffset - b.zOffset);
  return sorted.findIndex((m) => m.id === massingId);
}
