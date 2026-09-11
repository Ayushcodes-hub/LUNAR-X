# Project Rules — LUNARIS: Lunar Image Registration Command Center (SIH26166)

## What this project is
A world-class, real-time, sub-pixel-precision lunar image registration platform.
Finds sub-pixel, illumination- and scale-invariant correspondence points between
Chandrayaan-2 imagery (OHRC, TMC-2, IIRS) and reference lunar imagery (LRO NAC, SELENE),
then registers the source image to the reference.

Outputs per registration run:
- Registered raster (warped source in reference frame)
- Match-point file (GeoJSON or CSV with inlier/outlier flags)
- Evaluation report (RMSE, inlier count/ratio, spatial-uniformity score, sub-pixel offsets)
- Full convergence history (per-iteration loss, displacement, confidence)

## Scope discipline
- Build the smallest scientifically correct thing before adding decorative elements.
- One phase at a time (see phase sequence). Do not start Phase N+1 work during a Phase N task.
- If a task implies a subsystem not in the current phase's Implementation Plan: STOP and flag it.
- No fabricated metrics or AI theater. Every displayed number must come from real computation.

## Tech stack (fixed — do not substitute without asking)
- **Backend**: Python 3.14, FastAPI, Pydantic v2, async endpoints, SSE for streaming pipeline progress
- **CV/ML**: OpenCV, PyTorch, Kornia, NumPy/SciPy, scikit-image for phase correlation,
  rasterio/GDAL for georeferenced raster I/O, SpiceyPy for SPICE-kernel metadata when available
- **Frontend**: React 19 + TypeScript + Vite, Tailwind CSS v4, TanStack Query v5, Framer Motion,
  OpenLayers for georeferenced image overlays, Recharts for metric charts, Zustand for state,
  react-dropzone for file upload
- **DB**: SQLite (zero-setup local/demo), PostgreSQL (optional production profile)
- **Everything must run CPU-only**. GPU is an optional accelerator, never a hard requirement.

## Non-negotiable engineering rules
- No hardcoded secrets. Env vars only, always update `.env.example` with any new variable.
- No fabricated metrics, confidence scores, or fake "AI analysis" text. If a component is not
  implemented, the UI must show "Not implemented" — never a plausible-looking fake value.
- No bare `except:`. No silent failure. Every pipeline stage validates its own output and raises
  a typed, catchable error with an actionable message if it cannot proceed.
- Full type hints (Python) / strict TypeScript. Linting must pass before a task is complete.
- Sub-pixel values displayed in the UI must be the exact computed fractional pixel offsets
  from the registration pipeline — not rounded, not mocked.

## Verification loop (mandatory for every task)
1. Write tests FIRST (`backend/tests/test_<module>.py`), covering happy path + failure cases.
2. After implementing, run the test command and SHOW the output. Never report done without a
   passing test run.
3. For UI tasks, confirm the page loads without console errors before reporting done.

## File structure (do not reorganize without asking)
```
lunar_registration/
  backend/
    app/
      api/          # FastAPI routers
      core/         # config, database, events, exceptions
      pipelines/    # orchestrator: stages wired together
      preprocessing/# CLAHE, homomorphic filter, normalization
      matching/     # SIFT, LoFTR/LightGlue adapters, model registry
      geometry/     # RANSAC homography, affine, projective fitting
      refinement/   # sub-pixel: phase correlation, ECC, LK, NCC, pyramid
      evaluation/   # metrics: RMSE, NCC, SSIM, MI, uniformity, report gen
      ingestion/    # rasterio/GDAL adapters, PDS3/PDS4 parsers
    tests/
    scripts/        # synthetic data generator, benchmark scripts
  ml/
    models/         # pretrained weight configs
    training/       # future fine-tuning
    inference/      # inference wrappers
    configs/        # model YAML configs
  frontend/
    src/
      components/   # reusable UI: panels, sliders, overlays, controls
      pages/        # Registration, Dataset, Analysis, Settings
      features/     # feature-sliced: registration, datasets, metrics
      hooks/        # useRegistration, useSSE, useImageViewer
      services/     # API client, SSE client, WebSocket client
      types/        # TypeScript types mirroring backend Pydantic models
      store/        # Zustand stores
      workers/      # Web Workers for browser-side processing
  configs/          # per-sensor-pair YAML configs
  docs/
  .env.example
```

## Phases
- **Phase 0**: Scaffold + synthetic test harness
- **Phase 1**: Baseline vertical slice (SIFT → RANSAC → warp → metrics → UI)
- **Phase 2**: Illumination invariance (CLAHE/homomorphic) + sub-pixel refinement (phase correlation, ECC, LK pyramid)
- **Phase 3**: Deep learned matcher (LoFTR or LightGlue) as alternate pipeline
- **Phase 4**: Spatial uniformity + HTML/JSON evaluation report
- **Phase 5**: Real sensor data adapters (PDS3/PDS4, SPICE)
- **Phase 6**: Full UI polish — cinematic space theme, dataset explorer, match explorer, split view

## UI design contract
- Deep space color palette: near-black (#0a0b14) background, cyan/teal accents, amber warnings
- Animated star field background (canvas, not CSS): must be hardware-accelerated and <2% CPU idle
- All panels use glass-morphism (backdrop-filter blur, subtle border, low-opacity background)
- Every number displayed must trace to a real computation. No hardcoded demo values without an
  explicit "DEMO" chip label.
- Status indicators use real pipeline state from SSE stream
- Animations via Framer Motion: spring physics, no janky CSS transitions for layout changes
