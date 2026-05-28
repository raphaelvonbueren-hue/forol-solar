import { useProjectStore } from '@/lib/store';

export function PlacementSection() {
  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);

  const rot = location.rotationDeg ?? 0;
  const ox = location.offsetX ?? 0;
  const oz = location.offsetZ ?? 0;

  return (
    <div className="section">
      <div className="section-title">
        <span className="num">⊕</span>
        Anlage eindrehen
      </div>

      <div className="field">
        <div className="field-label">
          Rotation
          <span className="value">{rot.toFixed(1)}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          step="0.5"
          value={rot}
          onChange={(e) => setLocation({ ...location, rotationDeg: parseFloat(e.target.value) })}
        />
        <div className="row2" style={{ marginTop: 4 }}>
          <button
            className="mode-btn"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={() => setLocation({ ...location, rotationDeg: 0 })}
          >
            Null
          </button>
          <button
            className="mode-btn"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={() => setLocation({ ...location, rotationDeg: -15 })}
          >
            -15°
          </button>
        </div>
      </div>

      <div className="field">
        <div className="field-label">
          Verschiebung Ost-West
          <span className="value">{ox.toFixed(1)} m</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="0.5"
          value={ox}
          onChange={(e) => setLocation({ ...location, offsetX: parseFloat(e.target.value) })}
        />
      </div>

      <div className="field">
        <div className="field-label">
          Verschiebung Nord-Süd
          <span className="value">{oz.toFixed(1)} m</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="0.5"
          value={oz}
          onChange={(e) => setLocation({ ...location, offsetZ: parseFloat(e.target.value) })}
        />
      </div>

      {(rot !== 0 || ox !== 0 || oz !== 0) && (
        <button
          className="mode-btn"
          style={{ width: '100%', marginTop: 6, padding: '6px 8px', fontSize: 11 }}
          onClick={() =>
            setLocation({ ...location, rotationDeg: 0, offsetX: 0, offsetZ: 0 })
          }
        >
          Alle zurücksetzen
        </button>
      )}

      <div className="hint" style={{ fontSize: 10, marginTop: 8 }}>
        Anlage einmalig auf der echten Parzelle eindrehen. Wird in Projekt gespeichert.
      </div>
    </div>
  );
}
