import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Cpu, MemoryStick, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';
import type { AppPage } from '../store';

const NAV_PAGES: { id: AppPage; label: string }[] = [
  { id: 'registration', label: 'REGISTRATION' },
  { id: 'datasets', label: 'DATASETS' },
  { id: 'analysis', label: 'ANALYSIS' },
  { id: 'settings', label: 'SETTINGS' },
];

export const TopNav: React.FC = () => {
  const currentPage = useStore((s) => s.currentPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const jobStatus = useStore((s) => s.jobStatus);

  // Real system health — polled every 5 seconds
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 5000,
    retry: 3,
  });

  const missionStatus =
    jobStatus === 'running' ? { label: 'REAL-TIME REGISTRATION ACTIVE', color: '#22d3ee' } :
    jobStatus === 'done'    ? { label: 'REGISTRATION COMPLETE', color: '#4ade80' } :
    jobStatus === 'failed'  ? { label: 'PIPELINE ERROR', color: '#f87171' } :
                              { label: 'SYSTEM OPERATIONAL', color: '#22d3ee' };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="glass fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{ height: 56, borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6"/>
          <circle cx="16" cy="16" r="8" stroke="#22d3ee" strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="3" fill="#22d3ee"/>
          <ellipse cx="16" cy="16" rx="14" ry="5" stroke="#22d3ee" strokeWidth="0.8" opacity="0.3" transform="rotate(-30 16 16)"/>
        </svg>
        <div>
          <div className="text-sm font-semibold tracking-widest text-cyan-400">LUNARIS</div>
          <div className="text-xs text-slate-500 tracking-wider">SIH26166</div>
        </div>
      </div>

      {/* Mission Status */}
      <div className="flex items-center gap-3">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: missionStatus.color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-xs tracking-widest font-mono" style={{ color: missionStatus.color }}>
          {missionStatus.label}
        </span>
      </div>

      {/* Right: real telemetry */}
      <div className="flex items-center gap-5">
        {/* CPU */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Cpu size={12} className="text-cyan-500" />
          <span className="font-mono">
            {health ? `${health.cpu_percent.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Memory */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MemoryStick size={12} className="text-cyan-500" />
          <span className="font-mono">
            {health ? `${health.memory_percent.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* GPU */}
        <div className="flex items-center gap-1.5 text-xs">
          <Zap size={12} style={{ color: health?.gpu_available ? '#4ade80' : '#64748b' }} />
          <span className="font-mono" style={{ color: health?.gpu_available ? '#4ade80' : '#64748b' }}>
            {health
              ? health.gpu_available
                ? 'GPU ACTIVE'
                : 'CPU ONLY'
              : '—'}
          </span>
        </div>

        {/* Nav pages */}
        <nav className="flex gap-1 ml-2">
          {NAV_PAGES.map((page) => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              className="px-3 py-1 rounded text-xs tracking-widest transition-all"
              style={{
                background: currentPage === page.id ? 'rgba(34,211,238,0.12)' : 'transparent',
                color: currentPage === page.id ? '#22d3ee' : '#64748b',
                border: currentPage === page.id ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent',
              }}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </div>
    </motion.header>
  );
};
