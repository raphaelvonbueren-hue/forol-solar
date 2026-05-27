-- ============================================================================
-- FOROL Solar — Initial Schema
-- ============================================================================
-- Tabellen:
--   projects     - Bauprojekte (CH144, ...)
--   apartments   - Wohnungen pro Projekt mit Vertriebs-Daten
--   inquiries    - Kontakt-Anfragen von Endkunden
--   forol_staff  - Whitelist von E-Mails die als FOROL-Admins eingeloggt werden dürfen
--
-- Sicherheit:
--   - Anonyme Endkunden lesen nur veröffentlichte Projekte/Wohnungen (published_at IS NOT NULL)
--   - Anonyme Endkunden können Anfragen INSERTEN (kein READ)
--   - FOROL-Staff (auth.users mit E-Mail in forol_staff) hat vollen Zugriff auf alles
-- ============================================================================

-- =========================================
-- Tabelle: forol_staff (Admin-Whitelist)
-- =========================================
create table public.forol_staff (
  email text primary key,
  added_at timestamptz not null default now(),
  added_by text
);
alter table public.forol_staff enable row level security;

-- Helper: ist der aktuelle Benutzer in der Staff-Whitelist?
create or replace function public.is_forol_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forol_staff
    where email = (select auth.jwt() ->> 'email')
  );
$$;

-- Initial-Admin (du): trage hier deine E-Mail ein
-- Wird in einer separaten Migration eingespielt — siehe seed.sql

-- Staff kann Staff-Liste sehen und verwalten
create policy "Staff sees staff list" on public.forol_staff
  for select using (public.is_forol_staff());
create policy "Staff manages staff list" on public.forol_staff
  for all using (public.is_forol_staff()) with check (public.is_forol_staff());

-- =========================================
-- Tabelle: projects
-- =========================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  /** Bauträger-Notizen (intern, nie ausgespielt) */
  internal_notes text,
  /** Komplette Geometrie als JSON (Massings, Box, OSM-Settings, etc.) */
  geometry_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /** NULL = nicht veröffentlicht (Endkunden sehen es nicht); Timestamp = published seit */
  published_at timestamptz
);
create index projects_slug_idx on public.projects(slug);
create index projects_published_idx on public.projects(published_at) where published_at is not null;

alter table public.projects enable row level security;

-- Endkunden (anonym + authentifiziert): nur veröffentlichte Projekte lesen
create policy "Public reads published projects" on public.projects
  for select to anon, authenticated using (published_at is not null);

-- FOROL-Staff: voller Zugriff
create policy "Staff full access projects" on public.projects
  for all using (public.is_forol_staff()) with check (public.is_forol_staff());

-- =========================================
-- Tabelle: apartments
-- =========================================
create type apartment_status as enum ('available', 'reserved', 'sold');

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  /** Code im Massings-Tree (z.B. "A01", "B05") — muss zu geometry_json passen */
  code text not null,
  /** Anzeige-Reihenfolge in der Sidebar */
  display_order int not null default 0,
  floor_label text,
  area_sqm numeric(6,2),
  rooms numeric(3,1),
  price numeric(10,0),
  status apartment_status not null default 'available',
  thumbnail_color text default '#5E8FB8',
  thumbnail_url text,
  /** Längerer Beschreibungstext für die Wohnungs-Detailansicht */
  description text,
  /** Zusätzliche frei strukturierte Daten — z.B. Ausstattungs-Features */
  extras jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apartments_project_code_unique unique (project_id, code)
);
create index apartments_project_idx on public.apartments(project_id);

alter table public.apartments enable row level security;

-- Endkunden: lesen nur Wohnungen von veröffentlichten Projekten
create policy "Public reads apartments of published projects" on public.apartments
  for select to anon, authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = apartments.project_id and p.published_at is not null
    )
  );

-- FOROL-Staff: voller Zugriff
create policy "Staff full access apartments" on public.apartments
  for all using (public.is_forol_staff()) with check (public.is_forol_staff());

-- =========================================
-- Tabelle: inquiries
-- =========================================
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  apartment_id uuid references public.apartments(id) on delete set null,
  /** Snapshot der Wohnung zur Zeit der Anfrage — falls Wohnung später gelöscht wird */
  apartment_snapshot jsonb,
  name text not null,
  email text not null,
  phone text,
  message text,
  /** Bearbeitungs-Status (FOROL-intern) */
  handled boolean not null default false,
  handled_at timestamptz,
  handled_by text,
  created_at timestamptz not null default now()
);
create index inquiries_created_idx on public.inquiries(created_at desc);
create index inquiries_project_idx on public.inquiries(project_id);

alter table public.inquiries enable row level security;

-- Endkunden + anonym: dürfen Anfragen INSERTEN (aber niemals SELECTEN)
create policy "Public can submit inquiries" on public.inquiries
  for insert to anon, authenticated with check (true);

-- FOROL-Staff: voller Zugriff (SELECT, UPDATE, DELETE)
create policy "Staff full access inquiries" on public.inquiries
  for all using (public.is_forol_staff()) with check (public.is_forol_staff());

-- =========================================
-- Trigger: updated_at automatisch setzen
-- =========================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger apartments_touch before update on public.apartments
  for each row execute function public.touch_updated_at();
