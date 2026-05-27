import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useProjectStore } from '@/lib/store';
import type { LatLon } from '@/types';

const MASSING_COLORS = ['#D32F2F', '#F5A623', '#4A90E2', '#9C27B0', '#2E7D32', '#00897B'];

type EditorMode = 'view' | 'outline' | 'hole';

export function Map() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const swisstopoLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const [currentLayer, setCurrentLayer] = useState<'swisstopo' | 'osm'>('swisstopo');

  // Polygon-Editor State
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [editingMassingId, setEditingMassingId] = useState<string | null>(null);
  const editingPointsRef = useRef<L.LatLng[]>([]);
  const editingMarkersRef = useRef<L.CircleMarker[]>([]);
  const editingPolylineRef = useRef<L.Polyline | null>(null);
  const massingLayersRef = useRef<Map<string, L.Polygon>>(new globalThis.Map());

  const location = useProjectStore((s) => s.location);
  const setLocation = useProjectStore((s) => s.setLocation);
  const massings = useProjectStore((s) => s.massings);
  const addMassing = useProjectStore((s) => s.addMassing);
  const updateMassing = useProjectStore((s) => s.updateMassing);
  const buildingMode = useProjectStore((s) => s.buildingMode);

  // Map initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = L.map(containerRef.current, { zoomControl: true });
    m.setView([location.lat, location.lon], 17);

    swisstopoLayerRef.current = L.tileLayer(
      'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
      { maxZoom: 19, attribution: '© swisstopo' },
    );
    osmLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });
    swisstopoLayerRef.current.addTo(m);

    const marker = L.marker([location.lat, location.lon], { draggable: true });
    marker.addTo(m).bindTooltip('Standort der Liegenschaft');
    marker.on('dragend', (e) => {
      const ll = (e.target as L.Marker).getLatLng();
      setLocation({ lat: ll.lat, lon: ll.lng, label: 'Manueller Standort' });
    });
    markerRef.current = marker;

    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 100);

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker bei Location-Wechsel updaten
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([location.lat, location.lon]);
    mapRef.current.setView([location.lat, location.lon], mapRef.current.getZoom());
  }, [location.lat, location.lon]);

  // Layer-Wechsel
  useEffect(() => {
    if (!mapRef.current || !swisstopoLayerRef.current || !osmLayerRef.current) return;
    if (currentLayer === 'swisstopo') {
      osmLayerRef.current.remove();
      swisstopoLayerRef.current.addTo(mapRef.current);
    } else {
      swisstopoLayerRef.current.remove();
      osmLayerRef.current.addTo(mapRef.current);
    }
  }, [currentLayer]);

  // Massing-Polygone synchronisieren
  useEffect(() => {
    if (!mapRef.current) return;
    // Alte Layer entfernen, die nicht mehr existieren
    for (const [id, layer] of massingLayersRef.current.entries()) {
      if (!massings.find((m) => m.id === id)) {
        layer.remove();
        massingLayersRef.current.delete(id);
      }
    }
    // Aktualisieren/Neu erstellen
    massings.forEach((m, idx) => {
      if (m.outline.length < 3) {
        const existing = massingLayersRef.current.get(m.id);
        if (existing) {
          existing.remove();
          massingLayersRef.current.delete(m.id);
        }
        return;
      }
      const color = MASSING_COLORS[idx % MASSING_COLORS.length];
      const latLngs: L.LatLngTuple[][] = [m.outline.map(([lat, lon]) => [lat, lon] as L.LatLngTuple)];
      for (const h of m.holes) latLngs.push(h.map(([lat, lon]) => [lat, lon] as L.LatLngTuple));
      const existing = massingLayersRef.current.get(m.id);
      if (existing) existing.remove();
      const poly = L.polygon(latLngs, { color, fillColor: color, fillOpacity: 0.25, weight: 2 });
      poly.addTo(mapRef.current!);
      massingLayersRef.current.set(m.id, poly);
    });
  }, [massings]);

  // Map-Click-Handler (an editorMode gekoppelt)
  useEffect(() => {
    if (!mapRef.current) return;
    const m = mapRef.current;

    function handleClick(e: L.LeafletMouseEvent) {
      if (editorMode === 'view') {
        setLocation({ lat: e.latlng.lat, lon: e.latlng.lng, label: 'Per Karte gesetzt' });
      } else {
        editingPointsRef.current.push(e.latlng);
        const cm = L.circleMarker(e.latlng, {
          radius: 4, color: '#D32F2F', fillColor: '#D32F2F', fillOpacity: 1,
        }).addTo(m);
        editingMarkersRef.current.push(cm);
        if (editingPolylineRef.current) editingPolylineRef.current.remove();
        if (editingPointsRef.current.length >= 2) {
          editingPolylineRef.current = L.polyline(editingPointsRef.current, {
            color: '#D32F2F', weight: 2, dashArray: '4,3',
          }).addTo(m);
        }
      }
    }
    function handleDblClick(e: L.LeafletMouseEvent) {
      if (editorMode === 'outline' || editorMode === 'hole') {
        L.DomEvent.stopPropagation(e);
        finalizeEditor();
      }
    }

    m.on('click', handleClick);
    m.on('dblclick', handleDblClick);
    return () => {
      m.off('click', handleClick);
      m.off('dblclick', handleDblClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, editingMassingId]);

  function cancelEditor() {
    setEditorMode('view');
    editingPointsRef.current = [];
    editingMarkersRef.current.forEach((mk) => mk.remove());
    editingMarkersRef.current = [];
    if (editingPolylineRef.current) {
      editingPolylineRef.current.remove();
      editingPolylineRef.current = null;
    }
    if (mapRef.current) mapRef.current.getContainer().style.cursor = '';
  }

  function startEditor(target: 'outline' | 'hole') {
    cancelEditor();
    setEditorMode(target);
    if (mapRef.current) mapRef.current.getContainer().style.cursor = 'crosshair';
  }

  function finalizeEditor() {
    if (editingPointsRef.current.length < 3) {
      cancelEditor();
      return;
    }
    const points: LatLon[] = editingPointsRef.current.map((p) => [p.lat, p.lng]);
    let targetId = editingMassingId;
    if (editorMode === 'outline') {
      if (!targetId || !massings.find((m) => m.id === targetId)) {
        targetId = addMassing();
        setEditingMassingId(targetId);
      }
      updateMassing(targetId, { outline: points });
    } else if (editorMode === 'hole') {
      if (!targetId) {
        cancelEditor();
        return;
      }
      const target = massings.find((m) => m.id === targetId);
      if (!target || target.outline.length < 3) {
        cancelEditor();
        return;
      }
      updateMassing(targetId, { holes: [...target.holes, points] });
    }
    cancelEditor();
  }

  // Aktive Etage automatisch wechseln wenn polygon-Modus und massings dazukommen
  useEffect(() => {
    if (buildingMode !== 'polygon') return;
    if (!editingMassingId && massings.length > 0) {
      setEditingMassingId(massings[massings.length - 1].id);
    }
    if (editingMassingId && !massings.find((m) => m.id === editingMassingId)) {
      setEditingMassingId(massings[massings.length - 1]?.id ?? null);
    }
  }, [buildingMode, massings, editingMassingId]);

  return (
    <div>
      <div ref={containerRef} className="map-container" />
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button
          className={`btn ${currentLayer === 'osm' ? 'active' : ''}`}
          onClick={() => setCurrentLayer(currentLayer === 'swisstopo' ? 'osm' : 'swisstopo')}
        >
          {currentLayer === 'swisstopo' ? 'OSM-Karte' : 'Luftbild'}
        </button>
        {buildingMode === 'polygon' && (
          <>
            <button
              className={`btn ${editorMode === 'outline' ? 'primary' : ''}`}
              onClick={() => startEditor('outline')}
              disabled={massings.length === 0}
              title={massings.length === 0 ? 'Erst Etage hinzufügen' : ''}
            >
              ✏ Kontur
            </button>
            <button
              className={`btn ${editorMode === 'hole' ? 'primary' : ''}`}
              onClick={() => startEditor('hole')}
              disabled={!editingMassingId || (massings.find((m) => m.id === editingMassingId)?.outline.length ?? 0) < 3}
            >
              ⬚ Hof
            </button>
          </>
        )}
      </div>
      {buildingMode === 'polygon' && (editorMode === 'outline' || editorMode === 'hole') && (
        <div className="status-msg" style={{ color: 'var(--blue)' }}>
          {editorMode === 'outline'
            ? 'Klick = Punkt, Doppelklick = abschließen'
            : 'Innenhof: Klick = Punkt, Doppelklick = abschließen'}
        </div>
      )}
    </div>
  );
}
