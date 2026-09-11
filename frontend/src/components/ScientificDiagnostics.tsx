import React from 'react';
import { Compass, AlertTriangle, CheckCircle2, Info, Crosshair } from 'lucide-react';
import { useStore } from '../store';

export const ScientificDiagnostics: React.FC = () => {
  const result = useStore((s) => s.result);
  const refImage = useStore((s) => s.refImage);

  const metrics = result?.metrics;
  const uniformity = result?.uniformity;

  const getDiagnostics = () => {
    if (!result || !metrics) {
      return [
        {
          type: 'info',
          title: 'AWAITING REGISTRATION EXECUTION',
          body: 'Load source and reference imagery and trigger pipeline execution. Sub-pixel continuous parameters, geometric consensus, and residual distributions will be evaluated here.',
        },
      ];
    }

    const items: Array<{ type: 'success' | 'warning' | 'info'; title: string; body: string }> = [];

    // Quality Grade Evaluation
    if (metrics.quality_grade === 'excellent') {
      items.push({
        type: 'success',
        title: 'HIGH GEOMETRIC CONSISTENCY (GRADE A)',
        body: `Convergence verified with ${(metrics.inlier_ratio ? metrics.inlier_ratio * 100 : 0).toFixed(1)}% inlier consensus (${metrics.inlier_count ?? 0} vectors). Sub-pixel displacement resolved within target tolerance (RMSE: ${metrics.rmse_px?.toFixed(3) ?? '—'} px).`,
      });
    } else if (metrics.quality_grade === 'good') {
      items.push({
        type: 'success',
        title: 'ROBUST CONVERGENCE (GRADE B)',
        body: `Sub-pixel alignment succeeded with satisfactory reprojection consistency (${metrics.reprojection_error_px?.toFixed(3) ?? '—'} px). Suitable for cartographic mosaic production.`,
      });
    } else if (metrics.quality_grade === 'moderate' || metrics.quality_grade === 'poor') {
      items.push({
        type: 'warning',
        title: 'HIGH RESIDUAL VARIANCE',
        body: metrics.quality_explanation ?? 'Elevated reprojection residual detected across low-sun shadow boundaries. Homomorphic frequency filtering recommended to equalize high-frequency shadow contrast.',
      });
    }

    // Continuous Sub-Pixel Displacements
    if (metrics.delta_x_px !== null && metrics.delta_y_px !== null) {
      items.push({
        type: 'info',
        title: 'CONTINUOUS SUB-PIXEL OFFSETS',
        body: `Analytical translation: ΔX = ${metrics.delta_x_px >= 0 ? '+' : ''}${metrics.delta_x_px.toFixed(4)} px, ΔY = ${metrics.delta_y_px >= 0 ? '+' : ''}${metrics.delta_y_px.toFixed(4)} px. Scale ratio: ${metrics.delta_scale?.toFixed(4) ?? '1.0000'}×, Continuous rotation: ${metrics.delta_rotation_deg?.toFixed(4) ?? '0.0000'}°.`,
      });
    }

    // Spatial Uniformity Grid Analysis
    if (uniformity) {
      if (uniformity.score >= 0.7) {
        items.push({
          type: 'success',
          title: 'HOMOGENEOUS SPATIAL DISTRIBUTION',
          body: `Keypoint coverage spans ${(uniformity.coverage_fraction * 100).toFixed(0)}% of the ${uniformity.grid_n}×${uniformity.grid_m} grid. Absence of localized clustering minimizes corner warp distortion in the projective field.`,
        });
      } else {
        items.push({
          type: 'warning',
          title: 'LOCALIZED FEATURE CLUSTERING',
          body: `Spatial uniformity coefficient is ${(uniformity.score * 100).toFixed(0)}%. Correspondence vectors concentrate heavily along high-gradient crater rims. Local contrast normalization recommended for highland terrain.`,
        });
      }
    }

    return items;
  };

  const diagnostics = getDiagnostics();

  return (
    <div className="p-4 bg-[#0b0e14] border border-[#1c2230] rounded-none space-y-3 font-mono text-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-[#1c2230] text-cyan-400 font-bold text-[11px] tracking-wider">
        <Compass size={14} />
        <span>GEODETIC CONVERGENCE DIAGNOSTICS</span>
      </div>

      <div className="space-y-2">
        {diagnostics.map((diag, i) => (
          <div
            key={i}
            className={`p-3 border rounded-none text-xs leading-relaxed ${
              diag.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : diag.type === 'warning'
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
              {diag.type === 'success' && <CheckCircle2 size={13} className="text-emerald-400" />}
              {diag.type === 'warning' && <AlertTriangle size={13} className="text-amber-400" />}
              {diag.type === 'info' && <Info size={13} className="text-cyan-400" />}
              <span>{diag.title}</span>
            </div>
            <p className="text-slate-300 text-[11px] font-sans leading-normal">{diag.body}</p>
          </div>
        ))}
      </div>

      {refImage?.is_synthetic && (
        <div className="text-[10px] text-amber-400/90 pt-2 border-t border-[#181e2b] flex items-center gap-1.5">
          <Crosshair size={12} />
          Synthetic test bench active — parameters benchmarked against analytical ground truth.
        </div>
      )}
    </div>
  );
};
