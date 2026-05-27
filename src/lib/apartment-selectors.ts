/**
 * Selektor-Funktionen für die Vertriebs-Ansicht.
 *
 * Diese Funktionen bilden den Massings-Tree auf flache, filterbare Apartment-Listen ab.
 * Pure Funktionen — kein Store-Zugriff, gut testbar.
 */

import type { Apartment, ApartmentSales, ApartmentStatus, Massing } from '@/types';

/**
 * Eine Wohnung mit dem zugehörigen Massing-Kontext, für die Vertriebsliste.
 */
export interface SalesApartment {
  id: string;
  name: string;
  massingId: string;
  massingName: string;
  sales: ApartmentSales;
  apartment: Apartment;
  massing: Massing;
}

/**
 * Flacht den Massings-Tree zu einer Liste von Wohnungen ab.
 * Wohnungen ohne Sales-Daten werden ausgelassen (nur Vertriebs-relevante Wohnungen).
 */
export function flattenSalesApartments(massings: Massing[]): SalesApartment[] {
  const out: SalesApartment[] = [];
  for (const m of massings) {
    for (const sz of m.subzones) {
      if (!sz.sales) continue;
      out.push({
        id: sz.id,
        name: sz.name,
        massingId: m.id,
        massingName: m.name,
        sales: sz.sales,
        apartment: sz,
        massing: m,
      });
    }
  }
  return out;
}

export interface SalesFilter {
  statusFilter: ApartmentStatus[];
  minRooms: number | null;
  maxRooms: number | null;
  minArea: number | null;
  maxArea: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  floorLabels: string[];
}

/**
 * Filtert eine Wohnungs-Liste anhand der Vertriebs-Filter-Kriterien.
 */
export function applySalesFilter(
  apartments: SalesApartment[],
  filter: SalesFilter,
): SalesApartment[] {
  return apartments.filter((a) => {
    const s = a.sales;
    if (s.status && !filter.statusFilter.includes(s.status)) return false;
    if (filter.minRooms !== null && (s.rooms ?? 0) < filter.minRooms) return false;
    if (filter.maxRooms !== null && (s.rooms ?? Infinity) > filter.maxRooms) return false;
    if (filter.minArea !== null && (s.areaSqm ?? 0) < filter.minArea) return false;
    if (filter.maxArea !== null && (s.areaSqm ?? Infinity) > filter.maxArea) return false;
    if (filter.minPrice !== null && (s.price ?? 0) < filter.minPrice) return false;
    if (filter.maxPrice !== null && (s.price ?? Infinity) > filter.maxPrice) return false;
    if (filter.floorLabels.length > 0 && s.floorLabel && !filter.floorLabels.includes(s.floorLabel)) {
      return false;
    }
    return true;
  });
}

/**
 * Berechnet aggregierte Statistiken über eine Wohnungs-Liste — für Header/Übersicht.
 */
export function summarizeApartments(apartments: SalesApartment[]) {
  if (apartments.length === 0) {
    return {
      count: 0,
      availableCount: 0,
      minPrice: null as number | null,
      maxPrice: null as number | null,
      minArea: null as number | null,
      maxArea: null as number | null,
      minRooms: null as number | null,
      maxRooms: null as number | null,
    };
  }
  const prices = apartments.map((a) => a.sales.price).filter((p): p is number => typeof p === 'number');
  const areas = apartments.map((a) => a.sales.areaSqm).filter((a): a is number => typeof a === 'number');
  const rooms = apartments.map((a) => a.sales.rooms).filter((r): r is number => typeof r === 'number');
  return {
    count: apartments.length,
    availableCount: apartments.filter((a) => a.sales.status === 'available').length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    minArea: areas.length ? Math.min(...areas) : null,
    maxArea: areas.length ? Math.max(...areas) : null,
    minRooms: rooms.length ? Math.min(...rooms) : null,
    maxRooms: rooms.length ? Math.max(...rooms) : null,
  };
}

/** Formatiert einen CHF-Preis als '1'150'000' ohne Symbol. */
export function formatCHF(n: number): string {
  return n.toLocaleString('de-CH').replace(/,/g, "'");
}

/** Status-Label in Deutsch. */
export const STATUS_LABELS: Record<ApartmentStatus, string> = {
  available: 'verfügbar',
  reserved: 'reserviert',
  sold: 'verkauft',
};

export const STATUS_COLORS: Record<ApartmentStatus, string> = {
  available: '#2E7D32',
  reserved: '#F5A623',
  sold: '#999999',
};
