import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Cpu,
  Flame,
  Scale,
  Activity,
  FileCode,
  X,
  Pin,
  Plus,
  Columns,
  Square,
  HelpCircle,
  Command,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { TabKind } from '../../types/workspace';

export const TabBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    selectTab,
    closeTab,
    closeOtherTabs,
    pinTab,
    duplicateTab,
    addRunTab,
    addToolTab,
    isSplitView,
    toggleSplitView,
    setCommandPaletteOpen,
    setShortcutsOpen,
  } = useWorkspaceStore();

  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabIcon = (kind: TabKind) => {
    switch (kind) {
      case 'run':
        return <Layers size={13} className="text-cyan-400" />;
      case 'model-registry':
        return <Cpu size={13} className="text-amber-400" />;
      case 'fine-tune':
        return <Flame size={13} className="text-orange-400" />;
      case 'benchmarks':
        return <Scale size={13} className="text-cyan-300" />;
      case 'ops':
        return <Activity size={13} className="text-green-400" />;
      case 'changelog':
        return <FileCode size={13} className="text-indigo-400" />;
      case 'datasets':
        return <Layers size={13} className="text-slate-400" />;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      tabId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <header className="relative w-full h-11 bg-[#090b10] border-b border-[#1c2230] flex items-center justify-between px-2 select-none z-40">
      {/* Left: Brand Identity & Session Marker */}
      <div className="flex items-center gap-2 pr-3 border-r border-[#1c2230] shrink-0">
        <div className="w-6 h-6 border border-cyan-500/60 bg-cyan-950/40 flex items-center justify-center font-mono text-[10px] font-bold text-cyan-400 tracking-wider">
          LU
        </div>
        <div>
          <div className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 leading-none">
            LUNARIS
          </div>
          <div className="text-[8px] font-mono text-slate-500 tracking-wider leading-none mt-0.5">
            ISRO #26166
          </div>
        </div>
      </div>

      {/* Center: Scrollable Tab Strip */}
      <div className="flex-1 flex items-center h-full overflow-x-auto no-scrollbar mx-2 gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              className={`group relative flex items-center gap-2 h-8 px-3 border cursor-pointer transition-colors shrink-0 text-xs font-mono ${
                isActive
                  ? 'bg-[#121622] border-cyan-500/50 text-slate-100'
                  : 'bg-[#0b0e14] border-[#1a1f2c] text-slate-400 hover:bg-[#0f121a] hover:text-slate-200'
              }`}
              style={{ maxWidth: 260 }}
            >
              {/* Tab Icon */}
              <div className="shrink-0">{getTabIcon(tab.kind)}</div>

              {/* Title & Subtitle */}
              <div className="flex flex-col min-w-0 overflow-hidden text-left">
                <span className="truncate text-[11px] font-semibold leading-tight tracking-tight">
                  {tab.title}
                </span>
                {tab.subtitle && (
                  <span className="truncate text-[9px] text-slate-500 leading-none">
                    {tab.subtitle}
                  </span>
                )}
              </div>

              {/* Modified indicator dot */}
              {tab.isModified && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved modifications" />
              )}

              {/* Pin indicator */}
              {tab.isPinned && (
                <Pin size={10} className="text-cyan-500/70 shrink-0" />
              )}

              {/* Close Button */}
              {!tab.isPinned && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-950/60 hover:text-red-400 rounded transition-opacity text-slate-500"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add New Run Button */}
        <button
          type="button"
          onClick={() => addRunTab()}
          title="New Lunar Registration Workspace (Ctrl+N)"
          className="flex items-center gap-1 h-8 px-2.5 bg-[#0b0e14] hover:bg-[#121622] border border-[#1a1f2c] hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 text-xs font-mono transition-colors shrink-0"
        >
          <Plus size={12} />
          <span className="text-[10px]">NEW RUN</span>
        </button>
      </div>

      {/* Right Tools & Viewport Split Controls */}
      <div className="flex items-center gap-1 pl-2 border-l border-[#1c2230] shrink-0">
        {/* Tool shortcuts */}
        <button
          type="button"
          onClick={() => addToolTab('benchmarks')}
          title="Classical SIFT vs Deep Matchers Benchmark"
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-[#121622] rounded transition-colors"
        >
          <Scale size={14} />
        </button>
        <button
          type="button"
          onClick={() => addToolTab('fine-tune')}
          title="Physical Relighting Fine-Tuner"
          className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-[#121622] rounded transition-colors"
        >
          <Flame size={14} />
        </button>
        <button
          type="button"
          onClick={() => addToolTab('model-registry')}
          title="Model Registry & Staging Gate"
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-[#121622] rounded transition-colors"
        >
          <Cpu size={14} />
        </button>
        <button
          type="button"
          onClick={() => addToolTab('changelog')}
          title="Release Changelog & Documentation"
          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-[#121622] rounded transition-colors"
        >
          <FileCode size={14} />
        </button>

        <div className="w-[1px] h-4 bg-[#1c2230] mx-1" />

        {/* Split View Toggle */}
        <button
          type="button"
          onClick={toggleSplitView}
          title={isSplitView ? 'Collapse to Single Pane' : 'Split Workspace into Dual Panes'}
          className={`p-1.5 rounded transition-colors ${
            isSplitView
              ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#121622]'
          }`}
        >
          {isSplitView ? <Columns size={14} /> : <Square size={14} />}
        </button>

        {/* Command Palette Button */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (Ctrl+K)"
          className="flex items-center gap-1 px-2 py-1 bg-[#121622] hover:bg-cyan-950/50 border border-[#1f2638] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded text-[10px] font-mono transition-colors"
        >
          <Command size={11} />
          <span>K</span>
        </button>

        {/* Shortcuts Help */}
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard Shortcuts (?)"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#121622] rounded transition-colors"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#0f121a] border border-[#242c3d] shadow-2xl py-1 text-xs font-mono text-slate-200 w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-950/50 hover:text-cyan-400"
            onClick={() => {
              pinTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Pin / Unpin Tab
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-950/50 hover:text-cyan-400"
            onClick={() => {
              duplicateTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Duplicate Run
          </button>
          <div className="w-full h-[1px] bg-[#1f2638] my-1" />
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-cyan-950/50 hover:text-cyan-400"
            onClick={() => {
              closeOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close Others
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-1.5 hover:bg-red-950/60 hover:text-red-400"
            onClick={() => {
              closeTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            Close Tab
          </button>
        </div>
      )}
    </header>
  );
};
