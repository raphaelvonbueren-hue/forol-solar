/**
 * Datenbank-Zugriff für Projekte und Wohnungen.
 *
 * Liefert Projekte aus Supabase als komplette `Project`-Objekte
 * (mit Massings/Box-Geometrie aus geometry_json) und mergt die
 * separate Wohnungs-Tabelle in die Subzones der Massings.
 */

import type { Project, Apartment } from '@/types';
import { getSupabase } from './supabase';
import type { DbProject, DbApartment, DbInquiryInput } from './db-types';
import { dbApartmentToSales } from './db-types';
import { autoSplitMassing } from './apartments';
import { createCH144Demo } from './demo-ch144';
import { createJakobsparkDemo } from './demo-jakobspark';

/**
 * Wenn das geometry_json `useCodeFallback: true` gesetzt hat, holen wir die
 * Geometrie aus dem hardcodeten Demo-Code. So müssen wir nicht das ganze
 * Massings-JSON in der DB speichern, sondern nur die Vertriebs-Daten.
 */
function resolveGeometry(slug: string, geometryJson: Record<string, unknown>): Omit<Project, 'location'> {
  if (geometryJson?.useCodeFallback === true) {
    if (slug === 'ch144') {
      const demo = createCH144Demo();
      const { location: _l, ...rest } = demo;
      void _l;
      return rest;
    }
    if (slug === 'jakobspark') {
      const demo = createJakobsparkDemo();
      const { location: _l, ...rest } = demo;
      void _l;
      return rest;
    }
    throw new Error(`Code-Fallback für Slug "${slug}" nicht implementiert.`);
  }
  return geometryJson as unknown as Omit<Project, 'location'>;
}

/**
 * Lädt ein veröffentlichtes Projekt anhand seines Slugs.
 * Wirft, wenn nicht gefunden oder nicht published.
 */
export async function fetchProjectBySlug(slug: string): Promise<Project> {
  const sb = getSupabase();

  // 1. Projekt-Metadaten holen
  const { data: dbProject, error: pErr } = await sb
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (pErr) throw new Error(`Projekt konnte nicht geladen werden: ${pErr.message}`);
  if (!dbProject) throw new Error(`Projekt "${slug}" wurde nicht gefunden oder ist nicht veröffentlicht.`);
  const proj = dbProject as DbProject;

  // 2. Wohnungen für dieses Projekt holen
  const { data: dbApts, error: aErr } = await sb
    .from('apartments')
    .select('*')
    .eq('project_id', proj.id)
    .order('display_order', { ascending: true });

  if (aErr) throw new Error(`Wohnungs-Daten konnten nicht geladen werden: ${aErr.message}`);
  const apts = (dbApts ?? []) as DbApartment[];

  // 3. Project aus geometry_json zusammenbauen + Wohnungen einmergen
  //    Falls geometry_json.useCodeFallback gesetzt ist, kommt die Geometrie aus dem Code.
  const geometry = resolveGeometry(proj.slug, proj.geometry_json as Record<string, unknown>);
  const baseProject: Project = {
    ...geometry,
    location: { lat: proj.lat, lon: proj.lon, label: proj.name },
  };

  // Map Apartment-Code → DbApartment, plus Helfer um Code aus Massing+Index zu berechnen
  const aptByCode = new Map<string, DbApartment>();
  apts.forEach((a) => aptByCode.set(a.code, a));

  /**
   * Berechnet den Apartment-Code aus Massing-Name + Subzone-Index.
   * Konvention: Massing-Name endet mit Etagen-Label (z.B. "Haus A · EG"),
   * Wohnungen werden pro Haus durchnummeriert.
   * Falls Subzone schon einen Namen hat (z.B. "A01" aus alter Speicherung), nutzen wir den.
   */
  function deriveCode(massing: { name: string }, oldName: string | undefined, indexInProject: number): string {
    if (oldName && /^[A-Z]\d{2,}$/.test(oldName)) return oldName;
    // Massing-Name könnte "Haus A · EG" sein — extrahiere "A"
    const houseMatch = massing.name.match(/Haus\s+([A-Z])/);
    if (houseMatch) {
      return `${houseMatch[1]}${String(indexInProject + 1).padStart(2, '0')}`;
    }
    // Fallback: einfach durchnummerieren
    return `W${String(indexInProject + 1).padStart(2, '0')}`;
  }

  // Index pro Haus (A, B, ...) zählen
  const houseCounters: Record<string, number> = {};

  const massings = (baseProject.massings ?? []).map((m) => {
    if (m.splitMode === 'none' || m.outline.length < 3) {
      return { ...m, subzones: [] as Apartment[] };
    }
    const fresh = autoSplitMassing(m, m.splitMode, baseProject.location);
    const houseMatch = m.name.match(/Haus\s+([A-Z])/);
    const houseKey = houseMatch ? houseMatch[1] : '_';
    if (!(houseKey in houseCounters)) houseCounters[houseKey] = 0;

    const enriched = fresh.map((sz, i) => {
      const oldSz = m.subzones?.[i];
      const code = deriveCode(m, oldSz?.name, houseCounters[houseKey]);
      houseCounters[houseKey]++;
      const dbApt = aptByCode.get(code);
      if (dbApt) {
        return { ...sz, name: code, sales: dbApartmentToSales(dbApt) };
      }
      return { ...sz, name: code };
    });
    return { ...m, subzones: enriched };
  });

  return { ...baseProject, massings };
}

/**
 * Speichert eine Kontakt-Anfrage in der DB. RLS erlaubt INSERT für anonyme User.
 * Wirft bei Fehler. Wenn project_slug gesetzt ist, wird die project_id automatisch aufgelöst.
 */
export async function submitInquiry(
  input: Omit<DbInquiryInput, 'project_id'> & { project_slug?: string | null },
): Promise<void> {
  const sb = getSupabase();
  let project_id: string | null = null;
  if (input.project_slug) {
    const { data } = await sb
      .from('projects')
      .select('id')
      .eq('slug', input.project_slug)
      .maybeSingle();
    project_id = (data as { id: string } | null)?.id ?? null;
  }
  const { project_slug: _ignored, ...rest } = input;
  void _ignored;
  const { error } = await sb.from('inquiries').insert({ ...rest, project_id });
  if (error) throw new Error(`Anfrage konnte nicht gespeichert werden: ${error.message}`);
}

/**
 * Listet alle veröffentlichten Projekte (nur Metadaten, ohne Apartments).
 * Wird z.B. für eine Projekt-Übersicht oder /admin verwendet.
 */
export async function listPublishedProjects(): Promise<Pick<DbProject, 'slug' | 'name' | 'lat' | 'lon' | 'published_at'>[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('projects')
    .select('slug,name,lat,lon,published_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
