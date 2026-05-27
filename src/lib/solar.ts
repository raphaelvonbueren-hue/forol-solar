/**
 * NOAA Solar Position Algorithm.
 *
 * Genauigkeit: ±0.01° für die nächsten ~100 Jahre.
 * Referenz: https://gml.noaa.gov/grad/solcalc/calcdetails.html
 *
 * Diese Implementierung gibt astronomische Sonnenposition zurück.
 * Atmosphärische Refraktion (~0.5° am Horizont) wird nicht korrigiert.
 */

export interface SunPosition {
  /** Sonnenhöhe über Horizont in Grad (-90 bis +90). */
  altitude: number;
  /** Sonnenazimut in Grad, gemessen von Norden im Uhrzeigersinn (0 = N, 90 = O, 180 = S, 270 = W). */
  azimuth: number;
}

/**
 * Berechnet Sonnenposition für ein UTC-Datum und Beobachterstandort.
 *
 * @param date UTC-Zeitpunkt
 * @param lat Geografische Breite in Grad (positive Werte = Norden)
 * @param lon Geografische Länge in Grad (positive Werte = Osten)
 */
export function sunPosition(date: Date, lat: number, lon: number): SunPosition {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;

  // Geometrische mittlere Länge der Sonne
  let L0 = 280.46646 + T * (36000.76983 + T * 0.0003032);
  L0 = ((L0 % 360) + 360) % 360;

  // Mittlere Anomalie
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const Mrad = (M * Math.PI) / 180;

  // Mittelpunktsgleichung
  const C =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289;

  const trueLong = L0 + C;

  // Scheinbare Länge (Nutation und Aberration)
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
  const lambdaRad = (lambda * Math.PI) / 180;

  // Schiefe der Ekliptik
  let epsilon = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  epsilon += 0.00256 * Math.cos((omega * Math.PI) / 180);
  const epsilonRad = (epsilon * Math.PI) / 180;

  // Rektaszension und Deklination
  const RA = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
  const decl = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad));

  // Greenwich Mean Sidereal Time
  let GMST =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    T * T * (0.000387933 - T / 38710000);
  GMST = ((GMST % 360) + 360) % 360;

  // Stundenwinkel
  const H = ((GMST + lon) * Math.PI) / 180 - RA;

  const latRad = (lat * Math.PI) / 180;

  const altitude = Math.asin(
    Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(H),
  );
  const azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(latRad) - Math.tan(decl) * Math.cos(latRad),
  );

  return {
    altitude: (altitude * 180) / Math.PI,
    azimuth: ((((azimuth * 180) / Math.PI + 180) % 360) + 360) % 360,
  };
}

/**
 * Schweizer Zeitzonen-Offset in Stunden für ein UTC-Datum.
 * Berücksichtigt MEZ (UTC+1) vs MESZ (UTC+2) korrekt für jedes Jahr.
 */
export function swissOffsetHours(date: Date): 1 | 2 {
  const y = date.getFullYear();
  const lastSunMar = new Date(Date.UTC(y, 2, 31));
  lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
  lastSunMar.setUTCHours(1, 0, 0, 0);
  const lastSunOct = new Date(Date.UTC(y, 9, 31));
  lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
  lastSunOct.setUTCHours(1, 0, 0, 0);
  return date >= lastSunMar && date < lastSunOct ? 2 : 1;
}

export interface SunEvents {
  /** Minuten seit UTC-Mitternacht des Tages, oder null falls keine Sonne aufgeht (Polartag/-nacht). */
  sunrise: number | null;
  sunset: number | null;
  /** Höchster Sonnenstand des Tages in Grad. */
  maxAltitude: number;
}

/**
 * Findet Sonnenauf- und -untergang für einen UTC-Kalendertag durch lineare Interpolation
 * von 5-Minuten-Samples des Sonnenstandes.
 */
export function findSunEvents(
  year: number,
  month: number,
  day: number,
  lat: number,
  lon: number,
): SunEvents {
  let sunrise: number | null = null;
  let sunset: number | null = null;
  let maxAlt = -90;
  let prev: SunPosition | null = null;

  for (let m = 0; m < 24 * 60; m += 5) {
    const d = new Date(Date.UTC(year, month, day, 0, m));
    const pos = sunPosition(d, lat, lon);
    if (prev !== null) {
      if (prev.altitude < 0 && pos.altitude >= 0) {
        const t = prev.altitude / (prev.altitude - pos.altitude);
        sunrise = m - 5 + t * 5;
      }
      if (prev.altitude >= 0 && pos.altitude < 0) {
        const t = prev.altitude / (prev.altitude - pos.altitude);
        sunset = m - 5 + t * 5;
      }
    }
    if (pos.altitude > maxAlt) maxAlt = pos.altitude;
    prev = pos;
  }

  return { sunrise, sunset, maxAltitude: maxAlt };
}

/**
 * Formatiert Minuten seit Mitternacht als HH:MM, mit optionalem Zeitzonen-Offset in Stunden.
 */
export function formatMinutes(min: number, offsetHours = 0): string {
  let total = min + offsetHours * 60;
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = Math.round(total - h * 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
