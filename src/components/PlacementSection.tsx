import { useState } from 'react';
import { useProjectStore } from '@/lib/store';
import {
  getStoredPlacement,
  setStoredPlacement,
  clearStoredPlacement,
  formatPlacementAsCode,
} from '@/lib/placement-store';

export function PlacementSection() {
  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);

  const rot = location.rotationDeg ?? 0;
  const ox = location.offsetX ?? 0;
  const oz = location.offsetZ ?? 0;

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [codeSnippet, setCodeSnippet] = useState<string | null>(null);

  const hasStored = getStoredPlacement(location.label) !== null;
  const isModified = rot !== 0 || ox !== 0 || oz !== 0;

  function saveAsDefault() {
    setStoredPlacement(location.label, {
      rotationDeg: rot,
      offsetX: ox,
      offsetZ: oz,
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2200);
  }

  function clearDefault() {
    clearStoredPlacement(location.label);
    setLocation({ ...location, rotationDeg: 0, offsetX: 0, offsetZ: 0 });
  }

  function exportAsCode() {
    const code = formatPlacementAsCode(
      { rotationDeg: rot, offsetX: ox, offsetZ: oz },
      location.label,
    );
    setCodeSnippet(code);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
  }

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

      {isModified && (
        <button
          className="mode-btn"
          style={{ width: '100%', marginTop: 6, padding: '6px 8px', fontSize: 11 }}
          onClick={() => setLocation({ ...location, rotationDeg: 0, offsetX: 0, offsetZ: 0 })}
        >
          Slider zurücksetzen
        </button>
      )}

      <div className="placement-default-bar">
        <button
          className="placement-default-btn primary"
          onClick={saveAsDefault}
          disabled={!isModified && !hasStored}
          title="Position für diesen Browser persistieren"
        >
          {savedAt ? '✓ Gespeichert' : 'Als Default speichern'}
        </button>
        {hasStored && (
          <button
            className="placement-default-btn"
            onClick={clearDefault}
            title="Override löschen, zurück auf Demo-Default"
          >
            Default löschen
          </button>
        )}
      </div>

      {(isModified || hasStored) && (
        <button
          className="placement-default-btn"
          style={{ width: '100%', marginTop: 6 }}
          onClick={exportAsCode}
          title="TypeScript-Snippet für demo-jakobspark.ts in Zwischenablage"
        >
          📋 Als Code kopieren
        </button>
      )}

      {codeSnippet && (
        <div className="placement-code-snippet">
          <div className="placement-code-snippet-head">
            <span>Code für demo-{location.label.toLowerCase().split(/[^a-z0-9]+/)[0]}.ts</span>
            <button
              className="placement-code-close"
              onClick={() => setCodeSnippet(null)}
              aria-label="Schliessen"
            >
              ✕
            </button>
          </div>
          <pre className="placement-code-pre">{codeSnippet}</pre>
          <div className="placement-code-hint">
            In Zwischenablage kopiert. In demo-Datei einfügen für globale Persistenz.
          </div>
        </div>
      )}

      <div className="hint" style={{ fontSize: 10, marginTop: 8 }}>
        Mit den Slidern die Anlage auf die echte Parzelle ausrichten. {hasStored ? '✓ Default gesetzt.' : '"Als Default speichern" sichert die Werte für diesen Browser.'}
      </div>
    </div>
  );
}
