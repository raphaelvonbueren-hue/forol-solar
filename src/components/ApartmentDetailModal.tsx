import { useProjectStore } from '@/lib/store';
import {
  flattenSalesApartments,
  formatCHF,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/apartment-selectors';
import {
  computeApartmentSunHours,
  findApartmentMassing,
  findFloorIndex,
} from '@/lib/apartment-sun';
import {
  JAKOBSPARK_APARTMENT_IMAGES,
  JAKOBSPARK_FLOORPLANS,
} from '@/lib/jakobspark-content';
import { useMemo } from 'react';

export function ApartmentDetailModal() {
  const massings = useProjectStore((s) => s.massings);
  const selectedId = useProjectStore((s) => s.selectedApartmentId);
  const setSelected = useProjectStore((s) => s.setSelectedApartment);
  const projectName = useProjectStore((s) => s.location.label);
  const lat = useProjectStore((s) => s.location.lat);
  const lon = useProjectStore((s) => s.location.lon);
  const dateTime = useProjectStore((s) => s.dateTime);
  const setDateTime = useProjectStore((s) => s.setDateTime);

  // Aktuelle Stunde der globalen Zeit (für Highlight in der Sun-Bar)
  const currentHour = Math.floor(dateTime.localMinutes / 60);

  const all = useMemo(() => flattenSalesApartments(massings), [massings]);
  const apt = useMemo(() => all.find((a) => a.id === selectedId), [all, selectedId]);

  // Sonnenstunden-Berechnung
  const sunResult = useMemo(() => {
    if (!apt) return null;
    const m = findApartmentMassing(apt.id, massings);
    if (!m) return null;
    const floorIdx = findFloorIndex(m.id, massings);
    // Jakobspark ist um -15° rotiert; bei anderen Projekten Default 0
    const isJakobspark = /Jakobspark|Rorschach/i.test(projectName);
    const buildingRotation = isJakobspark ? -15 * Math.PI / 180 : 0;
    return computeApartmentSunHours(
      apt.apartment,
      m,
      dateTime,
      lat,
      lon,
      buildingRotation,
      floorIdx,
    );
  }, [apt, massings, dateTime, lat, lon, projectName]);

  if (!apt) return null;

  const s = apt.sales;
  const status = s.status ?? 'available';
  const statusColor = STATUS_COLORS[status];
  const thumb = s.thumbnailColor ?? '#888';

  // Echtes Wohnungs-Bild von jakobspark.swiss (falls verfügbar)
  const isJakobspark = /Jakobspark|Rorschach/i.test(projectName);
  const apartmentImage = isJakobspark ? JAKOBSPARK_APARTMENT_IMAGES[apt.name] : undefined;
  const floorplanPdf = isJakobspark ? JAKOBSPARK_FLOORPLANS[apt.name] : undefined;

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
          style={
            apartmentImage
              ? { backgroundImage: `url(${apartmentImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${thumb} 0%, ${thumb}cc 60%, ${thumb}88 100%)` }
          }
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
          {floorplanPdf ? (
            <a
              className="apt-modal-btn"
              href={floorplanPdf}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="apt-modal-btn-icon">📐</span>
              <span>Grundriss</span>
            </a>
          ) : (
            <button
              className="apt-modal-btn"
              onClick={() => alert('Grundriss-PDF folgt in nächster Version')}
            >
              <span className="apt-modal-btn-icon">📐</span>
              <span>Grundriss</span>
            </button>
          )}
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

        {sunResult && (
          <div className="apt-modal-sun">
            <div className="apt-modal-sun-header">
              <div className="apt-modal-sun-icon">☀️</div>
              <div className="apt-modal-sun-titles">
                <div className="apt-modal-sun-title">Sonneneinfall heute</div>
                <div className="apt-modal-sun-subtitle">
                  <strong>{sunResult.totalSunnyHours}h</strong> direkt &middot; Ausrichtung {sunResult.facingLabel}
                </div>
              </div>
            </div>
            <div className="apt-modal-sun-bar">
              {sunResult.hourly.map((h) => {
                const isCurrent = h.hour === currentHour;
                return (
                  <button
                    key={h.hour}
                    type="button"
                    className={`apt-modal-sun-hour ${h.sunny ? 'sunny' : 'shaded'} ${isCurrent ? 'current' : ''}`}
                    style={{ opacity: h.sunny ? 0.4 + h.intensity * 0.6 : 0.18 }}
                    title={`${String(h.hour).padStart(2, '0')}:00 — ${h.sunny ? `Sonne (${Math.round(h.intensity * 100)}%)` : 'Schatten'} · klicken zum Springen`}
                    onClick={() => setDateTime({ localMinutes: h.hour * 60 })}
                  >
                    <div className="apt-modal-sun-hour-lbl">{h.hour}</div>
                  </button>
                );
              })}
            </div>
            <div className="apt-modal-sun-now">
              Aktuell: <strong>{String(currentHour).padStart(2, '0')}:00</strong>
              {' · '}
              <button
                type="button"
                className="apt-modal-sun-reset"
                onClick={() => setDateTime({ localMinutes: 12 * 60 })}
              >
                Mittag
              </button>
            </div>
            {sunResult.bestHourRange && (
              <div className="apt-modal-sun-meta">
                Beste Sonnenzeit: <strong>{sunResult.bestHourRange.start}:00 – {sunResult.bestHourRange.end + 1}:00</strong>
              </div>
            )}
            <div className="apt-modal-sun-credit">
              Live-berechnet mit NOAA Solar Position Algorithm
            </div>
          </div>
        )}

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
