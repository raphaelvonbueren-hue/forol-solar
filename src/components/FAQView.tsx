import { useState } from 'react';

const FAQS = [
  {
    q: 'Wann ist Bezug?',
    a: 'Voraussichtlich ab Mitte 2026. Der genaue Bezugstermin wird mit den Käufern individuell vereinbart und im Kaufvertrag festgehalten.',
  },
  {
    q: 'Welche Heizung wird eingebaut?',
    a: 'Erdsonden-Wärmepumpe mit Bodenheizung in allen Wohnungen. Die Anlage ist nach Minergie-Standard konzipiert und sehr energieeffizient.',
  },
  {
    q: 'Wie funktioniert die Sonnen-Analyse?',
    a: 'Wir berechnen den Sonnenstand sekundengenau für jede Position auf dem Grundstück. Die Schattenwurf-Analyse basiert auf der echten Geometrie der Gebäude und nicht auf Schätzungen.',
  },
  {
    q: 'Sind Anpassungen am Grundriss möglich?',
    a: 'In gewissem Rahmen ja. Wandverschiebungen, Sanitärinstallationen oder andere Anpassungen können bis zu einem definierten Termin individuell vereinbart werden. Sprechen Sie uns an.',
  },
  {
    q: 'Wie hoch sind die Nebenkosten?',
    a: 'Die Nebenkosten betragen ca. CHF 3.50 pro m² und Monat. Darin enthalten sind Heizung, Warmwasser, Allgemeinstrom und Hauswart.',
  },
];

export function FAQView() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function handleContact() {
    window.location.href = 'mailto:vertrieb@forol.ch?subject=Anfrage%20Jakobspark';
  }

  return (
    <div className="faq-view">
      <div className="faq-intro">
        <div className="faq-intro-title">FAQ & Downloads</div>
        <div className="faq-intro-text">
          Häufige Fragen rund um das Projekt. Weitere Auskünfte gerne direkt vom Vertriebsteam.
        </div>
      </div>

      <div className="faq-list">
        {FAQS.map((f, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className={`faq-item ${open ? 'open' : ''}`}>
              <button
                className="faq-q"
                onClick={() => setOpenIdx(open ? null : i)}
              >
                <span>{f.q}</span>
                <span className="faq-q-icon">{open ? '−' : '+'}</span>
              </button>
              {open && <div className="faq-a">{f.a}</div>}
            </div>
          );
        })}
      </div>

      <div className="faq-downloads">
        <div className="faq-downloads-title">Downloads</div>
        <button className="faq-download" onClick={() => alert('Verkaufsdokumentation folgt')}>
          📄 Verkaufsdokumentation (PDF)
        </button>
        <button className="faq-download" onClick={() => alert('Baubeschrieb folgt')}>
          📄 Baubeschrieb (PDF)
        </button>
        <button className="faq-download" onClick={() => alert('Preisliste folgt')}>
          📄 Preisliste (PDF)
        </button>
      </div>

      <button className="faq-contact-cta" onClick={handleContact}>
        Persönliches Beratungsgespräch →
      </button>
    </div>
  );
}
