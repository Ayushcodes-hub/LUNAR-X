import React from 'react';
import { TabBar } from './TabBar';
import { RunFacetNav } from './RunFacetNav';
import { StatusBar } from './StatusBar';
import { LogDrawer } from './LogDrawer';
import { InspectorPanel } from './InspectorPanel';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { RunFacetView } from './RunFacetView';
import { ControlPanel } from '../ControlPanel';
import { ModelRegistryPage } from '../../pages/ModelRegistryPage';
import { FineTunePage } from '../../pages/FineTunePage';
import { ComparePage } from '../../pages/ComparePage';
import { OpsDashboardPage } from '../../pages/OpsDashboardPage';
import { ChangelogPage } from '../../pages/ChangelogPage';
import { DatasetsPage } from '../../pages/DatasetsPage';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useStore } from '../../store';
import { api } from '../../services/api';
import type { WorkspaceTab } from '../../types/workspace';

export const WorkspaceLayout: React.FC = () => {
  const { tabs, activeTabId, splitTabId, isSplitView } = useWorkspaceStore();

  const refImage = useStore((s) => s.refImage);
  const tgtImage = useStore((s) => s.tgtImage);
  const params = useStore((s) => s.params);
  const setJobId = useStore((s) => s.setJobId);
  const setJobStatus = useStore((s) => s.setJobStatus);
  const clearEvents = useStore((s) => s.clearEvents);
  const setLiveMetrics = useStore((s) => s.setLiveMetrics);
  const setResult = useStore((s) => s.setResult);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const splitTab = tabs.find((t) => t.id === splitTabId);

  const handleRunRegistration = async () => {
    if (!refImage || !tgtImage) return;

    clearEvents();
    setLiveMetrics({});
    setResult(null);
    setJobStatus('running');

    try {
      const fullParams = {
        reference_path: refImage.path,
        target_path: tgtImage.path,
        matcher: params.matcher ?? 'roma',
        backbone: params.backbone ?? 'dinov2_vits14',
        preprocessing: params.preprocessing ?? 'clahe',
        refinement_method: params.refinement_method ?? 'phase_correlation',
        ransac_threshold: params.ransac_threshold ?? 3.5,
        ratio_threshold: params.ratio_threshold ?? 0.75,
        max_features: params.max_features ?? 8000,
        grid_n: params.grid_n ?? 8,
        grid_m: params.grid_m ?? 8,
      };

      const res = await api.createJob(fullParams);
      setJobId(res.job_id);
    } catch (e) {
      console.error('Failed to dispatch registration job:', e);
      setJobStatus('failed');
    }
  };

  const renderTabContent = (tab: WorkspaceTab) => {
    switch (tab.kind) {
      case 'run':
        return (
          <div className="relative w-full h-full flex flex-col overflow-hidden">
            {/* Secondary Sub-Tab Row */}
            <RunFacetNav tabId={tab.id} />

            {/* Facet Body */}
            <div className="relative flex-1 w-full h-full overflow-hidden flex">
              {/* Optional Control Panel (shown when on Matches tab) */}
              {tab.activeFacet === 'matches' && (
                <div className="hidden xl:block w-72 h-full border-r border-[#1a1f2c] shrink-0 overflow-y-auto bg-[#090c12]">
                  <ControlPanel onRun={handleRunRegistration} />
                </div>
              )}

              {/* Main Facet Viewport */}
              <div className="flex-1 w-full h-full overflow-hidden">
                <RunFacetView tab={tab} onRunRegistration={handleRunRegistration} />
              </div>
            </div>
          </div>
        );
      case 'model-registry':
        return <ModelRegistryPage />;
      case 'fine-tune':
        return <FineTunePage />;
      case 'benchmarks':
        return <ComparePage />;
      case 'ops':
        return <OpsDashboardPage />;
      case 'changelog':
        return <ChangelogPage />;
      case 'datasets':
        return <DatasetsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#06080c] text-slate-200 font-sans flex flex-col select-none">
      {/* 1. Primary Multi-Tab Strip */}
      <TabBar />

      {/* 2. Main Workspace Viewport (Single or Split Pane) */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Left Pane (Active Tab) */}
        <div className={`relative h-full flex flex-col overflow-hidden ${isSplitView ? 'w-1/2 border-r border-[#1c2230]' : 'w-full'}`}>
          {activeTab && renderTabContent(activeTab)}
        </div>

        {/* Right Pane (Split Tab if active) */}
        {isSplitView && (
          <div className="relative w-1/2 h-full flex flex-col overflow-hidden bg-[#07090e]">
            {splitTab ? (
              renderTabContent(splitTab)
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-600">
                Select a secondary tab to view side by side.
              </div>
            )}
          </div>
        )}

        {/* 3. Contextual Right-Side Inspector Panel */}
        <InspectorPanel />
      </div>

      {/* 4. Collapsible Streaming Log Drawer */}
      <LogDrawer />

      {/* 5. Persistent Bottom GIS Status Bar */}
      <StatusBar />

      {/* 6. Power-User Command Palette & Shortcuts */}
      <CommandPalette />
      <KeyboardShortcutsModal />
    </div>
  );
};
