// All TypeScript types mirroring backend Pydantic models exactly.
// Values are only displayed in the UI after they come from the backend.

export interface HealthService {
  name: string;
  status: 'ready' | 'unavailable' | 'configuration_required';
  detail: string;
}

export interface JobCreated {
  job_id: string;
  status: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: number;
  gpu_available: boolean;
  gpu_name: string | null;
  cpu_percent: number;
  memory_percent: number;
  matchers_available: string[];
  refinements_available: string[];
  services: HealthService[];
}

export interface ImageMeta {
  image_id: string;
  filename: string;
  path: string;
  width: number;
  height: number;
  file_size_bytes: number;
  sha256: string;
  is_synthetic: boolean;
  mission?: string | null;
  instrument?: string | null;
  resolution_m_per_px?: number | null;
  sun_azimuth_deg?: number | null;
  sun_elevation_deg?: number | null;
}

export interface SyntheticPairRequest {
  width?: number;
  height?: number;
  rotation_deg?: number;
  scale?: number;
  tx?: number;
  ty?: number;
  gamma?: number;
  seed?: number;
}

export interface SyntheticPairResponse {
  reference: ImageMeta;
  target: ImageMeta;
  ground_truth: {
    metadata: {
      generated_at: string;
      label: string;
      generator_script: string;
    };
    source: {
      synthetic_surface: boolean;
      width: number;
      height: number;
    };
    transform: {
      rotation_deg: number;
      scale: number;
      translation_x_px: number;
      translation_y_px: number;
      homography_matrix_3x3: number[][];
    };
    relighting: {
      gamma: number;
    };
  };
}

export interface SampleDatasetItem {
  id: string;
  name: string;
  description: string;
  mission_pair: string;
  sensor_pair: string;
  target_region: string;
  resolution: string;
  illumination_delta: string;
  scale_ratio: string;
  reference_id: string;
  target_id: string;
  ground_truth?: Record<string, unknown> | null;
}

export interface IntegrationItem {
  name: string;
  purpose: string;
  auth_method: string;
  status: 'CONNECTED' | 'CONFIGURATION_REQUIRED' | 'DEVELOPMENT_MODE' | 'NOT_AVAILABLE';
  details: string;
  is_ready: boolean;
}

export interface IntegrationsResponse {
  system_ready: boolean;
  python_version: string;
  device: string;
  integrations: IntegrationItem[];
}

export interface JobParams {
  reference_path: string;
  target_path: string;
  matcher: 'sift' | 'loftr' | 'roma' | 'lightglue';
  backbone?: 'dinov2_vits14' | 'dinov2_vitb14' | 'satellite_vit';
  preprocessing: 'clahe' | 'homomorphic' | 'none';
  refinement_method: 'phase_correlation' | 'ecc' | 'pyramid';
  ransac_threshold: number;
  ratio_threshold: number;
  max_features: number;
  grid_n: number;
  grid_m: number;
}

export interface MetricsSnapshot {
  features_detected?: number | null;
  matches_found?: number | null;
  inlier_count?: number | null;
  inlier_ratio?: number | null;
  rmse_px?: number | null;
  ncc?: number | null;
  delta_x_px?: number | null;
  delta_y_px?: number | null;
  delta_rotation_deg?: number | null;
  delta_scale?: number | null;
  confidence?: number | null;
}

export interface PipelineEvent {
  job_id: string;
  stage: string;
  status: 'running' | 'done' | 'failed';
  progress_pct: number;
  message: string;
  metrics: MetricsSnapshot;
  timestamp: number;
  extra?: Record<string, unknown>;
}

export interface IterationMetric {
  iteration: number;
  loss: number;
  similarity: number;
  delta_x_px: number;
  delta_y_px: number;
  confidence: number;
}

export interface FullMetrics {
  rmse_px: number | null;
  ncc: number | null;
  ssim: number | null;
  mutual_information: number | null;
  inlier_count: number | null;
  inlier_ratio: number | null;
  reprojection_error_px: number | null;
  features_detected_ref: number | null;
  features_detected_tgt: number | null;
  delta_x_px: number | null;
  delta_y_px: number | null;
  delta_rotation_deg: number | null;
  delta_scale: number | null;
  subpixel_precision_px: number | null;
  processing_time_sec: number | null;
  quality_grade: 'excellent' | 'good' | 'moderate' | 'poor' | 'insufficient_data' | null;
  quality_score: number | null;
  quality_explanation: string | null;
}

export interface JobResult {
  job_id: string;
  metrics: FullMetrics;
  uniformity: {
    score: number;
    coverage_fraction: number;
    grid_n: number;
    grid_m: number;
    density_map: number[][];
  } | null;
  homography: number[][];
  match_points: {
    ref: number[][];
    tgt: number[][];
    scores: number[];
    uncertainties?: number[];
    inlier_mask: boolean[];
  };
  convergence_history: IterationMetric[];
  correlation_surface: number[][] | null;
  registered_image_id?: string;
  registered_path?: string;
  image_info: {
    ref: ImageMeta;
    tgt: ImageMeta;
  };
}

export interface JobSummary {
  job_id: string;
  status: 'running' | 'done' | 'failed';
  created_at: string | null;
  params: Partial<JobParams>;
  error: string | null;
}

// Pipeline stages in order
export const PIPELINE_STAGES = [
  'ingestion',
  'preprocessing',
  'feature_extraction',
  'feature_matching',
  'geometric_estimation',
  'subpixel_refinement',
  'evaluation',
  'complete',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];
