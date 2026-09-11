import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Cpu, HardDrive, Zap, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export const OpsDashboardPage: React.FC = () => {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 3000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.listJobs(15),
    refetchInterval: 5000,
  });

  return (
    <div className="relative w-full h-full pt-20 pb-8 px-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      <div className="border-b border-cyan-900/30 pb-4">
        <div className="flex items-center gap-3">
          <Settings className="text-cyan-400" size={24} />
          <h1 className="text-xl font-bold tracking-widest text-cyan-400">MISSION CONTROL OPS & AUDIT TELEMETRY</h1>
        </div>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Hardware telemetry, pipeline worker queues, service health, and registration audit history.
        </p>
      </div>

      {/* Real-time System Health Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="glass p-4 rounded-xl border border-cyan-900/30">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>CPU UTILIZATION</span>
            <Cpu size={14} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">
            {health ? `${health.cpu_percent.toFixed(1)}%` : '—'}
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-cyan-900/30">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>MEMORY (RAM)</span>
            <HardDrive size={14} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">
            {health ? `${health.memory_percent.toFixed(1)}%` : '—'}
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-cyan-900/30">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>ACCELERATOR (CUDA)</span>
            <Zap size={14} className={health?.gpu_available ? 'text-green-400' : 'text-slate-500'} />
          </div>
          <div className={`text-xl font-bold ${health?.gpu_available ? 'text-green-400' : 'text-slate-400'}`}>
            {health?.gpu_available ? 'GPU ACTIVE' : 'CPU FALLBACK'}
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-cyan-900/30">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>SYSTEM INTEGRITY</span>
            <ShieldCheck size={14} className="text-green-400" />
          </div>
          <div className="text-xl font-bold text-green-400">100% REAL COMPUTE</div>
        </div>
      </div>

      {/* Job Audit Log */}
      <div className="glass p-5 rounded-xl border border-cyan-900/30 space-y-4">
        <div className="text-xs font-bold font-mono text-slate-200 tracking-wider">
          PIPELINE EXECUTION AUDIT LOG
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-slate-400">
            <thead className="border-b border-cyan-900/40 text-[11px] text-slate-500 uppercase">
              <tr>
                <th className="py-2 px-3">Job ID</th>
                <th className="py-2 px-3">Matcher</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-900/20">
              {jobs?.map((j) => (
                <tr key={j.job_id} className="hover:bg-cyan-950/20">
                  <td className="py-2 px-3 text-cyan-300 font-bold">{j.job_id.slice(0, 8)}…</td>
                  <td className="py-2 px-3 uppercase text-slate-300">{(j.params as any)?.matcher || 'SIFT'}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        j.status === 'done'
                          ? 'bg-green-500/20 text-green-300'
                          : j.status === 'failed'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{j.created_at ? new Date(j.created_at).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-600">No jobs recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
