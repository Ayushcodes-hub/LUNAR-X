import React, { useEffect, useRef, useState } from 'react';
import { Activity, Box } from 'lucide-react';
import { useStore } from '../store';

function drawCorrelation2D(canvas: HTMLCanvasElement, surface: number[][]): void {
  const h = surface.length;
  const w = surface[0]?.length ?? 0;
  if (!h || !w) return;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(w, h);

  let min = Infinity, max = -Infinity;
  surface.forEach((row) => row.forEach((v) => {
    if (v < min) min = v;
    if (v > max) max = v;
  }));
  const range = max - min || 1;

  surface.forEach((row, ry) => {
    row.forEach((v, rx) => {
      const t = (v - min) / range;
      const idx = (ry * w + rx) * 4;
      imageData.data[idx] = Math.round(t * 34);       // R
      imageData.data[idx + 1] = Math.round(t * 211);  // G
      imageData.data[idx + 2] = Math.round(t * 238);  // B
      imageData.data[idx + 3] = 255;
    });
  });

  ctx.putImageData(imageData, 0, 0);

  // Peak marker
  let peakR = 0, peakC = 0;
  surface.forEach((row, ry) => {
    row.forEach((v, rx) => {
      if (v > surface[peakR][peakC]) { peakR = ry; peakC = rx; }
    });
  });
  ctx.beginPath();
  ctx.arc(peakC, peakR, 3.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCorrelation3D(canvas: HTMLCanvasElement, surface: number[][]): void {
  const h = surface.length;
  const w = surface[0]?.length ?? 0;
  if (!h || !w) return;

  canvas.width = 240;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let min = Infinity, max = -Infinity;
  surface.forEach((row) => row.forEach((v) => {
    if (v < min) min = v;
    if (v > max) max = v;
  }));
  const range = max - min || 1;

  const originX = canvas.width / 2;
  const originY = canvas.height * 0.75;
  const scaleX = 4.5;
  const scaleY = 2.2;
  const scaleZ = 45;

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 0.8;

  const step = Math.max(1, Math.floor(h / 16));

  for (let r = 0; r < h; r += step) {
    ctx.beginPath();
    for (let c = 0; c < w; c += step) {
      const val = (surface[r][c] - min) / range;
      const isoX = originX + (c - w / 2) * scaleX - (r - h / 2) * scaleX * 0.5;
      const isoY = originY + (r - h / 2) * scaleY - val * scaleZ;
      if (c === 0) ctx.moveTo(isoX, isoY);
      else ctx.lineTo(isoX, isoY);
    }
    ctx.stroke();
  }

  // Draw glowing continuous peak vector
  let peakR = 0, peakC = 0;
  surface.forEach((row, ry) => {
    row.forEach((v, rx) => {
      if (v > surface[peakR][peakC]) { peakR = ry; peakC = rx; }
    });
  });
  const peakVal = (surface[peakR][peakC] - min) / range;
  const peakIsoX = originX + (peakC - w / 2) * scaleX - (peakR - h / 2) * scaleX * 0.5;
  const peakIsoY = originY + (peakR - h / 2) * scaleY - peakVal * scaleZ;

  ctx.beginPath();
  ctx.arc(peakIsoX, peakIsoY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

export const SubPixelLab: React.FC = () => {
  const result = useStore((s) => s.result);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);
  const [view3d, setView3d] = useState(true);

  const surface = result?.correlation_surface ?? null;
  const dx = result?.metrics?.delta_x_px ?? null;
  const dy = result?.metrics?.delta_y_px ?? null;
  const dRot = result?.metrics?.delta_rotation_deg ?? null;
  const dScale = result?.metrics?.delta_scale ?? null;
  const precision = result?.metrics?.subpixel_precision_px ?? null;

  useEffect(() => {
    if (surface) {
      if (canvas2dRef.current) drawCorrelation2D(canvas2dRef.current, surface);
      if (canvas3dRef.current) drawCorrelation3D(canvas3dRef.current, surface);
    }
  }, [surface, view3d]);

  return (
    <div className="glass p-4 rounded-xl border border-cyan-900/30 space-y-3">
      <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-widest text-cyan-400">
            SUB-PIXEL ANALYSIS LAB
          </span>
        </div>
        {surface && (
          <button
            onClick={() => setView3d((v) => !v)}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-800/40 text-cyan-300 hover:border-cyan-400 transition-all flex items-center gap-1"
          >
            <Box size={10} />
            {view3d ? '3D SURFACE PEAK' : '2D SPECTRUM'}
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        {/* Surface Visualization */}
        <div className="flex-shrink-0 bg-black/50 p-2 rounded-lg border border-cyan-950/60 text-center">
          {surface ? (
            view3d ? (
              <canvas ref={canvas3dRef} className="rounded" style={{ width: 140, height: 90 }} />
            ) : (
              <canvas ref={canvas2dRef} className="rounded" style={{ width: 90, height: 90, imageRendering: 'pixelated' }} />
            )
          ) : (
            <div
              className="flex items-center justify-center text-slate-700 font-mono text-[10px] text-center"
              style={{ width: 140, height: 90 }}
            >
              Awaiting Sub-Pixel<br/>Optimization Peak
            </div>
          )}
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">
            {surface ? 'FOURIER CROSS-SPECTRUM PEAK' : 'STANDBY'}
          </span>
        </div>

        {/* Real Computed Parameter Offsets */}
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-black/30 p-2 rounded border border-cyan-950/40">
            <span className="text-[10px] text-slate-500 block">SUB-PIXEL ΔX</span>
            <span className="text-cyan-300 font-semibold">
              {dx !== null ? `${dx >= 0 ? '+' : ''}${dx.toFixed(4)} px` : '—'}
            </span>
          </div>

          <div className="bg-black/30 p-2 rounded border border-cyan-950/40">
            <span className="text-[10px] text-slate-500 block">SUB-PIXEL ΔY</span>
            <span className="text-cyan-300 font-semibold">
              {dy !== null ? `${dy >= 0 ? '+' : ''}${dy.toFixed(4)} px` : '—'}
            </span>
          </div>

          <div className="bg-black/30 p-2 rounded border border-cyan-950/40">
            <span className="text-[10px] text-slate-500 block">ROTATION REFINEMENT</span>
            <span className="text-slate-300">
              {dRot !== null ? `${dRot >= 0 ? '+' : ''}${dRot.toFixed(4)}°` : '—'}
            </span>
          </div>

          <div className="bg-black/30 p-2 rounded border border-cyan-950/40">
            <span className="text-[10px] text-slate-500 block">SCALE CORRECTION</span>
            <span className="text-slate-300">
              {dScale !== null ? `${dScale.toFixed(5)}×` : '—'}
            </span>
          </div>
        </div>
      </div>

      {precision !== null && (
        <div className="text-[11px] font-mono text-green-400 bg-green-950/30 border border-green-800/30 px-2.5 py-1 rounded flex items-center justify-between">
          <span>CONTINUOUS SUB-PIXEL PRECISION:</span>
          <span className="font-bold">{precision.toFixed(4)} px</span>
        </div>
      )}
    </div>
  );
};
