import { useRef, useState, useMemo, useEffect } from 'react';
import { useGardenStore } from '../store/useGardenStore';
import { SEED_CATALOG } from '../catalog/seeds';
import { SUN_ICONS } from '../utils/sunWarnings';
import type { Bed, BedType, PlotFeature } from '../types';
import { PlantIcon } from './PlantIcon';

// ─── Types ────────────────────────────────────────────────────

type TopEdge = 'north' | 'east' | 'south' | 'west';

interface DisplayRect {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

// ─── Bed colour palette ───────────────────────────────────────

const BED_COLORS: Record<BedType, { bg: string; border: string; text: string; header: string }> = {
  raised:         { bg: '#c8e6c9', border: '#388e3c', text: '#1b5e20', header: '#a5d6a7' },
  inground:       { bg: '#d7ccc8', border: '#6d4c41', text: '#3e2723', header: '#bcaaa4' },
  container:      { bg: '#ffe0b2', border: '#e65100', text: '#bf360c', header: '#ffcc80' },
  bucket:         { bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1', header: '#bbdefb' },
  'planter-box':  { bg: '#fce4ec', border: '#880e4f', text: '#4a0027', header: '#f8bbd0' },
};

const BED_TYPE_ICONS: Record<BedType, string> = {
  raised:        '🪵',
  inground:      '🌍',
  container:     '🪴',
  bucket:        '🪣',
  'planter-box': '📦',
};

const TOP_EDGE_OPTIONS: { value: TopEdge; label: string; arrow: string }[] = [
  { value: 'north', label: 'North at top',  arrow: '↑N' },
  { value: 'east',  label: 'East at top',   arrow: '→E' },
  { value: 'south', label: 'South at top',  arrow: '↓S' },
  { value: 'west',  label: 'West at top',   arrow: '←W' },
];

// ─── Coordinate transform helpers ────────────────────────────

function transformPos(
  x: number, y: number,
  plotW: number, plotL: number,
  topEdge: TopEdge
): { leftPct: number; topPct: number } {
  switch (topEdge) {
    case 'north': return { leftPct: (x / plotW) * 100, topPct:  (y / plotL) * 100 };
    case 'south': return { leftPct: ((plotW - x) / plotW) * 100, topPct: ((plotL - y) / plotL) * 100 };
    case 'east':  return { leftPct: (y / plotL) * 100, topPct:  ((plotW - x) / plotW) * 100 };
    case 'west':  return { leftPct: ((plotL - y) / plotL) * 100, topPct: (x / plotW) * 100 };
  }
}

function transformBed(
  bed: Bed,
  pos: { x: number; y: number },
  plotW: number,
  plotL: number,
  topEdge: TopEdge
): DisplayRect {
  const bw = bed.widthFt;
  const bl = bed.lengthFt;
  const x  = pos.x;
  const y  = pos.y;

  switch (topEdge) {
    case 'north':
      return { leftPct: (x / plotW) * 100, topPct: (y / plotL) * 100,
               widthPct: (bw / plotW) * 100, heightPct: (bl / plotL) * 100 };
    case 'south':
      return { leftPct: ((plotW - x - bw) / plotW) * 100, topPct: ((plotL - y - bl) / plotL) * 100,
               widthPct: (bw / plotW) * 100, heightPct: (bl / plotL) * 100 };
    case 'east':
      return { leftPct: (y / plotL) * 100, topPct: ((plotW - x - bw) / plotW) * 100,
               widthPct: (bl / plotL) * 100, heightPct: (bw / plotW) * 100 };
    case 'west':
      return { leftPct: ((plotL - y - bl) / plotL) * 100, topPct: (x / plotW) * 100,
               widthPct: (bl / plotL) * 100, heightPct: (bw / plotW) * 100 };
  }
}

function canvasAspect(plotW: number, plotL: number, topEdge: TopEdge): string {
  if (topEdge === 'east' || topEdge === 'west') return `${plotL} / ${plotW}`;
  return `${plotW} / ${plotL}`;
}

function compassLabels(topEdge: TopEdge) {
  const map: Record<TopEdge, { top: string; bottom: string; left: string; right: string }> = {
    north: { top: 'N', bottom: 'S', left: 'W', right: 'E' },
    east:  { top: 'E', bottom: 'W', left: 'N', right: 'S' },
    south: { top: 'S', bottom: 'N', left: 'E', right: 'W' },
    west:  { top: 'W', bottom: 'E', left: 'S', right: 'N' },
  };
  return map[topEdge];
}

/** Center point (in %) of a DisplayRect */
function rectCenter(r: DisplayRect) {
  return { x: r.leftPct + r.widthPct / 2, y: r.topPct + r.heightPct / 2 };
}

/** Returns which side label the sun comes from, based on which edge is "top" */
function sunHintLabel(topEdge: TopEdge): string {
  // In the Northern Hemisphere the sun is in the southern sky.
  // We label the hint by where south is in the current canvas orientation.
  const map: Record<TopEdge, string> = {
    north: 'south ↓',
    south: 'south ↑',
    east:  'south →',
    west:  'south ←',
  };
  return map[topEdge];
}

/** Positions the sun hint near the south edge of the canvas */
function sunHintStyle(topEdge: TopEdge): React.CSSProperties {
  switch (topEdge) {
    case 'north': return { bottom: 5, left: '50%', transform: 'translateX(-50%)' };
    case 'south': return { top: 5,    left: '50%', transform: 'translateX(-50%)' };
    case 'east':  return { right: 5,  top:  '50%', transform: 'translateY(-50%)' };
    case 'west':  return { left: 5,   top:  '50%', transform: 'translateY(-50%)' };
  }
}

// ─── Component ────────────────────────────────────────────────

interface GardenPlotProps {
  onSelectBed: (bedId: string) => void;
  onEditFeature?: (feature: PlotFeature) => void;
}

export function GardenPlot({ onSelectBed, onEditFeature }: GardenPlotProps) {
  const { garden, settings, updateBed, saveSettings, updatePlotFeature } = useGardenStore();

  const canvasRef     = useRef<HTMLDivElement>(null);
  const scrollerRef   = useRef<HTMLDivElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  function adjustZoom(delta: number) {
    setZoom((z) => Math.max(0.5, Math.min(3.0, Math.round((z + delta) * 4) / 4)));
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setZoom((z) => Math.max(0.5, Math.min(3.0, z - e.deltaY * 0.001)));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const [sizeW, setSizeW] = useState(String(settings.plotWidthFt  ?? 20));
  const [sizeH, setSizeH] = useState(String(settings.plotLengthFt ?? 23));

  const plotW    = settings.plotWidthFt  ?? 20;
  const plotL    = settings.plotLengthFt ?? 23;
  const topEdge  = settings.plotTopEdge  ?? 'north';

  const beds         = garden?.beds         ?? [];
  const plotFeatures = garden?.plotFeatures ?? [];

  // ── Auto-position beds that have never been dragged ──────────
  function resolvePos(bed: Bed, index: number): { x: number; y: number } {
    if (bed.plotX != null && bed.plotY != null) return { x: bed.plotX, y: bed.plotY };
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: col === 0 ? 1 : Math.min(plotW / 2 + 1, plotW - bed.widthFt - 1),
      y: 1 + row * (bed.lengthFt + 3),
    };
  }

  // ── Bed drag state ────────────────────────────────────────────
  const [localPos, setLocalPos] = useState<Map<string, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{
    type: 'bed';
    bedId: string;
    startClient: { x: number; y: number };
    startReal: { x: number; y: number };
    moved: boolean;
  } | {
    type: 'feature';
    featureId: string;
    startClient: { x: number; y: number };
    startReal: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const [localFeaturePos, setLocalFeaturePos] = useState<Map<string, { x: number; y: number }>>(new Map());

  function pxToFt(dpx: number, dpy: number): { dx: number; dy: number } {
    if (!canvasRef.current) return { dx: 0, dy: 0 };
    const r = canvasRef.current.getBoundingClientRect();
    const canW = topEdge === 'east' || topEdge === 'west' ? plotL : plotW;
    const canH = topEdge === 'east' || topEdge === 'west' ? plotW : plotL;
    const pxPerFtX = r.width  / canW;
    const pxPerFtY = r.height / canH;
    switch (topEdge) {
      case 'north': return { dx:  dpx / pxPerFtX, dy:  dpy / pxPerFtY };
      case 'south': return { dx: -dpx / pxPerFtX, dy: -dpy / pxPerFtY };
      case 'east':  return { dx: -dpy / pxPerFtY, dy:  dpx / pxPerFtX };
      case 'west':  return { dx:  dpy / pxPerFtY, dy: -dpx / pxPerFtX };
    }
  }

  // ── Bed pointer events ─────────────────────────────────────

  function onBedPointerDown(e: React.PointerEvent, bed: Bed, index: number) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = localPos.get(bed.id) ?? resolvePos(bed, index);
    dragRef.current = {
      type: 'bed', bedId: bed.id,
      startClient: { x: e.clientX, y: e.clientY },
      startReal:   { ...pos },
      moved: false,
    };
  }

  function onBedPointerMove(e: React.PointerEvent, bed: Bed) {
    if (!dragRef.current || dragRef.current.type !== 'bed' || dragRef.current.bedId !== bed.id) return;
    const { dx, dy } = pxToFt(e.clientX - dragRef.current.startClient.x, e.clientY - dragRef.current.startClient.y);
    if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) dragRef.current.moved = true;
    const newX = Math.max(0, Math.min(plotW - bed.widthFt,  dragRef.current.startReal.x + dx));
    const newY = Math.max(0, Math.min(plotL - bed.lengthFt, dragRef.current.startReal.y + dy));
    setLocalPos((prev) => new Map(prev).set(bed.id, { x: newX, y: newY }));
  }

  async function onBedPointerUp(_e: React.PointerEvent, bed: Bed, index: number) {
    if (!dragRef.current || dragRef.current.type !== 'bed' || dragRef.current.bedId !== bed.id) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;

    if (!moved) { onSelectBed(bed.id); return; }

    const pos = localPos.get(bed.id) ?? resolvePos(bed, index);
    const snapped = { x: Math.round(pos.x * 2) / 2, y: Math.round(pos.y * 2) / 2 };
    setLocalPos((prev) => new Map(prev).set(bed.id, snapped));
    await updateBed({ ...bed, plotX: snapped.x, plotY: snapped.y });
  }

  // ── Feature (in-ground plant) pointer events ───────────────

  function resolveFeaturePos(f: PlotFeature): { x: number; y: number } {
    return localFeaturePos.get(f.id) ?? { x: f.plotX, y: f.plotY };
  }

  function onFeaturePointerDown(e: React.PointerEvent, feature: PlotFeature) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = resolveFeaturePos(feature);
    dragRef.current = {
      type: 'feature', featureId: feature.id,
      startClient: { x: e.clientX, y: e.clientY },
      startReal:   { ...pos },
      moved: false,
    };
  }

  function onFeaturePointerMove(e: React.PointerEvent, feature: PlotFeature) {
    if (!dragRef.current || dragRef.current.type !== 'feature' || dragRef.current.featureId !== feature.id) return;
    const { dx, dy } = pxToFt(e.clientX - dragRef.current.startClient.x, e.clientY - dragRef.current.startClient.y);
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) dragRef.current.moved = true;
    const newX = Math.max(0, Math.min(plotW, dragRef.current.startReal.x + dx));
    const newY = Math.max(0, Math.min(plotL, dragRef.current.startReal.y + dy));
    setLocalFeaturePos((prev) => new Map(prev).set(feature.id, { x: newX, y: newY }));
  }

  async function onFeaturePointerUp(_e: React.PointerEvent, feature: PlotFeature) {
    if (!dragRef.current || dragRef.current.type !== 'feature' || dragRef.current.featureId !== feature.id) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;

    if (!moved) { onEditFeature?.(feature); return; }

    const pos = localFeaturePos.get(feature.id) ?? resolveFeaturePos(feature);
    const snapped = { x: Math.round(pos.x * 2) / 2, y: Math.round(pos.y * 2) / 2 };
    setLocalFeaturePos((prev) => new Map(prev).set(feature.id, snapped));
    await updatePlotFeature({ ...feature, plotX: snapped.x, plotY: snapped.y });
  }

  // ── Settings ───────────────────────────────────────────────

  async function handleSaveSettings() {
    const w = Math.max(10, Math.min(200, parseFloat(sizeW) || 10));
    const h = Math.max(10, Math.min(200, parseFloat(sizeH) || 10));
    await saveSettings({ ...settings, plotWidthFt: w, plotLengthFt: h });
    setShowSettings(false);
  }

  async function setTopEdge(te: TopEdge) {
    await saveSettings({ ...settings, plotTopEdge: te });
  }

  const compass = compassLabels(topEdge);
  const aspect  = canvasAspect(plotW, plotL, topEdge);
  const gridW = topEdge === 'east' || topEdge === 'west' ? plotL : plotW;
  const gridH = topEdge === 'east' || topEdge === 'west' ? plotW : plotL;

  // Plant count summary
  const totalPlants = useMemo(
    () => beds.reduce((sum, b) => sum + new Set(b.slots.map((s) => s.plantId)).size, 0),
    [beds]
  );

  // ── Trellis arch SVG paths ─────────────────────────────────
  // For each bed with trellisType=arch, find its partner and draw a curved line.
  const trellisArcs = useMemo(() => {
    const arcs: Array<{ key: string; d: string }> = [];
    const seen = new Set<string>();

    for (const bed of beds) {
      if (bed.trellisType !== 'arch' || !bed.trellisPartnerId) continue;
      const pairKey = [bed.id, bed.trellisPartnerId].sort().join('--');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const partner = beds.find((b) => b.id === bed.trellisPartnerId);
      if (!partner) continue;

      const posA = localPos.get(bed.id) ?? resolvePos(bed, beds.indexOf(bed));
      const posB = localPos.get(partner.id) ?? resolvePos(partner, beds.indexOf(partner));
      const rectA = transformBed(bed, posA, plotW, plotL, topEdge);
      const rectB = transformBed(partner, posB, plotW, plotL, topEdge);
      const cA = rectCenter(rectA);
      const cB = rectCenter(rectB);

      // Cubic bezier — control points bow outward
      const mx = (cA.x + cB.x) / 2;
      const my = (cA.y + cB.y) / 2 - 12; // bow upward by 12% of canvas height
      const d = `M ${cA.x} ${cA.y} Q ${mx} ${my} ${cB.x} ${cB.y}`;
      arcs.push({ key: pairKey, d });
    }
    return arcs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beds, localPos, plotW, plotL, topEdge]);

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="plot-toolbar">
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1 }}>
          {TOP_EDGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`btn btn-sm${topEdge === o.value ? ' btn-primary' : ' btn-ghost'}`}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              onClick={() => void setTopEdge(o.value)}
              title={o.label}
            >
              {o.arrow}
            </button>
          ))}
          <span className="text-sm text-muted" style={{ alignSelf: 'center', fontSize: '0.72rem' }}>
            {plotW}×{plotL} ft
          </span>
        </div>
        <div className="plot-zoom-controls">
          <button className="btn btn-ghost btn-sm plot-zoom-btn" onClick={() => adjustZoom(-0.25)} disabled={zoom <= 0.5} title="Zoom out">−</button>
          <span className="plot-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-ghost btn-sm plot-zoom-btn" onClick={() => adjustZoom(0.25)} disabled={zoom >= 3.0} title="Zoom in">+</button>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setSizeW(String(plotW)); setSizeH(String(plotL)); setShowSettings((v) => !v); }}
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="card plot-size-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plot width (ft) — E/W</label>
              <input className="form-input" type="number" min={10} max={200}
                value={sizeW} onChange={(e) => setSizeW(e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-group">
              <label className="form-label">Plot length (ft) — N/S</label>
              <input className="form-input" type="number" min={10} max={200}
                value={sizeH} onChange={(e) => setSizeH(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="plot-size-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => void handleSaveSettings()}>Save</button>
          </div>
        </div>
      )}

      {/* ── Canvas ───────────────────────────────────────────── */}
      <div ref={scrollerRef} className="plot-outer-scroller">
      <div style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 100}%` }}>
      <div className="plot-canvas-wrapper">
        <div className="plot-edge-label plot-edge-top">{compass.top}</div>
        <div className="plot-edge-row">
          <div className="plot-edge-label plot-edge-side">{compass.left}</div>

          <div
            ref={canvasRef}
            className="plot-canvas"
            style={{
              aspectRatio: aspect,
              backgroundSize: `calc(100% / ${gridW}) calc(100% / ${gridH})`,
            }}
          >
            {/* Fine 5-ft accent lines */}
            <div className="plot-canvas-accent"
              style={{ backgroundSize: `calc(500% / ${gridW}) calc(500% / ${gridH})` }} />

            {/* Compass rose */}
            <svg className="plot-compass-rose" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.15)" strokeWidth="1"/>
              <text x="18" y="7"  textAnchor="middle" fontSize="7" fontWeight="800" fill="#2c5f34">{compass.top}</text>
              <text x="18" y="33" textAnchor="middle" fontSize="7" fontWeight="800" fill="#888">{compass.bottom}</text>
              <text x="3"  y="20" textAnchor="middle" fontSize="7" fontWeight="800" fill="#888">{compass.left}</text>
              <text x="33" y="20" textAnchor="middle" fontSize="7" fontWeight="800" fill="#888">{compass.right}</text>
              <polygon points="18,10 16,18 18,16 20,18" fill="#2c5f34" opacity="0.7"/>
            </svg>

            {/* Scale bar — 5 ft */}
            <div className="plot-scale-bar" style={{ width: `${(5 / gridW) * 100}%` }}>
              <div className="plot-scale-line" />
              <div className="plot-scale-label">5 ft</div>
            </div>

            {/* Dynamic sun-side indicator */}
            <div
              className="plot-sun-hint"
              style={sunHintStyle(topEdge)}
              title="Sun direction (Northern Hemisphere)"
            >
              ☀️ {sunHintLabel(topEdge)}
            </div>

            {/* ── Trellis arch SVG overlay ──────────────────── */}
            {trellisArcs.length > 0 && (
              <svg
                className="plot-trellis-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {trellisArcs.map((arc) => (
                  <path
                    key={arc.key}
                    d={arc.d}
                    fill="none"
                    stroke="#2c5f34"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    opacity="0.7"
                  />
                ))}
              </svg>
            )}

            {/* ── Beds ───────────────────────────────────────── */}
            {beds.map((bed, i) => {
              const realPos = localPos.get(bed.id) ?? resolvePos(bed, i);
              const rect    = transformBed(bed, realPos, plotW, plotL, topEdge);
              const colors  = BED_COLORS[bed.type] ?? BED_COLORS.raised;
              const typeIcon = BED_TYPE_ICONS[bed.type] ?? '🪵';

              const uniqueIds  = [...new Set(bed.slots.map((s) => s.plantId))];
              const plantSeeds = uniqueIds.slice(0, 12).map((id) => SEED_CATALOG.find((s) => s.id === id)).filter(Boolean);
              const overflow   = uniqueIds.length - 12;

              // Fill ratio: slots / total grid cells
              const gridCols  = Math.max(1, Math.round(bed.widthFt));
              const gridRows  = Math.max(1, Math.round(bed.lengthFt));
              const totalCells = gridCols * gridRows;
              const fillPct   = Math.min(100, Math.round((bed.slots.length / totalCells) * 100));

              const hasTrellis = bed.trellisType && bed.trellisType !== 'none';

              return (
                <div
                  key={bed.id}
                  className={`plot-bed${hasTrellis ? ' plot-bed--trellis' : ''}`}
                  style={{
                    left:    `${rect.leftPct}%`,
                    top:     `${rect.topPct}%`,
                    width:   `${rect.widthPct}%`,
                    height:  `${rect.heightPct}%`,
                    '--bed-bg':     colors.bg,
                    '--bed-border': colors.border,
                    '--bed-text':   colors.text,
                    '--bed-header': colors.header,
                  } as React.CSSProperties}
                  onPointerDown={(e) => onBedPointerDown(e, bed, i)}
                  onPointerMove={(e) => onBedPointerMove(e, bed)}
                  onPointerUp={(e) => void onBedPointerUp(e, bed, i)}
                >
                  <div className="plot-bed-header">
                    <span className="plot-bed-name">{typeIcon} {bed.name}</span>
                    <span className="plot-bed-sun-badge">{SUN_ICONS[bed.sunExposure ?? 'full-sun']}</span>
                  </div>

                  <div className="plot-bed-dims">
                    {bed.widthFt !== Math.round(bed.widthFt) || bed.lengthFt !== Math.round(bed.lengthFt)
                      ? `${Math.round(bed.widthFt * 12)}"×${Math.round(bed.lengthFt * 12)}"`
                      : `${bed.widthFt}×${bed.lengthFt} ft`}
                  </div>

                  {hasTrellis && (
                    <div className="plot-bed-trellis-badge">
                      {bed.trellisType === 'arch' ? '🌿 arch' : '🪝 wall'}
                    </div>
                  )}

                  {totalCells > 0 && (
                    <div className="plot-fill-bar">
                      <div className="plot-fill-fill" style={{ width: `${fillPct}%` }} />
                    </div>
                  )}

                  {plantSeeds.length > 0 ? (
                    <div className="plot-bed-icons">
                      {plantSeeds.map((seed) => seed && <span key={seed.id} title={seed.name}><PlantIcon seed={seed} /></span>)}
                      {overflow > 0 && <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>+{overflow}</span>}
                    </div>
                  ) : (
                    <div className="plot-bed-empty">tap to plant</div>
                  )}
                </div>
              );
            })}

            {/* ── In-Ground PlotFeature markers ─────────────── */}
            {plotFeatures.map((feature) => {
              const pos  = resolveFeaturePos(feature);
              const disp = transformPos(pos.x, pos.y, plotW, plotL, topEdge);
              return (
                <div
                  key={feature.id}
                  className="plot-feature-marker"
                  style={{ left: `${disp.leftPct}%`, top: `${disp.topPct}%` }}
                  onPointerDown={(e) => onFeaturePointerDown(e, feature)}
                  onPointerMove={(e) => onFeaturePointerMove(e, feature)}
                  onPointerUp={(e) => void onFeaturePointerUp(e, feature)}
                  title={`${feature.name}${feature.notes ? ' — ' + feature.notes : ''} · tap to edit, drag to move`}
                >
                  <span className="plot-feature-marker-icon">{feature.icon}</span>
                  <span className="plot-feature-marker-label">{feature.name}</span>
                </div>
              );
            })}
          </div>

          <div className="plot-edge-label plot-edge-side">{compass.right}</div>
        </div>
        <div className="plot-edge-label plot-edge-bottom">{compass.bottom}</div>
      </div>
      </div>
      </div>

      {/* ── Summary bar ──────────────────────────────────────── */}
      <div className="plot-summary-bar">
        <div className="plot-summary-stat">
          <span className="plot-stat-n">{beds.length}</span>
          <span>beds</span>
        </div>
        <div className="plot-summary-stat">
          <span className="plot-stat-n">{totalPlants}</span>
          <span>crops</span>
        </div>
        {plotFeatures.length > 0 && (
          <div className="plot-summary-stat">
            <span className="plot-stat-n">{plotFeatures.length}</span>
            <span>perennials</span>
          </div>
        )}
        <div className="plot-summary-stat">
          <span className="plot-stat-n">{plotW * plotL}</span>
          <span>sq ft plot</span>
        </div>
        <div className="plot-summary-stat">
          <span className="plot-stat-n">{Math.round(beds.reduce((s, b) => s + b.widthFt * b.lengthFt, 0))}</span>
          <span>sq ft beds</span>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="plot-legend">
        {(Object.entries(BED_COLORS) as [BedType, typeof BED_COLORS[BedType]][]).map(([type, c]) => (
          <div key={type} className="plot-legend-item">
            <div className="plot-legend-swatch" style={{ background: c.bg, borderColor: c.border }} />
            <span style={{ textTransform: 'capitalize' }}>{BED_TYPE_ICONS[type]} {type.replace('-', ' ')}</span>
          </div>
        ))}
        {plotFeatures.length > 0 && (
          <div className="plot-legend-item">
            <div className="plot-legend-swatch" style={{ background: '#f3e5f5', borderColor: '#7b1fa2' }} />
            <span>🌳 In-ground</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: '0.4rem' }}>
        Drag to reposition · tap bed to open grid · tap plant to edit
      </p>
    </div>
  );
}
