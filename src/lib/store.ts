import { create } from 'zustand';
import type {
  AnalysisConfig,
  Apartment,
  ApartmentResult,
  BoxBuilding,
  BuildingMode,
  DateTime,
  Location,
  Massing,
  Project,
  SplitMode,
} from '@/types';
import { autoSplitMassing, mergeSubzoneData } from '@/lib/apartments';
import type { OSMBuilding } from '@/lib/osm';
import type { FacadeSample } from '@/lib/heatmap-compute';

interface ProjectState {
  // Standort
  location: Location;
  setLocation: (loc: Location) => void;

  // Gebäude
  buildingMode: BuildingMode;
  setBuildingMode: (mode: BuildingMode) => void;
  box: BoxBuilding;
  setBox: (patch: Partial<BoxBuilding>) => void;
  massings: Massing[];
  addMassing: (name?: string) => string;
  updateMassing: (id: string, patch: Partial<Massing>) => void;
  deleteMassing: (id: string) => void;
  setMassingSplit: (id: string, mode: SplitMode) => void;

  // Eigenes 3D-Modell (Upload)
  modelFile: File | null;
  modelScale: number;
  modelRotation: number;
  setModelFile: (f: File | null) => void;
  setModelTransform: (patch: { scale?: number; rotation?: number }) => void;

  // Datum/Zeit
  dateTime: DateTime;
  setDateTime: (patch: Partial<DateTime>) => void;
  animating: boolean;
  animMode: 'day' | 'year';
  setAnimating: (v: boolean) => void;
  setAnimMode: (m: 'day' | 'year') => void;

  // Umgebung
  osmRadius: number;
  setOsmRadius: (r: number) => void;
  osmBuildings: OSMBuilding[];
  setOsmBuildings: (b: OSMBuilding[]) => void;
  neighborGLBFile: File | null;
  setNeighborGLBFile: (f: File | null) => void;

  // Analyse-Konfiguration
  analysisConfig: AnalysisConfig;
  setAnalysisConfig: (patch: Partial<AnalysisConfig>) => void;

  // Letztes Analyse-Ergebnis
  heatmapSamples: FacadeSample[] | null;
  heatmapResults: Float32Array | null;
  setHeatmap: (samples: FacadeSample[] | null, results: Float32Array | null) => void;
  apartmentResults: ApartmentResult[];
  setApartmentResults: (results: ApartmentResult[]) => void;

  // Berechnungs-Status
  computing: boolean;
  computeProgress: number;
  computeStatus: string;
  cancelRequested: boolean;
  setComputing: (v: boolean) => void;
  setComputeProgress: (p: number) => void;
  setComputeStatus: (s: string) => void;
  requestCancel: () => void;
  resetCancel: () => void;

  // Vertriebs-Modus: Wohnungs-Selektion und Filter
  selectedApartmentId: string | null;
  hoveredApartmentId: string | null;
  setSelectedApartment: (id: string | null) => void;
  setHoveredApartment: (id: string | null) => void;

  salesFilter: {
    statusFilter: Array<'available' | 'reserved' | 'sold'>;
    minRooms: number | null;
    maxRooms: number | null;
    minArea: number | null;
    maxArea: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    floorLabels: string[]; // leer = alle
  };
  setSalesFilter: (patch: Partial<ProjectState['salesFilter']>) => void;
  resetSalesFilter: () => void;

  // UI-Modus: 'sales' = Vertriebs-Showcase, 'editor' = Bauplaner-Tools
  uiMode: 'sales' | 'editor';
  setUiMode: (m: 'sales' | 'editor') => void;

  // Persistenz
  exportProject: () => Project;
  importProject: (project: Project) => void;
}

const DEFAULT_LOCATION: Location = {
  lat: 47.3769,
  lon: 8.5417,
  label: 'Zürich',
};

const DEFAULT_BOX: BoxBuilding = {
  length: 25,
  width: 15,
  height: 12,
  rotationDeg: 0,
};

function today(): DateTime {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    localMinutes: d.getHours() * 60 + d.getMinutes(),
  };
}

function newMassingId(): string {
  return 'm' + Math.random().toString(36).slice(2, 8);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  location: DEFAULT_LOCATION,
  setLocation: (location) => set({ location }),

  buildingMode: 'box',
  setBuildingMode: (buildingMode) => set({ buildingMode }),

  box: DEFAULT_BOX,
  setBox: (patch) => set((s) => ({
    box: { ...s.box, ...patch },
    heatmapSamples: null, heatmapResults: null, apartmentResults: [],
  })),

  massings: [],
  addMassing: (name) => {
    const state = get();
    const id = newMassingId();
    const totalHeight = state.massings.reduce((sum, m) => sum + m.height, 0);
    const massing: Massing = {
      id,
      name: name ?? `Etage ${state.massings.length + 1}`,
      outline: [],
      holes: [],
      height: 3.0,
      zOffset: totalHeight,
      splitMode: 'none',
      subzones: [],
    };
    set({
      massings: [...state.massings, massing],
      heatmapSamples: null, heatmapResults: null, apartmentResults: [],
    });
    return id;
  },
  updateMassing: (id, patch) =>
    set((s) => {
      const massings = s.massings.map((m) => (m.id === id ? { ...m, ...patch } : m));
      // Wenn outline geändert wurde, Subzones neu rechnen für den Massing
      const changed = massings.find((m) => m.id === id);
      if (changed && (patch.outline || patch.splitMode) && changed.splitMode !== 'none') {
        changed.subzones = autoSplitMassing(changed, changed.splitMode, s.location);
      }
      // Wenn Höhe geändert: z-Offsets aller folgenden Etagen anpassen
      if (patch.height !== undefined) {
        let z = 0;
        for (const m of massings) {
          m.zOffset = z;
          z += m.height;
        }
      }
      return {
        massings,
        // Geometry-Änderungen invalidieren Heatmap; splitMode-Änderungen nicht
        ...(patch.outline || patch.holes || patch.height || patch.zOffset
          ? { heatmapSamples: null, heatmapResults: null, apartmentResults: [] }
          : {}),
      };
    }),
  deleteMassing: (id) =>
    set((s) => {
      const massings = s.massings.filter((m) => m.id !== id);
      let z = 0;
      for (const m of massings) {
        m.zOffset = z;
        z += m.height;
      }
      return {
        massings,
        heatmapSamples: null, heatmapResults: null, apartmentResults: [],
      };
    }),
  setMassingSplit: (id, mode) =>
    set((s) => {
      const massings = s.massings.map((m) => {
        if (m.id !== id) return m;
        return {
          ...m,
          splitMode: mode,
          subzones: autoSplitMassing(m, mode, s.location),
        };
      });
      return { massings };
    }),

  dateTime: today(),
  setDateTime: (patch) => set((s) => ({ dateTime: { ...s.dateTime, ...patch } })),
  animating: false,
  animMode: 'day',
  setAnimating: (animating) => set({ animating }),
  setAnimMode: (animMode) => set({ animMode }),

  modelFile: null,
  modelScale: 1,
  modelRotation: 0,
  setModelFile: (modelFile) => set({ modelFile }),
  setModelTransform: (patch) =>
    set((s) => ({
      modelScale: patch.scale ?? s.modelScale,
      modelRotation: patch.rotation ?? s.modelRotation,
    })),

  osmRadius: 200,
  setOsmRadius: (osmRadius) => set({ osmRadius }),
  osmBuildings: [],
  setOsmBuildings: (osmBuildings) => set({ osmBuildings }),
  neighborGLBFile: null,
  setNeighborGLBFile: (neighborGLBFile) => set({ neighborGLBFile }),

  analysisConfig: { precision: 'medium', sampleSpacing: 1.5 },
  setAnalysisConfig: (patch) =>
    set((s) => ({ analysisConfig: { ...s.analysisConfig, ...patch } })),

  heatmapSamples: null,
  heatmapResults: null,
  setHeatmap: (heatmapSamples, heatmapResults) => set({ heatmapSamples, heatmapResults }),

  apartmentResults: [],
  setApartmentResults: (apartmentResults) => set({ apartmentResults }),

  computing: false,
  computeProgress: 0,
  computeStatus: 'Bereit',
  cancelRequested: false,
  setComputing: (computing) => set({ computing }),
  setComputeProgress: (computeProgress) => set({ computeProgress }),
  setComputeStatus: (computeStatus) => set({ computeStatus }),
  requestCancel: () => set({ cancelRequested: true }),
  resetCancel: () => set({ cancelRequested: false }),

  selectedApartmentId: null,
  hoveredApartmentId: null,
  setSelectedApartment: (selectedApartmentId) => set({ selectedApartmentId }),
  setHoveredApartment: (hoveredApartmentId) => set({ hoveredApartmentId }),

  salesFilter: {
    statusFilter: ['available', 'reserved'],
    minRooms: null, maxRooms: null,
    minArea: null, maxArea: null,
    minPrice: null, maxPrice: null,
    floorLabels: [],
  },
  setSalesFilter: (patch) => set((s) => ({ salesFilter: { ...s.salesFilter, ...patch } })),
  resetSalesFilter: () => set({
    salesFilter: {
      statusFilter: ['available', 'reserved', 'sold'],
      minRooms: null, maxRooms: null,
      minArea: null, maxArea: null,
      minPrice: null, maxPrice: null,
      floorLabels: [],
    },
  }),

  uiMode: 'sales',
  setUiMode: (uiMode) => set({ uiMode }),

  exportProject: () => {
    const s = get();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      location: s.location,
      buildingMode: s.buildingMode,
      box: s.box,
      massings: s.massings,
      dateTime: s.dateTime,
      osmRadius: s.osmRadius,
    };
  },
  importProject: (project) => {
    // Subzones neu berechnen (bbox hängt vom lokalen Koordinatensystem ab),
    // aber Sales-Daten aus dem Projekt erhalten
    const massings = project.massings.map((m) => {
      if (m.splitMode === 'none' || m.outline.length < 3) {
        return { ...m, subzones: [] as Apartment[] };
      }
      const fresh = autoSplitMassing(m, m.splitMode, project.location);
      return { ...m, subzones: mergeSubzoneData(fresh, m.subzones || []) };
    });
    set({
      location: project.location,
      buildingMode: project.buildingMode,
      box: project.box,
      massings,
      dateTime: project.dateTime,
      osmRadius: project.osmRadius,
      apartmentResults: [],
      heatmapSamples: null,
      heatmapResults: null,
      osmBuildings: [],
    });
  },
}));

/**
 * Helper-Funktion, die bei jedem Standort-Wechsel die Wohnungen aller Massings
 * neu berechnet, da die Bounding-Boxes vom lokalen Koordinatensystem abhängen.
 * Sales-Daten der existierenden Subzones bleiben erhalten.
 */
export function recomputeAllSubzones(): void {
  const state = useProjectStore.getState();
  const massings = state.massings.map((m) => {
    if (m.splitMode === 'none' || m.outline.length < 3) {
      return { ...m, subzones: [] as Apartment[] };
    }
    const fresh = autoSplitMassing(m, m.splitMode, state.location);
    return { ...m, subzones: mergeSubzoneData(fresh, m.subzones || []) };
  });
  useProjectStore.setState({ massings });
}
