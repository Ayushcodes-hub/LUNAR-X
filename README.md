# 🛰️ LUNAR-X: Advanced Planetary Image Registration & Scientific Correspondence Command Center

> **SIH Problem Statement 26166:** Multi-modal, Sun-angle and scale-invariant image correspondence using Chandrayaan-2 (OHRC, TMC-2, IIRS) with reference basemap imagery (NASA LRO NAC / SELENE).

[![Backend Tests](https://img.shields.io/badge/pytest-79%20passed-emerald?style=flat-square&logo=pytest)](backend/tests/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.1.0-009688?style=flat-square&logo=fastapi)](backend/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](frontend/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=flat-square&logo=three.js)](frontend/src/components/three/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=flat-square&logo=pytorch)](ml/)

---

## 🌌 Overview

**LUNAR-X** is an end-to-end planetary photogrammetry and image registration command center. It bridges the extreme geometric, photometric, and spatial gaps between **Chandrayaan-2** payloads and NASA/JAXA reference basemaps down to continuous sub-pixel precision ($\pm0.01\text{ px}$).

```
  CHANDRAYAAN-2 (OHRC / TMC-2 / IIRS)       NASA LRO NAC / SELENE BASEMAP
                     │                                     │
                     ▼                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │       ILLUMINATION NORMALIZATION & PREPROCESSING        │
        │   Frequency-Domain Homomorphic Filter + Rayleigh CLAHE  │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │             DEEP FEATURE CORRESPONDENCE                 │
        │      RoMa Dense ViT / LightGlue GNN / LoFTR / SIFT       │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │            GEOMETRIC ESTIMATION (RANSAC)                │
        │       Projective Homography (8-DOF) / Affine (4-DOF)    │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │            CONTINUOUS SUB-PIXEL REFINEMENT              │
        │  Phase Correlation (0.01px) + Overlap-Masked ECC + LK   │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │      OFFICIAL REPORTING & 3D SCIENTIFIC VISUALIZATION   │
        │    RMSE, SSIM, NCC, Spatial Uniformity & 3D DEM Drape   │
        └─────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

1. **Sub-Pixel Precision Engine**:
   - Fourier-domain Phase Cross-Correlation with 100× peak upsampling ($\pm0.01\text{ px}$ accuracy).
   - Residual Enhanced Correlation Coefficient (ECC) with dynamic overlap masking.
   - Multi-scale Gaussian Pyramid coarse-to-fine optimization.

2. **Multi-Modal Lunar Sensor Support**:
   - **ISRO Chandrayaan-2 OHRC** (Orbiter High-Resolution Camera, 0.25 m/px).
   - **ISRO Chandrayaan-2 TMC-2** (Terrain Mapping Camera-2, 5.0 m/px tri-stereo).
   - **ISRO Chandrayaan-2 IIRS** (Imaging Infrared Spectrometer, hyperspectral).
   - **NASA LRO NAC** (Narrow Angle Camera, 0.50–1.2 m/px).
   - **JAXA SELENE / Kaguya** terrain elevation models.

3. **Sun-Angle & Illumination Invariance**:
   - Logarithmic Homomorphic High-Pass Butterworth filtering in log-Fourier space to eliminate shadow variations across crater rims.
   - Contrast Limited Adaptive Histogram Equalization (CLAHE).

4. **10-Mode Scientific Visualizer**:
   - `REF` / `TGT` / `OVERLAY` (True alpha opacity slider) / `DIFF` / `BLINK` / `SPLIT` (Draggable curtain) / `REGISTERED` / `HEATMAP` / `MATCHES` (Interactive tie-points) / `GRID`.

5. **Deep Learning & Classical Model Hub**:
   - **RoMa** (Coarse-to-fine correlation volume ViT).
   - **LightGlue** (Adaptive depth Graph Transformer).
   - **LoFTR** (Detector-free linear attention transformer).
   - **SIFT / ORB / AKAZE** (Standardized classical baselines).

6. **Interactive 3D Scientific Lab**:
   - Three.js WebGL 3D Terrain & DEM drape.
   - 3D Match Constellation & reprojection residual visualization.
   - Real-time cartographic graticule with IAU Moon 2000 coordinate readouts.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+** (Tested on Python 3.12 & 3.14)
- **Node.js 18+** & **npm**

### 1. Start the Backend API
```powershell
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Telemetry**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start the Frontend Command Center
```powershell
cd frontend
npm install
npm run dev
```
- **Mission Console**: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Scientific Verification & Tests

Run the automated scientific test suite:
```powershell
cd backend
python -m pytest tests/ -v
```
*(All 79 unit and pipeline integration tests verify transform invertibility, sub-pixel recovery, homomorphic spectrum validity, and metric accuracy).*

---

## 📜 Scientific Provenance & Guarantees

- **No Mock Metrics**: Every coordinate, sub-pixel offset ($\Delta X, \Delta Y$), RMSE, and inlier ratio is computed from actual image matrices.
- **Reproducible Lineage**: SHA-256 integrity fingerprinting on all ingested rasters and registered outputs.
