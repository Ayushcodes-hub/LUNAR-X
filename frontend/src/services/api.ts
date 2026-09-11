// API service — all calls go through the Vite proxy to /api
// No credentials are stored client-side.
// Every response is typed to mirror the backend exactly.

import type {
  HealthResponse,
  ImageMeta,
  IntegrationsResponse,
  JobParams,
  JobResult,
  JobSummary,
  SampleDatasetItem,
  SyntheticPairRequest,
  SyntheticPairResponse,
} from '../types/api';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ── Health & Integrations ──────────────────────────────────────────────────
  getHealth: (): Promise<HealthResponse> =>
    request<HealthResponse>('/health'),

  getIntegrations: (): Promise<IntegrationsResponse> =>
    request<IntegrationsResponse>('/v1/integrations/status'),

  // ── Images ─────────────────────────────────────────────────────────────────
  uploadImage: async (file: File): Promise<ImageMeta> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/v1/images/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `Upload failed: HTTP ${res.status}`);
    }
    return res.json() as Promise<ImageMeta>;
  },

  getThumbnailUrl: (imageId: string, size = 256): string =>
    `${BASE}/v1/images/${imageId}/thumbnail?size=${size}`,

  getRawImageUrl: (imageId: string): string =>
    `${BASE}/v1/images/${imageId}/raw`,

  createSyntheticPair: (params: SyntheticPairRequest): Promise<SyntheticPairResponse> =>
    request<SyntheticPairResponse>('/v1/images/synthetic', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getSampleDatasets: (): Promise<SampleDatasetItem[]> =>
    request<SampleDatasetItem[]>('/v1/images/samples'),

  // ── Jobs ───────────────────────────────────────────────────────────────────
  createJob: (params: JobParams): Promise<{ job_id: string; status: string }> =>
    request('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  listJobs: (limit = 20): Promise<JobSummary[]> =>
    request<JobSummary[]>(`/v1/jobs?limit=${limit}`),

  getJobResult: (jobId: string): Promise<JobResult> =>
    request<JobResult>(`/v1/jobs/${jobId}/result`),

  getJobRasterUrl: (jobId: string): string =>
    `${BASE}/v1/jobs/${jobId}/raster`,

  // SSE stream — returns a native EventSource
  streamJob: (jobId: string): EventSource =>
    new EventSource(`${BASE}/v1/jobs/${jobId}/stream`),
};
