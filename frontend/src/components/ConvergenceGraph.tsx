// ConvergenceGraph — live Recharts graph of real pipeline convergence history
// Only rendered after real data arrives — never pre-populated with fake curves
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store';
import type { IterationMetric } from '../types/api';

interface ChartPoint {
  iteration: number;
  loss: number;
  similarity: number;
  delta_x_px: number;
  delta_y_px: number;
  confidence: number;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string | number }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass p-3 text-xs font-mono" style={{ minWidth: 160 }}>
      <div className="text-slate-400 mb-2">Iteration {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const ConvergenceGraph: React.FC = () => {
  const result = useStore((s) => s.result);
  const events = useStore((s) => s.events);

  // Collect convergence history from final result or live events
  const history: IterationMetric[] = React.useMemo(() => {
    if (result?.convergence_history?.length) return result.convergence_history;
    // Try to extract from extra in subpixel_refinement event
    const spEvent = [...events].reverse().find((e) => e.stage === 'subpixel_refinement' && e.status === 'done');
    if (spEvent?.extra?.convergence_history) {
      return spEvent.extra.convergence_history as IterationMetric[];
    }
    return [];
  }, [result, events]);

  if (!history.length) {
    return (
      <div className="glass flex items-center justify-center" style={{ height: 200 }}>
        <p className="text-xs text-slate-600 font-mono italic">
          Convergence graph — available after sub-pixel refinement
        </p>
      </div>
    );
  }

  const data: ChartPoint[] = history.map((m) => ({
    iteration: m.iteration,
    loss: parseFloat(m.loss.toFixed(4)),
    similarity: parseFloat(m.similarity.toFixed(4)),
    delta_x_px: parseFloat(m.delta_x_px.toFixed(4)),
    delta_y_px: parseFloat(m.delta_y_px.toFixed(4)),
    confidence: parseFloat(m.confidence.toFixed(4)),
  }));

  return (
    <div className="glass p-4">
      <div className="text-xs text-slate-500 tracking-widest mb-3">CONVERGENCE HISTORY</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="iteration"
            tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
            label={{ value: 'iter', position: 'insideBottom', fontSize: 9, fill: '#475569' }}
          />
          <YAxis tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}
          />
          <Line type="monotone" dataKey="loss" stroke="#f87171" dot={false} strokeWidth={1.5} name="loss" />
          <Line type="monotone" dataKey="similarity" stroke="#22d3ee" dot={false} strokeWidth={1.5} name="similarity" />
          <Line type="monotone" dataKey="confidence" stroke="#4ade80" dot={false} strokeWidth={1} name="confidence" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-600 mt-2 font-mono">
        {data.length} iterations · Real convergence data from {result ? 'completed job' : 'live stream'}
      </p>
    </div>
  );
};
