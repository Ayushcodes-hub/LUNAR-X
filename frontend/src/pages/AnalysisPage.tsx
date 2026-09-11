import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, FileText, ShieldCheck, Grid } from 'lucide-react';
import { useStore } from '../store';

export const AnalysisPage: React.FC = () => {
  const result = useStore((s) => s.result);
  const setCurrentPage = useStore((s) => s.setCurrentPage);

  if (!result) {
    return (
      <div className="relative w-full h-full pt-28 pb-8 px-8 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass p-8 max-w-md text-center"
        >
          <BarChart3 size={36} className="text-cyan-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-base font-bold text-slate-300 mb-2 tracking-wide">NO REGISTRATION RESULT LOADED</h2>
          <p className="text-xs text-slate-500 font-mono mb-6 leading-relaxed">
            Execute a registration pipeline run on the Registration console to generate quantitative diagnostics, spatial uniformity maps, and downloadable evaluation reports.
          </p>
          <button
            onClick={() => setCurrentPage('registration')}
            className="px-4 py-2 rounded text-xs font-mono font-bold tracking-wider text-cyan-400 border border-cyan-400/40 bg-cyan-950/40 hover:bg-cyan-900/40 transition-colors"
          >
            OPEN REGISTRATION BENCH
          </button>
        </motion.div>
      </div>
    );
  }

  const m = result.metrics;
  const uniformity = result.uniformity;
  const H = result.homography;

  const downloadReport = (format: 'json' | 'html') => {
    let content = '';
    let filename = `lunaris_report_${result.job_id}.${format}`;
    let mimeType = format === 'json' ? 'application/json' : 'text/html';

    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
    } else {
      // Basic client-side HTML report download
      content = `<!DOCTYPE html><html><head><title>LUNARIS Report - ${result.job_id}</title><style>body{background:#0a0b14;color:#e2e8f0;font-family:sans-serif;padding:30px;}</style></head><body><h1>LUNARIS Scientific Registration Report</h1><pre>${JSON.stringify(result.metrics, null, 2)}</pre></body></html>`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/30 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-widest text-cyan-400">SCIENTIFIC VALIDATION & DIAGNOSTICS</h1>
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Job ID: {result.job_id} · Grade: {(m.quality_grade || 'UNKNOWN').toUpperCase()}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => downloadReport('json')}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono text-cyan-400 border border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/40 transition-colors"
          >
            <FileText size={14} />
            <span>EXPORT JSON</span>
          </button>
          <button
            onClick={() => downloadReport('html')}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono text-cyan-400 border border-cyan-800 bg-cyan-950/40 hover:bg-cyan-900/40 transition-colors"
          >
            <Download size={14} />
            <span>EXPORT HTML</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4">
          <div className="text-xs text-slate-500 font-mono mb-1">RMSE RESIDUAL</div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {m.rmse_px !== null ? `${m.rmse_px.toFixed(4)} px` : 'N/A'}
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">Target precision &lt; 0.5 px</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-slate-500 font-mono mb-1">INLIER RATIO</div>
          <div className="text-xl font-bold font-mono text-green-400">
            {m.inlier_ratio !== null ? `${(m.inlier_ratio * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">{m.inlier_count} verified inliers</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-slate-500 font-mono mb-1">SUB-PIXEL OFFSET</div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {m.delta_x_px !== null && m.delta_y_px !== null
              ? `(${m.delta_x_px >= 0 ? '+' : ''}${m.delta_x_px.toFixed(3)}, ${m.delta_y_px >= 0 ? '+' : ''}${m.delta_y_px.toFixed(3)})`
              : 'N/A'}
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">Continuous phase correlation</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-slate-500 font-mono mb-1">SPATIAL UNIFORMITY</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {uniformity ? uniformity.score.toFixed(4) : 'N/A'}
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            {uniformity ? `${(uniformity.coverage_fraction * 100).toFixed(0)}% grid coverage` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Deep Dive Grid: Transform Matrix & Uniformity Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estimated Homography Matrix */}
        <div className="glass p-5">
          <div className="text-xs font-bold text-slate-300 tracking-wider mb-3">
            ESTIMATED 3×3 HOMOGRAPHY MATRIX (H)
          </div>
          <div className="bg-black/40 p-3 rounded font-mono text-xs text-cyan-300 border border-cyan-900/30 overflow-x-auto">
            {H && H.length === 3 ? (
              <div className="space-y-1">
                {H.map((row, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    {row.map((val, j) => (
                      <span key={j} className="w-24 text-right">
                        {val >= 0 ? ' ' : ''}{val.toFixed(6)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-600">Identity transform</div>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-3 leading-relaxed">
            H maps homogenous source coordinates to the reference lunar baseline coordinate frame.
          </div>
        </div>

        {/* Spatial Uniformity Density Grid */}
        <div className="glass p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold text-slate-300 tracking-wider">
              SPATIAL MATCH DISTRIBUTION ({uniformity ? `${uniformity.grid_n}×${uniformity.grid_m}` : '8×8'} GRID)
            </div>
            <Grid size={14} className="text-cyan-400" />
          </div>

          {uniformity?.density_map ? (
            <div
              className="grid gap-1 bg-black/40 p-3 rounded border border-cyan-900/30"
              style={{
                gridTemplateColumns: `repeat(${uniformity.grid_m}, minmax(0, 1fr))`,
              }}
            >
              {uniformity.density_map.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="aspect-square rounded flex items-center justify-center text-xs font-mono font-bold"
                    style={{
                      backgroundColor: val > 0 ? `rgba(34, 211, 238, ${Math.min(1, 0.2 + val * 0.15)})` : 'rgba(255,255,255,0.02)',
                      color: val > 0 ? '#ffffff' : '#334155',
                      fontSize: 9,
                    }}
                    title={`Cell (${r},${c}): ${val} inliers`}
                  >
                    {val}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-600 font-mono py-8 text-center">
              Uniformity density grid unavailable
            </div>
          )}
          <div className="text-xs text-slate-500 font-mono mt-3">
            Measures spatial dispersion to avoid degenerate match clustering in high-contrast crater rims.
          </div>
        </div>
      </div>
    </div>
  );
};
