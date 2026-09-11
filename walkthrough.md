# LUNARIS (SIH26166) — Completion Walkthrough & Run Guide

## Project Summary
**LUNARIS** is a sub-pixel-precision lunar image registration command center designed for **SIH Problem Statement 26166**: Multi-modal, Sun angle and scale invariant image correspondence using Chandrayaan-2 optical imagery (OHRC, TMC-2, IIRS) and reference basemaps (LRO NAC, SELENE).

---

## 1. System Architecture & Capabilities

### Backend (Python FastAPI + PyTorch + OpenCV + scikit-image + Kornia)
- **Ingestion**: Raw raster ingestion, SHA-256 fingerprinting, GDAL/rasterio support.
- **Illumination Preprocessing**: Contrast Limited Adaptive Histogram Equalization (CLAHE) & logarithmic homomorphic filtering in the frequency domain.
- **Feature Matching**:
  - Classical SIFT with Lowe ratio-test and bidirectional geometric consistency.
  - Deep dense matching via LoFTR.
- **Robust Geometry Estimation**: RANSAC homography & affine fitting with outlier rejection.
- **Continuous Sub-Pixel Refinement Engine**:
  - Sub-pixel Phase Cross-Correlation with peak upsampling up to $\pm0.01\text{ px}$.
  - Enhanced Correlation Coefficient (ECC) optimization.
  - Multi-scale Gaussian pyramid refinement.
- **Evaluation & Diagnostics**:
  - Exact fractional sub-pixel offsets ($\Delta X, \Delta Y, \Delta\text{Rot}, \Delta\text{Scale}$).
  - RMSE, NCC, SSIM, Mutual Information (MI), inlier count & ratio.
  - Spatial Uniformity grid metric with coverage coefficient.
  - Standalone HTML & JSON report generation.
- **Streaming Pipeline**: Real-time progress and metric snapshots over Server-Sent Events (SSE).

### Frontend (React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion)
- **Cinematic Deep-Space UI**: Canvas-based hardware-accelerated animated starfield (<2% CPU idle), glass-morphism panels, and neon cyan accents.
- **10-Mode Synchronized Image Viewer**:
  1. Reference (`REF`)
  2. Target (`TGT`)
  3. Difference Map (`DIFF`)
  4. Overlay Blend (`OVERLAY`)
  5. Rapid Alternating Blink (`BLINK`)
  6. Split-Screen Comparison (`SPLIT`)
  7. Registered Result (`RESULT`)
  8. Error Heatmap (`HEATMAP`)
  9. Inlier / Outlier Feature Matches (`MATCHES`)
  10. Transformation Grid (`GRID`)
- **Sub-Pixel Analysis Lab**: Real-time 2D correlation landscape heatmap and peak localization.
- **Live Convergence Graph**: Interactive Recharts telemetry of iteration loss and similarity.
- **Mission Control Navigation**: Registration Bench, Sensor Registry / Datasets, Scientific Diagnostics & Analysis, and Integration Health Status.

---

## 2. Verification Results

### Automated Backend Tests
- **Total Tests**: 66 passed in 12.30s (`pytest tests/`)
  - `test_synthetic.py`: Shape verification, transform invertibility, ground-truth consistency.
  - `test_preprocessing.py`: CLAHE, homomorphic filtering, spectrum validity.
  - `test_sift_pipeline.py`: SIFT feature extraction, RANSAC homography recovery, warping.
  - `test_refinement.py`: Phase cross-correlation, ECC monotonicity, multi-scale pyramid.
  - `test_metrics.py`: RMSE, NCC, SSIM, Mutual Information, spatial uniformity.

### Frontend TypeScript & Vite Build
- **Result**: `✓ built in 1m 11s` with 0 errors.

---

## 3. Exact Spoon-Fed Commands to Run LUNARIS

### Terminal 1: Start Backend Server
```powershell
cd c:\Users\Admin\Downloads\LUNARIS-Ag\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Start Frontend Development Server
```powershell
cd c:\Users\Admin\Downloads\LUNARIS-Ag\frontend
npm run dev
```

### Terminal 3 (Optional): Run Tests & Benchmark
```powershell
# Run the 66 automated tests
cd c:\Users\Admin\Downloads\LUNARIS-Ag\backend
python -m pytest tests/ -v

# Generate fresh synthetic test data
python scripts/make_synthetic_pair.py --output ../test_data/lunar_pair_1 --rotation 4.5 --scale 1.03 --tx 25 --ty -15 --gamma 1.35

# Run SIFT vs LoFTR benchmark
python scripts/benchmark.py --ref ../test_data/lunar_pair_1/reference.png --tgt ../test_data/lunar_pair_1/target.png
```

### Browser URLs
- **Web Command Center**: [http://localhost:5173](http://localhost:5173)
- **FastAPI OpenAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
