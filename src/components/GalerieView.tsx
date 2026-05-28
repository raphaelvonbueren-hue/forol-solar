import { useProjectStore } from '@/lib/store';
import { useMemo } from 'react';
import { flattenSalesApartments } from '@/lib/apartment-selectors';

export function GalerieView() {
  const massings = useProjectStore((s) => s.massings);
  const location = useProjectStore((s) => s.location);
  const all = useMemo(() => flattenSalesApartments(massings), [massings]);

  // Sammle unique thumbnail-Farben für stylisierte Gallery-Tiles
  const colors = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) {
      if (a.sales.thumbnailColor) set.add(a.sales.thumbnailColor);
    }
    return Array.from(set);
  }, [all]);

  const isJakobspark = /Jakobspark|Rorschach/i.test(location.label);
  const externalLinks = isJakobspark
    ? [
        { label: 'jakobspark.swiss', url: 'https://www.jakobspark.swiss/' },
        { label: 'Stockwerkpläne ansehen', url: 'https://www.jakobspark.swiss/#Wohnen' },
      ]
    : [];

  return (
    <div className="galerie-view">
      <div className="galerie-intro">
        <div className="galerie-intro-title">Galerie</div>
        <div className="galerie-intro-text">
          Visualisierungen und Stockwerkpläne von {location.label}.
        </div>
      </div>

      <div className="galerie-grid">
        {colors.slice(0, 8).map((c, i) => (
          <div
            key={i}
            className="galerie-tile"
            style={{
              background: `linear-gradient(135deg, ${c} 0%, ${c}aa 50%, ${c}66 100%)`,
            }}
          >
            <div className="galerie-tile-label">Ansicht {i + 1}</div>
          </div>
        ))}
      </div>

      {externalLinks.length > 0 && (
        <div className="galerie-links">
          <div className="galerie-links-title">Externe Renderings</div>
          {externalLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="galerie-link"
            >
              {link.label} →
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
