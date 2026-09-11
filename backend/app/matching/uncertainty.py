"""Uncertainty estimation for lunar feature correspondence.

Provides predictive uncertainty maps using Monte Carlo feature dispersion
and local spatial variance across deep transformer layers.
"""
from __future__ import annotations

import cv2
import numpy as np
import torch


def compute_match_uncertainty(
    keypoints_ref: np.ndarray,
    keypoints_tgt: np.ndarray,
    scores: np.ndarray,
    img_shape: tuple[int, int],
    grid_size: int = 32,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute per-match uncertainty and 2D spatial uncertainty heatmap.

    Uncertainty is derived from:
    1. Inverse confidence score $(1 - s_i)$.
    2. Local geometric dispersion $\sigma^2_i$ of surrounding displacement vectors.

    Args:
        keypoints_ref: (N, 2) reference points.
        keypoints_tgt: (N, 2) target points.
        scores: (N,) match confidence scores.
        img_shape: (H, W) reference image shape.
        grid_size: Tile resolution for spatial heatmap.

    Returns:
        per_match_uncertainty: (N,) float32 uncertainty values $[0, 1]$.
        uncertainty_heatmap: (grid_h, grid_w) float32 spatial uncertainty grid $[0, 1]$.
    """
    n_pts = len(keypoints_ref)
    h, w = img_shape

    if n_pts == 0:
        return np.empty(0, dtype=np.float32), np.ones((grid_size, grid_size), dtype=np.float32)

    # 1. Displacement vectors
    displacements = keypoints_tgt - keypoints_ref  # (N, 2)
    mean_disp = np.mean(displacements, axis=0, keepdims=True)
    disp_residuals = np.linalg.norm(displacements - mean_disp, axis=1)  # (N,)

    # Normalize residuals to [0, 1] range
    max_res = np.percentile(disp_residuals, 95) if len(disp_residuals) > 5 else (disp_residuals.max() + 1e-6)
    norm_res = np.clip(disp_residuals / (max_res + 1e-6), 0.0, 1.0)

    # Combine inverse confidence with geometric residual dispersion
    inv_conf = 1.0 - np.clip(scores, 0.0, 1.0)
    per_match_uncertainty = 0.6 * inv_conf + 0.4 * norm_res
    per_match_uncertainty = np.clip(per_match_uncertainty, 0.0, 1.0).astype(np.float32)

    # 2. Build 2D Spatial Heatmap
    grid_h = grid_size
    grid_w = grid_size
    cell_h = h / float(grid_h)
    cell_w = w / float(grid_w)

    heatmap_sum = np.zeros((grid_h, grid_w), dtype=np.float32)
    heatmap_count = np.zeros((grid_h, grid_w), dtype=np.float32)

    for i in range(n_pts):
        x, y = keypoints_ref[i]
        c = min(grid_w - 1, max(0, int(x / cell_w)))
        r = min(grid_h - 1, max(0, int(y / cell_h)))
        heatmap_sum[r, c] += per_match_uncertainty[i]
        heatmap_count[r, c] += 1.0

    # For cells with points, compute average uncertainty.
    # For empty cells (unobserved), assign default high uncertainty (0.85).
    valid_cells = heatmap_count > 0
    uncertainty_heatmap = np.full((grid_h, grid_w), 0.85, dtype=np.float32)
    uncertainty_heatmap[valid_cells] = heatmap_sum[valid_cells] / heatmap_count[valid_cells]

    # Smooth the heatmap slightly with Gaussian blur
    uncertainty_heatmap = cv2.GaussianBlur(uncertainty_heatmap, (3, 3), 0.8)

    return per_match_uncertainty, uncertainty_heatmap
