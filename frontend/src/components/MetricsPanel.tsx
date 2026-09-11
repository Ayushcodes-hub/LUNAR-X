// MetricsPanel — right intelligence panel displaying ONLY real computed values
// Every displayed number traces to actual pipeline computation.
// If a value is null/undefined, it shows "—" or explicit "Awaiting computation"
import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';

interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  format: (v: number) => string;
  unit?: string;
  color?: string;
  description?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, format, unit, color, description }) => (
  <motion.div
    layout
    className="flex flex-col gap-1 py-2 border-b border-cyan-900/20 last:border-0"
    title={description}
  >
    <div className="text-xs text-slate-500 tracking-wider">{label}</div>
    <div className="flex items-baseline gap-1">
      {value !== null && value !== undefined ? (
        <>
          <span
            className="font-mono text-base font-medium"
            style={{ color: color ?? '#22d3ee' }}
          >
            {format(value)}
          </span>
          {unit && <span className="text-xs text-slate-600 font-mono">{unit}</span>}
        </>
      ) : (
        <span className="text-xs text-slate-600 font-mono italic">Awaiting computation</span>
      )}
    </div>
  </motion.div>
);

const GradeChip: React.FC<{ grade: string | null }> = ({ grade }) => {
  const colors: Record<string, string> = {
    excellent: '#4ade80',
    good: '#22d3ee',
    moderate: '#fbbf24',
    poor: '#f87171',
    insufficient_data: '#64748b',
  };
  if (!grade) return <span className="text-xs text-slate-600 font-mono italic">Awaiting computation</span>;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-mono tracking-widest uppercase"
      style={{
        color: colors[grade] ?? '#64748b',
        border: `1px solid ${colors[grade] ?? '#334155'}44`,
        background: `${colors[grade] ?? '#334155'}12`,
      }}
    >
      {grade.replace('_', ' ')}
    </span>
  );
};

export const MetricsPanel: React.FC = () => {
  const liveMetrics = useStore((s) => s.liveMetrics);
  const result = useStore((s) => s.result);
  const jobStatus = useStore((s) => s.jobStatus);

  // Use final result if available, otherwise live streaming metrics
  const m = result?.metrics ?? null;
  const live = liveMetrics;

  const inlierRatio = m?.inlier_ratio ?? live?.inlier_ratio ?? null;
  const inlierCount = m?.inlier_count ?? live?.inlier_count ?? null;
  const featuresRef = m?.features_detected_ref ?? live?.features_detected ?? null;
  const rmse = m?.rmse_px ?? null;
  const ncc = m?.ncc ?? null;
  const ssim = m?.ssim ?? null;
  const mi = m?.mutual_information ?? null;
  const dx = m?.delta_x_px ?? live?.delta_x_px ?? null;
  const dy = m?.delta_y_px ?? live?.delta_y_px ?? null;
  const drot = m?.delta_rotation_deg ?? live?.delta_rotation_deg ?? null;
  const dscale = m?.delta_scale ?? live?.delta_scale ?? null;
  const precision = m?.subpixel_precision_px ?? null;
  const processingMs = m?.processing_time_sec != null ? m.processing_time_sec * 1000 : null;
  const qualityGrade = m?.quality_grade ?? null;
  const qualityScore = m?.quality_score ?? null;
  const qualityExplanation = m?.quality_explanation ?? null;

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      className="glass fixed right-4 top-16 bottom-4 w-72 z-40 overflow-y-auto"
      style={{ padding: '16px' }}
    >
      <div className="text-xs text-slate-600 tracking-widest mb-4 pb-2 border-b border-cyan-900/30">
        INTELLIGENCE PANEL
      </div>

      {/* Quality Grade */}
      <div className="mb-4 pb-3 border-b border-cyan-900/20">
        <div className="text-xs text-slate-500 tracking-wider mb-2">REGISTRATION QUALITY</div>
        <GradeChip grade={qualityGrade} />
        {qualityScore !== null && (
          <div className="text-xs text-slate-500 font-mono mt-1">
            Score: {(qualityScore * 100).toFixed(1)}%
          </div>
        )}
        {qualityExplanation && (
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{qualityExplanation}</p>
        )}
      </div>

      {/* Sub-pixel results */}
      <div className="mb-3 pb-3 border-b border-cyan-900/20">
        <div className="text-xs text-slate-500 tracking-wider mb-2">SUB-PIXEL CORRECTION</div>
        <div className="font-mono text-xs space-y-1">
          {dx !== null ? (
            <>
              <div style={{ color: '#22d3ee' }}>ΔX: {dx >= 0 ? '+' : ''}{dx.toFixed(4)} px</div>
              <div style={{ color: '#22d3ee' }}>ΔY: {dy !== null ? (dy >= 0 ? '+' : '') + dy.toFixed(4) : '—'} px</div>
              {drot !== null && <div style={{ color: '#a5f3fc' }}>ΔRot: {drot >= 0 ? '+' : ''}{drot.toFixed(4)}°</div>}
              {dscale !== null && <div style={{ color: '#a5f3fc' }}>ΔScale: {dscale.toFixed(5)}×</div>}
              {precision !== null && (
                <div className="mt-1 text-amber-400">Precision: {precision.toFixed(4)} px</div>
              )}
            </>
          ) : (
            <span className="italic text-slate-600">Awaiting sub-pixel refinement</span>
          )}
        </div>
      </div>

      {/* Feature metrics */}
      <MetricRow
        label="FEATURES DETECTED"
        value={featuresRef}
        format={(v) => v.toLocaleString()}
        description="Number of SIFT/LoFTR keypoints detected in reference image"
      />
      <MetricRow
        label="INLIER COUNT"
        value={inlierCount}
        format={(v) => v.toLocaleString()}
      />
      <MetricRow
        label="INLIER RATIO"
        value={inlierRatio}
        format={(v) => `${(v * 100).toFixed(1)}%`}
        color={inlierRatio !== null ? (inlierRatio > 0.7 ? '#4ade80' : inlierRatio > 0.4 ? '#fbbf24' : '#f87171') : undefined}
      />

      {/* Registration metrics */}
      <MetricRow
        label="RMSE"
        value={rmse}
        format={(v) => v.toFixed(4)}
        unit="px"
        color={rmse !== null ? (rmse < 1 ? '#4ade80' : rmse < 3 ? '#fbbf24' : '#f87171') : undefined}
        description="Root Mean Squared Error between registered and reference image"
      />
      <MetricRow
        label="NCC"
        value={ncc}
        format={(v) => v.toFixed(4)}
        description="Normalized Cross-Correlation (−1 to 1, higher is better)"
      />
      <MetricRow
        label="SSIM"
        value={ssim}
        format={(v) => v.toFixed(4)}
        description="Structural Similarity Index (0 to 1, higher is better)"
      />
      <MetricRow
        label="MUTUAL INFORMATION"
        value={mi}
        format={(v) => v.toFixed(4)}
        unit="nats"
        description="Mutual information between registered and reference image (in nats)"
      />
      <MetricRow
        label="PROCESSING TIME"
        value={processingMs}
        format={(v) => v < 1000 ? `${v.toFixed(0)} ms` : `${(v / 1000).toFixed(2)} s`}
      />

      {jobStatus === 'idle' && (
        <p className="text-xs text-slate-600 text-center mt-4 italic">
          Upload images and run registration to compute metrics.
        </p>
      )}
    </motion.aside>
  );
};
