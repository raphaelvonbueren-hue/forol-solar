import { useProjectStore } from '@/lib/store';
import {
  flattenSalesApartments,
  formatCHF,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/apartment-selectors';
import { useMemo } from 'react';

export function ApartmentDetailModal() {
  const massings = useProjectStore((s) => s.massings);
  const selectedId = useProjectStore((s) => s.selectedApartmentId);
  const setSelected = useProjectStore((s) => s.setSelectedApartment);
  const projectName = useProjectStore((s) => s.location.label);

  const all = useMemo(() => flattenSalesApartments(massings), [massings]);
  const apt = useMemo(() => all.find((a) => a.id === selectedId), [all, selectedId]);

  if (!apt) return null;

  const s = apt.sales;
  const status = s.status ?? 'available';
  const statusColor = STATUS_COLORS[status];
  const thumb = s.thumbnailColor ?? '#888';

  function close() {
    setSelected(null);
  }

  function handleApply() {
    const subject = encodeURIComponent(`Bewerbung: Wohnung ${apt!.name} (${projectName})`);
    const body = encodeURIComponent(
      `Guten Tag\n\nIch interessiere mich für die Wohnung ${apt!.name}` +
      (s.areaSqm ? `, ${s.areaSqm.toFixed(0)} m²` : '') +
      (s.rooms ? `, ${s.rooms.toFixed(1)} Zimmer` : '') +
      (s.price ? `, CHF ${formatCHF(s.price)}` : '') +
      `.\n\nBitte kontaktieren Sie mich für weitere Informationen.\n\nFreundliche Grüsse`
    );
    window.location.href = `mailto:vertrieb@forol.ch?subject=${subject}&body=${body}`;
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({ title: `Wohnung ${apt!.name}`, text: `${apt!.name} – ${projectName}`, url })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Link kopiert');
      });
    }
  }

  return (
    <div className="apt-modal-backdrop" onClick={close}>
      <div className="apt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="apt-modal-close" onClick={close} aria-label="Schliessen">
          ✕
        </button>

        <div className="apt-modal-header">
          <div className="apt-modal-name">
            <div className="apt-modal-floor">{s.floorLabel ?? '—'}</div>
            <div className="apt-modal-title">Wohnung {apt.name}</div>
            <div className="apt-modal-subtitle">{projectName}</div>
          </div>
          <div className="apt-modal-status" style={{ background: statusColor }}>
            {STATUS_LABELS[status]}
          </div>
        </div>

        <div
          className="apt-modal-hero"
          style={{
            background: `linear-gradient(135deg, ${thumb} 0%, ${thumb}cc 60%, ${thumb}88 100%)`,
          }}
        >
          <div className="apt-modal-hero-meta">
            {s.areaSqm !== undefined && (
              <div className="apt-modal-meta-item">
                <span className="apt-modal-meta-val">{s.areaSqm.toFixed(0)}</span>
                <span className="apt-modal-meta-lbl">m² Fläche</span>
              </div>
            )}
            {s.rooms !== undefined && (
              <div className="apt-modal-meta-item">
                <span className="apt-modal-meta-val">{s.rooms.toFixed(1)}</span>
                <span className="apt-modal-meta-lbl">Zimmer</span>
              </div>
            )}
            {s.price !== undefined && (
              <div className="apt-modal-meta-item">
                <span className="apt-modal-meta-val">CHF {formatCHF(s.price)}</span>
                <span className="apt-modal-meta-lbl">Kaufpreis</span>
              </div>
            )}
          </div>
        </div>

        <div className="apt-modal-actions">
          <button
            className="apt-modal-btn"
            onClick={() => alert('Grundriss-PDF folgt in nächster Version')}
          >
            <span className="apt-modal-btn-icon">📐</span>
            <span>Grundriss</span>
          </button>
          <button
            className="apt-modal-btn"
            onClick={() => alert('Baubeschrieb folgt in nächster Version')}
          >
            <span className="apt-modal-btn-icon">📋</span>
            <span>Baubeschrieb</span>
          </button>
          <button
            className="apt-modal-btn"
            onClick={() => alert('3D-Rundgang folgt in nächster Version')}
          >
            <span className="apt-modal-btn-icon">🎬</span>
            <span>3D-Rundgang</span>
          </button>
        </div>

        {s.price !== undefined && (
          <div className="apt-modal-data">
            <div className="apt-modal-data-row">
              <span className="apt-modal-data-lbl">Kaufpreis</span>
              <span className="apt-modal-data-val">CHF {formatCHF(s.price)}</span>
            </div>
            {s.areaSqm !== undefined && s.price > 0 && (
              <div className="apt-modal-data-row">
                <span className="apt-modal-data-lbl">CHF / m²</span>
                <span className="apt-modal-data-val">
                  CHF {formatCHF(Math.round(s.price / s.areaSqm))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="apt-modal-footer">
          <button className="apt-modal-secondary" onClick={handleShare}>
            Teilen
          </button>
          <button className="apt-modal-secondary" onClick={() => alert('Merkliste folgt')}>
            ♡ Merken
          </button>
          <button className="apt-modal-cta" onClick={handleApply}>
            Jetzt bewerben →
          </button>
        </div>
      </div>
    </div>
  );
}
