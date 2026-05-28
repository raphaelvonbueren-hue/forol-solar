import { useState, useMemo } from 'react';
import { useProjectStore } from '@/lib/store';
import { JAKOBSPARK_GALLERY, JAKOBSPARK_DOCS } from '@/lib/jakobspark-content';

type Category = 'alle' | 'aussen' | 'interior' | 'umgebung';

const CATEGORY_LABELS: Record<Category, string> = {
  alle: 'Alle',
  aussen: 'Fassade',
  interior: 'Innenräume',
  umgebung: 'Umgebung',
};

export function GalerieView() {
  const location = useProjectStore((s) => s.location);
  const isJakobspark = /Jakobspark|Rorschach/i.test(location.label);

  const [category, setCategory] = useState<Category>('alle');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const filteredImages = useMemo(() => {
    if (!isJakobspark) return [];
    if (category === 'alle') return JAKOBSPARK_GALLERY;
    return JAKOBSPARK_GALLERY.filter((g) => g.category === category);
  }, [category, isJakobspark]);

  if (!isJakobspark) {
    return (
      <div className="galerie-view">
        <div className="galerie-intro">
          <div className="galerie-intro-title">Galerie</div>
          <div className="galerie-intro-text">
            Bildergalerie folgt für dieses Projekt.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="galerie-view">
      <div className="galerie-intro">
        <div className="galerie-intro-title">Galerie</div>
        <div className="galerie-intro-text">
          {JAKOBSPARK_GALLERY.length} Visualisierungen vom Projekt {location.label}.
        </div>
      </div>

      <div className="galerie-filter">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <button
            key={c}
            className={`galerie-filter-btn ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="galerie-grid-img">
        {filteredImages.map((img, i) => (
          <button
            key={img.url}
            className="galerie-tile-img"
            onClick={() => setLightboxIdx(i)}
            type="button"
          >
            <img src={img.url} alt={img.alt} loading="lazy" />
          </button>
        ))}
      </div>

      <div className="galerie-links">
        <div className="galerie-links-title">Downloads</div>
        <a
          href={JAKOBSPARK_DOCS.Stockwerkplaene}
          target="_blank"
          rel="noopener noreferrer"
          className="galerie-link"
        >
          📄 Stockwerkpläne (PDF) →
        </a>
        <a
          href={JAKOBSPARK_DOCS.Ablauf}
          target="_blank"
          rel="noopener noreferrer"
          className="galerie-link"
        >
          📄 Ablauf Jakobspark (PDF) →
        </a>
        <a
          href="https://www.jakobspark.swiss/"
          target="_blank"
          rel="noopener noreferrer"
          className="galerie-link"
        >
          🌐 jakobspark.swiss →
        </a>
      </div>

      {lightboxIdx !== null && (
        <div
          className="galerie-lightbox"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="galerie-lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            aria-label="Schliessen"
          >
            ✕
          </button>
          {lightboxIdx > 0 && (
            <button
              className="galerie-lightbox-nav galerie-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
              aria-label="Vorheriges Bild"
            >
              ‹
            </button>
          )}
          {lightboxIdx < filteredImages.length - 1 && (
            <button
              className="galerie-lightbox-nav galerie-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
              aria-label="Nächstes Bild"
            >
              ›
            </button>
          )}
          <img
            src={filteredImages[lightboxIdx].url}
            alt={filteredImages[lightboxIdx].alt}
            onClick={(e) => e.stopPropagation()}
          />
          {filteredImages[lightboxIdx].alt && (
            <div
              className="galerie-lightbox-caption"
              onClick={(e) => e.stopPropagation()}
            >
              {filteredImages[lightboxIdx].alt}
              <span className="galerie-lightbox-count">
                {' · '}{lightboxIdx + 1} / {filteredImages.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
