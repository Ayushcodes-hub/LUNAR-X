import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Cpu,
  Flame,
  Scale,
  Activity,
  FileCode,
  Play,
  Grid,
  Columns,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    tabs,
    selectTab,
    addRunTab,
    addToolTab,
    toggleSplitView,
    toggleGraticule,
    toggleLogDrawer,
  } = useWorkspaceStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const actions = [
    // Tabs navigation
    ...tabs.map((tab) => ({
      id: `tab-${tab.id}`,
      title: `Switch to: ${tab.title}`,
      subtitle: tab.subtitle || tab.kind,
      icon: <Layers size={14} className="text-cyan-400" />,
      run: () => {
        selectTab(tab.id);
        setCommandPaletteOpen(false);
      },
    })),
    // Commands
    {
      id: 'cmd-new-run',
      title: 'New Lunar Registration Workspace',
      subtitle: 'Create a new independent registration document',
      icon: <Play size={14} className="text-emerald-400" />,
      run: () => {
        addRunTab();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-benchmarks',
      title: 'Open Classical vs Deep Benchmarks',
      subtitle: 'Side-by-side empirical performance comparison',
      icon: <Scale size={14} className="text-cyan-400" />,
      run: () => {
        addToolTab('benchmarks');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-finetune',
      title: 'Open Physical Relighting Fine-Tuner',
      subtitle: 'Real PyTorch gradient descent on DEM heightmaps',
      icon: <Flame size={14} className="text-orange-400" />,
      run: () => {
        addToolTab('fine-tune');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-registry',
      title: 'Open Model Registry & Staging Gate',
      subtitle: 'Inspect MLflow model versions and promotion gates',
      icon: <Cpu size={14} className="text-amber-400" />,
      run: () => {
        addToolTab('model-registry');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-split-view',
      title: 'Toggle Split-Pane Workspace',
      subtitle: 'Compare two tabs or runs side by side',
      icon: <Columns size={14} className="text-indigo-400" />,
      run: () => {
        toggleSplitView();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-graticule',
      title: 'Toggle Geodetic Graticule Grid',
      subtitle: 'Show/hide planetary latitude and longitude overlay',
      icon: <Grid size={14} className="text-cyan-400" />,
      run: () => {
        toggleGraticule();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-logs',
      title: 'Toggle Pipeline Telemetry Event Logs',
      subtitle: 'Open real-time console event stream',
      icon: <Activity size={14} className="text-green-400" />,
      run: () => {
        toggleLogDrawer();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'cmd-changelog',
      title: 'Open Release Notes & Provenance',
      subtitle: 'ISRO PS #26166 Technical Changelog and Spec',
      icon: <FileCode size={14} className="text-slate-400" />,
      run: () => {
        addToolTab('changelog');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 select-none">
      <div className="w-full max-w-xl bg-[#0d1017] border border-[#222a3a] shadow-2xl overflow-hidden font-mono text-xs">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c2333] bg-[#090b10]">
          <Search size={16} className="text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to workspace tab..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5 bg-[#0a0d13]">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs italic">
              No matching commands or workspace tabs.
            </div>
          ) : (
            filtered.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={action.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#161e2e] border-l-2 border-cyan-400 text-slate-100'
                      : 'hover:bg-[#111622] text-slate-300'
                  }`}
                >
                  <div className="shrink-0">{action.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[11px] truncate leading-tight">
                      {action.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
                      {action.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-cyan-400 font-bold tracking-widest shrink-0">
                      ENTER ↵
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-[#080a0f] border-t border-[#181e2b] flex items-center justify-between text-[10px] text-slate-500">
          <span>Navigate: ↑↓ · Select: ↵ · Dismiss: ESC</span>
          <span className="text-cyan-500/80">LUNARIS COMMAND SYSTEM</span>
        </div>
      </div>
    </div>
  );
};
