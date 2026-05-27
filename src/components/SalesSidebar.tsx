import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import {
  flattenSalesApartments,
  applySalesFilter,
  summarizeApartments,
  formatCHF,
  STATUS_LABELS,
} from '@/lib/apartment-selectors';
import { ApartmentCard } from './ApartmentCard';
import { SalesFilters } from './SalesFilters';

export function SalesSidebar() {
  const massings = useProjectStore((s) => s.massings);
  const selectedId = useProjectStore((s) => s.selectedApartmentId);
  const hoveredId = useProjectStore((s) => s.hoveredApartmentId);
  const setSelected = useProjectStore((s) => s.setSelectedApartment);
  const setHovered = useProjectStore((s) => s.setHoveredApartment);
  const filter = useProjectStore((s) => s.salesFilter);

  const allApartments = useMemo(() => flattenSalesApartments(massings), [massings]);
  const filtered = useMemo(() => applySalesFilter(allApartments, filter), [allApartments, filter]);
  const summary = useMemo(() => summarizeApartments(filtered), [filtered]);

  if (allApartments.length === 0) {
    return (
      <aside className="sales-sidebar">
        <div className="sales-empty">
          <div className="sales-empty-title">Kein Projekt geladen</div>
          <div className="sales-empty-hint">
            Klicke <strong>⭐ CH144</strong> oben rechts, um das Demo-Projekt zu laden.
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sales-sidebar">
      <div className="sales-header">
        <div className="sales-title">Angebot</div>
        <div className="sales-summary">
          <span className="sales-count">{summary.availableCount}</span>
          <span className="sales-count-sep">/{allApartments.length}</span>
          <span className="sales-count-label">{STATUS_LABELS.available}</span>
        </div>
      </div>

      {summary.minPrice !== null && summary.maxPrice !== null && (
        <div className="sales-stats-grid">
          <div className="sales-stat">
            <div className="sales-stat-lbl">Kaufpreis</div>
            <div className="sales-stat-val">
              CHF {formatCHF(summary.minPrice)}–{formatCHF(summary.maxPrice)}
            </div>
          </div>
          {summary.minArea !== null && summary.maxArea !== null && (
            <div className="sales-stat">
              <div className="sales-stat-lbl">Fläche</div>
              <div className="sales-stat-val">
                {summary.minArea.toFixed(0)}–{summary.maxArea.toFixed(0)} m²
              </div>
            </div>
          )}
          {summary.minRooms !== null && summary.maxRooms !== null && (
            <div className="sales-stat">
              <div className="sales-stat-lbl">Zimmer</div>
              <div className="sales-stat-val">
                {summary.minRooms.toFixed(1)}–{summary.maxRooms.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      <SalesFilters />

      <div className="apt-list">
        {filtered.length === 0 ? (
          <div className="apt-list-empty">
            Keine Wohnung passt zu den gewählten Kriterien.
          </div>
        ) : (
          filtered.map((apt) => (
            <ApartmentCard
              key={apt.id}
              apartment={apt}
              selected={selectedId === apt.id}
              hovered={hoveredId === apt.id}
              onClick={() => setSelected(selectedId === apt.id ? null : apt.id)}
              onMouseEnter={() => setHovered(apt.id)}
              onMouseLeave={() => setHovered(null)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
