import { useState } from 'react';
import { useProjectStore } from '@/lib/store';
import { flattenSalesApartments, formatCHF } from '@/lib/apartment-selectors';

const FOROL_CONTACT_EMAIL = 'info@forol.ch';

export function ContactButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const massings = useProjectStore((s) => s.massings);
  const selectedId = useProjectStore((s) => s.selectedApartmentId);
  const location = useProjectStore((s) => s.location);

  const selectedApt = (() => {
    if (!selectedId) return null;
    const all = flattenSalesApartments(massings);
    return all.find((a) => a.id === selectedId) ?? null;
  })();

  function buildMailto(): string {
    const subject = selectedApt
      ? `Anfrage Wohnung ${selectedApt.name} — ${location.label}`
      : `Anfrage — ${location.label}`;

    let body = `Hallo FOROL,\n\n`;
    if (selectedApt) {
      body += `Ich interessiere mich für die Wohnung ${selectedApt.name} (${selectedApt.massingName}):\n`;
      if (selectedApt.sales.areaSqm) body += `· Fläche: ${selectedApt.sales.areaSqm} m²\n`;
      if (selectedApt.sales.rooms) body += `· Zimmer: ${selectedApt.sales.rooms}\n`;
      if (selectedApt.sales.price) body += `· Preis: CHF ${formatCHF(selectedApt.sales.price)}\n`;
      body += `\n`;
    } else {
      body += `Ich interessiere mich für das Projekt "${location.label}".\n\n`;
    }
    if (message) body += `${message}\n\n`;
    body += `Mit freundlichen Grüssen\n${name || '[Name]'}\n`;
    if (phone) body += `Tel: ${phone}\n`;
    if (email) body += `E-Mail: ${email}\n`;
    return `mailto:${FOROL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = buildMailto();
    setOpen(false);
  }

  return (
    <>
      <button
        className="contact-btn"
        onClick={() => setOpen(true)}
        aria-label="Kontakt"
        title="Kontakt aufnehmen"
      >
        ✉
      </button>
      {open && (
        <>
          <div className="contact-backdrop" onClick={() => setOpen(false)} />
          <div className="contact-modal" role="dialog" aria-modal="true">
            <div className="contact-modal-header">
              <h2 className="contact-modal-title">
                {selectedApt ? `Anfrage Wohnung ${selectedApt.name}` : 'Kontakt'}
              </h2>
              <button className="contact-modal-close" onClick={() => setOpen(false)} aria-label="Schließen">
                ✕
              </button>
            </div>
            <form className="contact-form" onSubmit={handleSubmit}>
              {selectedApt && (
                <div className="contact-summary">
                  <div className="contact-summary-row">
                    <span className="contact-summary-lbl">Etage</span>
                    <span className="contact-summary-val">{selectedApt.sales.floorLabel ?? '—'}</span>
                  </div>
                  {selectedApt.sales.areaSqm && (
                    <div className="contact-summary-row">
                      <span className="contact-summary-lbl">Fläche</span>
                      <span className="contact-summary-val">{selectedApt.sales.areaSqm} m²</span>
                    </div>
                  )}
                  {selectedApt.sales.rooms && (
                    <div className="contact-summary-row">
                      <span className="contact-summary-lbl">Zimmer</span>
                      <span className="contact-summary-val">{selectedApt.sales.rooms}</span>
                    </div>
                  )}
                  {selectedApt.sales.price && (
                    <div className="contact-summary-row">
                      <span className="contact-summary-lbl">Kaufpreis</span>
                      <span className="contact-summary-val">CHF {formatCHF(selectedApt.sales.price)}</span>
                    </div>
                  )}
                </div>
              )}
              <label>
                <span>Name *</span>
                <input
                  type="text" required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Muster"
                />
              </label>
              <label>
                <span>E-Mail *</span>
                <input
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@example.ch"
                />
              </label>
              <label>
                <span>Telefon</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+41 79 ..."
                />
              </label>
              <label>
                <span>Nachricht</span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ihre Anfrage ..."
                />
              </label>
              <button type="submit" className="btn-submit">
                Anfrage senden
              </button>
              <div className="contact-hint">
                Beim Klick auf "Anfrage senden" öffnet sich Ihr E-Mail-Programm mit der vorbereiteten Nachricht.
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
