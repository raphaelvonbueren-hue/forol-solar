import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useProjectStore } from '@/lib/store';

interface POI {
  name: string;
  type: string;
  icon: string;
  lat: number;
  lon: number;
}

// Distanz in Metern zwischen zwei Lat/Lon-Punkten (Haversine)
function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function formatDist(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// POI je nach Projekt-Standort
function getPOIs(label: string): POI[] {
  if (/Jakobspark|Rorschach/i.test(label)) {
    return [
      { name: 'Bahnhof Rorschach', type: 'Verkehr', icon: '🚆', lat: 47.4781, lon: 9.4870 },
      { name: 'Bodensee-Promenade', type: 'Freizeit', icon: '🌊', lat: 47.4793, lon: 9.4920 },
      { name: 'Kornhaus', type: 'Wahrzeichen', icon: '🏛️', lat: 47.4791, lon: 9.4894 },
      { name: 'Bushaltestelle Jakobstrasse', type: 'Verkehr', icon: '🚌', lat: 47.4785, lon: 9.4905 },
      { name: 'Coop Rorschach', type: 'Einkauf', icon: '🛒', lat: 47.4795, lon: 9.4880 },
      { name: 'Migros Rorschach', type: 'Einkauf', icon: '🛒', lat: 47.4773, lon: 9.4862 },
      { name: 'Primarschule Rorschach', type: 'Schule', icon: '🏫', lat: 47.4768, lon: 9.4895 },
      { name: 'Kantonsspital St. Gallen', type: 'Spital', icon: '🏥', lat: 47.4393, lon: 9.3700 },
    ];
  }
  // Default / CH144 / andere Projekte
  return [
    { name: 'Bahnhof (zentral)', type: 'Verkehr', icon: '🚆', lat: 47.5520, lon: 9.3530 },
    { name: 'Schule', type: 'Schule', icon: '🏫', lat: 47.5510, lon: 9.3548 },
    { name: 'Einkaufszentrum', type: 'Einkauf', icon: '🛒', lat: 47.5505, lon: 9.3520 },
  ];
}

export function UmgebungView() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useProjectStore((s) => s.location);

  const pois = useMemo(() => getPOIs(location.label), [location.label]);

  // Distanzen berechnen + sortieren
  const poisWithDist = useMemo(
    () =>
      pois
        .map((p) => ({
          ...p,
          dist: distanceMeters({ lat: location.lat, lon: location.lon }, { lat: p.lat, lon: p.lon }),
        }))
        .sort((a, b) => a.dist - b.dist),
    [pois, location.lat, location.lon],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    m.setView([location.lat, location.lon], 15);

    L.tileLayer(
      'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
      { maxZoom: 19, attribution: '© swisstopo' },
    ).addTo(m);

    // Origin-Marker (FOROL-rot, custom DivIcon)
    const originIcon = L.divIcon({
      className: 'forol-marker forol-marker-origin',
      html: '<div class="forol-marker-pin" style="background:#D32F2F"><div class="forol-marker-pin-dot"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([location.lat, location.lon], { icon: originIcon })
      .addTo(m)
      .bindTooltip(location.label, { permanent: false });

    // POI-Marker
    for (const poi of poisWithDist) {
      const icon = L.divIcon({
        className: 'forol-marker',
        html: `<div class="forol-marker-pin"><span>${poi.icon}</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([poi.lat, poi.lon], { icon })
        .addTo(m)
        .bindTooltip(`${poi.name} · ${formatDist(poi.dist)}`, { permanent: false });
    }

    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="umgebung-view">
      <div className="umgebung-map" ref={containerRef} />
      <div className="umgebung-poi-list">
        <div className="umgebung-poi-title">In der Nähe</div>
        {poisWithDist.map((p) => (
          <div
            key={p.name}
            className="umgebung-poi"
            onClick={() => mapRef.current?.flyTo([p.lat, p.lon], 17, { duration: 0.6 })}
          >
            <div className="umgebung-poi-icon">{p.icon}</div>
            <div className="umgebung-poi-body">
              <div className="umgebung-poi-name">{p.name}</div>
              <div className="umgebung-poi-type">{p.type}</div>
            </div>
            <div className="umgebung-poi-dist">{formatDist(p.dist)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
