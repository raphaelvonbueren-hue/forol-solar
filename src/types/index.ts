/**
 * Domain-Modell für FOROL Sonnen- und Schattenanalyse.
 *
 * Diese Types beschreiben die Daten, die zwischen UI, Berechnung und Persistenz
 * fließen. Sie sind bewusst frei von Three.js- und React-Abhängigkeiten —
 * damit auch in Worker-Threads und im Backend nutzbar.
 */

/** Geografischer Standort in WGS84. */
export interface Location {
  lat: number;
  lon: number;
  label: string;
  /** Rotation der Anlage in Grad (Z-Achse), für Eindrehen auf Parzelle. Default 0. */
  rotationDeg?: number;
  /** Translation der Anlage in lokalen Metern (Ost-Verschiebung). Default 0. */
  offsetX?: number;
  /** Translation der Anlage in lokalen Metern (Süd-Verschiebung). Default 0. */
  offsetZ?: number;
}

/** Datum und Tageszeit in Schweizer Lokalzeit. */
export interface DateTime {
  year: number;
  /** Monat 0-11 */
  month: number;
  /** Tag 1-31 */
  day: number;
  /** Minuten seit lokaler Mitternacht */
  localMinutes: number;
}

/** Einfacher Quader als Gebäudemodell. */
export interface BoxBuilding {
  length: number; // Meter
  width: number;
  height: number;
  rotationDeg: number; // Drehung um Y-Achse, 0 = Nord
}

/** Ein einzelnes WGS84-Punktpaar [lat, lon]. */
export type LatLon = [number, number];

/** Aufteilungs-Modus für Wohnungen einer Etage. */
export type SplitMode =
  | 'none'
  | 'long2' | 'long3' | 'long4'
  | 'cross2' | 'cross3'
  | 'grid2x2' | 'grid2x3';

/** Achsen-ausgerichtete Bounding-Box in lokalen Metern. */
export interface BoundingBox2D {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/** Verkaufsstatus einer Wohnung. */
export type ApartmentStatus = 'available' | 'reserved' | 'sold';

/** Eine Wohnung als achsen-ausgerichtete Subzone einer Etage. */
export interface Apartment {
  id: string;
  name: string;
  bbox: BoundingBox2D;
  /** Optionale Vertriebs-Daten — können von Demo-Preset, Code oder Backend kommen */
  sales?: ApartmentSales;
}

/** Vertriebs-Informationen einer Wohnung. */
export interface ApartmentSales {
  /** Verkaufspreis in CHF */
  price?: number;
  /** Wohnfläche in m² */
  areaSqm?: number;
  /** Anzahl Zimmer (z.B. 3.5, 4.5) */
  rooms?: number;
  /** Verkaufsstatus */
  status?: ApartmentStatus;
  /** Etagen-Label fürs UI (z.B. "EG", "1.OG") */
  floorLabel?: string;
  /** Optional: Bild-URL oder Inline-Farbverlauf */
  thumbnailUrl?: string;
  /** Optional: Hex-Farbe für Thumbnail-Verlauf wenn kein Bild */
  thumbnailColor?: string;
}

/**
 * Eine Etage als 3D-Massing: extrudiertes Polygon mit optionalen Löchern (Innenhof).
 */
export interface Massing {
  id: string;
  name: string;
  /** Außenkontur als WGS84-Punkte */
  outline: LatLon[];
  /** Optionale Löcher (z.B. Innenhof) */
  holes: LatLon[][];
  /** Höhe der Etage in Metern */
  height: number;
  /** z-Offset (Höhe des Bodens dieser Etage über Grund) */
  zOffset: number;
  /** Wohnungs-Aufteilung */
  splitMode: SplitMode;
  /** Berechnete Wohnungen (durch autoSplit erzeugt) */
  subzones: Apartment[];
}

/** Modus für Gebäude-Definition. */
export type BuildingMode = 'box' | 'polygon' | 'upload';

/** Genauigkeitsstufe für Verschattungs-Analyse. */
export type AnalysisPrecision = 'fast' | 'medium' | 'accurate';

/** Konfiguration einer Verschattungs-Analyse. */
export interface AnalysisConfig {
  precision: AnalysisPrecision;
  /** Abstand zwischen Fassaden-Samples in Metern */
  sampleSpacing: number;
}

/** Ergebnis pro Wohnung. */
export interface ApartmentResult {
  id: string;
  name: string;
  massingName: string;
  color: string;
  minSunHours: number;
  avgSunHours: number;
  maxSunHours: number;
  sampleCount: number;
}

/**
 * Gesamtzustand eines Projekts, wie er gespeichert/geladen wird.
 * Diese Struktur ist das Format der Export-/Import-JSON.
 */
export interface Project {
  version: '1.0';
  exportedAt: string; // ISO-8601
  location: Location;
  buildingMode: BuildingMode;
  box: BoxBuilding;
  massings: Massing[];
  dateTime: DateTime;
  osmRadius: number;
  /** Feste Modell-Ausrichtung in Grad (0 = Nord), optional für Abwärtskompatibilität. */
  orientationDeg?: number;
}
