import React from 'react';
import {
  FileText,
  Sliders,
  Crosshair,
  Box,
  BarChart3,
  FileCheck,
  History,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { RunFacet } from '../../types/workspace';

interface RunFacetNavProps {
  tabId: string;
}

const FACETS: { id: RunFacet; label: string; key: string; icon: React.ReactNode }[] = [
  { id: 'metadata', label: 'METADATA', key: '1', icon: <FileText size={12} /> },
  { id: 'preprocessing', label: 'PREPROCESSING', key: '2', icon: <Sliders size={12} /> },
  { id: 'matches', label: 'MATCHES', key: '3', icon: <Crosshair size={12} /> },
  { id: '3dview', label: '3D VIEW', key: '4', icon: <Box size={12} /> },
  { id: 'metrics', label: 'METRICS', key: '5', icon: <BarChart3 size={12} /> },
  { id: 'report', label: 'REPORT', key: '6', icon: <FileCheck size={12} /> },
  { id: 'provenance', label: 'PROVENANCE', key: '7', icon: <History size={12} /> },
];

export const RunFacetNav: React.FC<RunFacetNavProps> = ({ tabId }) => {
  const { tabs, setTabFacet } = useWorkspaceStore();
  const currentTab = tabs.find((t) => t.id === tabId);
  const activeFacet = currentTab?.activeFacet || 'matches';

  return (
    <div className="w-full h-8 bg-[#0c0f16] border-b border-[#181e2b] flex items-center justify-between px-3 text-xs font-mono select-none">
      {/* Facet Buttons */}
      <div className="flex items-center gap-1">
        {FACETS.map((facet) => {
          const isActive = activeFacet === facet.id;
          return (
            <button
              key={facet.id}
              type="button"
              onClick={() => setTabFacet(tabId, facet.id)}
              className={`flex items-center gap-1.5 h-6 px-2.5 rounded-none text-[11px] font-mono tracking-wider transition-colors ${
                isActive
                  ? 'bg-[#182030] text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111622]'
              }`}
            >
              {facet.icon}
              <span>{facet.label}</span>
              <span className="text-[9px] text-slate-500 font-normal">[{facet.key}]</span>
            </button>
          );
        })}
      </div>

      {/* Right Metadata / Quality Tag */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        {currentTab?.jobStatus === 'running' && (
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            SOLVING CORRESPONDENCE FIELD…
          </span>
        )}
        {currentTab?.result && (
          <span className="text-emerald-400 font-semibold">
            INLIERS: {currentTab.result.metrics.inlier_count ?? 0} (
            {((currentTab.result.metrics.inlier_ratio ?? 0) * 100).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
};
