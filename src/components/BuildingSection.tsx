import { useRef } from 'react';
import { useProjectStore } from '@/lib/store';
import type { BuildingMode, SplitMode } from '@/types';

const MODES: Array<{ id: BuildingMode; icon: string; label: string }> = [
  { id: 'box', icon: '📦', label: 'Quader' },
  { id: 'polygon', icon: '⬢', label: 'Polygon' },
  { id: 'upload', icon: '📁', label: '3D-Modell' },
];

const SPLIT_OPTIONS: Array<{ value: SplitMode; label: string }> = [
  { value: 'none', label: 'keine' },
  { value: 'long2', label: '2 längs' },
  { value: 'long3', label: '3 längs' },
  { value: 'long4', label: '4 längs' },
  { value: 'cross2', label: '2 quer' },
  { value: 'cross3', label: '3 quer' },
  { value: 'grid2x2', label: '4 (2×2 Grid)' },
  { value: 'grid2x3', label: '6 (2×3 Grid)' },
];

export function BuildingSection() {
  const buildingMode = useProjectStore((s) => s.buildingMode);
  const setBuildingMode = useProjectStore((s) => s.setBuildingMode);

  return (
    <div className="section">
      <div className="section-title">
        <span className="num">2</span>Eigenes Gebäude
      </div>
      <div className="mode-selector">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${buildingMode === m.id ? 'active' : ''}`}
            onClick={() => setBuildingMode(m.id)}
          >
            <div className="mode-btn-icon">{m.icon}</div>
            <div className="mode-btn-label">{m.label}</div>
          </button>
        ))}
      </div>
      {buildingMode === 'box' && <BoxMode />}
      {buildingMode === 'polygon' && <PolygonMode />}
      {buildingMode === 'upload' && <UploadMode />}
    </div>
  );
}

function BoxMode() {
  const box = useProjectStore((s) => s.box);
  const setBox = useProjectStore((s) => s.setBox);
  return (
    <>
      <div className="field row3">
        <div>
          <div className="field-label">
            <span>Länge</span>
            <span className="value">{box.length} m</span>
          </div>
          <input
            type="number" min={3} max={200} step={0.5}
            value={box.length}
            onChange={(e) => setBox({ length: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <div className="field-label">
            <span>Breite</span>
            <span className="value">{box.width} m</span>
          </div>
          <input
            type="number" min={3} max={100} step={0.5}
            value={box.width}
            onChange={(e) => setBox({ width: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <div className="field-label">
            <span>Höhe</span>
            <span className="value">{box.height} m</span>
          </div>
          <input
            type="number" min={3} max={100} step={0.5}
            value={box.height}
            onChange={(e) => setBox({ height: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      <div className="field">
        <div className="field-label">
          <span>Nord-Drehung</span>
          <span className="value">{box.rotationDeg}°</span>
        </div>
        <input
          type="range" min={0} max={359}
          value={box.rotationDeg}
          onChange={(e) => setBox({ rotationDeg: parseInt(e.target.value, 10) })}
        />
      </div>
    </>
  );
}

function PolygonMode() {
  const massings = useProjectStore((s) => s.massings);
  const addMassing = useProjectStore((s) => s.addMassing);
  const updateMassing = useProjectStore((s) => s.updateMassing);
  const deleteMassing = useProjectStore((s) => s.deleteMassing);
  const setMassingSplit = useProjectStore((s) => s.setMassingSplit);

  return (
    <>
      <div className="hint">
        Klick auf die Karte oben um Punkte zu setzen. Doppelklick schließt das Polygon.
        Etage hinzufügen → Außenkontur zeichnen.
      </div>
      <div className="btn-row" style={{ marginBottom: 8 }}>
        <button className="btn btn-full" onClick={() => addMassing()}>
          ＋ Etage hinzufügen
        </button>
      </div>
      {massings.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--gray-light)', textAlign: 'center', padding: 8 }}>
          Noch keine Etage. Klick „＋ Etage hinzufügen", dann auf die Karte zum Zeichnen.
        </div>
      )}
      {massings.map((m, i) => (
        <div key={m.id} className="massing-item">
          <div className="massing-header">
            <span className="massing-name">{m.name}</span>
            <div className="massing-actions">
              <button onClick={() => deleteMassing(m.id)}>✕</button>
            </div>
          </div>
          <div className="massing-stats">
            <div>
              Punkte <span className="v">{m.outline.length}{m.holes.length ? ` (+${m.holes.length} Loch)` : ''}</span>
            </div>
            <div>
              Höhe{' '}
              <input
                type="number" min={1} max={100} step={0.5}
                value={m.height}
                onChange={(e) => updateMassing(m.id, { height: parseFloat(e.target.value) })}
                style={{ width: 48, padding: '2px 4px', fontSize: 10 }}
              /> m
            </div>
            <div>
              z-Start{' '}
              <input
                type="number" step={0.5}
                value={m.zOffset.toFixed(1)}
                onChange={(e) => updateMassing(m.id, { zOffset: parseFloat(e.target.value) })}
                style={{ width: 48, padding: '2px 4px', fontSize: 10 }}
              /> m
            </div>
          </div>
          <div className="split-row">
            <span>Wohnungen:</span>
            <select
              value={m.splitMode}
              onChange={(e) => setMassingSplit(m.id, e.target.value as SplitMode)}
              data-idx={i}
            >
              {SPLIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {m.subzones.length > 0 && (
              <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{m.subzones.length}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function UploadMode() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelFile = useProjectStore((s) => s.modelFile);
  const modelScale = useProjectStore((s) => s.modelScale);
  const modelRotation = useProjectStore((s) => s.modelRotation);
  const setModelFile = useProjectStore((s) => s.setModelFile);
  const setModelTransform = useProjectStore((s) => s.setModelTransform);

  return (
    <>
      <div className="hint">
        Du kannst die Datei auch direkt in die 3D-Szene per Drag-and-Drop ablegen.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj"
        style={{ display: 'none' }}
        onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
      />
      <button
        className="btn btn-full primary"
        onClick={() => fileInputRef.current?.click()}
      >
        3D-Modell wählen (.glb / .gltf / .obj)
      </button>
      <div className="file-info">
        {modelFile ? modelFile.name : 'Kein Modell geladen. Tipp: IFC- oder SketchUp-Dateien vorher in Blender als GLB exportieren.'}
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <div className="field-label">
          <span>Skalierung</span>
          <span className="value">{modelScale.toFixed(2)}×</span>
        </div>
        <input
          type="range" min={0.1} max={10} step={0.05}
          value={modelScale}
          onChange={(e) => setModelTransform({ scale: parseFloat(e.target.value) })}
        />
      </div>
      <div className="field">
        <div className="field-label">
          <span>Nord-Drehung</span>
          <span className="value">{modelRotation}°</span>
        </div>
        <input
          type="range" min={0} max={359}
          value={modelRotation}
          onChange={(e) => setModelTransform({ rotation: parseInt(e.target.value, 10) })}
        />
      </div>
    </>
  );
}
