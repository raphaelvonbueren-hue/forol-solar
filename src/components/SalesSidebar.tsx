import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import {
  flattenSalesApartments,
  applySalesFilter,
  summarizeApartments,
  formatCHF,
} from '@/lib/apartment-selectors';
import { ApartmentCard } from './ApartmentCard';
import { SalesFilters } from './SalesFilters';
import { ProjektView } from './ProjektView';
import { UmgebungView } from './UmgebungView';
import { GalerieView } from './GalerieView';
import { FAQView } from './FAQView';

export function SalesSidebar() {
  const massings = useProjectStore((s) => s.massings);
  const projectName = useProjectStore((s) => s.location.label);
  const selectedId = useProjectStore((s) => s.selectedApartmentId);
  const hoveredId = useProjectStore((s) => s.hoveredApartmentId);
  const setSelected = useProjectStore((s) => s.setSelectedApartment);
  const setHovered = useProjectStore((s) => s.setHoveredApartment);
  const filter = useProjectStore((s) => s.salesFilter);
  const view = useProjectStore((s) => s.salesView);

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

  // VIEW-Routing: jeder Tab hat seinen eigenen Inhalt
  if (view === 'projekt') {
    return (
      <aside className="sales-sidebar">
        <ProjektView />
      </aside>
    );
  }
  if (view === 'umgebung') {
    return (
      <aside className="sales-sidebar">
        <UmgebungView />
      </aside>
    );
  }
  if (view === 'galerie') {
    return (
      <aside className="sales-sidebar">
        <GalerieView />
      </aside>
    );
  }
  if (view === 'faq') {
    return (
      <aside className="sales-sidebar">
        <FAQView />
      </aside>
    );
  }

  return (
    <aside className="sales-sidebar">
      <div className="sales-header">
        <div className="sales-title">Angebot</div>
        <div className="sales-address">{projectName}</div>
      </div>

      <div className="sales-overview-box">
        <div className="sales-overview-top">
          <div className="sales-overview-label">Übersicht</div>
          <div className="sales-overview-badge">
            <span className="sales-overview-num">{summary.availableCount}</span>
            <span className="sales-overview-of">/{allApartments.length}</span>
            <span className="sales-overview-txt">verfügbar</span>
          </div>
        </div>

        {summary.minPrice !== null && summary.maxPrice !== null && (
          <div className="sales-overview-rows">
            <div className="sales-overview-row">
              <div className="sales-overview-row-lbl">Kaufpreis</div>
              <div className="sales-overview-row-val">
                CHF {formatCHF(summary.minPrice)}–{formatCHF(summary.maxPrice)}
              </div>
            </div>
            {summary.minArea !== null && summary.maxArea !== null && (
              <div className="sales-overview-row">
                <div className="sales-overview-row-lbl">Fläche</div>
                <div className="sales-overview-row-val">
                  {summary.minArea.toFixed(0)}–{summary.maxArea.toFixed(0)} m²
                </div>
              </div>
            )}
            {summary.minRooms !== null && summary.maxRooms !== null && (
              <div className="sales-overview-row">
                <div className="sales-overview-row-lbl">Zimmer</div>
                <div className="sales-overview-row-val">
                  {summary.minRooms.toFixed(1)}–{summary.maxRooms.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
