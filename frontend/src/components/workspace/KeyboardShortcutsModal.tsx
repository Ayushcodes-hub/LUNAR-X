import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShortcutsOpen(!isShortcutsOpen);
      }
      if (e.key === 'Escape' && isShortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, setShortcutsOpen]);

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K', description: 'Open Command Palette' },
    { key: '1 - 7', description: 'Switch Run Sub-Tabs (Metadata, Matches, 3D, etc.)' },
    { key: 'G', description: 'Toggle Geodetic Graticule Grid' },
    { key: 'S', description: 'Toggle Dual Split-Pane Workspace' },
    { key: 'L', description: 'Toggle Telemetry Event Console' },
    { key: 'I', description: 'Toggle Contextual Inspector' },
    { key: '?', description: 'Open Keyboard Shortcuts Reference' },
    { key: 'Esc', description: 'Close modal, palette, or inspector' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center select-none font-mono">
      <div className="w-full max-w-md bg-[#0d1017] border border-[#222a3a] shadow-2xl overflow-hidden text-xs">
        <div className="h-10 bg-[#090b10] border-b border-[#1c2333] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs tracking-wider">
            <Keyboard size={15} />
            <span>KEYBOARD SHORTCUTS REFERENCE</span>
          </div>
          <button
            type="button"
            onClick={() => setShortcutsOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-2 bg-[#0a0d13]">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 border-b border-[#161c28] last:border-0"
            >
              <span className="text-slate-300">{sc.description}</span>
              <kbd className="px-2 py-0.5 bg-[#141a26] border border-[#222b3d] text-cyan-400 font-bold text-[10px] rounded-none">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-[#080a0f] border-t border-[#181e2b] text-[10px] text-slate-500 flex justify-between">
          <span>Enterprise GIS Controls</span>
          <span className="text-slate-400">Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
