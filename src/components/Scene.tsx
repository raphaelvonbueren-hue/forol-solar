import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useProjectStore } from '@/lib/store';
import { sunPosition, swissOffsetHours } from '@/lib/solar';
import {
  buildBoxMesh, buildMassingMesh, buildOSMMesh,
  loadModelFile, loadNeighborGLB, disposeObject3D,
} from '@/three/buildings';
import {
  generateBoxSamples, generateMassingSamples,
  buildAnalysisTimestamps, findApartmentForSample, sunHoursToRGB,
  type FacadeSample,
} from '@/lib/heatmap-compute';
import { computeShadowAnalysis } from '@/three/heatmap';
import { initGoogleTiles, getGoogleApiKey, type GoogleTilesHandle } from '@/three/google-tiles';
import { fetchOSMBuildings, type OSMBuilding } from '@/lib/osm-buildings';
import type { ApartmentResult } from '@/types';
import { TimeBar } from './TimeBar';

const APARTMENT_COLORS = [
  '#D32F2F', '#F5A623', '#2E7D32', '#4A90E2',
  '#9C27B0', '#00897B', '#E91E63', '#FF6F00',
  '#5E35B1', '#C0CA33', '#0288D1', '#8D6E63',
];

interface InfoOverlayState {
  datetime: string;
  azimuth: number;
  altitude: number;
  locationLabel: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  hours: number;
  description: string;
}

export function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Three.js Refs — bewusst kein State, würde sonst rerender triggern
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const neighborsGroupRef = useRef<THREE.Group | null>(null);
  const subzoneGroupRef = useRef<THREE.Group | null>(null);
  const heatmapGroupRef = useRef<THREE.Group | null>(null);
  const samplesRef = useRef<FacadeSample[] | null>(null);
  const resultsRef = useRef<Float32Array | null>(null);
  const frameRef = useRef<number | null>(null);
  const googleTilesRef = useRef<GoogleTilesHandle | null>(null);
  // Kamera-Animation (für Fly-to bei Wohnungs-Selektion)
  const cameraAnimRef = useRef<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [infoOverlay, setInfoOverlay] = useState<InfoOverlayState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, hours: 0, description: '',
  });

  // Store-Subscriptions
  const location = useProjectStore((s) => s.location);
  const dateTime = useProjectStore((s) => s.dateTime);
  const buildingMode = useProjectStore((s) => s.buildingMode);
  const box = useProjectStore((s) => s.box);
  const massings = useProjectStore((s) => s.massings);
  const modelFile = useProjectStore((s) => s.modelFile);
  const modelScale = useProjectStore((s) => s.modelScale);
  const modelRotation = useProjectStore((s) => s.modelRotation);
  const osmBuildings = useProjectStore((s) => s.osmBuildings);
  const neighborGLBFile = useProjectStore((s) => s.neighborGLBFile);
  const setHeatmap = useProjectStore((s) => s.setHeatmap);
  const setApartmentResults = useProjectStore((s) => s.setApartmentResults);
  const setModelFile = useProjectStore((s) => s.setModelFile);
  // Three.js Setup (einmalig)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xB8D4E8);
    scene.fog = new THREE.Fog(0xB8D4E8, 300, 800);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    // Default-Kameraposition: Süd-Ost. Wird projekt-spezifisch im
    // separaten Effect angepasst sobald location geladen ist.
    camera.position.set(60, 50, 60);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvasRef.current);
    controls.target.set(0, 8, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    ambientLightRef.current = ambient;
    scene.add(new THREE.HemisphereLight(0xB8D4E8, 0x4A3520, 0.4));

    const sun = new THREE.DirectionalLight(0xfff5e1, 2.0);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const R = 150;
    sun.shadow.camera.left = -R; sun.shadow.camera.right = R;
    sun.shadow.camera.top = R; sun.shadow.camera.bottom = -R;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 2000;
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    sunLightRef.current = sun;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshStandardMaterial({ color: 0xD8D8D2, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGroundPlane = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(400, 40, 0x999999, 0xCCCCCC);
    grid.position.y = 0.02;
    grid.userData.isGroundGrid = true;
    scene.add(grid);

    // N/S/O/W-Labels
    addCompassLabels(scene);

    const buildingGroup = new THREE.Group();
    const neighborsGroup = new THREE.Group();
    const subzoneGroup = new THREE.Group();
    const heatmapGroup = new THREE.Group();
    scene.add(buildingGroup, neighborsGroup, subzoneGroup, heatmapGroup);
    buildingGroupRef.current = buildingGroup;
    neighborsGroupRef.current = neighborsGroup;
    subzoneGroupRef.current = subzoneGroup;
    heatmapGroupRef.current = heatmapGroup;

    function resize() {
      const wrap = containerRef.current;
      if (!wrap) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      // Kamera-Animation, falls aktiv
      if (cameraAnimRef.current) {
        const a = cameraAnimRef.current;
        const t = Math.min(1, (performance.now() - a.startTime) / a.duration);
        // ease-in-out cubic
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.lerpVectors(a.fromPos, a.toPos, e);
        controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
        if (t >= 1) {
          cameraAnimRef.current = null;
        }
      }
      controls.update();
      // Google 3D Tiles update (falls aktiv)
      googleTilesRef.current?.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Project-spezifische Szene-Anpassungen (Bodensee, Kamera-Position, Google 3D Tiles)
  // reagiert auf location.label, da location async aus der DB geladen wird.
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    const isJakobspark = /Jakobspark|Rorschach/i.test(location.label);

    // Alte Lake-Objekte entfernen (Tag: 'lakeBackdrop')
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData?.lakeBackdrop) toRemove.push(obj);
    });
    toRemove.forEach((obj) => {
      scene.remove(obj);
      disposeObject3D(obj);
    });

    // Alte Google Tiles disposen
    if (googleTilesRef.current) {
      googleTilesRef.current.dispose();
      googleTilesRef.current = null;
    }

    if (isJakobspark) {
      addLakeBackdrop(scene);
      // Kamera in Jakobspark-Position bringen, falls noch in Default-Position
      // (Bei initialem Laden — Nutzer-Manipulationen NICHT überschreiben)
      const isDefault = Math.abs(camera.position.x - 60) < 0.5
        && Math.abs(camera.position.y - 50) < 0.5
        && Math.abs(camera.position.z - 60) < 0.5;
      if (isDefault) {
        camera.position.set(45, 60, 90);
        controlsRef.current?.update();
      }

      // OSM-Nachbargebäude laden (async)
      removeOSMBuildings(scene);
      fetchOSMBuildings(location.lat, location.lon, 250, true)
        .then((buildings) => {
          addOSMBuildings(scene, buildings);
          console.log(`[Scene] ${buildings.length} OSM-Nachbargebäude geladen`);
        })
        .catch((e) => {
          console.warn('[Scene] OSM-Buildings konnten nicht geladen werden:', e.message);
        });

      // Phase 2: Google Photorealistic 3D Tiles laden (falls API Key vorhanden)
      const apiKey = getGoogleApiKey();

      // Ground/Grid sichtbar oder unsichtbar je nach Tile-Verfügbarkeit
      const groundMesh = scene.children.find((o) => o.userData?.isGroundPlane) as
        THREE.Mesh | undefined;
      const groundGrid = scene.children.find((o) => o.userData?.isGroundGrid) as
        THREE.Object3D | undefined;
      if (apiKey) {
        // Tiles aktiv: Ground unsichtbar (verdeckt sonst die Google-Tiles)
        if (groundMesh) groundMesh.visible = false;
        if (groundGrid) groundGrid.visible = false;
      } else {
        // Kein API Key: Ground sichtbar lassen (Default)
        if (groundMesh) groundMesh.visible = true;
        if (groundGrid) groundGrid.visible = true;
      }

      if (apiKey) {
        // Tiles aktiv: Camera far weiter setzen (Top-Level Tiles haben sehr großen Radius)
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.far = 100000;
          camera.updateProjectionMatrix();
        }
        try {
          googleTilesRef.current = initGoogleTiles({
            apiKey,
            origin: { lat: location.lat, lon: location.lon },
            scene,
            camera,
            renderer,
          });
          console.log('[Scene] Google 3D Tiles geladen');
        } catch (e) {
          console.warn('[Scene] Google 3D Tiles konnten nicht geladen werden:', e);
        }
      } else {
        // Kein API Key: Camera far auf Default
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.far = 5000;
          camera.updateProjectionMatrix();
        }
      }
    } else {
      // Nicht-Jakobspark: Ground/Grid sichtbar lassen, camera far default
      removeOSMBuildings(scene);
      const groundMesh = scene.children.find((o) => o.userData?.isGroundPlane) as
        THREE.Mesh | undefined;
      const groundGrid = scene.children.find((o) => o.userData?.isGroundGrid) as
        THREE.Object3D | undefined;
      if (groundMesh) groundMesh.visible = true;
      if (groundGrid) groundGrid.visible = true;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.far = 5000;
        camera.updateProjectionMatrix();
      }
    }
  }, [location.label, location.lat, location.lon]);

  // Building (Box / Polygon / Upload) synchronisieren
  useEffect(() => {
    const group = buildingGroupRef.current;
    if (!group) return;
    // Aufräumen
    while (group.children.length > 0) {
      const c = group.children[0];
      group.remove(c);
      disposeObject3D(c);
    }
    if (buildingMode === 'box') {
      group.add(buildBoxMesh(box));
    } else if (buildingMode === 'polygon') {
      for (const m of massings) {
        const mesh = buildMassingMesh(m, location);
        if (mesh) group.add(mesh);
      }
    }
    // Admin-Drehen-Tool: Zusätzliche Rotation + Translation auf der ganzen Anlage
    const rotDeg = location.rotationDeg ?? 0;
    group.rotation.y = (rotDeg * Math.PI) / 180;
    group.position.set(location.offsetX ?? 0, 0, location.offsetZ ?? 0);
  }, [buildingMode, box, massings, location]);

  // Modell-Upload
  useEffect(() => {
    if (buildingMode !== 'upload') return;
    const group = buildingGroupRef.current;
    if (!group || !modelFile) return;
    let cancelled = false;
    loadModelFile(modelFile).then(({ object }) => {
      if (cancelled || !group) return;
      while (group.children.length > 0) {
        const c = group.children[0];
        group.remove(c);
        disposeObject3D(c);
      }
      object.scale.setScalar(modelScale);
      object.rotation.y = -modelRotation * Math.PI / 180;
      group.add(object);
    }).catch((e) => {
      console.error('Modell-Upload fehlgeschlagen:', e);
    });
    return () => { cancelled = true; };
  }, [buildingMode, modelFile, modelScale, modelRotation]);

  // OSM-Buildings
  useEffect(() => {
    const group = neighborsGroupRef.current;
    if (!group) return;
    // Aufräumen, alle Kinder die NICHT vom GLB-Loader sind
    const toRemove: THREE.Object3D[] = [];
    for (const c of group.children) {
      if (c.userData.source === 'osm') toRemove.push(c);
    }
    for (const c of toRemove) {
      group.remove(c);
      disposeObject3D(c);
    }
    // Neu hinzufügen
    for (const b of osmBuildings) {
      const mesh = buildOSMMesh(b, location);
      if (mesh) {
        mesh.userData.source = 'osm';
        group.add(mesh);
      }
    }
  }, [osmBuildings, location]);

  // GLB-Nachbarbebauung
  useEffect(() => {
    if (!neighborGLBFile) return;
    const group = neighborsGroupRef.current;
    if (!group) return;
    let cancelled = false;
    loadNeighborGLB(neighborGLBFile).then(({ object }) => {
      if (cancelled || !group) return;
      // Alte GLB-Objekte entfernen
      const toRemove: THREE.Object3D[] = [];
      for (const c of group.children) {
        if (c.userData.source === 'glb') toRemove.push(c);
      }
      for (const c of toRemove) {
        group.remove(c);
        disposeObject3D(c);
      }
      object.userData.source = 'glb';
      group.add(object);
    }).catch((e) => {
      console.error('Nachbarn-GLB fehlgeschlagen:', e);
    });
    return () => { cancelled = true; };
  }, [neighborGLBFile]);

  const selectedApartmentId = useProjectStore((s) => s.selectedApartmentId);
  const hoveredApartmentId = useProjectStore((s) => s.hoveredApartmentId);
  const uiMode = useProjectStore((s) => s.uiMode);

  // Fly-to bei Wohnungs-Selektion (Sales-Modus)
  useEffect(() => {
    if (!selectedApartmentId) return;
    if (uiMode !== 'sales') return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    // Wohnung in Massings suchen
    let target: { x: number; y: number; z: number } | null = null;
    for (const m of massings) {
      const sz = m.subzones.find((s) => s.id === selectedApartmentId);
      if (sz) {
        target = {
          x: (sz.bbox.xMin + sz.bbox.xMax) / 2,
          y: m.zOffset + m.height / 2 + 0.05,
          z: (sz.bbox.zMin + sz.bbox.zMax) / 2,
        };
        break;
      }
    }
    if (!target) return;

    const currentDir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();
    if (currentDir.y > 0.8) {
      currentDir.set(0.7, 0.55, 0.7).normalize();
    }
    const targetDistance = 45;
    const toTarget = new THREE.Vector3(target.x, target.y, target.z);
    const toPos = toTarget.clone().add(currentDir.multiplyScalar(targetDistance));

    cameraAnimRef.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget,
      startTime: performance.now(),
      duration: 850,
    };
  }, [selectedApartmentId, uiMode, massings]);

  useEffect(() => {
    const group = subzoneGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      const c = group.children[0];
      group.remove(c);
      disposeObject3D(c);
    }
    if (buildingMode !== 'polygon') return;

    const isSalesMode = uiMode === 'sales';
    let aptIdx = 0;
    for (const m of massings) {
      for (let i = 0; i < m.subzones.length; i++) {
        const sz = m.subzones[i];
        const isSelected = sz.id === selectedApartmentId;
        const isHovered = sz.id === hoveredApartmentId;
        const isOtherSelected = selectedApartmentId !== null && !isSelected;

        // Farbe: Sales-Modus nutzt thumbnailColor wenn vorhanden, sonst Default
        let color: string;
        if (isSalesMode && sz.sales?.thumbnailColor) {
          color = sz.sales.thumbnailColor;
        } else {
          color = APARTMENT_COLORS[aptIdx % APARTMENT_COLORS.length];
        }
        aptIdx++;

        // Status-Filter im Sales-Modus
        let opacity = 0.18;
        let visible = true;
        if (isSalesMode && sz.sales?.status === 'sold') {
          opacity = 0.08; // verkauft = sehr blass
        }
        if (isSelected) opacity = 0.55;
        else if (isHovered) opacity = 0.40;
        else if (isOtherSelected) opacity = 0.05; // andere blass wenn eine selectiert

        const w = sz.bbox.xMax - sz.bbox.xMin;
        const d = sz.bbox.zMax - sz.bbox.zMin;
        const h = m.height * 0.95;

        // Wohnungs-Quader
        const boxGeom = new THREE.BoxGeometry(w * 0.92, h, d * 0.92);
        const boxMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false,
        });
        const boxMesh = new THREE.Mesh(boxGeom, boxMat);
        boxMesh.position.set(
          (sz.bbox.xMin + sz.bbox.xMax) / 2,
          m.zOffset + h / 2 + 0.05,
          (sz.bbox.zMin + sz.bbox.zMax) / 2,
        );
        boxMesh.visible = visible;
        boxMesh.userData.apartmentId = sz.id;
        group.add(boxMesh);

        // Kanten für selektiert/hovered: deutlichere Sichtbarkeit
        if (isSelected || isHovered) {
          const edges = new THREE.EdgesGeometry(boxGeom);
          const lineMat = new THREE.LineBasicMaterial({
            color: isSelected ? 0xD32F2F : 0xFFFFFF,
            linewidth: 2,
          });
          const lines = new THREE.LineSegments(edges, lineMat);
          lines.position.copy(boxMesh.position);
          group.add(lines);
        }
      }
    }
  }, [buildingMode, massings, selectedApartmentId, hoveredApartmentId, uiMode]);

  // Sonnenposition aktualisieren
  useEffect(() => {
    const sun = sunLightRef.current;
    const ambient = ambientLightRef.current;
    const scene = sceneRef.current;
    if (!sun || !ambient || !scene) return;
    const offsetH = swissOffsetHours(new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 12)));
    const utc = new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 0, dateTime.localMinutes - offsetH * 60));
    const pos = sunPosition(utc, location.lat, location.lon);
    const azRad = pos.azimuth * Math.PI / 180;
    const altRad = pos.altitude * Math.PI / 180;
    const D = 500;
    sun.position.set(
       D * Math.cos(altRad) * Math.sin(azRad),
       D * Math.sin(altRad),
      -D * Math.cos(altRad) * Math.cos(azRad),
    );
    sun.target.position.set(0, 0, 0);
    const altClamp = Math.max(0, Math.sin(altRad));
    sun.intensity = altClamp * 2.5;
    sun.color.setRGB(1, 0.65 + 0.35 * altClamp, 0.35 + 0.6 * altClamp);
    if (pos.altitude < -1) {
      (scene.background as THREE.Color).setHex(0x0a1530);
      scene.fog!.color.setHex(0x0a1530);
      ambient.intensity = 0.08;
    } else {
      const a = altClamp;
      const r = 0.45 + 0.27 * a + (1 - a) * 0.4;
      const g = 0.62 + 0.21 * a + (1 - a) * 0.25;
      const b = 0.78 + 0.13 * a;
      (scene.background as THREE.Color).setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b));
      scene.fog!.color.copy(scene.background as THREE.Color);
      ambient.intensity = 0.18 + 0.22 * a;
    }
    const localTime = new Date(utc.getTime() + offsetH * 3600 * 1000);
    setInfoOverlay({
      datetime:
        localTime.toLocaleString('de-CH', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
        }) + ` ${offsetH === 2 ? 'MESZ' : 'MEZ'}`,
      azimuth: pos.azimuth,
      altitude: pos.altitude,
      locationLabel: location.label,
    });
  }, [dateTime, location]);

  // Hover-Raycaster für Tooltip
  useEffect(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const heatmapGroup = heatmapGroupRef.current;
    if (!canvas || !camera || !heatmapGroup) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onMove(e: PointerEvent) {
      if (!samplesRef.current || !resultsRef.current || heatmapGroup!.children.length === 0) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }
      const rect = canvas!.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera!);
      const inst = heatmapGroup!.children[0] as THREE.InstancedMesh;
      const hits = raycaster.intersectObject(inst, false);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const idx = hits[0].instanceId;
        const s = samplesRef.current[idx];
        const hours = resultsRef.current[idx];
        const azimuthDeg = (Math.atan2(s.normal.x, -s.normal.z) * 180) / Math.PI;
        const az = ((azimuthDeg % 360) + 360) % 360;
        const dirNames = ['Nord', 'NO', 'Ost', 'SO', 'Süd', 'SW', 'West', 'NW'];
        const dirName = dirNames[Math.round(az / 45) % 8];
        const sm = useProjectStore.getState().massings;
        const massingName = s.massingId === 'box' ? 'Quader' : sm.find((m) => m.id === s.massingId)?.name ?? '—';
        const faceType = s.isHole ? 'Innenhof' : 'Außenfassade';
        setTooltip({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          hours,
          description: `${massingName} · ${faceType} · ${dirName} · Höhe ${s.position.y.toFixed(1)} m`,
        });
      } else {
        setTooltip((t) => ({ ...t, visible: false }));
      }
    }
    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, []);

  // Click-Handler: Klick auf Wohnungs-Quader selectiert diese im Store
  useEffect(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const subzoneGroup = subzoneGroupRef.current;
    if (!canvas || !camera || !subzoneGroup) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos: { x: number; y: number } | null = null;

    function onDown(e: PointerEvent) {
      downPos = { x: e.clientX, y: e.clientY };
    }
    function onUp(e: PointerEvent) {
      if (!downPos) return;
      // Nur als Klick werten wenn nicht gedragged wurde
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      downPos = null;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const rect = canvas!.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera!);
      const meshes: THREE.Object3D[] = [];
      subzoneGroup!.traverse((n) => {
        if ((n as THREE.Mesh).isMesh && n.userData.apartmentId) meshes.push(n);
      });
      const hits = raycaster.intersectObjects(meshes, false);
      const store = useProjectStore.getState();
      if (hits.length > 0) {
        const id = hits[0].object.userData.apartmentId as string;
        store.setSelectedApartment(store.selectedApartmentId === id ? null : id);
      } else {
        // Klick ins Leere = Deselect
        if (store.selectedApartmentId !== null) {
          store.setSelectedApartment(null);
        }
      }
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Heatmap-Computation registrieren
  useEffect(() => {
    type WindowWithCompute = Window & {
      __forolComputeHeatmap?: () => Promise<void>;
    };
    const win = window as WindowWithCompute;
    win.__forolComputeHeatmap = async () => {
      const heatmapGroup = heatmapGroupRef.current;
      const buildingGroup = buildingGroupRef.current;
      const neighborsGroup = neighborsGroupRef.current;
      if (!heatmapGroup || !buildingGroup || !neighborsGroup) return;

      const state = useProjectStore.getState();

      // Samples generieren
      let samples: FacadeSample[] = [];
      if (state.buildingMode === 'box') {
        samples = generateBoxSamples(state.box, state.analysisConfig.sampleSpacing);
      } else if (state.buildingMode === 'polygon') {
        for (const m of state.massings) {
          samples = samples.concat(
            generateMassingSamples(m, state.analysisConfig.sampleSpacing, state.location),
          );
        }
      } else {
        throw new Error('Verschattungs-Analyse aktuell nur für Quader und Polygon verfügbar');
      }
      if (samples.length === 0) throw new Error('Keine Fassaden-Punkte vorhanden');

      const { dates, scaleFactor } = buildAnalysisTimestamps(
        state.analysisConfig.precision,
        state.dateTime.year,
      );

      const targets = [buildingGroup, neighborsGroup];
      const store = useProjectStore;
      const results = await computeShadowAnalysis({
        samples, dates, scaleFactor,
        lat: state.location.lat, lon: state.location.lon,
        targets,
        onProgress: (p) => {
          store.getState().setComputeProgress(p);
        },
        shouldCancel: () => store.getState().cancelRequested,
      });

      // Heatmap-Visualisierung
      while (heatmapGroup.children.length > 0) {
        const c = heatmapGroup.children[0];
        heatmapGroup.remove(c);
        disposeObject3D(c);
      }
      const maxHours = Math.max(...results, 1);
      const quadGeom = new THREE.PlaneGeometry(0.6, 0.6);
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const inst = new THREE.InstancedMesh(quadGeom, mat, samples.length);
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(samples.length * 3), 3);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        dummy.position.set(s.position.x, s.position.y, s.position.z);
        dummy.lookAt(s.position.x + s.normal.x, s.position.y, s.position.z + s.normal.z);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        const [r, g, b] = sunHoursToRGB(results[i], maxHours);
        inst.setColorAt(i, new THREE.Color(r, g, b));
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      heatmapGroup.add(inst);
      samplesRef.current = samples;
      resultsRef.current = results;

      // Wohnungs-Aggregation
      const apts: Record<string, ApartmentResult & { _values: number[] }> = {};
      for (let i = 0; i < samples.length; i++) {
        const apt = findApartmentForSample(samples[i], state.massings);
        if (!apt) continue;
        if (!apts[apt.subzoneId]) {
          apts[apt.subzoneId] = {
            id: apt.subzoneId,
            name: apt.subzoneName,
            massingName: apt.massingName,
            color: APARTMENT_COLORS[Object.keys(apts).length % APARTMENT_COLORS.length],
            minSunHours: 0, avgSunHours: 0, maxSunHours: 0, sampleCount: 0,
            _values: [],
          };
        }
        apts[apt.subzoneId]._values.push(results[i]);
      }
      const aptResults: ApartmentResult[] = [];
      for (const key of Object.keys(apts)) {
        const a = apts[key];
        if (a._values.length === 0) continue;
        const sum = a._values.reduce((acc, v) => acc + v, 0);
        aptResults.push({
          id: a.id,
          name: a.name,
          massingName: a.massingName,
          color: a.color,
          minSunHours: Math.min(...a._values),
          maxSunHours: Math.max(...a._values),
          avgSunHours: sum / a._values.length,
          sampleCount: a._values.length,
        });
      }

      setHeatmap(samples, results);
      setApartmentResults(aptResults);
    };
    return () => {
      delete win.__forolComputeHeatmap;
    };
  }, [setHeatmap, setApartmentResults]);

  // Drag-and-Drop für 3D-Modelle
  const onDragHandlers = useMemo(() => ({
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['glb', 'gltf', 'obj'].includes(ext)) return;
      setModelFile(file);
    },
  }), [setModelFile]);

  return (
    <div ref={containerRef} className={`scene-wrap ${dragActive ? 'drop-active' : ''}`} {...onDragHandlers}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {infoOverlay && (
        <div className="overlay-info">
          <div className="label">Aktuelle Zeit</div>
          <div className="value">{infoOverlay.datetime}</div>
          <div className="info-row">
            <span className="col-label">Azimut</span>
            <span className="col-value">{infoOverlay.azimuth.toFixed(1)}°</span>
          </div>
          <div className="info-row">
            <span className="col-label">Sonnenhöhe</span>
            <span className="col-value">{infoOverlay.altitude.toFixed(1)}°</span>
          </div>
          <div className="info-row">
            <span className="col-label">Standort</span>
            <span className="col-value">
              {infoOverlay.locationLabel.length > 28
                ? infoOverlay.locationLabel.slice(0, 28) + '…'
                : infoOverlay.locationLabel}
            </span>
          </div>
        </div>
      )}
      {tooltip.visible && (
        <div
          ref={tooltipRef}
          className="scene-tooltip"
          style={{ left: tooltip.x, top: tooltip.y, display: 'block' }}
        >
          <div className="tooltip-main">{Math.round(tooltip.hours)} h/Jahr</div>
          <div className="tooltip-sub">{tooltip.description}</div>
        </div>
      )}
      {uiMode === 'editor' && <TimeBar />}
    </div>
  );
}

function addCompassLabels(scene: THREE.Scene) {
  function mkText(text: string, x: number, z: number, color: string) {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const c = cvs.getContext('2d')!;
    c.fillStyle = color;
    c.font = 'bold 80px Inter';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 64, 64);
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.03, z);
    scene.add(plane);
  }
  mkText('N', 0, -180, '#D32F2F');
  mkText('S', 0, 180, '#666666');
  mkText('O', 180, 0, '#666666');
  mkText('W', -180, 0, '#666666');
}

/**
 * Bodensee-Backdrop für Jakobspark: blaue Wasser-Fläche nördlich der Anlage
 * plus große "BODENSEE"-Beschriftung — damit Kunden sofort die Orientierung haben.
 * Der Bodensee liegt ca. 30-50m nördlich der Jakobstrasse 90.
 *
 * Position in Three-Koord-System: -Z = Norden (vom Origin gesehen).
 * Anlage selbst zentriert um (0, 0, 0), Süd-Trakt bei +Z=12, Nord-Trakte bei -Z=-10.
 * Bodensee-Ufer beginnt ca. 15m nördlich der Anlage (-Z=-25).
 */
function addLakeBackdrop(scene: THREE.Scene) {
  // Helfer: Mesh als Lake-Backdrop markieren für späteres Cleanup
  const tag = (obj: THREE.Object3D) => { obj.userData.lakeBackdrop = true; };

  // Sand-/Ufer-Streifen direkt nördlich der Anlage (zwischen Anlage und Wasser)
  // Beginnt ca. 15m nördlich der Anlage und ist 15m breit
  const shoreGeom = new THREE.PlaneGeometry(400, 15);
  const shoreMat = new THREE.MeshStandardMaterial({
    color: 0xE8DCC4,
    roughness: 1.0,
  });
  const shore = new THREE.Mesh(shoreGeom, shoreMat);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(0, 0.04, -32);
  tag(shore);
  scene.add(shore);

  // Wasser-Plane: blau, leicht über Ground-Niveau, beginnt nördlich vom Ufer-Streifen
  const waterGeom = new THREE.PlaneGeometry(800, 600);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3E7CB1,
    roughness: 0.4,
    metalness: 0.3,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.045, -340);
  water.receiveShadow = true;
  tag(water);
  scene.add(water);

  // "BODENSEE"-Beschriftung — groß, auf der Wasseroberfläche, gut sichtbar
  function mkLakeLabel(text: string, x: number, z: number, sizeM: number, fillColor = '#FFFFFF') {
    const cvs = document.createElement('canvas');
    cvs.width = 1024; cvs.height = 200;
    const c = cvs.getContext('2d')!;
    c.clearRect(0, 0, cvs.width, cvs.height);
    c.fillStyle = fillColor;
    c.strokeStyle = 'rgba(20, 50, 80, 0.7)';
    c.lineWidth = 6;
    c.font = 'bold 140px Inter, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText(text, 512, 100);
    c.fillText(text, 512, 100);
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = cvs.width / cvs.height;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(sizeM * aspect, sizeM),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.08, z);
    tag(plane);
    scene.add(plane);
  }
  // BODENSEE-Label sichtbar nahe der Anlage (ca. 90m nördlich)
  mkLakeLabel('BODENSEE', 0, -100, 18);

  // Wave-Linien für visuelle Wasser-Andeutung
  for (let i = 0; i < 3; i++) {
    const waveCvs = document.createElement('canvas');
    waveCvs.width = 512; waveCvs.height = 32;
    const wc = waveCvs.getContext('2d')!;
    wc.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    wc.lineWidth = 2;
    wc.beginPath();
    for (let x = 0; x <= 512; x += 4) {
      const y = 16 + Math.sin(x / 30) * 6;
      if (x === 0) wc.moveTo(x, y); else wc.lineTo(x, y);
    }
    wc.stroke();
    const waveTex = new THREE.CanvasTexture(waveCvs);
    waveTex.colorSpace = THREE.SRGBColorSpace;
    const wave = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 4),
      new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, depthWrite: false }),
    );
    wave.rotation.x = -Math.PI / 2;
    wave.position.set(-50 + i * 50, 0.06, -150 - i * 40);
    tag(wave);
    scene.add(wave);
  }

  // ============== PARK-GRÜNFLÄCHE ==============
  // Park-Streifen entlang der Ufer-Promenade (zwischen Anlage und Sand)
  // Gibt der Demo Grün-Anteil und passt zum Namen "Jakobspark"
  const parkGeom = new THREE.PlaneGeometry(300, 14);
  const parkMat = new THREE.MeshStandardMaterial({
    color: 0x7BA05B, // gedämpftes Park-Grün
    roughness: 1.0,
  });
  const park = new THREE.Mesh(parkGeom, parkMat);
  park.rotation.x = -Math.PI / 2;
  park.position.set(0, 0.035, -16);
  park.receiveShadow = true;
  tag(park);
  scene.add(park);

  // ============== BÄUME ==============
  // Bäume entlang der Park-Promenade und am Süd-Rand (Strassenbäume)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5C4030, roughness: 0.95 });
  const crownMatLight = new THREE.MeshStandardMaterial({ color: 0x5A8C3F, roughness: 0.9 });
  const crownMatDark = new THREE.MeshStandardMaterial({ color: 0x3D6B2A, roughness: 0.9 });

  function addTree(x: number, z: number, scale = 1) {
    const grp = new THREE.Group();
    // Stamm
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 3 * scale, 6),
      trunkMat,
    );
    trunk.position.y = 1.5 * scale;
    trunk.castShadow = true;
    grp.add(trunk);
    // Krone (2 überlappende Spheres für mehr Volumen)
    const crownGeom = new THREE.SphereGeometry(1.8 * scale, 8, 6);
    const crown1 = new THREE.Mesh(crownGeom, crownMatLight);
    crown1.position.y = 3.8 * scale;
    crown1.castShadow = true;
    grp.add(crown1);
    const crown2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.4 * scale, 8, 6),
      crownMatDark,
    );
    crown2.position.set(0.5 * scale, 4.5 * scale, -0.3 * scale);
    crown2.castShadow = true;
    grp.add(crown2);

    grp.position.set(x, 0, z);
    tag(grp);
    grp.children.forEach((c) => { c.userData.lakeBackdrop = true; });
    scene.add(grp);
  }

  // Strassenbäume entlang der Jakobstrasse (südlich der Anlage)
  for (let i = -6; i <= 6; i++) {
    if (i === 0) continue;
    const scale = 0.9 + ((i * 7) % 5) * 0.06;
    addTree(i * 8, +24, scale);
  }

  // Park-Bäume (zwischen Anlage und See)
  const parkTreePositions = [
    [-50, -18, 1.1], [-30, -20, 1.0], [-12, -19, 1.2],
    [12, -19, 1.05], [30, -18, 1.15], [50, -20, 1.0],
    [-65, -15, 0.95], [65, -16, 1.0],
  ];
  parkTreePositions.forEach(([x, z, s]) => addTree(x, z, s));

  // ============== KORNHAUS-MARKER ==============
  // Das historische Kornhaus liegt ca. 80m nordöstlich vom Jakobspark
  // Als Wahrzeichen visualisieren mit großem dunklem Block
  const kornhausGeom = new THREE.BoxGeometry(20, 16, 14);
  const kornhausMat = new THREE.MeshStandardMaterial({
    color: 0xB89878, // helles Sandstein-Beige
    roughness: 0.85,
  });
  const kornhaus = new THREE.Mesh(kornhausGeom, kornhausMat);
  kornhaus.position.set(75, 8, -8);
  kornhaus.castShadow = true;
  kornhaus.receiveShadow = true;
  tag(kornhaus);
  scene.add(kornhaus);

  // Spitzdach aufs Kornhaus
  const kornhausRoofGeom = new THREE.ConeGeometry(11, 6, 4, 1);
  const kornhausRoofMat = new THREE.MeshStandardMaterial({
    color: 0x5C3B26, // dunkles Ziegelrot
    roughness: 0.9,
  });
  const kornhausRoof = new THREE.Mesh(kornhausRoofGeom, kornhausRoofMat);
  kornhausRoof.position.set(75, 19, -8);
  kornhausRoof.rotation.y = Math.PI / 4;
  kornhausRoof.castShadow = true;
  tag(kornhausRoof);
  scene.add(kornhausRoof);

  // Beschriftung "Kornhaus" über dem Dach
  function mkSmallLabel(text: string, x: number, y: number, z: number, sizeM: number) {
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 128;
    const c = cvs.getContext('2d')!;
    c.clearRect(0, 0, cvs.width, cvs.height);
    c.fillStyle = '#1A1A1A';
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 3;
    c.font = 'bold 60px Inter, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText(text, 256, 64);
    c.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;
    const aspect = cvs.width / cvs.height;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(sizeM * aspect, sizeM),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    plane.position.set(x, y, z);
    // Billboard-Effekt: Plane immer zur Kamera (vereinfacht: nur Y-Rotation, beim Update)
    plane.userData.billboard = true;
    tag(plane);
    scene.add(plane);
  }
  mkSmallLabel('Kornhaus', 75, 25, -8, 3.5);
  mkSmallLabel('Jakobstrasse →', 0, 6, 22, 4);
}

/**
 * Rendert OSM-Nachbargebäude als graue Extrude-Geometrien in die Szene.
 * Jedes Building bekommt userData.osmBuilding=true für späteres dispose.
 */
function addOSMBuildings(scene: THREE.Scene, buildings: OSMBuilding[]) {
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xC8C2B8,
    roughness: 0.85,
    metalness: 0.05,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x888080, opacity: 0.7, transparent: true });

  for (const b of buildings) {
    if (b.outline.length < 3) continue;
    try {
      const shape = new THREE.Shape();
      shape.moveTo(b.outline[0].x, b.outline[0].z);
      for (let i = 1; i < b.outline.length; i++) {
        shape.lineTo(b.outline[i].x, b.outline[i].z);
      }
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: b.height,
        bevelEnabled: false,
      });
      // Extrude legt entlang +Z aus — wir rotieren so dass die Höhe entlang +Y ist
      geom.rotateX(-Math.PI / 2);

      const mesh = new THREE.Mesh(geom, buildingMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.osmBuilding = true;
      mesh.userData.osmId = b.id;
      scene.add(mesh);

      // Edge-Lines on top für mehr Kontur-Definition
      const edges = new THREE.EdgesGeometry(geom);
      const lines = new THREE.LineSegments(edges, edgeMat);
      lines.userData.osmBuilding = true;
      scene.add(lines);
    } catch (e) {
      console.warn(`[OSM] Building ${b.id} konnte nicht gerendert werden:`, e);
    }
  }
}

/** Entfernt alle OSM-Buildings aus der Szene und disposed Geometrien. */
function removeOSMBuildings(scene: THREE.Scene) {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj.userData?.osmBuilding) toRemove.push(obj);
  });
  for (const o of toRemove) {
    scene.remove(o);
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
    } else if (o instanceof THREE.LineSegments) {
      o.geometry.dispose();
    }
  }
}
