/**
 * TypeScript-Typen für die Supabase-Tabellen.
 * Entsprechen 1:1 dem Schema in supabase/migrations/20260528000001_init.sql.
 */

import type { Project, ApartmentStatus, ApartmentSales } from '@/types';

export interface DbProject {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lon: number;
  internal_notes: string | null;
  /** Vollständige Geometrie als Project-JSON (ohne id/slug) */
  geometry_json: Omit<Project, 'location'> & { location?: Project['location'] };
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface DbApartment {
  id: string;
  project_id: string;
  code: string;
  display_order: number;
  floor_label: string | null;
  area_sqm: number | null;
  rooms: number | null;
  price: number | null;
  status: ApartmentStatus;
  thumbnail_color: string | null;
  thumbnail_url: string | null;
  description: string | null;
  extras: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbInquiry {
  id: string;
  project_id: string | null;
  apartment_id: string | null;
  apartment_snapshot: Record<string, unknown> | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  handled: boolean;
  handled_at: string | null;
  handled_by: string | null;
  created_at: string;
}

export interface DbInquiryInput {
  project_id?: string | null;
  apartment_id?: string | null;
  apartment_snapshot?: Record<string, unknown> | null;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
}

/** Konvertiert DB-Apartment → Frontend-ApartmentSales (für Apartment.sales). */
export function dbApartmentToSales(db: DbApartment): ApartmentSales {
  return {
    price: db.price ?? undefined,
    areaSqm: db.area_sqm ?? undefined,
    rooms: db.rooms ?? undefined,
    status: db.status,
    floorLabel: db.floor_label ?? undefined,
    thumbnailColor: db.thumbnail_color ?? undefined,
    thumbnailUrl: db.thumbnail_url ?? undefined,
  };
}
