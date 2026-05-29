import { useRef, useState } from 'react';
import { useProjectStore } from '@/lib/store';
import { loadOSMBuildings } from '@/lib/osm';

export function EnvironmentSection() {
  const location = useProjectStore((s) => s.location);
  const osmRadius = useProjectStore((s) => s.osmRadius);
  const setOsmRadius = useProjectStore((s) => s.setOsmRadius);
  const osmBuildings = useProjectStore((s) => s.osmBuildings);
  const setOsmBuildings = useProjectStore((s) => s.setOsmBuildings);
  const neighborGLBFile = useProjectStore((s) => s.neighborGLBFile);
  const setNeighborGLBFile = useProjectStore((s) => s.setNeighborGLBFile);
  const orientationDeg = useProjectStore((s) => s.orientationDeg);
  const setOrientationDeg = useProjectStore((s) => s.setOrientationDeg);
  const aerialGround = useProjectStore((s) => s.aerialGround);
  const setAerialGround = useProjectStore((s) => s.setAerialGround);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; kind: 'info' | 'success' | 'error' }>({
    text: 'Lädt Gebäude im Umkreis um den Standort',
    kind: 'info',
  });
  const [loading, setLoading] = useState(false);

  async function handleLoadOSM() {
    setLoading(true);
    setStatus({ text: 'Lade Gebäudegrundrisse aus OpenStreetMap …', kind: 'info' });
    try {
      const buildings = await loadOSMBuildings({
        lat: location.lat,
        lon: location.lon,
        radiusMeters: osmRadius,
      });
      setOsmBuildings(buildings);
      setStatus({ text: `${buildings.length} Gebäude geladen (Radius ${osmRadius} m)`, kind: 'success' });
    } catch (err) {
      setStatus({ text: `Fehler: ${(err as Error).message}`, kind: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section">
      <div className="section-title">
        <span className="num">3</span>Umgebung
      </div>
      <div className="field">
        <div className="field-label">
          <span>Ausrichtung</span>
          <span className="value">{orientationDeg}°</span>
        </div>
        <input
          type="range" min={0} max={359} step={1}
          value={orientationDeg}
          onChange={(e) => setOrientationDeg(parseInt(e.target.value, 10))}
        />
      </div>
      <div className="hint">
        Modell drehen, bis der See im Norden liegt — die Schatten richten sich neu zur Sonne aus.
      </div>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={aerialGround}
          onChange={(e) => setAerialGround(e.target.checked)}
        />
        <span>Luftbild als Boden (Swisstopo)</span>
      </label>
      <div className="btn-row">
        <button className="btn btn-full" onClick={handleLoadOSM} disabled={loading}>
          {loading ? 'Lade …' : 'Nachbarbebauung aus OSM laden'}
        </button>
      </div>
      <div className={`status-msg ${status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : ''}`}>
        {status.text}
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <div className="field-label">
          <span>Suchradius</span>
          <span className="value">{osmRadius} m</span>
        </div>
        <input
          type="range" min={50} max={500} step={50}
          value={osmRadius}
          onChange={(e) => setOsmRadius(parseInt(e.target.value, 10))}
        />
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        Für LOD2-Genauigkeit (Dachformen): GLB-Export aus swissBUILDINGS3D verwenden.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={(e) => setNeighborGLBFile(e.target.files?.[0] ?? null)}
      />
      <button className="btn btn-full" onClick={() => fileInputRef.current?.click()}>
        LOD2-GLB der Nachbarbebauung laden
      </button>
      <div className="file-info">
        {neighborGLBFile ? neighborGLBFile.name : 'Kein GLB geladen'}
      </div>
      <button
        className="btn"
        style={{ marginTop: 6 }}
        onClick={() => {
          setOsmBuildings([]);
          setNeighborGLBFile(null);
        }}
        disabled={osmBuildings.length === 0 && !neighborGLBFile}
      >
        Alle Nachbarn entfernen
      </button>
    </div>
  );
}
