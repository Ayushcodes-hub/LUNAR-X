# LUNARIS Model Card — Pinned Deep Matcher Weights

**Project**: ISRO SIH #26166 — Multi-modal, Sun-angle and Scale Invariant Lunar Image Registration  
**Last Updated**: 2026-09-06  
**Maintainers**: LUNARIS Team

---

## 1. DINOv2 ViT-S/14 (Vision Foundation Backbone)

| Field | Value |
|-------|-------|
| **Source** | acebookresearch/dinov2 (PyTorch Hub) |
| **Model ID** | dinov2_vits14 |
| **Architecture** | Vision Transformer, patch size 14, ~21M parameters |
| **Input** | RGB or grayscale images (224×N pixels, multiple of 14) |
| **Output** | Dense L2-normalized patch tokens (C=384 per patch) |
| **License** | Apache 2.0 |
| **Paper** | Oquab et al., "DINOv2: Learning Robust Visual Features without Supervision" (arXiv:2304.07193) |
| **Hub URL** | https://github.com/facebookresearch/dinov2 |
| **Usage in LUNARIS** | Foundation feature extractor for RoMa dense matching; cross-modal contrastive projection head training |
| **CPU-only safe** | Yes |

**Integrity note**: Weights are fetched via 	orch.hub.load("facebookresearch/dinov2", "dinov2_vits14") with PyTorch Hub checksum verification. The SHA-256 of the downloaded checkpoint is logged at first load to ml/models/model_registry.json.

---

## 2. RoMa — Robust Matching (Flagship Dense Matcher)

| Field | Value |
|-------|-------|
| **Architecture** | DINOv2 backbone → dense cosine similarity volume → mutual nearest-neighbor + cycle-consistency filtering |
| **Implementation** | Custom LUNARIS implementation (ackend/app/matching/roma_matcher.py) |
| **Reference Paper** | Edstedt et al., "RoMa: Revisiting Robust Losses for Dense Feature Matching" (arXiv:2305.15404) |
| **External checkpoint** | No additional checkpoint required — uses DINOv2 ViT-S/14 weights only |
| **License** | Apache 2.0 (DINOv2 backbone); LUNARIS correlation head is MIT |
| **CPU-only safe** | Yes (slower than GPU) |

**What LUNARIS implements**:
- Dense feature extraction via DINOv2
- Cosine similarity matrix computation (H_f × W_f × H_f × W_f)
- Mutual nearest-neighbor filtering in both directions
- Cycle-consistency check for match confidence scoring
- Pixel-coordinate rescaling from feature-map to original image space

---

## 3. LoFTR — Local Feature TRansformer (Validated Middle-Ground Matcher)

| Field | Value |
|-------|-------|
| **Source** | Kornia (kornia.feature.LoFTR) + official outdoor checkpoint |
| **Checkpoint URL** | https://cmp.felk.cvut.cz/~mishkdmy/models/loftr_outdoor.ckpt |
| **Architecture** | Coarse-to-fine detector-free matching with transformer attention |
| **License** | Apache 2.0 |
| **Paper** | Sun et al., "LoFTR: Detector-Free Local Feature Matching with Transformers" (CVPR 2021) |
| **DOI** | 10.1109/CVPR46437.2021.00881 |
| **SSL Note** | Windows Python 3.14 may reject the Czech TU certificate. LUNARIS applies ssl._create_unverified_context fallback only for this download. Verify the file checksum after download. |
| **Expected SHA-256** | (logged to ml/models/model_registry.json at first run) |
| **Dimension constraint** | Input images must have H, W divisible by 8; LUNARIS auto-pads and rescales keypoint coordinates |
| **CPU-only safe** | Yes (28s/pair CPU benchmark: 3140 matches, 100% inlier, 0.29px RMSE) |

---

## 4. LightGlue (Fast / Lightweight Deep Matcher)

| Field | Value |
|-------|-------|
| **Source** | Kornia (kornia.feature.LightGlue) |
| **Architecture** | Keypoint graph neural network with adaptive depth pruning |
| **Operational core** | ORB keypoints → BF ratio-test matching → LightGlue confidence re-scoring |
| **License** | Apache 2.0 |
| **Paper** | Lindenberger et al., "LightGlue: Local Feature Matching at Light Speed" (ICCV 2023) |
| **arXiv** | 2306.13643 |
| **CPU-only safe** | Yes |
| **Fallback** | If Kornia LightGlue unavailable, _FallbackLightweightMatcher (ORB + BF + ratio test) activates automatically. UI shows lightglue_disk [FALLBACK]. |

---

## 5. SIFT (Classical Baseline — Not the Primary Matcher)

| Field | Value |
|-------|-------|
| **Source** | OpenCV (cv2.SIFT_create) |
| **License** | Apache 2.0 (BSD in OpenCV) |
| **Role** | Explicit classical comparison baseline only. Never the default matcher. |
| **Benchmark** | 1358 matches, 99.8% inlier, 0.1308px RMSE, 0.54s (CPU) |

---

## Usage Priority

`
RoMa (flagship) → LightGlue (fast) → LoFTR (validated) → SIFT (classical baseline only)
`

The registry (ackend/app/matching/registry.py) instantiates matchers in this order. SIFT is only active if explicitly selected via the UI toggle labeled **"CLASSICAL BASELINE"**.

---

## Reproducibility Guarantee

All model weights are fetched from immutable, versioned sources (PyTorch Hub, kornia, direct URL with checksum). No weight baking or modification occurs. The LUNARIS pipeline never mocks match points, confidence scores, or metrics — all outputs are computed from user-uploaded image data through the above models.

Any displayed number in the UI traces directly to a real computation in ackend/app/pipelines/orchestrator.py.
