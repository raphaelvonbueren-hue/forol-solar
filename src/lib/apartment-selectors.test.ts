import { describe, it, expect } from 'vitest';
import {
  flattenSalesApartments,
  applySalesFilter,
  summarizeApartments,
  formatCHF,
} from './apartment-selectors';
import type { Massing } from '@/types';

function fakeMassing(id: string, subzones: Array<{
  id: string; name: string; rooms?: number; area?: number; price?: number;
  status?: 'available' | 'reserved' | 'sold'; floor?: string;
}>): Massing {
  return {
    id,
    name: `M-${id}`,
    outline: [[0, 0], [0, 1], [1, 1], [1, 0]],
    holes: [],
    height: 3,
    zOffset: 0,
    splitMode: 'cross2',
    subzones: subzones.map(sz => ({
      id: sz.id,
      name: sz.name,
      bbox: { xMin: 0, xMax: 1, zMin: 0, zMax: 1 },
      sales: {
        rooms: sz.rooms, areaSqm: sz.area, price: sz.price,
        status: sz.status, floorLabel: sz.floor,
      },
    })),
  };
}

describe('flattenSalesApartments', () => {
  it('extrahiert nur Wohnungen mit Sales-Daten', () => {
    const m: Massing = {
      id: 'm1', name: 'EG', outline: [], holes: [], height: 3, zOffset: 0,
      splitMode: 'cross2',
      subzones: [
        { id: 'w1', name: 'A01', bbox: { xMin: 0, xMax: 1, zMin: 0, zMax: 1 },
          sales: { price: 1000000 } },
        { id: 'w2', name: 'A02', bbox: { xMin: 0, xMax: 1, zMin: 0, zMax: 1 } },
      ],
    };
    expect(flattenSalesApartments([m])).toHaveLength(1);
  });

  it('liefert Massing-Kontext mit', () => {
    const m = fakeMassing('m1', [{ id: 'w1', name: 'A01', price: 1000000 }]);
    const result = flattenSalesApartments([m]);
    expect(result[0].massingName).toBe('M-m1');
    expect(result[0].massingId).toBe('m1');
  });
});

describe('applySalesFilter', () => {
  const apartments = flattenSalesApartments([
    fakeMassing('m1', [
      { id: 'w1', name: 'A01', rooms: 3.5, area: 100, price: 1000000, status: 'available', floor: 'EG' },
      { id: 'w2', name: 'A02', rooms: 4.5, area: 120, price: 1300000, status: 'sold', floor: 'EG' },
    ]),
    fakeMassing('m2', [
      { id: 'w3', name: 'B01', rooms: 5.5, area: 150, price: 1800000, status: 'reserved', floor: '1.OG' },
    ]),
  ]);

  it('filtert nach Status', () => {
    const filtered = applySalesFilter(apartments, {
      statusFilter: ['available'],
      minRooms: null, maxRooms: null, minArea: null, maxArea: null,
      minPrice: null, maxPrice: null, floorLabels: [],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('w1');
  });

  it('filtert nach Zimmer-Range', () => {
    const filtered = applySalesFilter(apartments, {
      statusFilter: ['available', 'reserved', 'sold'],
      minRooms: 4, maxRooms: 5,
      minArea: null, maxArea: null, minPrice: null, maxPrice: null, floorLabels: [],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('w2');
  });

  it('filtert nach Fläche', () => {
    const filtered = applySalesFilter(apartments, {
      statusFilter: ['available', 'reserved', 'sold'],
      minRooms: null, maxRooms: null,
      minArea: 130, maxArea: null,
      minPrice: null, maxPrice: null, floorLabels: [],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('w3');
  });

  it('filtert nach Etage', () => {
    const filtered = applySalesFilter(apartments, {
      statusFilter: ['available', 'reserved', 'sold'],
      minRooms: null, maxRooms: null, minArea: null, maxArea: null,
      minPrice: null, maxPrice: null,
      floorLabels: ['1.OG'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('w3');
  });

  it('kombiniert Filter', () => {
    const filtered = applySalesFilter(apartments, {
      statusFilter: ['available', 'reserved'],
      minRooms: 4, maxRooms: null,
      minArea: null, maxArea: null, minPrice: null, maxPrice: null, floorLabels: [],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('w3');
  });
});

describe('summarizeApartments', () => {
  it('leere Liste → null-Werte', () => {
    const s = summarizeApartments([]);
    expect(s.count).toBe(0);
    expect(s.minPrice).toBeNull();
  });

  it('aggregiert Min/Max', () => {
    const apts = flattenSalesApartments([
      fakeMassing('m1', [
        { id: 'w1', name: 'A01', rooms: 3.5, area: 100, price: 1000000, status: 'available' },
        { id: 'w2', name: 'A02', rooms: 5.5, area: 150, price: 1800000, status: 'reserved' },
      ]),
    ]);
    const s = summarizeApartments(apts);
    expect(s.count).toBe(2);
    expect(s.availableCount).toBe(1);
    expect(s.minPrice).toBe(1000000);
    expect(s.maxPrice).toBe(1800000);
    expect(s.minRooms).toBe(3.5);
    expect(s.maxRooms).toBe(5.5);
  });
});

describe('formatCHF', () => {
  it('formatiert mit Hochkomma als Tausender-Trenner', () => {
    expect(formatCHF(1150000)).toBe("1'150'000");
    expect(formatCHF(500)).toBe('500');
    expect(formatCHF(0)).toBe('0');
  });
});
