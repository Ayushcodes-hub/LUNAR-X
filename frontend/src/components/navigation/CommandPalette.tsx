import React, { useEffect, useState } from 'react';
import { Search, Compass, Layers, ShieldCheck, Settings, Cpu, HardDrive, Terminal } from 'lucide-react';
import { useStore } from '../../store';
import type { AppPage } from '../../store';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const setParams = useStore((s) => s.setParams);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const actions = [
    { id: 'reg', label: 'Go to Registration Command Bench', page: 'registration' as AppPage, icon: Compass },
    { id: '3d', label: 'Open 3D Terrain & Constellation Studio', page: 'registration' as AppPage, icon: Layers },
    { id: 'comp', label: 'Compare Deep Learning vs Classical Baseline', page: 'compare' as AppPage, icon: ShieldCheck },
    { id: 'tune', label: 'Open Photometric Fine-Tuning Bench', page: 'finetune' as AppPage, icon: Cpu },
    { id: 'reg_models', label: 'Model Registry & Promotion Gate', page: 'registry' as AppPage, icon: HardDrive },
    { id: 'diag', label: 'Scientific Diagnostics & Quality Report', page: 'analysis' as AppPage, icon: Terminal },
    { id: 'ops', label: 'Mission Control Ops & Audit Telemetry', page: 'ops' as AppPage, icon: Settings },
    { id: 'roma_preset', label: 'Switch Matcher to RoMa (Flagship)', action: () => setParams({ matcher: 'roma' as any }), icon: Cpu },
    { id: 'lg_preset', label: 'Switch Matcher to LightGlue (Fast)', action: () => setParams({ matcher: 'lightglue' as any }), icon: Cpu },
    { id: 'sift_preset', label: 'Switch Matcher to SIFT (Classical Baseline)', action: () => setParams({ matcher: 'sift' as any }), icon: Cpu },
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl glass rounded-xl border border-cyan-500/40 shadow-2xl overflow-hidden bg-[#0a0b14]/95">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-900/40">
          <Search size={18} className="text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to screen… (ESC to close)"
            autoFocus
            className="flex-1 bg-transparent text-sm font-mono text-slate-200 outline-none placeholder-slate-500"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.page) setCurrentPage(item.page);
                  if (item.action) item.action();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-mono text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors"
              >
                <Icon size={16} className="text-cyan-400 opacity-80" />
                <span>{item.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">No matching actions found</div>
          )}
        </div>
      </div>
    </div>
  );
};
