import { useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import { flattenSalesApartments, summarizeApartments, formatCHF } from '@/lib/apartment-selectors';
import { JAKOBSPARK_HERO, JAKOBSPARK_TEXTS } from '@/lib/jakobspark-content';

export function ProjektView() {
  const massings = useProjectStore((s) => s.massings);
  const location = useProjectStore((s) => s.location);
  const setView = useProjectStore((s) => s.setSalesView);

  const all = useMemo(() => flattenSalesApartments(massings), [massings]);
  const summary = useMemo(() => summarizeApartments(all), [all]);

  // Projekt-Tagline & Description aus Location
  const isJakobspark = /Jakobspark|Rorschach/i.test(location.label);

  const tagline = isJakobspark ? JAKOBSPARK_TEXTS.tagline : 'Neubau-Projekt';
  const headline = isJakobspark ? JAKOBSPARK_TEXTS.headline : location.label;

  const description = isJakobspark
    ? JAKOBSPARK_TEXTS.description +
      ' Über 11 Stunden direkter Sonneneinfall an Sommertagen — wissenschaftlich berechnet, nicht geschätzt.'
    : `${all.length} Wohnungen in Topographie und Lage analysiert mit echter Sonnen- und Schatten-Simulation.`;

  const features = [
    { icon: '☀️', label: 'Sonnenanalyse', sub: 'Live, nicht geschätzt' },
    { icon: '🌊', label: 'Bodensee', sub: '200 m zu Fuss' },
    { icon: '🏛️', label: 'Holzbau', sub: 'Minergie-Standard' },
    { icon: '🌳', label: 'Innenhof', sub: 'Süd-West-Sonne' },
  ];

  return (
    <div className="projekt-view">
      <div
        className="projekt-hero"
        style={
          isJakobspark
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(211,47,47,0.88) 0%, rgba(183,28,28,0.92) 100%), url(${JAKOBSPARK_HERO})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="projekt-hero-tag">{tagline}</div>
        <div className="projekt-hero-title">{isJakobspark ? location.label : headline}</div>
        {isJakobspark && (
          <div className="projekt-hero-headline">{headline}</div>
        )}
        <div className="projekt-hero-stats">
          <div className="projekt-hero-stat">
            <span className="projekt-hero-stat-num">{summary.availableCount}</span>
            <span className="projekt-hero-stat-sep">/{all.length}</span>
            <span className="projekt-hero-stat-lbl">verfügbar</span>
          </div>
          {summary.minPrice !== null && summary.maxPrice !== null && (
            <div className="projekt-hero-stat">
              <span className="projekt-hero-stat-num">
                CHF {formatCHF(summary.minPrice)}
              </span>
              <span className="projekt-hero-stat-lbl">ab Kaufpreis</span>
            </div>
          )}
        </div>
      </div>

      <div className="projekt-body">
        <p className="projekt-desc">{description}</p>

        <div className="projekt-features">
          {features.map((f) => (
            <div key={f.label} className="projekt-feature">
              <div className="projekt-feature-icon">{f.icon}</div>
              <div className="projekt-feature-label">{f.label}</div>
              <div className="projekt-feature-sub">{f.sub}</div>
            </div>
          ))}
        </div>

        <button
          className="projekt-cta"
          onClick={() => setView('angebot')}
        >
          Zum Angebot →
        </button>
      </div>
    </div>
  );
}
