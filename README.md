# FOROL Sonnen- und Schattenanalyse — v7.1

Interaktive 3D-Sonnen- und Schattenanalyse für Schweizer Liegenschaften.
React + TypeScript + Vite + Three.js.

## Quick Start

```bash
npm install
npm run dev       # → http://localhost:5173
npm run test      # 60 Tests
npm run typecheck # TypeScript strict
npm run build     # → dist/
```

## Deployment auf Vercel

```bash
npx vercel --prod
```

Die `vercel.json` setzt SPA-Rewrites, immutable Cache-Header für Assets und
`Content-Security-Policy: frame-ancestors *` für iframe-Embedding.

## Embed in der FOROL-Website

Die App kann via iframe auf forol.ch eingebettet werden:

```html
<iframe
  src="https://forol-solar.vercel.app/?embed=1"
  width="100%"
  height="600"
  style="border: 0; border-radius: 8px;"
></iframe>
```

### URL-Parameter

| Parameter | Wert | Bedeutung |
|-----------|------|-----------|
| `embed`   | `1`  | Versteckt Header und Stats-Bar — kompakt für iframes |
| `compact` | `1`  | Versteckt nur die Stats-Bar |
| `lat`     | z.B. `47.37` | Setzt Startstandort (Breite) |
| `lon`     | z.B. `8.54`  | Setzt Startstandort (Länge) |
| `label`   | z.B. `Musterhaus%20Z%C3%BCrich` | Standort-Label |
| `demo`    | `ch144` | Lädt CH144-Demoprojekt direkt |
| `readonly`| `1`  | (vorbereitet) Sidebar nur Anzeige, keine Bearbeitung |

Beispiele:
- `?demo=ch144` — sofort CH144-Showcase
- `?lat=47.3769&lon=8.5417&label=Bahnhofstrasse%201` — Adresse vorausgewählt
- `?embed=1&demo=ch144` — eingebettete Demo ohne Header/Stats

## Architektur

```
src/
├── lib/                      Pure TypeScript, framework-agnostisch
│   ├── solar.ts                NOAA-Sonnenposition       (15 Tests)
│   ├── geo.ts                  WGS84 ↔ Meter             (5 Tests)
│   ├── apartments.ts           Wohnungs-Aufteilung       (11 Tests)
│   ├── heatmap-compute.ts      Sample-Generierung        (14 Tests)
│   ├── demo-ch144.ts           CH144-Demo-Projekt        (7 Tests)
│   ├── url-params.ts           URL-Parameter-Parser      (8 Tests)
│   ├── osm.ts                  Overpass-API
│   └── store.ts                Zustand-Store
├── three/                    Three.js-Helfer
│   ├── buildings.ts            Mesh-Erzeugung
│   └── heatmap.ts              BVH-Raycasting + Cancellation
├── types/index.ts            Domain-Modell
├── components/               React-UI
│   ├── App.tsx, Header.tsx, Controls.tsx
│   ├── LocationSection.tsx     Standort + Karte
│   ├── BuildingSection.tsx     Box/Polygon/Upload
│   ├── EnvironmentSection.tsx  OSM + LOD2-GLB
│   ├── AnalysisSection.tsx     Heatmap + Cancel + CSV
│   ├── Map.tsx                 Leaflet-Polygon-Editor
│   ├── Scene.tsx               Three.js-Hauptszene
│   ├── TimeBar.tsx, StatsBar.tsx
│   └── ErrorBoundary.tsx       Crash-Schutz
├── main.tsx, index.css
└── index.html                 Loader-Screen + Meta-Tags
```

## Features

- Standort: Swisstopo-Autocomplete, Geolocation, Karte mit Polygon-Editor
- Gebäude: Quader / Polygon-Etagen mit Innenhöfen / 3D-Modell-Upload (.glb/.gltf/.obj)
- Wohnungs-Aufteilung: 8 Modi (longitudinal, quer, Grid)
- Nachbarbebauung: OSM-Footprints + LOD2-GLB-Import (swissBUILDINGS3D)
- Verschattungs-Heatmap: 3 Genauigkeitsstufen, BVH-beschleunigt, **abbrechbar**
- Pro-Wohnung-Statistik: Min/Ø/Max Sonnenstunden, CSV-Export
- Hover-Tooltip mit Detailinformationen pro Sample
- Datum/Uhrzeit-Animation (Tag und Jahr)
- Schweizer Zeitzone MEZ/MESZ
- Projekt-Speichern/-Laden als JSON
- **⭐ CH144 Demo-Button** für sofortigen Showcase
- **Mobile-Layout** mit Slide-Up-Drawer für Sidebar
- **Embed-Modus** für iframe-Integration auf forol.ch
- **URL-Parameter** für Deep-Linking aus E-Mails / Inseraten
- Automatische Heatmap-Invalidation bei Geometrie-Änderungen
- ErrorBoundary, Loader-Screen, Vercel-ready

## Was in v7.1 dazukam

- **Cancellation**: User kann eine laufende Heatmap-Berechnung abbrechen
- **Progress über Store**: kein globaler Hack mehr, sauberer State-Flow
- **URL-Parameter**: `?embed=1`, `?demo=ch144`, `?lat=...&lon=...`, `?label=...`
- **iframe-Support**: `frame-ancestors *` in vercel.json
- **Mobile-Drawer**: Sidebar wird zum Bottom-Sheet mit Toggle-Button
- **Touch-Handling**: `touch-action: none` auf Scene verhindert Page-Scroll-Konflikt
- **Heatmap-Invalidation**: Geometrie-Änderung löscht veraltete Heatmap automatisch

## Bundle (after build)

| Chunk     | Größe    | Gzipped | Inhalt |
|-----------|----------|---------|--------|
| three     | 638 KB   | 164 KB  | Three.js + GLTFLoader |
| leaflet   | 150 KB   | 43 KB   | Leaflet-Map |
| react     | 143 KB   | 46 KB   | React + Zustand |
| index     | 55 KB    | 19 KB   | App-Code |
| three-bvh | 42 KB    | 14 KB   | BVH-Raycasting |
| **Gesamt** | **1.0 MB** | **287 KB** | parallel streamend |

## Externe Endpoints

- `api3.geo.admin.ch` — Swisstopo Geocoding
- `wmts.geo.admin.ch` — Swisstopo Luftbild
- `overpass-api.de` — OSM-Gebäudegrundrisse
- `tile.openstreetmap.org` — OSM-Tiles
- `fonts.googleapis.com` — Inter-Font

Kein eigenes Backend nötig.

## Nächste Schritte

1. **Supabase-Integration** — Projekt-JSON in Cloud, geteilte Links für Endkunden
2. **Worker-Migration** der Heatmap-Berechnung — vorbereitet, aber Three.js
   im Worker würde Bundle verdoppeln; Alternative: leichter Eigenbau-Raycaster
3. **i18n** (DE/FR/IT/EN) für mehrsprachige FOROL-Website
4. **PDF-Report-Export** für Übergabe an Käufer
5. **BIM/IFC-Import** statt nur GLB
6. **Heatmap-Persistence** — aktuell wird Heatmap beim Reload nicht wiederhergestellt
