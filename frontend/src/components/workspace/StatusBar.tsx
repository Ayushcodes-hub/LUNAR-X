import React from 'react';
import {
  Terminal,
  Grid,
  Cpu,
  Zap,
  Radio,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useStore } from '../../store';

export const StatusBar: React.FC = () => {
  const {
    cursorPosition,
    zoomFactor,
    graticuleVisible,
    toggleGraticule,
    isLogDrawerOpen,
    toggleLogDrawer,
  } = useWorkspaceStore();

  const events = useStore((s) => s.events);
  const jobStatus = useStore((s) => s.jobStatus);

  // Real backend health telemetry polled every 3s
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 3000,
  });

  return (
    <footer className="w-full h-7 bg-[#07090e] border-t border-[#181d28] flex items-center justify-between px-3 text-[11px] font-mono text-slate-400 select-none z-40 shrink-0">
      {/* Left: Geodetic Cursor Readout & Scale */}
      <div className="flex items-center gap-4">
        {/* Pixel & Planetary Coordinates */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">CURSOR:</span>
          <span className="text-slate-200 tabular-nums">
            X:{cursorPosition.pixelX.toFixed(1)} Y:{cursorPosition.pixelY.toFixed(1)} px
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 tabular-nums">
            {cursorPosition.latDeg ? `${cursorPosition.latDeg.toFixed(4)}° S` : '—'}
          </span>
          <span className="text-cyan-400 tabular-nums">
            {cursorPosition.lonDeg ? `${cursorPosition.lonDeg.toFixed(4)}° E` : '—'}
          </span>
          {cursorPosition.elevationM !== undefined && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400/90 tabular-nums">
                ALT: {cursorPosition.elevationM.toFixed(1)} m
              </span>
            </>
          )}
        </div>

        <div className="w-[1px] h-3.5 bg-[#181d28]" />

        {/* Spatial Resolution (GSD) & Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">GSD:</span>
          <span className="text-slate-300 font-semibold tabular-nums">
            {cursorPosition.gsdMeters.toFixed(2)} m/px
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 tabular-nums">
            ZOOM: {zoomFactor.toFixed(1)}×
          </span>
        </div>

        {/* Graticule Grid Toggle */}
        <button
          type="button"
          onClick={toggleGraticule}
          title="Toggle Geodetic Graticule Grid Overlay"
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
            graticuleVisible
              ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Grid size={11} />
          <span>GRATICULE {graticuleVisible ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Right: Telemetry, Hardware & Log Drawer Trigger */}
      <div className="flex items-center gap-4">
        {/* Geodetic Datum */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500">
          <span>DATUM:</span>
          <span className="text-slate-400">IAU Moon 2000 Sphere</span>
        </div>

        <div className="w-[1px] h-3.5 bg-[#181d28]" />

        {/* Real CPU Telemetry */}
        <div className="flex items-center gap-1">
          <Cpu size={11} className="text-cyan-500" />
          <span className="tabular-nums text-slate-300">
            {health ? `${health.cpu_percent.toFixed(0)}%` : '—'}
          </span>
        </div>

        {/* Real GPU Device Indicator */}
        <div className="flex items-center gap-1">
          <Zap size={11} className={health?.gpu_available ? 'text-emerald-400' : 'text-slate-500'} />
          <span className={`text-[10px] font-semibold ${health?.gpu_available ? 'text-emerald-400' : 'text-slate-500'}`}>
            {health?.gpu_available ? health.gpu_name || 'CUDA:0' : 'CPU FALLBACK'}
          </span>
        </div>

        <div className="w-[1px] h-3.5 bg-[#181d28]" />

        {/* Link / WebSocket Status */}
        <div className="flex items-center gap-1.5">
          <Radio size={11} className={jobStatus === 'running' ? 'text-cyan-400 animate-pulse' : 'text-emerald-400'} />
          <span className="text-[10px] text-emerald-400 font-semibold">
            LINK NOMINAL
          </span>
        </div>

        <div className="w-[1px] h-3.5 bg-[#181d28]" />

        {/* Terminal Log Drawer Button */}
        <button
          type="button"
          onClick={toggleLogDrawer}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
            isLogDrawerOpen
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
              : 'bg-[#10141e] text-slate-400 hover:text-slate-200 hover:bg-[#161c2a]'
          }`}
        >
          <Terminal size={11} />
          <span>EVENTS [{events.length}]</span>
        </button>

        {/* Build & Version Stamp */}
        <span className="text-[9px] text-slate-600 font-mono">
          v2.4.1-rc3 · ISRO-SAC
        </span>
      </div>
    </footer>
  );
};
