import type { ImageMeta, JobParams, JobResult } from './api';

export type RunFacet =
  | 'metadata'
  | 'preprocessing'
  | 'matches'
  | '3dview'
  | 'metrics'
  | 'report'
  | 'provenance';

export type TabKind =
  | 'run'
  | 'model-registry'
  | 'fine-tune'
  | 'benchmarks'
  | 'ops'
  | 'changelog'
  | 'datasets';

export interface WorkspaceTab {
  id: string;
  kind: TabKind;
  title: string;
  subtitle: string;
  activeFacet: RunFacet;
  isPinned: boolean;
  isModified: boolean;
  refImage: ImageMeta | null;
  tgtImage: ImageMeta | null;
  jobId: string | null;
  jobStatus: 'idle' | 'running' | 'done' | 'failed';
  result: JobResult | null;
  params: Partial<JobParams>;
  createdAt: string;
}

export interface InspectorState {
  isOpen: boolean;
  targetType: 'match_point' | 'sensor_metadata' | 'matrix_geometry' | 'subpixel_refinement' | null;
  targetData: any;
}

export interface CursorPosition {
  pixelX: number;
  pixelY: number;
  subpixelDx?: number;
  subpixelDy?: number;
  latDeg?: number;
  lonDeg?: number;
  elevationM?: number;
  gsdMeters: number;
}
