/**
 * URL-Parameter-Parsing für Embed-Modus und Deep-Linking.
 *
 * Unterstützte Parameter:
 * - embed=1            Versteckt Header und Stats-Bar (kompakt für iframes)
 * - compact=1          Versteckt nur Stats-Bar
 * - lat=47.37, lon=8.54  Setzt Startstandort
 * - label=...          Setzt Standort-Label
 * - demo=ch144         Lädt CH144-Demoprojekt
 * - readonly=1         Macht Sidebar nicht editierbar (nur Anzeige)
 */

export interface UrlParams {
  embed: boolean;
  compact: boolean;
  lat: number | null;
  lon: number | null;
  label: string | null;
  demo: string | null;
  readonly: boolean;
}

export function parseUrlParams(search: string = window.location.search): UrlParams {
  const p = new URLSearchParams(search);
  const lat = parseFloatOrNull(p.get('lat'));
  const lon = parseFloatOrNull(p.get('lon'));
  return {
    embed: p.get('embed') === '1',
    compact: p.get('compact') === '1' || p.get('embed') === '1',
    lat,
    lon,
    label: p.get('label'),
    demo: p.get('demo'),
    readonly: p.get('readonly') === '1',
  };
}

function parseFloatOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}
