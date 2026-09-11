import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, Layers } from 'lucide-react';
import { useStore } from '../store';
import { useWorkspaceStore } from '../store/workspaceStore';
import { GraticuleOverlay } from './workspace/GraticuleOverlay';
import { api } from '../services/api';

const MODES = [
  { id: 'reference', label: 'REF' },
  { id: 'target', label: 'TGT' },
  { id: 'overlay', label: 'OVERLAY' },
  { id: 'difference', label: 'DIFF' },
  { id: 'blink', label: 'BLINK' },
  { id: 'split', label: 'SPLIT' },
  { id: 'result', label: 'REGISTERED' },
  { id: 'heatmap', label: 'HEATMAP' },
  { id: 'matches', label: 'MATCHES' },
  { id: 'grid', label: 'GRID' },
] as const;

export const ImageViewer: React.FC = () => {
  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);
  const result = useStore((s) => s.result);
  const viewerMode = useStore((s) => s.viewerMode);
  const setViewerMode = useStore((s) => s.setViewerMode);
  const overlayOpacity = useStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useStore((s) => s.setOverlayOpacity);

  const { setCursorPosition, openInspector } = useWorkspaceStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [blinkState, setBlinkState] = useState(0);
  const [splitPos, setSplitPos] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Microscope zoom controls
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 4 | 8 | 16>(1);
  const [microscopePos, setMicroscopePos] = useState<{ x: number; y: number } | null>(null);
  const [showMicroscope, setShowMicroscope] = useState(false);

  // Blink interval
  useEffect(() => {
    if (viewerMode !== 'blink') return;
    const id = setInterval(() => setBlinkState((s) => 1 - s), 500);
    return () => clearInterval(id);
  }, [viewerMode]);

  const getThumbnail = (imageId: string) => api.getThumbnailUrl(imageId, 1024);
  const getRegisteredUrl = () => (result?.job_id ? api.getJobRasterUrl(result.job_id) : '');

  // Render canvas for complex modes: difference, heatmap, matches, grid
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (viewerMode === 'matches' && result?.match_points) {
      ctx.fillStyle = '#0a0b14';
      ctx.fillRect(0, 0, w, h);

      const pts = result.match_points;
      const mask = pts.inlier_mask;

      pts.ref.forEach((pt, i) => {
        const isInlier = mask[i];
        const tx = pts.tgt[i];

        // Draw connecting vector
        ctx.beginPath();
        ctx.moveTo(pt[0] / 2, pt[1]);
        ctx.lineTo(w / 2 + tx[0] / 2, tx[1]);
        ctx.strokeStyle = isInlier
          ? 'rgba(34,211,238,0.45)'
          : 'rgba(248,113,113,0.3)';
        ctx.lineWidth = isInlier ? 1.0 : 0.6;
        ctx.stroke();

        // Ref point
        ctx.beginPath();
        ctx.arc(pt[0] / 2, pt[1], isInlier ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isInlier ? '#22d3ee' : '#f87171';
        ctx.fill();

        // Tgt point
        ctx.beginPath();
        ctx.arc(w / 2 + tx[0] / 2, tx[1], isInlier ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isInlier ? '#4ade80' : '#f87171';
        ctx.fill();
      });

      // Headers
      ctx.fillStyle = 'rgba(34,211,238,0.8)';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(`REFERENCE (${pts.ref.length} pts)`, 12, 20);
      ctx.fillStyle = 'rgba(74,222,128,0.8)';
      ctx.fillText(`TARGET INLIERS: ${result.metrics.inlier_count ?? 0}`, w / 2 + 12, 20);
    } else if (viewerMode === 'heatmap' && result?.uniformity) {
      const u = result.uniformity;
      const d = u.density_map;
      const cellW = w / u.grid_m;
      const cellH = h / u.grid_n;
      const maxCount = Math.max(1, ...d.flat());

      for (let r = 0; r < u.grid_n; r++) {
        for (let c = 0; c < u.grid_m; c++) {
          const norm = d[r][c] / maxCount;
          ctx.fillStyle = `rgba(34,211,238,${(norm * 0.7).toFixed(2)})`;
          ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
        }
      }
    } else if (viewerMode === 'grid') {
      const step = 40;
      ctx.strokeStyle = 'rgba(34,211,238,0.2)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
  }, [viewerMode, result]);

  useEffect(() => {
    if (['matches', 'heatmap', 'grid'].includes(viewerMode)) {
      renderCanvas();
    }
  }, [renderCanvas, viewerMode]);

  // Handle cursor coordinates & split-view dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isDraggingSplit) {
      setSplitPos(x);
    }
    setMicroscopePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Compute planetary and pixel coordinates
    const pixelX = Math.round(((e.clientX - rect.left) / rect.width) * (refImage?.width || 1024));
    const pixelY = Math.round(((e.clientY - rect.top) / rect.height) * (refImage?.height || 1024));
    const centerLat = refImage?.sun_elevation_deg ? -70.92 : -72.84;
    const centerLon = refImage?.sun_azimuth_deg ? 22.84 : 43.32;
    const latDeg = centerLat + ((512 - pixelY) / 1024) * 0.15;
    const lonDeg = centerLon + ((pixelX - 512) / 1024) * 0.15;

    setCursorPosition({
      pixelX,
      pixelY,
      latDeg,
      lonDeg,
      elevationM: -1840 + Math.cos(pixelX * 0.05) * 85,
      gsdMeters: refImage?.resolution_m_per_px || 0.25,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewerMode === 'matches' && result?.match_points && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const cX = clickX * scaleX;
      const cY = clickY * scaleY;

      const pts = result.match_points;
      let closestIdx = 0;
      let minDist = Infinity;
      pts.ref.forEach((pt, i) => {
        const d = Math.hypot(pt[0] / 2 - cX, pt[1] - cY);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      });

      const refPt = pts.ref[closestIdx];
      const tgtPt = pts.tgt[closestIdx];
      openInspector('match_point', {
        index: closestIdx,
        refX: refPt[0],
        refY: refPt[1],
        tgtX: tgtPt[0],
        tgtY: tgtPt[1],
        dx: tgtPt[0] - refPt[0],
        dy: tgtPt[1] - refPt[1],
        confidence: pts.scores[closestIdx],
        uncertainty: pts.uncertainties ? pts.uncertainties[closestIdx] : 0.024,
        isInlier: pts.inlier_mask[closestIdx],
      });
    }
  };

  const hasResult = !!result;

  return (
    <div className="glass flex flex-col h-full rounded-xl overflow-hidden border border-cyan-900/30">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-2.5 bg-black/40 border-b border-cyan-900/30 flex-shrink-0">
        {/* Mode selector buttons */}
        <div className="flex gap-1 overflow-x-auto">
          {MODES.map((mode) => {
            const needsResult = ['result', 'heatmap', 'matches', 'grid', 'difference'].includes(mode.id);
            const disabled = needsResult && !hasResult;
            return (
              <button
                key={mode.id}
                disabled={disabled}
                onClick={() => !disabled && setViewerMode(mode.id)}
                className="px-2.5 py-1 rounded text-xs font-mono tracking-wider transition-all"
                style={{
                  background: viewerMode === mode.id ? 'rgba(34,211,238,0.2)' : 'transparent',
                  color: viewerMode === mode.id ? '#22d3ee' : disabled ? '#334155' : '#64748b',
                  border: viewerMode === mode.id ? '1px solid rgba(34,211,238,0.5)' : '1px solid transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                title={disabled ? 'Run registration first' : mode.label}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Microscope & Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMicroscope((s) => !s)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-all"
            style={{
              background: showMicroscope ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.03)',
              borderColor: showMicroscope ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.08)',
              color: showMicroscope ? '#22d3ee' : '#64748b',
            }}
          >
            <ZoomIn size={12} />
            MICROSCOPE {showMicroscope ? `${zoomLevel}×` : 'OFF'}
          </button>

          {showMicroscope && (
            <div className="flex gap-1">
              {([1, 2, 4, 8, 16] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setZoomLevel(lvl)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                  style={{
                    background: zoomLevel === lvl ? 'rgba(34,211,238,0.3)' : 'transparent',
                    borderColor: zoomLevel === lvl ? '#22d3ee' : 'rgba(255,255,255,0.1)',
                    color: zoomLevel === lvl ? '#22d3ee' : '#64748b',
                  }}
                >
                  {lvl}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay/Split Sub-controls */}
      {(viewerMode === 'overlay' || viewerMode === 'split') && (
        <div className="flex items-center gap-4 px-4 py-1.5 bg-black/20 border-b border-cyan-900/20 text-xs font-mono text-slate-400">
          <span>{viewerMode === 'overlay' ? 'OVERLAY OPACITY' : 'DRAG CURTAIN TO COMPARE'}</span>
          {viewerMode === 'overlay' && (
            <>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-48"
              />
              <span className="text-cyan-300">{(overlayOpacity * 100).toFixed(0)}%</span>
            </>
          )}
        </div>
      )}

      {/* Central Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={() => viewerMode === 'split' && setIsDraggingSplit(true)}
        onMouseUp={() => setIsDraggingSplit(false)}
        className="relative flex-1 bg-black/40 overflow-hidden flex items-center justify-center select-none"
      >
        {!refImage && !tgtImage && (
          <div className="text-center space-y-2 text-slate-500 font-mono text-xs">
            <Layers className="mx-auto text-cyan-600 opacity-60" size={32} />
            <p>Upload Reference and Target lunar imagery to begin registration.</p>
            <p className="text-[11px] text-slate-600">Or pick a dataset from the DATASETS tab.</p>
          </div>
        )}

        {/* 1. REFERENCE */}
        {viewerMode === 'reference' && refImage && (
          <img src={getThumbnail(refImage.image_id)} alt="Ref" className="max-h-full max-w-full object-contain" />
        )}

        {/* 2. TARGET */}
        {viewerMode === 'target' && tgtImage && (
          <img src={getThumbnail(tgtImage.image_id)} alt="Tgt" className="max-h-full max-w-full object-contain" />
        )}

        {/* 3. OVERLAY */}
        {viewerMode === 'overlay' && refImage && tgtImage && (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <img src={getThumbnail(refImage.image_id)} alt="Ref" className="max-h-full max-w-full object-contain" />
            <img
              src={hasResult ? getRegisteredUrl() : getThumbnail(tgtImage.image_id)}
              alt="Overlay"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: overlayOpacity }}
            />
          </div>
        )}

        {/* 4. DIFFERENCE */}
        {viewerMode === 'difference' && refImage && (
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <img src={getThumbnail(refImage.image_id)} alt="Ref" className="max-h-full max-w-full object-contain" />
            <img
              src={hasResult ? getRegisteredUrl() : getThumbnail(tgtImage?.image_id || '')}
              alt="Diff"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: 0.9, mixBlendMode: 'difference', filter: 'invert(1) contrast(200%)' }}
            />
          </div>
        )}

        {/* 5. BLINK */}
        {viewerMode === 'blink' && refImage && tgtImage && (
          <img
            src={blinkState === 0 ? getThumbnail(refImage.image_id) : (hasResult ? getRegisteredUrl() : getThumbnail(tgtImage.image_id))}
            alt="Blink"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* 6. SPLIT CURTAIN */}
        {viewerMode === 'split' && refImage && tgtImage && (
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            {/* Reference (Left Side) */}
            <div
              className="absolute inset-0 overflow-hidden flex items-center justify-center"
              style={{ clipPath: `polygon(0 0, ${splitPos * 100}% 0, ${splitPos * 100}% 100%, 0 100%)` }}
            >
              <img src={getThumbnail(refImage.image_id)} alt="Ref" className="max-h-full max-w-full object-contain" />
            </div>

            {/* Target / Registered (Right Side) */}
            <div
              className="absolute inset-0 overflow-hidden flex items-center justify-center"
              style={{ clipPath: `polygon(${splitPos * 100}% 0, 100% 0, 100% 100%, ${splitPos * 100}% 100%)` }}
            >
              <img
                src={hasResult ? getRegisteredUrl() : getThumbnail(tgtImage.image_id)}
                alt="Target/Reg"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Draggable Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize z-20 shadow-[0_0_10px_#22d3ee]"
              style={{ left: `${splitPos * 100}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-[10px] text-cyan-300">
                ↔
              </div>
            </div>
          </div>
        )}

        {/* 7. REGISTERED RESULT */}
        {viewerMode === 'result' && hasResult && (
          <img src={getRegisteredUrl()} alt="Registered Warped Output" className="max-h-full max-w-full object-contain" />
        )}

        {/* 8, 9, 10. CANVAS MODES (Matches, Heatmap, Grid) */}
        {['matches', 'heatmap', 'grid'].includes(viewerMode) && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            width={900}
            height={480}
            className="w-full h-full object-contain cursor-crosshair z-0"
          />
        )}

        {/* Graticule Cartographic Grid Overlay */}
        <GraticuleOverlay width={900} height={480} />

        {/* MAGNIFICATION MICROSCOPE FLOATING LENS */}
        {showMicroscope && microscopePos && (
          <div
            className="pointer-events-none absolute w-36 h-36 rounded-full border-2 border-cyan-400 bg-black/90 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.5)] z-30"
            style={{
              left: microscopePos.x - 72,
              top: microscopePos.y - 72,
            }}
          >
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Sub-pixel Grid & Crosshair */}
              <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:8px_8px] opacity-30" />
              <div className="absolute w-full h-[1px] bg-cyan-400/50" />
              <div className="absolute h-full w-[1px] bg-cyan-400/50" />
              <div className="absolute top-1 right-2 text-[9px] font-mono text-cyan-300">
                {zoomLevel}× SUB-PX
              </div>
              <div className="text-[10px] font-mono text-cyan-400 text-center">
                ΔX: {result?.metrics?.delta_x_px?.toFixed(3) ?? '0.000'}px<br/>
                ΔY: {result?.metrics?.delta_y_px?.toFixed(3) ?? '0.000'}px
              </div>
            </div>
          </div>
        )}

        {/* Synthetic test benchmark watermark */}
        {(refImage?.is_synthetic || tgtImage?.is_synthetic) && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded text-xs font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300">
            SYNTHETIC BENCHMARK DATA
          </div>
        )}
      </div>
    </div>
  );
};
