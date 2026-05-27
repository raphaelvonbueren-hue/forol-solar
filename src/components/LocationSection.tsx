import { useEffect, useRef, useState } from 'react';
import { useProjectStore, recomputeAllSubzones } from '@/lib/store';
import { Map } from './Map';

interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

async function geocodeSwisstopo(query: string): Promise<GeocodeResult[]> {
  if (query.length < 2) return [];
  const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(
    query,
  )}&type=locations&limit=8&sr=4326&origins=address,parcel,gg25,zipcode`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Geocoding fehlgeschlagen');
  const data = (await r.json()) as { results: Array<{ attrs: { label: string; lat: number; lon: number } }> };
  return (data.results || []).map((item) => ({
    label: item.attrs.label ? item.attrs.label.replace(/<\/?[^>]+(>|$)/g, '') : 'Unbekannt',
    lat: item.attrs.lat,
    lon: item.attrs.lon,
  }));
}

export function LocationSection() {
  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);

  const [addressInput, setAddressInput] = useState(location.label);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [acVisible, setAcVisible] = useState(false);
  const [status, setStatus] = useState<{ text: string; kind: 'info' | 'success' | 'error' }>({
    text: 'Standort suchen oder Geolocation nutzen',
    kind: 'info',
  });
  const debounceRef = useRef<number | null>(null);

  // Debounced Autocomplete
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (addressInput.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await geocodeSwisstopo(addressInput);
        setResults(r);
        setAcVisible(true);
      } catch (err) {
        setStatus({ text: (err as Error).message, kind: 'error' });
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [addressInput]);

  function pickResult(r: GeocodeResult) {
    setLocation({ lat: r.lat, lon: r.lon, label: r.label });
    recomputeAllSubzones();
    setAddressInput(r.label);
    setAcVisible(false);
    setStatus({ text: r.label, kind: 'success' });
  }

  function tryGeolocation() {
    if (!navigator.geolocation) {
      setStatus({ text: 'Geolocation nicht verfügbar', kind: 'error' });
      return;
    }
    setStatus({ text: 'Standort wird ermittelt …', kind: 'info' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocation({ lat, lon, label: 'Mein Standort' });
        recomputeAllSubzones();
        setAddressInput('Mein Standort');
        setStatus({ text: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, kind: 'success' });
      },
      (err) => {
        setStatus({ text: `Nicht ermittelbar: ${err.message}`, kind: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function setManualLatLon(lat: number, lon: number) {
    setLocation({ lat, lon, label: 'Manuell eingegeben' });
    recomputeAllSubzones();
  }

  return (
    <div className="section">
      <div className="section-title">
        <span className="num">1</span>Standort
      </div>

      <Map />

      <div className="btn-row" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={tryGeolocation}>
          📍 Mein Standort
        </button>
      </div>

      <div className="field">
        <input
          type="text"
          placeholder="Adresse, PLZ oder Ort eingeben"
          autoComplete="off"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onFocus={() => results.length > 0 && setAcVisible(true)}
          onBlur={() => window.setTimeout(() => setAcVisible(false), 200)}
        />
        {acVisible && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              borderRadius: '0 0 3px 3px',
              maxHeight: 220,
              overflowY: 'auto',
              zIndex: 200,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--bg)',
                }}
                onMouseDown={() => pickResult(r)}
              >
                {r.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field row2">
        <input
          type="number"
          step="0.000001"
          placeholder="Breite"
          value={location.lat.toFixed(6)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setManualLatLon(v, location.lon);
          }}
        />
        <input
          type="number"
          step="0.000001"
          placeholder="Länge"
          value={location.lon.toFixed(6)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) setManualLatLon(location.lat, v);
          }}
        />
      </div>

      <div
        className={`status-msg ${status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : ''}`}
      >
        {status.text}
      </div>
    </div>
  );
}
