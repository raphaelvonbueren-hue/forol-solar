/**
 * Konvertierung von WGS84-Koordinaten (Breite/Länge) zu lokalen Metern
 * relativ zu einem Ursprungspunkt.
 *
 * Verwendet equirectangular projection — exakt genug für Radien < 5 km,
 * danach wachsen Fehler quadratisch.
 */

export const EARTH_RADIUS_M = 6371000;

export interface GeoOrigin {
  lat: number;
  lon: number;
}

export interface LocalPoint {
  /** Meter östlich vom Ursprung */
  x: number;
  /** Meter südlich vom Ursprung (Three.js-Konvention: Norden = -Z) */
  z: number;
}

/**
 * Wandelt einen Punkt von WGS84 nach lokalem ENU-Koordinatensystem um.
 * Konvention: X = Osten, Z = Süden, Y = Up (passt zu Three.js).
 */
export function geoToLocal(lat: number, lon: number, origin: GeoOrigin): LocalPoint {
  const dLat = ((lat - origin.lat) * Math.PI) / 180;
  const dLon = ((lon - origin.lon) * Math.PI) / 180;
  return {
    x: dLon * EARTH_RADIUS_M * Math.cos((origin.lat * Math.PI) / 180),
    z: -dLat * EARTH_RADIUS_M,
  };
}

/**
 * Inverse: lokale Meter zurück nach WGS84.
 */
export function localToGeo(point: LocalPoint, origin: GeoOrigin): { lat: number; lon: number } {
  const dLat = -point.z / EARTH_RADIUS_M;
  const dLon = point.x / (EARTH_RADIUS_M * Math.cos((origin.lat * Math.PI) / 180));
  return {
    lat: origin.lat + (dLat * 180) / Math.PI,
    lon: origin.lon + (dLon * 180) / Math.PI,
  };
}

/**
 * Rotiert einen Punkt in der XZ-Ebene um die Y-Achse (Three.js-Konvention).
 * Entspricht der Welt-Transformation eines lokalen Punktes in einer Group mit
 * `rotation.y = rad`: x' = x·cos + z·sin, z' = -x·sin + z·cos.
 */
export function rotateXZ(x: number, z: number, rad: number): { x: number; z: number } {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c + z * s, z: -x * s + z * c };
}
