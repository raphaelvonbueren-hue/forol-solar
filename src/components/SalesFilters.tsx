import { useMemo, useState } from 'react';
import { useProjectStore } from '@/lib/store';
import { STATUS_LABELS } from '@/lib/apartment-selectors';
import type { ApartmentStatus } from '@/types';

const STATUSES: ApartmentStatus[] = ['available', 'reserved', 'sold'];
const ROOM_OPTIONS = [2.5, 3.5, 4.5, 5.5, 6.5];

export function SalesFilters() {
  const massings = useProjectStore((s) => s.massings);
  const filter = useProjectStore((s) => s.salesFilter);
  const setFilter = useProjectStore((s) => s.setSalesFilter);
  const reset = useProjectStore((s) => s.resetSalesFilter);
  const [expanded, setExpanded] = useState(false);

  // Verfügbare Etagen aus dem Projekt extrahieren
  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    for (const m of massings) {
      for (const sz of m.subzones) {
        if (sz.sales?.floorLabel) set.add(sz.sales.floorLabel);
      }
    }
    return Array.from(set);
  }, [massings]);

  const isActive =
    filter.statusFilter.length !== 3 ||
    filter.minRooms !== null || filter.maxRooms !== null ||
    filter.minArea !== null || filter.maxArea !== null ||
    filter.minPrice !== null || filter.maxPrice !== null ||
    filter.floorLabels.length > 0;

  function toggleStatus(s: ApartmentStatus) {
    if (filter.statusFilter.includes(s)) {
      setFilter({ statusFilter: filter.statusFilter.filter((x) => x !== s) });
    } else {
      setFilter({ statusFilter: [...filter.statusFilter, s] });
    }
  }
  function toggleFloor(f: string) {
    if (filter.floorLabels.includes(f)) {
      setFilter({ floorLabels: filter.floorLabels.filter((x) => x !== f) });
    } else {
      setFilter({ floorLabels: [...filter.floorLabels, f] });
    }
  }

  return (
    <div className="sales-filters">
      <div className="sales-filters-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`chip chip-status status-${s} ${filter.statusFilter.includes(s) ? 'on' : ''}`}
            onClick={() => toggleStatus(s)}
            title={STATUS_LABELS[s]}
          >
            <span className="chip-dot" />
            {STATUS_LABELS[s]}
          </button>
        ))}
        <button
          className={`chip chip-more ${expanded ? 'on' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Filter ▴' : 'Filter ▾'}
        </button>
      </div>
      {expanded && (
        <div className="sales-filters-expanded">
          <div className="filter-group">
            <div className="filter-group-label">Zimmer</div>
            <div className="filter-pills">
              {ROOM_OPTIONS.map((r) => {
                const active = filter.minRooms === r && filter.maxRooms === r;
                return (
                  <button
                    key={r}
                    className={`chip ${active ? 'on' : ''}`}
                    onClick={() => active
                      ? setFilter({ minRooms: null, maxRooms: null })
                      : setFilter({ minRooms: r, maxRooms: r })
                    }
                  >
                    {r.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>
          {availableFloors.length > 0 && (
            <div className="filter-group">
              <div className="filter-group-label">Etage</div>
              <div className="filter-pills">
                {availableFloors.map((f) => (
                  <button
                    key={f}
                    className={`chip ${filter.floorLabels.includes(f) ? 'on' : ''}`}
                    onClick={() => toggleFloor(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isActive && (
            <button className="filter-reset" onClick={reset}>
              Alle Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
