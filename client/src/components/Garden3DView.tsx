import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useGardenStore } from '../store/useGardenStore';
import { SEED_CATALOG } from '../catalog/seeds';
import type { Bed, PlantSlot, CatalogSeed, HeightCategory } from '../types';

// Vite resolves the import to a hashed public URL at build time
import tomatoGlbUrl from '../assets/plants/tomato_plant.glb?url';

// ─── Constants ────────────────────────────────────────────────

const RAISED_HEIGHT = 0.5;
const RAISED_WALL   = 0.5;

const FAMILY_COLORS: Record<string, number> = {
  'Nightshade':  0xe53935,
  'Cucurbit':    0xfb8c00,
  'Brassica':    0x43a047,
  'Legume':      0x00897b,
  'Root':        0xef6c00,
  'Allium':      0x8e24aa,
  'Leafy Green': 0x7cb342,
  'Herb':        0x6d4c41,
  'Grain':       0xf9a825,
  'Flower':      0xe91e63,
};

function seedColor(seed: CatalogSeed): number {
  return FAMILY_COLORS[seed.family] ?? 0x607d8b;
}

// ─── Plant metadata type ──────────────────────────────────────

interface PlantInfo {
  type: 'plant';
  plantId: string;
  plantName: string;
  bedName: string;
  icon: string;
  family: string;
  heightCategory: string;
}

// ─── Pre-allocated Color objects for day/night (no per-frame alloc) ──

const _c = {
  nightSky:  new THREE.Color(0x080a1a),
  dawnSky:   new THREE.Color(0xff7043),
  daySky:    new THREE.Color(0x87ceeb),
  nightAmb:  new THREE.Color(0x1a2050),
  dayAmb:    new THREE.Color(0xffffff),
  sunHigh:   new THREE.Color(0xfffde7),
  sunLow:    new THREE.Color(0xff8c42),
  _tmp:      new THREE.Color(),
};

// ─── Day/Night update (called from animation loop) ────────────

function updateDayNight(
  hour: number,
  sunLight: THREE.DirectionalLight,
  ambient: THREE.AmbientLight,
  lantern: THREE.PointLight,
  skyColor: THREE.Color,
  fogColor: THREE.Color,
  sunSphere: THREE.Mesh,
  moonSphere: THREE.Mesh,
  plotW: number,
  plotL: number
) {
  const sunEl  = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)); // 0 at 6am/6pm, 1 at noon
  const sunAz  = (hour - 12) * (Math.PI / 12);                        // 0 = south at noon
  const isDay  = hour > 6 && hour < 18;
  const nightF = Math.max(0, 1 - sunEl * 2.5);                        // 1 = full night
  const dist   = Math.max(plotW, plotL) * 2.5;

  // Dawn/dusk blend (0–1: 0 = no transition, 1 = fully transitioning)
  const dawnF  = hour >= 5 && hour < 7   ? (hour - 5) / 2
               : hour >= 18 && hour < 20  ? (20 - hour) / 2 : 0;

  // Sky colour
  if (nightF > 0.95) {
    skyColor.copy(_c.nightSky);
  } else if (dawnF > 0) {
    _c._tmp.lerpColors(_c.nightSky, _c.dawnSky, dawnF);
    skyColor.lerpColors(_c._tmp, _c.daySky, dawnF * 0.7);
  } else {
    skyColor.lerpColors(_c.daySky, _c.nightSky, nightF);
  }
  fogColor.copy(skyColor);

  // Sun light position: east at 6am, south at noon, west at 6pm
  const sx = plotW / 2 - Math.sin(sunAz) * dist;
  const sy = sunEl * dist * 0.65 + 2;
  const sz = plotL / 2 + Math.cos(sunAz) * dist * 0.35;
  sunLight.position.set(sx, sy, sz);
  sunLight.color.lerpColors(_c.sunHigh, _c.sunLow, Math.pow(1 - sunEl, 2));
  sunLight.intensity = isDay ? sunEl * 1.8 + 0.05 : 0.01;

  // Ambient: blue-dim at night, warm during day
  ambient.color.lerpColors(_c.dayAmb, _c.nightAmb, nightF);
  ambient.intensity = 0.08 + (1 - nightF) * 0.46;

  // Night lantern (garden lamp glow)
  lantern.intensity = nightF * 2.0;

  // Sky objects
  sunSphere.position.set(sx, sy, sz);
  sunSphere.visible = sunEl > 0.05;

  moonSphere.visible = nightF > 0.4;
  if (moonSphere.visible) {
    moonSphere.position.set(
      plotW / 2 + Math.sin(sunAz) * dist * 0.75,
      Math.max(4, (1 - sunEl) * dist * 0.4),
      plotL / 2 - Math.cos(sunAz) * dist * 0.3
    );
  }
}

// ─── Ground ───────────────────────────────────────────────────

function buildGround(scene: THREE.Scene, plotW: number, plotL: number) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(plotW + 30, plotL + 30),
    new THREE.MeshLambertMaterial({ color: 0x5d8a3c })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(plotW / 2, -0.01, plotL / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);

  const size = Math.max(plotW, plotL) + 12;
  const grid = new THREE.GridHelper(size, size, 0x3a6e28, 0x4a7e38);
  grid.position.set(plotW / 2, 0, plotL / 2);
  scene.add(grid);
}

// ─── Beds ─────────────────────────────────────────────────────

function buildBed(scene: THREE.Scene, bed: Bed, rx: number, rz: number) {
  const bw = bed.widthFt, bl = bed.lengthFt;
  const cx = rx + bw / 2, cz = rz + bl / 2;

  if (bed.type === 'raised') {
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(bw - 0.1, 0.05, bl - 0.1),
      new THREE.MeshLambertMaterial({ color: 0x3d2b1f })
    );
    soil.position.set(cx, RAISED_HEIGHT, cz);
    soil.receiveShadow = true;
    scene.add(soil);

    const wMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    ([
      [bw, RAISED_WALL, 0.15, cx,            RAISED_WALL / 2, rz + 0.075],
      [bw, RAISED_WALL, 0.15, cx,            RAISED_WALL / 2, rz + bl - 0.075],
      [0.15, RAISED_WALL, bl,  rx + 0.075,   RAISED_WALL / 2, cz],
      [0.15, RAISED_WALL, bl,  rx + bw - 0.075, RAISED_WALL / 2, cz],
    ] as [number, number, number, number, number, number][]).forEach(([w, h, d, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    });
  } else if (bed.type === 'inground') {
    const soil = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bl),
      new THREE.MeshLambertMaterial({ color: 0x2c1a0e })
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(cx, 0.01, cz);
    soil.receiveShadow = true;
    scene.add(soil);

    const bMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    ([
      [bw + 0.3, 0.1, 0.15, cx,      0.05, rz     ],
      [bw + 0.3, 0.1, 0.15, cx,      0.05, rz + bl],
      [0.15, 0.1, bl + 0.3, rx,      0.05, cz     ],
      [0.15, 0.1, bl + 0.3, rx + bw, 0.05, cz     ],
    ] as [number, number, number, number, number, number][]).forEach(([w, h, d, x, y, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      scene.add(m);
    });
  } else {
    // Container: terracotta pot
    const r = Math.min(bw, bl) / 2;
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(r - 0.1, r, RAISED_HEIGHT, 16),
      new THREE.MeshLambertMaterial({ color: 0xbf360c })
    );
    pot.position.set(cx, RAISED_HEIGHT / 2, cz);
    pot.castShadow = true;
    scene.add(pot);

    const soil2 = new THREE.Mesh(
      new THREE.CylinderGeometry(r - 0.15, r - 0.15, 0.05, 16),
      new THREE.MeshLambertMaterial({ color: 0x3d2b1f })
    );
    soil2.position.set(cx, RAISED_HEIGHT + 0.025, cz);
    scene.add(soil2);
  }
}

// ─── Plants ───────────────────────────────────────────────────

function buildPlant(
  scene: THREE.Scene,
  seed: CatalogSeed,
  slot: PlantSlot,
  bedX: number,
  bedZ: number,
  bedType: string,
  bedName: string,
  plantMeshes: THREE.Mesh[]
) {
  const baseY = bedType === 'raised' ? RAISED_HEIGHT + 0.05 : 0.02;
  const px = bedX + slot.cellX + slot.widthCells / 2;
  const pz = bedZ + slot.cellY + slot.lengthCells / 2;
  const col = seedColor(seed);

  const info: PlantInfo = {
    type: 'plant',
    plantId: seed.id,
    plantName: seed.name,
    bedName,
    icon: seed.icon,
    family: seed.family,
    heightCategory: seed.heightCategory as string,
  };

  // Tag mesh, cast shadow, add to scene + plantMeshes array
  function tag(mesh: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh {
    mesh.position.set(x, y, z);
    mesh.userData = info;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    plantMeshes.push(mesh);
    return mesh;
  }

  const mLeaf = new THREE.MeshLambertMaterial({ color: col });
  const mStem = new THREE.MeshLambertMaterial({ color: 0x558b2f });
  const mBark = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const mWire = new THREE.MeshLambertMaterial({ color: 0xc5cae9 });

  const ball = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mLeaf);
  const cyl  = (rt: number, rb: number, h: number, mat: THREE.Material = mStem) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 7), mat);

  switch (seed.heightCategory as HeightCategory) {

    case 'low': {
      if (seed.family === 'Root') {
        // Taproot cone + leaf top
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), new THREE.MeshLambertMaterial({ color: col }));
        root.rotation.x = Math.PI;
        tag(root, px, baseY + 0.06, pz);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          tag(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mStem), px + Math.cos(a) * 0.09, baseY + 0.24, pz + Math.sin(a) * 0.09);
        }
      } else if (seed.family === 'Allium') {
        // Upright strap leaves fanning outward
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const leaf = cyl(0.015, 0.02, 0.38, mLeaf);
          leaf.rotation.z = Math.sin(a) * 0.45;
          leaf.rotation.x = Math.cos(a) * 0.45;
          tag(leaf, px + Math.cos(a) * 0.07, baseY + 0.19, pz + Math.sin(a) * 0.07);
        }
      } else {
        // Bushy rosette: center dome + surrounding spheres
        const offsets: [number, number, number][] = [
          [0, 0, 0], [0.13, 0, 0], [-0.13, 0, 0],
          [0, 0, 0.13], [0, 0, -0.13], [0.09, 0, 0.09], [-0.09, 0, -0.09],
        ];
        offsets.forEach(([ox, , oz], i) => {
          const r = i === 0 ? 0.19 : 0.12;
          tag(ball(r), px + ox, baseY + r * 0.85, pz + oz);
        });
      }
      break;
    }

    case 'medium': {
      const sh = 0.78;
      tag(cyl(0.04, 0.06, sh), px, baseY + sh / 2, pz);

      // Main canopy
      tag(ball(0.28), px, baseY + sh + 0.18, pz);
      // Side clusters
      ([[ 0.23, 0.40, 0], [-0.23, 0.36, 0], [0, 0.34, 0.23], [0, 0.34, -0.23]] as [number,number,number][]).forEach(([ox, oy, oz]) => {
        tag(ball(0.17), px + ox, baseY + oy, pz + oz);
      });

      // Nightshade: show fruit
      if (seed.family === 'Nightshade') {
        const fMat = new THREE.MeshLambertMaterial({ color: col });
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          tag(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), fMat), px + Math.cos(a) * 0.24, baseY + 0.32, pz + Math.sin(a) * 0.24);
        }
      }
      // Flower: yellow disc centre
      if (seed.family === 'Flower') {
        tag(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 12), new THREE.MeshLambertMaterial({ color: col })), px, baseY + sh + 0.3, pz);
        tag(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshLambertMaterial({ color: 0xfdd835 })), px, baseY + sh + 0.34, pz);
      }
      // Brassica: layered cabbage look
      if (seed.family === 'Brassica') {
        for (let i = 0; i < 3; i++) {
          const r = 0.22 - i * 0.04;
          const flat = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 5), mLeaf);
          flat.scale.y = 0.35;
          tag(flat, px, baseY + 0.08 + i * 0.12, pz);
        }
      }
      break;
    }

    case 'tall': {
      const isGrain = seed.family === 'Grain';
      const sh = isGrain ? 2.1 : 1.8;
      tag(cyl(isGrain ? 0.06 : 0.05, isGrain ? 0.09 : 0.07, sh), px, baseY + sh / 2, pz);

      if (isGrain) {
        // Corn: angled leaf pairs every 35cm up stalk
        for (let i = 0; i < 5; i++) {
          const ht = baseY + 0.25 + i * 0.38;
          const side = i % 2 === 0 ? 1 : -1;
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.7, 5), mLeaf);
          leaf.rotation.z = side * (Math.PI / 2.8);
          tag(leaf, px + side * 0.3, ht + 0.22, pz);
        }
        // Tassel
        tag(cyl(0.025, 0.04, 0.45, new THREE.MeshLambertMaterial({ color: 0xf9a825 })), px, baseY + sh + 0.22, pz);
      } else {
        // Generic tall: main sphere + 3 lower flanking clusters
        tag(ball(0.38), px, baseY + sh + 0.28, pz);
        ([[ 0.28, -0.18, 0], [-0.28, -0.16, 0], [0, -0.16, 0.28]] as [number,number,number][]).forEach(([ox, oy, oz]) => {
          tag(ball(0.24), px + ox, baseY + sh + 0.28 + oy, pz + oz);
        });
        // Mid-stalk leaves
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), mLeaf);
          leaf.scale.set(1.2, 0.3, 1.2);
          tag(leaf, px + Math.cos(a) * 0.22, baseY + 0.7 + i * 0.35, pz + Math.sin(a) * 0.22);
        }
      }
      break;
    }

    case 'vine': {
      const tH = 2.3;
      // Trellis posts
      for (const ox of [-0.28, 0.28]) {
        tag(cyl(0.03, 0.04, tH, mBark), px + ox, baseY + tH / 2, pz);
      }
      // Horizontal wires
      for (let i = 1; i <= 5; i++) {
        const wire = cyl(0.01, 0.01, 0.6, mWire);
        wire.rotation.z = Math.PI / 2;
        tag(wire, px, baseY + (tH * i) / 6, pz);
      }
      // Leaf clusters climbing the trellis
      ([[-0.2, 0.4], [0.2, 0.85], [-0.15, 1.3], [0.15, 1.75], [0, 2.15]] as [number,number][]).forEach(([ox, hy]) => {
        tag(ball(0.15), px + ox, baseY + hy, pz);
      });
      // Fruit for cucurbits — elongated blobs
      if (seed.family === 'Cucurbit') {
        const fMat = new THREE.MeshLambertMaterial({ color: col });
        ([[ 0.12, 0.7,  0.08], [-0.12, 1.15, 0.06], [0.08, 1.55, -0.1]] as [number,number,number][]).forEach(([ox, hy, oz]) => {
          const fr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), fMat);
          fr.scale.set(0.55, 1.6, 0.55); // elongate to cucumber shape
          tag(fr, px + ox, baseY + hy, pz + oz);
        });
      }
      // Legumes: show pods
      if (seed.family === 'Legume') {
        const pMat = new THREE.MeshLambertMaterial({ color: col });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const pod = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), pMat);
          pod.scale.set(0.5, 2.0, 0.5);
          tag(pod, px + Math.cos(a) * 0.18, baseY + 0.6 + i * 0.35, pz + Math.sin(a) * 0.18);
        }
      }
      break;
    }
  }
}

// ─── Virtual Joystick (mobile walk controls) ──────────────────

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
}

function VirtualJoystick({ onMove }: VirtualJoystickProps) {
  const baseRef  = useRef<HTMLDivElement>(null);
  const knobRef  = useRef<HTMLDivElement>(null);
  const touchId  = useRef<number | null>(null);
  const active   = useRef(false);

  const RADIUS = 44; // px — half the base size

  function getOffset(touch: React.Touch | Touch): { x: number; y: number } {
    const base = baseRef.current;
    if (!base) return { x: 0, y: 0 };
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    return {
      x: (Math.cos(angle) * clamp) / RADIUS,
      y: (Math.sin(angle) * clamp) / RADIUS,
    };
  }

  function positionKnob(nx: number, ny: number) {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
  }

  function onTouchStart(e: React.TouchEvent) {
    if (active.current) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    active.current  = true;
    const { x, y } = getOffset(touch);
    positionKnob(x, y);
    onMove(x, -y); // invert Y: up = forward
    e.stopPropagation();
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!active.current) return;
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchId.current);
    if (!touch) return;
    const { x, y } = getOffset(touch);
    positionKnob(x, y);
    onMove(x, -y);
    e.stopPropagation();
    e.preventDefault();
  }

  function onTouchEnd(e: React.TouchEvent) {
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchId.current);
    if (!touch) return;
    active.current  = false;
    touchId.current = null;
    positionKnob(0, 0);
    onMove(0, 0);
    e.stopPropagation();
  }

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div ref={knobRef} className="joystick-knob" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface Garden3DViewProps {
  onExit?: () => void;
}

// ─── GLTF model registry ──────────────────────────────────────
//
// Maps seed ID → { url, scale, yOffset }. Add more entries here
// as you drop GLB files into src/assets/plants/.
//
const PLANT_MODELS: Record<string, { url: string; scale: number; yOffset: number }> = {
  tomato: { url: tomatoGlbUrl, scale: 0.012, yOffset: 0 },
};

// Module-level cache so models survive HMR re-renders
const gltfCache = new Map<string, THREE.Group>();
const gltfLoader = new GLTFLoader();

function loadPlantModel(
  seedId: string,
  onLoad: (group: THREE.Group) => void
): void {
  const spec = PLANT_MODELS[seedId];
  if (!spec) return;

  if (gltfCache.has(seedId)) {
    onLoad(gltfCache.get(seedId)!.clone());
    return;
  }

  gltfLoader.load(
    spec.url,
    (gltf) => {
      // Normalise: centre at bottom, apply scale
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Scale so the tallest axis ≈ 1 unit (1 ft) then multiply by spec.scale factor
      const maxAxis = Math.max(size.x, size.y, size.z);
      const norm = maxAxis > 0 ? (1 / maxAxis) : 1;
      gltf.scene.scale.setScalar(norm * spec.scale * 100); // GLBs often in cm

      // Re-centre so feet touch y=0
      const box2 = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.y -= box2.min.y;

      // Enable shadows on every mesh inside
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
        }
      });

      gltfCache.set(seedId, gltf.scene);
      onLoad(gltf.scene.clone());
    },
    undefined,
    (err) => console.warn(`GLTFLoader failed for ${seedId}:`, err)
  );
}

interface SceneRefs {
  sunLight: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  lantern: THREE.PointLight;
  scene: THREE.Scene;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  sunSphere: THREE.Mesh;
  moonSphere: THREE.Mesh;
  plantMeshes: THREE.Mesh[];
  raycaster: THREE.Raycaster;
  plotW: number;
  plotL: number;
}

export function Garden3DView({ onExit }: Garden3DViewProps) {
  const mountRef     = useRef<HTMLDivElement>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef  = useRef<OrbitControls | null>(null);
  const sceneRefsRef = useRef<SceneRefs | null>(null);
  const walkEulerRef = useRef(new THREE.Euler(0, Math.PI, 0, 'YXZ'));

  const { garden, settings } = useGardenStore();

  const [mode, setMode]             = useState<'orbit' | 'walk'>('orbit');
  const modeRef                     = useRef<'orbit' | 'walk'>('orbit');
  const [timeOfDay, setTimeOfDay]   = useState(10);
  const timeRef                     = useRef(10);
  const [focusedPlant, setFocusedPlant] = useState<PlantInfo | null>(null);
  const focusedKeyRef               = useRef<string | null>(null);

  const joystickMoveRef = useRef({ x: 0, y: 0 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMobile, _setIsMobile] = useState(() =>
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { timeRef.current = timeOfDay; }, [timeOfDay]);

  // Teleport + orient on walk entry
  useEffect(() => {
    if (mode !== 'walk') return;
    const cam  = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const plotW = settings.plotWidthFt  ?? 40;
    const plotL = settings.plotLengthFt ?? 60;
    walkEulerRef.current.set(0, Math.PI, 0, 'YXZ');
    cam.position.set(plotW / 2, 5.5, plotL - 4);
    cam.quaternion.setFromEuler(walkEulerRef.current);
    ctrl.enabled = false;
    setFocusedPlant(null);
    focusedKeyRef.current = null;
  }, [mode, settings.plotWidthFt, settings.plotLengthFt]);

  // ── Main scene effect ────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const plotW = settings.plotWidthFt  ?? 40;
    const plotL = settings.plotLengthFt ?? 60;
    const beds  = garden?.beds ?? [];

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const skyColor  = new THREE.Color(0x87ceeb);
    const fogColor  = new THREE.Color(0x87ceeb);
    scene.background = skyColor;
    scene.fog = new THREE.Fog(fogColor, plotW * 1.8, plotW * 5);

    // ── Lights ────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfffde7, 1.4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left   = -(plotW + 15);
    sunLight.shadow.camera.right  =  plotW + 15;
    sunLight.shadow.camera.top    =  plotL + 15;
    sunLight.shadow.camera.bottom = -(plotL + 15);
    sunLight.shadow.camera.near   = 1;
    sunLight.shadow.camera.far    = plotW * 8;
    scene.add(sunLight);

    // Garden lantern — glows at night
    const lantern = new THREE.PointLight(0xffd54f, 0, 18);
    lantern.position.set(plotW / 2, 3.5, plotL / 2);
    lantern.castShadow = true;
    scene.add(lantern);

    // Lantern post (visible geometry)
    const postMat = new THREE.MeshLambertMaterial({ color: 0x424242 });
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 8), postMat);
    lanternPost.position.set(plotW / 2, 2, plotL / 2);
    lanternPost.castShadow = true;
    scene.add(lanternPost);
    const lanternHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0x78909c, emissive: 0xffd54f, emissiveIntensity: 0 }));
    lanternHead.position.set(plotW / 2, 4.05, plotL / 2);
    scene.add(lanternHead);

    // Sky fill
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x4a6e2a, 0.3);
    scene.add(hemi);

    // ── Sun + Moon spheres in sky ─────────────────────────────
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee55 })
    );
    scene.add(sunSphere);

    const moonSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xe8eaf6 })
    );
    moonSphere.visible = false;
    scene.add(moonSphere);

    // ── Ground + Beds + Plants ────────────────────────────────
    buildGround(scene, plotW, plotL);

    const plantMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < beds.length; i++) {
      const bed = beds[i];
      const rx  = bed.plotX ?? (i % 2 === 0 ? 1 : plotW / 2 + 1);
      const rz  = bed.plotY ?? (1 + Math.floor(i / 2) * (bed.lengthFt + 3));
      buildBed(scene, bed, rx, rz);
      for (const slot of bed.slots) {
        const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
        if (!seed) continue;

        const baseY = bed.type === 'raised' ? RAISED_HEIGHT + 0.05 : 0.02;
        const px = rx + slot.cellX + slot.widthCells / 2;
        const pz = rz + slot.cellY + slot.lengthCells / 2;
        const spec = PLANT_MODELS[seed.id];
        const plantInfo: PlantInfo = {
          type: 'plant',
          plantId: seed.id,
          plantName: seed.name,
          bedName: bed.name,
          icon: seed.icon,
          family: seed.family,
          heightCategory: seed.heightCategory as string,
        };

        if (spec) {
          // Load real GLTF model (async — appears when ready)
          loadPlantModel(seed.id, (group) => {
            group.position.set(px, baseY + spec.yOffset, pz);
            // Tag all child meshes so raycaster can identify the plant
            group.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.userData = plantInfo;
                plantMeshes.push(child);
              }
            });
            scene.add(group);
          });
        } else {
          // Procedural fallback for all other plants
          buildPlant(scene, seed, slot, rx, rz, bed.type, bed.name, plantMeshes);
        }
      }
    }

    // ── Camera ────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(plotW / 2, plotL * 0.4, plotL * 0.85);
    camera.lookAt(plotW / 2, 0, plotL / 2);
    cameraRef.current = camera;

    // ── Orbit Controls ────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(plotW / 2, 0, plotL / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance   = 2;
    controls.maxDistance   = plotW * 3;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();
    controlsRef.current = controls;

    // ── Store scene refs ──────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    sceneRefsRef.current = {
      sunLight, ambient, lantern, scene, skyColor, fogColor,
      sunSphere, moonSphere, plantMeshes, raycaster, plotW, plotL,
    };

    // Initial lighting for current time
    updateDayNight(timeRef.current, sunLight, ambient, lantern, skyColor, fogColor, sunSphere, moonSphere, plotW, plotL);

    // ── Walk: keyboard ────────────────────────────────────────
    const keys = new Set<string>();
    function onKeyDown(e: KeyboardEvent) {
      keys.add(e.key.toLowerCase());
      if (modeRef.current === 'walk' &&
          ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.key.toLowerCase()); }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // ── Unified mouse tracking ────────────────────────────────
    // NDC coords of the cursor — used for both hover raycasting and walk look
    const mouseNDC = new THREE.Vector2(0, 0);

    const walkEuler = walkEulerRef.current;
    let isMouseLooking = false, lastMX = 0, lastMY = 0;

    function onMouseDown(e: MouseEvent) {
      if (modeRef.current !== 'walk') return;
      isMouseLooking = true;
      lastMX = e.clientX; lastMY = e.clientY;
    }
    function onMouseMove(e: MouseEvent) {
      // Always update NDC so hover raycasting works in both modes
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.set(
         ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top)  / rect.height) * 2 + 1
      );

      // Walk look: only when dragging
      if (isMouseLooking) {
        const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
        lastMX = e.clientX; lastMY = e.clientY;
        walkEuler.y -= dx * 0.004;
        walkEuler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, walkEuler.x - dy * 0.004));
        camera.quaternion.setFromEuler(walkEuler);
      }
    }
    function onMouseUp() { isMouseLooking = false; }

    // ── Touch look ────────────────────────────────────────────
    let isTouchLooking = false, lastTX = 0, lastTY = 0;
    function onTouchStart(e: TouchEvent) {
      if (modeRef.current !== 'walk' || e.touches.length !== 1) return;
      isTouchLooking = true;
      lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (!isTouchLooking || e.touches.length !== 1) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTX, dy = e.touches[0].clientY - lastTY;
      lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY;
      walkEuler.y -= dx * 0.005;
      walkEuler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, walkEuler.x - dy * 0.005));
      camera.quaternion.setFromEuler(walkEuler);
    }
    function onTouchEnd() { isTouchLooking = false; }

    renderer.domElement.addEventListener('mousedown',  onMouseDown);
    renderer.domElement.addEventListener('mousemove',  onMouseMove);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove',  onTouchMove,  { passive: false });
    renderer.domElement.addEventListener('touchend',   onTouchEnd);
    window.addEventListener('mouseup', onMouseUp);

    // ── Resize ────────────────────────────────────────────────
    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Animation loop ────────────────────────────────────────
    const walkDir   = new THREE.Vector3();
    const walkRight = new THREE.Vector3();
    const walkSpeed = 0.12;
    let lastHour    = -99;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);

      // Update day/night when time slider changes
      const hr = timeRef.current;
      if (Math.abs(hr - lastHour) > 0.005) {
        lastHour = hr;
        updateDayNight(hr, sunLight, ambient, lantern, skyColor, fogColor, sunSphere, moonSphere, plotW, plotL);
        // Update lantern emissive glow
        const nightF = Math.max(0, 1 - Math.max(0, Math.sin(((hr - 6) / 12) * Math.PI)) * 2.5);
        (lanternHead.material as THREE.MeshLambertMaterial).emissiveIntensity = nightF;
      }

      if (modeRef.current === 'walk') {
        controls.enabled = false;

        camera.getWorldDirection(walkDir);
        walkDir.y = 0;
        walkDir.normalize();
        walkRight.crossVectors(walkDir, camera.up).normalize();

        if (keys.has('w') || keys.has('arrowup'))    camera.position.addScaledVector(walkDir,    walkSpeed);
        if (keys.has('s') || keys.has('arrowdown'))  camera.position.addScaledVector(walkDir,   -walkSpeed);
        if (keys.has('a') || keys.has('arrowleft'))  camera.position.addScaledVector(walkRight, -walkSpeed);
        if (keys.has('d') || keys.has('arrowright')) camera.position.addScaledVector(walkRight,  walkSpeed);

        const jx = joystickMoveRef.current.x;
        const jy = joystickMoveRef.current.y;
        if (Math.abs(jy) > 0.05) camera.position.addScaledVector(walkDir, walkSpeed * jy);
        if (Math.abs(jx) > 0.05) camera.position.addScaledVector(walkRight, walkSpeed * jx);

        camera.position.y = 5.5;
        camera.position.x = Math.max(-8, Math.min(plotW + 8, camera.position.x));
        camera.position.z = Math.max(-8, Math.min(plotL + 8, camera.position.z));

        // Hover: what plant is under the cursor?
        raycaster.setFromCamera(mouseNDC, camera);
        const hits    = raycaster.intersectObjects(plantMeshes, false);
        const nearHit = hits.find((h) => h.distance < 10);
        const newKey  = nearHit
          ? (nearHit.object.userData as PlantInfo).plantId + (nearHit.object.userData as PlantInfo).bedName
          : null;
        if (newKey !== focusedKeyRef.current) {
          focusedKeyRef.current = newKey;
          setFocusedPlant(nearHit ? (nearHit.object.userData as PlantInfo) : null);
        }
      } else {
        controls.enabled = true;
        controls.update();

        // Orbit: hover to identify plants under cursor
        raycaster.setFromCamera(mouseNDC, camera);
        const hits    = raycaster.intersectObjects(plantMeshes, false);
        const nearHit = hits[0];
        const newKey  = (nearHit?.object.userData.type === 'plant')
          ? (nearHit.object.userData as PlantInfo).plantId + (nearHit.object.userData as PlantInfo).bedName
          : null;
        if (newKey !== focusedKeyRef.current) {
          focusedKeyRef.current = newKey;
          setFocusedPlant(newKey ? (nearHit!.object.userData as PlantInfo) : null);
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown',  onMouseDown);
      renderer.domElement.removeEventListener('mousemove',  onMouseMove);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove',  onTouchMove);
      renderer.domElement.removeEventListener('touchend',   onTouchEnd);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      sceneRefsRef.current = null;
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, settings.plotWidthFt, settings.plotLengthFt]);

  // ── UI helpers ───────────────────────────────────────────────
  const hourLabel = (() => {
    const h = Math.floor(timeOfDay);
    const m = Math.round((timeOfDay - h) * 60);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
  })();

  const timeIcon = timeOfDay >= 6 && timeOfDay < 8  ? '🌅'
                 : timeOfDay >= 8 && timeOfDay < 17  ? '☀️'
                 : timeOfDay >= 17 && timeOfDay < 20  ? '🌇'
                 : '🌙';

  return (
    <div className={`view3d-wrapper${mode === 'walk' ? ' view3d-walk' : ''}`}>
      <div ref={mountRef} className="view3d-canvas" />

      {/* Plant info card */}
      {focusedPlant && (
        <div className={`view3d-plant-card${mode === 'walk' ? ' view3d-plant-card--walk' : ''}`}>
          <span className="view3d-plant-icon">{focusedPlant.icon}</span>
          <div className="view3d-plant-info">
            <div className="view3d-plant-name">{focusedPlant.plantName}</div>
            <div className="view3d-plant-meta">{focusedPlant.family} · {focusedPlant.heightCategory}</div>
            <div className="view3d-plant-bed">📍 {focusedPlant.bedName}</div>
          </div>
          {mode === 'orbit' && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.1rem 0.4rem', lineHeight: 1 }}
              onClick={() => setFocusedPlant(null)}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* HUD */}
      <div className="view3d-hud">
        <div className="view3d-controls">
          <button
            className={`btn btn-sm${mode === 'orbit' ? ' btn-primary' : ' btn-ghost view3d-hud-btn'}`}
            onClick={() => setMode('orbit')}
          >
            🔭 Orbit
          </button>
          <button
            className={`btn btn-sm${mode === 'walk' ? ' btn-primary' : ' btn-ghost view3d-hud-btn'}`}
            onClick={() => setMode('walk')}
          >
            🚶 Walk
          </button>
          {onExit && (
            <button className="btn btn-sm btn-ghost view3d-hud-btn" onClick={onExit}>
              ✕ Exit
            </button>
          )}
        </div>

        {/* Time of day */}
        <div className="view3d-time-ctrl">
          <span className="view3d-time-icon">{timeIcon}</span>
          <input
            className="view3d-time-slider"
            type="range"
            min="0" max="24" step="0.25"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
          />
          <span className="view3d-time-label">{hourLabel}</span>
        </div>

        {mode === 'walk' && (
          <div className="view3d-hint">
            WASD / arrows · drag to look · hover plants to identify
          </div>
        )}
        {mode === 'orbit' && (
          <div className="view3d-hint">
            Drag to orbit · scroll/pinch to zoom · hover plants
          </div>
        )}
      </div>

      {/* Mobile joystick — walk mode only */}
      {isMobile && mode === 'walk' && (
        <VirtualJoystick onMove={(x, y) => { joystickMoveRef.current = { x, y }; }} />
      )}
    </div>
  );
}
