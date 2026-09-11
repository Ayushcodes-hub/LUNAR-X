import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceTab, RunFacet, TabKind, InspectorState, CursorPosition } from '../types/workspace';

interface WorkspaceStore {
  // Tabs
  tabs: WorkspaceTab[];
  activeTabId: string;
  splitTabId: string | null;
  isSplitView: boolean;

  // Tab Operations
  selectTab: (id: string) => void;
  selectSplitTab: (id: string | null) => void;
  toggleSplitView: () => void;
  addRunTab: (title?: string) => string;
  addToolTab: (kind: TabKind) => string;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  pinTab: (id: string) => void;
  duplicateTab: (id: string) => string;
  setTabFacet: (tabId: string, facet: RunFacet) => void;
  updateTab: (tabId: string, partial: Partial<WorkspaceTab>) => void;

  // Viewport & Cursor Telemetry
  cursorPosition: CursorPosition;
  setCursorPosition: (pos: CursorPosition) => void;
  zoomFactor: number;
  setZoomFactor: (zoom: number) => void;
  graticuleVisible: boolean;
  toggleGraticule: () => void;

  // Drawer / Inspector / Modals
  isLogDrawerOpen: boolean;
  toggleLogDrawer: () => void;
  inspector: InspectorState;
  openInspector: (targetType: InspectorState['targetType'], targetData: any) => void;
  closeInspector: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

const DEFAULT_TABS: WorkspaceTab[] = [
  {
    id: 'run-primary',
    kind: 'run',
    title: 'RUN-01: OHRC_CH2 · LRO_NAC',
    subtitle: 'Boguslawsky Crater (72.9° S, 43.3° E)',
    activeFacet: 'matches',
    isPinned: true,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {
      matcher: 'roma',
      backbone: 'dinov2_vits14',
      preprocessing: 'clahe',
      refinement_method: 'phase_correlation',
      ransac_threshold: 3.5,
      ratio_threshold: 0.75,
      max_features: 8000,
      grid_n: 8,
      grid_m: 8,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tool-registry',
    kind: 'model-registry',
    title: 'MODEL REGISTRY',
    subtitle: 'MLflow Checkpoint Staging & Verification',
    activeFacet: 'metadata',
    isPinned: false,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tool-finetune',
    kind: 'fine-tune',
    title: 'HAPKE RELIGHTING FINE-TUNER',
    subtitle: 'Self-Supervised Contrastive Domain Adaptation',
    activeFacet: 'metadata',
    isPinned: false,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tool-benchmarks',
    kind: 'benchmarks',
    title: 'CLASSICAL VS DEEP BENCHMARKS',
    subtitle: 'Empirical Verification on Lunar Pairs',
    activeFacet: 'metadata',
    isPinned: false,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tool-ops',
    kind: 'ops',
    title: 'MISSION OPS CONSOLE',
    subtitle: 'Cluster Resources, Queue & Telemetry',
    activeFacet: 'metadata',
    isPinned: false,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tool-changelog',
    kind: 'changelog',
    title: 'RELEASE NOTES & PROVENANCE',
    subtitle: 'v2.4.1-rc3 · ISRO PS #26166 Changelog',
    activeFacet: 'metadata',
    isPinned: false,
    isModified: false,
    refImage: null,
    tgtImage: null,
    jobId: null,
    jobStatus: 'idle',
    result: null,
    params: {},
    createdAt: new Date().toISOString(),
  },
];

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      tabs: DEFAULT_TABS,
      activeTabId: 'run-primary',
      splitTabId: 'tool-benchmarks',
      isSplitView: false,

      selectTab: (id: string) => set({ activeTabId: id }),
      selectSplitTab: (id: string | null) => set({ splitTabId: id }),
      toggleSplitView: () => set((s) => ({ isSplitView: !s.isSplitView })),

      addRunTab: (title?: string) => {
        const id = `run-${Date.now().toString(36)}`;
        const newRunNumber = get().tabs.filter((t) => t.kind === 'run').length + 1;
        const newTab: WorkspaceTab = {
          id,
          kind: 'run',
          title: title || `RUN-0${newRunNumber}: CH2 · LRO`,
          subtitle: 'Active Lunar Registration Workspace',
          activeFacet: 'metadata',
          isPinned: false,
          isModified: false,
          refImage: null,
          tgtImage: null,
          jobId: null,
          jobStatus: 'idle',
          result: null,
          params: {
            matcher: 'roma',
            backbone: 'dinov2_vits14',
            preprocessing: 'clahe',
            refinement_method: 'phase_correlation',
            ransac_threshold: 3.5,
            ratio_threshold: 0.75,
            max_features: 8000,
            grid_n: 8,
            grid_m: 8,
          },
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          tabs: [...s.tabs, newTab],
          activeTabId: id,
        }));
        return id;
      },

      addToolTab: (kind: TabKind) => {
        const existing = get().tabs.find((t) => t.kind === kind);
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }
        const titles: Record<TabKind, { title: string; subtitle: string }> = {
          run: { title: 'RUN', subtitle: 'Registration Workspace' },
          'model-registry': { title: 'MODEL REGISTRY', subtitle: 'Staging & Verification' },
          'fine-tune': { title: 'HAPKE RELIGHTING FINE-TUNER', subtitle: 'Domain Adaptation' },
          benchmarks: { title: 'CLASSICAL VS DEEP BENCHMARKS', subtitle: 'SIFT vs RoMa' },
          ops: { title: 'MISSION OPS CONSOLE', subtitle: 'Cluster Health' },
          changelog: { title: 'RELEASE NOTES & PROVENANCE', subtitle: 'Technical Changelog' },
          datasets: { title: 'DATASET REPOSITORY', subtitle: 'Raw PDS & Rasters' },
        };
        const id = `tool-${kind}`;
        const newTab: WorkspaceTab = {
          id,
          kind,
          title: titles[kind].title,
          subtitle: titles[kind].subtitle,
          activeFacet: 'metadata',
          isPinned: false,
          isModified: false,
          refImage: null,
          tgtImage: null,
          jobId: null,
          jobStatus: 'idle',
          result: null,
          params: {},
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          tabs: [...s.tabs, newTab],
          activeTabId: id,
        }));
        return id;
      },

      closeTab: (id: string) => {
        const currentTabs = get().tabs;
        const tabToClose = currentTabs.find((t) => t.id === id);
        if (tabToClose?.isPinned) return; // cannot close pinned tab
        const nextTabs = currentTabs.filter((t) => t.id !== id);
        if (nextTabs.length === 0) return;

        let nextActive = get().activeTabId;
        if (nextActive === id) {
          const closedIndex = currentTabs.findIndex((t) => t.id === id);
          const newIndex = Math.max(0, closedIndex - 1);
          nextActive = nextTabs[newIndex].id;
        }
        set({
          tabs: nextTabs,
          activeTabId: nextActive,
          splitTabId: get().splitTabId === id ? null : get().splitTabId,
        });
      },

      closeOtherTabs: (id: string) => {
        const currentTabs = get().tabs;
        const nextTabs = currentTabs.filter((t) => t.id === id || t.isPinned);
        set({
          tabs: nextTabs,
          activeTabId: id,
        });
      },

      pinTab: (id: string) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t)),
        }));
      },

      duplicateTab: (id: string) => {
        const original = get().tabs.find((t) => t.id === id);
        if (!original) return id;
        const newId = `run-${Date.now().toString(36)}`;
        const duplicate: WorkspaceTab = {
          ...original,
          id: newId,
          title: `${original.title} (COPY)`,
          isPinned: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          tabs: [...s.tabs, duplicate],
          activeTabId: newId,
        }));
        return newId;
      },

      setTabFacet: (tabId: string, facet: RunFacet) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, activeFacet: facet } : t)),
        }));
      },

      updateTab: (tabId: string, partial: Partial<WorkspaceTab>) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, ...partial } : t)),
        }));
      },

      // Viewport & Cursor Telemetry
      cursorPosition: {
        pixelX: 512,
        pixelY: 512,
        subpixelDx: 0.0,
        subpixelDy: 0.0,
        latDeg: -70.9214,
        lonDeg: 22.8415,
        elevationM: -1840.5,
        gsdMeters: 0.25,
      },
      setCursorPosition: (pos: CursorPosition) => set({ cursorPosition: pos }),

      zoomFactor: 1.0,
      setZoomFactor: (zoom: number) => set({ zoomFactor: zoom }),

      graticuleVisible: true,
      toggleGraticule: () => set((s) => ({ graticuleVisible: !s.graticuleVisible })),

      // Drawer / Inspector / Modals
      isLogDrawerOpen: false,
      toggleLogDrawer: () => set((s) => ({ isLogDrawerOpen: !s.isLogDrawerOpen })),

      inspector: {
        isOpen: false,
        targetType: null,
        targetData: null,
      },
      openInspector: (targetType, targetData) =>
        set({
          inspector: {
            isOpen: true,
            targetType,
            targetData,
          },
        }),
      closeInspector: () =>
        set((s) => ({
          inspector: {
            ...s.inspector,
            isOpen: false,
          },
        })),

      isCommandPaletteOpen: false,
      setCommandPaletteOpen: (open: boolean) => set({ isCommandPaletteOpen: open }),

      isShortcutsOpen: false,
      setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
    }),
    {
      name: 'lunaris_workspace_v2_storage',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        splitTabId: state.splitTabId,
        isSplitView: state.isSplitView,
        graticuleVisible: state.graticuleVisible,
      }),
    }
  )
);
