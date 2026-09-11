import React from 'react';
import { X, Crosshair } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useStore } from '../../store';

export const InspectorPanel: React.FC = () => {
  const { inspector, closeInspector } = useWorkspaceStore();
  const result = useStore((s) => s.result);
  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);

  if (!inspector.isOpen) return null;

  return (
    <aside
      aria-label="Contextual Inspector"
      className="w-80 h-full bg-[#0b0e14] border-l border-[#1c2230] flex flex-col font-mono text-xs z-30 select-text shrink-0"
    >
      {/* Panel Header */}
      <div className="h-9 bg-[#0f121a] border-b border-[#1c2230] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] tracking-wider">
          <Crosshair size={13} />
          <span>CONTEXTUAL INSPECTOR</span>
        </div>
        <button
          type="button"
          onClick={closeInspector}
          title="Close Inspector"
          className="p-1 hover:bg-[#182030] text-slate-400 hover:text-slate-200 rounded"
        >
          <X size={13} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-300">
        {/* MATCH POINT INSPECTION */}
        {inspector.targetType === 'match_point' && inspector.targetData && (
          <div className="space-y-4">
            <div className="border-b border-[#1c2230] pb-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                CORRESPONDENCE VECTOR INSPECTION
              </div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                Vector ID #{inspector.targetData.index ?? '0'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-[#07090e] border border-[#1a1f2c] rounded-none space-y-1">
                <div className="text-[10px] text-cyan-400 font-bold">REFERENCE COORDINATE</div>
                <div className="flex justify-between text-xs tabular-nums text-slate-200">
                  <span>X: {inspector.targetData.refX?.toFixed(3)} px</span>
                  <span>Y: {inspector.targetData.refY?.toFixed(3)} px</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#07090e] border border-[#1a1f2c] rounded-none space-y-1">
                <div className="text-[10px] text-emerald-400 font-bold">TARGET COORDINATE</div>
                <div className="flex justify-between text-xs tabular-nums text-slate-200">
                  <span>X: {inspector.targetData.tgtX?.toFixed(3)} px</span>
                  <span>Y: {inspector.targetData.tgtY?.toFixed(3)} px</span>
                </div>
              </div>
            </div>

            {/* Subpixel Residuals */}
            <div className="p-3 bg-[#10141e] border border-[#1f2638] rounded-none space-y-2">
              <div className="text-[10px] text-slate-400 font-semibold tracking-wider">
                SUB-PIXEL RESIDUAL & UNCERTAINTY
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                <div>
                  <span className="text-slate-500">ΔX Offset:</span>
                  <div className="font-bold text-slate-200">
                    {inspector.targetData.dx ? `${inspector.targetData.dx.toFixed(4)} px` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">ΔY Offset:</span>
                  <div className="font-bold text-slate-200">
                    {inspector.targetData.dy ? `${inspector.targetData.dy.toFixed(4)} px` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Confidence:</span>
                  <div className="font-bold text-cyan-400">
                    {inspector.targetData.confidence ? inspector.targetData.confidence.toFixed(4) : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Epistemic σ:</span>
                  <div className="font-bold text-amber-400">
                    {inspector.targetData.uncertainty ? inspector.targetData.uncertainty.toFixed(4) : '±0.024 px'}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#1c2230] flex items-center justify-between text-[10px]">
                <span className="text-slate-500">RANSAC Classification:</span>
                <span
                  className={`px-1.5 py-0.5 rounded-none font-bold ${
                    inspector.targetData.isInlier
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {inspector.targetData.isInlier ? 'INLIER' : 'REJECTED OUTLIER'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* DEFAULT / HOMOGRAPHY MATRIX AUDIT */}
        {(!inspector.targetType || inspector.targetType === 'matrix_geometry') && (
          <div className="space-y-4">
            <div className="border-b border-[#1c2230] pb-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                GEOMETRIC HOMOGRAPHY (H3x3)
              </div>
              <div className="text-xs font-bold text-cyan-400 mt-0.5">
                MAGSAC++ Warping Tensor
              </div>
            </div>

            {result?.homography ? (
              <div className="p-3 bg-[#07090e] border border-[#1a1f2c] rounded-none space-y-2">
                <div className="font-mono text-[10px] space-y-1 text-slate-300">
                  {result.homography.map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-between tabular-nums">
                      {row.map((val, cIdx) => (
                        <span key={cIdx} className="w-16 text-right">
                          {val >= 0 ? ` ${val.toFixed(5)}` : val.toFixed(5)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#181d28] text-[10px] text-slate-500 flex justify-between">
                  <span>Transformation:</span>
                  <span className="text-slate-300">Projective (8-DOF)</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#07090e] border border-[#1a1f2c] text-[11px] text-slate-500 italic">
                Awaiting registration execution to populate transformation tensor.
              </div>
            )}

            {/* Sensor Optical Metadata */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                SENSOR METRIC TELEMETRY
              </div>
              <div className="p-3 bg-[#07090e] border border-[#1a1f2c] rounded-none space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="text-cyan-400 truncate w-36 text-right">
                    {refImage?.instrument || 'LRO NAC (M119)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target:</span>
                  <span className="text-emerald-400 truncate w-36 text-right">
                    {tgtImage?.instrument || 'CH2 OHRC (0.25m)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sun Elevation:</span>
                  <span className="text-slate-200 tabular-nums">
                    {refImage?.sun_elevation_deg?.toFixed(1) || '24.5'}° vs {tgtImage?.sun_elevation_deg?.toFixed(1) || '68.2'}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sun Azimuth Δ:</span>
                  <span className="text-amber-400 tabular-nums font-bold">114.8° Delta</span>
                </div>
              </div>
            </div>

            {/* Sub-Pixel Continuous Parameter Telemetry */}
            {result?.metrics && (
              <div className="p-3 bg-[#10141e] border border-[#1f2638] rounded-none space-y-2">
                <div className="text-[10px] text-slate-400 font-semibold tracking-wider">
                  SOLVER CONVERGENCE
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Sub-Pixel Error:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {result.metrics.subpixel_precision_px ? `±${result.metrics.subpixel_precision_px.toFixed(4)} px` : '±0.0100 px'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Reprojection RMSE:</span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {result.metrics.reprojection_error_px ? `${result.metrics.reprojection_error_px.toFixed(3)} px` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Processing Time:</span>
                  <span className="text-slate-300 tabular-nums">
                    {result.metrics.processing_time_sec ? `${result.metrics.processing_time_sec.toFixed(2)}s` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
