// Zustand store for global pipeline state
import { create } from 'zustand';
import type { ImageMeta, JobParams, JobResult, MetricsSnapshot, PipelineEvent } from '../types/api';

export type AppPage = 'registration' | 'datasets' | 'analysis' | 'settings';

interface RegistrationStore {
  // Images
  refImage: ImageMeta | null;
  tgtImage: ImageMeta | null;
  setRefImage: (img: ImageMeta | null) => void;
  setTgtImage: (img: ImageMeta | null) => void;

  // Job
  jobId: string | null;
  jobStatus: 'idle' | 'running' | 'done' | 'failed';
  setJobId: (id: string | null) => void;
  setJobStatus: (s: 'idle' | 'running' | 'done' | 'failed') => void;

  // Pipeline events (real SSE data)
  events: PipelineEvent[];
  addEvent: (e: PipelineEvent) => void;
  clearEvents: () => void;

  // Live metrics from SSE (real computed values only)
  liveMetrics: MetricsSnapshot;
  setLiveMetrics: (m: MetricsSnapshot) => void;

  // Final result
  result: JobResult | null;
  setResult: (r: JobResult | null) => void;

  // Pipeline params
  params: Partial<JobParams>;
  setParams: (p: Partial<JobParams>) => void;

  // Viewer mode
  viewerMode: 'reference' | 'target' | 'overlay' | 'difference' | 'blink' | 'split' | 'result' | 'heatmap' | 'matches' | 'grid';
  setViewerMode: (m: RegistrationStore['viewerMode']) => void;
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;

  // UI
  currentPage: AppPage;
  setCurrentPage: (p: AppPage) => void;
}

export const useStore = create<RegistrationStore>((set) => ({
  refImage: null,
  tgtImage: null,
  setRefImage: (img) => set({ refImage: img }),
  setTgtImage: (img) => set({ tgtImage: img }),

  jobId: null,
  jobStatus: 'idle',
  setJobId: (id) => set({ jobId: id }),
  setJobStatus: (s) => set({ jobStatus: s }),

  events: [],
  addEvent: (e) => set((state) => ({ events: [...state.events.slice(-100), e] })),
  clearEvents: () => set({ events: [] }),

  liveMetrics: {},
  setLiveMetrics: (m) => set({ liveMetrics: m }),

  result: null,
  setResult: (r) => set({ result: r }),

  params: {
    matcher: 'sift',
    preprocessing: 'clahe',
    refinement_method: 'phase_correlation',
    ransac_threshold: 4.0,
    ratio_threshold: 0.75,
    max_features: 8000,
    grid_n: 8,
    grid_m: 8,
  },
  setParams: (p) => set((state) => ({ params: { ...state.params, ...p } })),

  viewerMode: 'overlay',
  setViewerMode: (m) => set({ viewerMode: m }),
  overlayOpacity: 0.5,
  setOverlayOpacity: (v) => set({ overlayOpacity: v }),

  currentPage: 'registration',
  setCurrentPage: (p) => set({ currentPage: p }),
}));
