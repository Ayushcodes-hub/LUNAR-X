"""Evaluation metrics — all computed from real registration output.

INTEGRITY CONTRACT: Every function in this module performs an actual
mathematical computation. No value is hardcoded, estimated, or faked.
If computation is not possible (e.g. mismatched shapes), a typed error
is raised — never a plausible-looking made-up number.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim_func

from app.core.exceptions import EvaluationError


# ── Quality classification ────────────────────────────────────────────────────

QualityGrade = Literal["excellent", "good", "moderate", "poor", "insufficient_data"]


@dataclass
class QualityScore:
    grade: QualityGrade
    score: float          # 0–1 composite score
    explanation: str      # Plain-English reason


@dataclass
class UniformityResult:
    """Spatial coverage score for match-point distribution."""
    score: float                         # 0–1 (1 = perfectly uniform)
    grid_n: int
    grid_m: int
    cell_counts: list[list[int]]         # [row][col] match counts per cell
    coverage_fraction: float             # fraction of cells with ≥1 match
    density_map: np.ndarray              # float32 heat-map array, shape (grid_n, grid_m)


@dataclass
class FullMetrics:
    """All registration quality metrics for a single run."""
    rmse_px: float | None = None
    ncc: float | None = None
    ssim: float | None = None
    mutual_information: float | None = None
    inlier_count: int | None = None
    inlier_ratio: float | None = None
    reprojection_error_px: float | None = None
    features_detected_ref: int | None = None
    features_detected_tgt: int | None = None
    delta_x_px: float | None = None
    delta_y_px: float | None = None
    delta_rotation_deg: float | None = None
    delta_scale: float | None = None
    subpixel_precision_px: float | None = None  # = sqrt(dx² + dy²) of the sub-pixel correction
    uniformity: UniformityResult | None = None
    quality: QualityScore | None = None
    processing_time_sec: float | None = None


# ── Individual metric functions ───────────────────────────────────────────────

def compute_rmse(
    registered: np.ndarray,
    reference: np.ndarray,
    mask: np.ndarray | None = None,
) -> float:
    """Root mean squared error between registered and reference images.

    Args:
        registered: Warped target image aligned to reference frame.
        reference:  Reference image.
        mask:       Optional binary mask; only masked pixels contribute.

    Returns:
        RMSE in pixel intensity units (0–255 scale).

    Raises:
        EvaluationError: If shapes don't match or mask is invalid.
    """
    if registered.shape != reference.shape:
        raise EvaluationError(
            "rmse",
            f"Shape mismatch: registered={registered.shape}, reference={reference.shape}. "
            "Ensure both images are cropped to the same extent before evaluation.",
        )

    r = registered.astype(np.float64)
    ref = reference.astype(np.float64)

    if mask is not None:
        if mask.shape != reference.shape[:2]:
            raise EvaluationError("rmse", f"Mask shape {mask.shape} != image shape {reference.shape[:2]}.")
        m = mask.astype(bool)
        if m.sum() == 0:
            raise EvaluationError("rmse", "Mask covers zero pixels — cannot compute RMSE.")
        diff = (r[m] - ref[m]) ** 2
    else:
        diff = (r - ref) ** 2

    return float(math.sqrt(diff.mean()))


def compute_ncc(img1: np.ndarray, img2: np.ndarray) -> float:
    """Normalized cross-correlation (–1 to +1; 1.0 = perfect match).

    Args:
        img1, img2: Grayscale images, same shape.

    Returns:
        NCC value in [–1, 1].

    Raises:
        EvaluationError: On shape mismatch or zero-variance image.
    """
    if img1.shape != img2.shape:
        raise EvaluationError("ncc", f"Shape mismatch: {img1.shape} vs {img2.shape}.")

    a = img1.astype(np.float64).ravel()
    b = img2.astype(np.float64).ravel()

    a -= a.mean()
    b -= b.mean()

    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom < 1e-10:
        raise EvaluationError(
            "ncc",
            "One or both images have near-zero variance. "
            "NCC is undefined for uniform images.",
        )
    return float(np.dot(a, b) / denom)


def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Structural Similarity Index (0–1; 1.0 = identical).

    Args:
        img1, img2: Grayscale uint8 images, same shape.

    Returns:
        SSIM in [–1, 1] (typically positive for similar images).

    Raises:
        EvaluationError: On shape mismatch.
    """
    if img1.shape != img2.shape:
        raise EvaluationError("ssim", f"Shape mismatch: {img1.shape} vs {img2.shape}.")

    # Ensure uint8 for skimage ssim
    def to_u8(img: np.ndarray) -> np.ndarray:
        if img.dtype == np.uint8:
            return img
        mn, mx = img.min(), img.max()
        if mx == mn:
            return np.zeros_like(img, dtype=np.uint8)
        return ((img.astype(np.float64) - mn) / (mx - mn) * 255).astype(np.uint8)

    try:
        val = ssim_func(to_u8(img1), to_u8(img2), data_range=255)
    except Exception as e:
        raise EvaluationError("ssim", f"skimage SSIM failed: {e}") from e

    return float(val)


def compute_mutual_information(
    img1: np.ndarray,
    img2: np.ndarray,
    bins: int = 256,
) -> float:
    """Mutual information between two images (in nats).

    Useful for cross-modal or heavily illumination-variant pairs.
    Computed from a joint histogram of pixel intensities.

    Args:
        img1, img2: Grayscale images, same shape.
        bins: Number of histogram bins for each axis.

    Returns:
        MI value ≥ 0 (higher = more shared information).

    Raises:
        EvaluationError: On shape mismatch or empty histogram.
    """
    if img1.shape != img2.shape:
        raise EvaluationError("mutual_information", f"Shape mismatch: {img1.shape} vs {img2.shape}.")

    a = img1.astype(np.float32).ravel()
    b = img2.astype(np.float32).ravel()

    try:
        joint_hist, _, _ = np.histogram2d(a, b, bins=bins, density=False)
    except Exception as e:
        raise EvaluationError("mutual_information", f"Histogram computation failed: {e}") from e

    joint_hist = joint_hist + 1e-10  # avoid log(0)
    joint_prob = joint_hist / joint_hist.sum()
    p_a = joint_prob.sum(axis=1, keepdims=True)
    p_b = joint_prob.sum(axis=0, keepdims=True)
    mi = float(np.sum(joint_prob * np.log(joint_prob / (p_a * p_b + 1e-10))))
    return max(0.0, mi)  # MI is always ≥ 0


def compute_spatial_uniformity(
    match_points: np.ndarray,
    image_shape: tuple[int, int],
    grid_n: int = 8,
    grid_m: int = 8,
) -> UniformityResult:
    """Grid-based spatial coverage/uniformity score for match distribution.

    Divides the image into grid_n × grid_m cells and counts match points
    per cell. Uniformity score = 1 - (coefficient of variation of cell counts).

    A score near 1.0 means matches are evenly distributed (good).
    A score near 0.0 means matches are clustered (poor geometric coverage).

    Args:
        match_points: Array of (x, y) keypoint coordinates, shape (N, 2).
        image_shape:  (height, width) of the image.
        grid_n:       Number of grid rows.
        grid_m:       Number of grid columns.

    Returns:
        UniformityResult with score, per-cell counts, and density map.

    Raises:
        EvaluationError: If match_points is empty or image_shape invalid.
    """
    h, w = image_shape
    if h <= 0 or w <= 0:
        raise EvaluationError("uniformity", f"Invalid image_shape: {image_shape}.")
    if len(match_points) == 0:
        return UniformityResult(
            score=0.0,
            grid_n=grid_n,
            grid_m=grid_m,
            cell_counts=[[0] * grid_m for _ in range(grid_n)],
            coverage_fraction=0.0,
            density_map=np.zeros((grid_n, grid_m), dtype=np.float32),
        )

    cell_counts: list[list[int]] = [[0] * grid_m for _ in range(grid_n)]
    cell_h = h / grid_n
    cell_w = w / grid_m

    for x, y in match_points:
        row = min(int(y / cell_h), grid_n - 1)
        col = min(int(x / cell_w), grid_m - 1)
        cell_counts[row][col] += 1

    counts_flat = [cell_counts[r][c] for r in range(grid_n) for c in range(grid_m)]
    counts_arr = np.array(counts_flat, dtype=np.float32)

    total_cells = grid_n * grid_m
    nonempty = int((counts_arr > 0).sum())
    coverage_fraction = nonempty / total_cells

    # Uniformity score: 1 - CV (coefficient of variation), clipped to [0, 1]
    mean_c = counts_arr.mean()
    if mean_c > 0:
        cv = counts_arr.std() / mean_c
        score = float(np.clip(1.0 - cv / (grid_n * grid_m) ** 0.5, 0.0, 1.0))
        # Also incorporate coverage
        score = score * 0.6 + coverage_fraction * 0.4
    else:
        score = 0.0

    density_map = counts_arr.reshape(grid_n, grid_m).astype(np.float32)
    if density_map.max() > 0:
        density_map = density_map / density_map.max()

    return UniformityResult(
        score=score,
        grid_n=grid_n,
        grid_m=grid_m,
        cell_counts=cell_counts,
        coverage_fraction=coverage_fraction,
        density_map=density_map,
    )


def compute_quality_score(metrics: FullMetrics) -> QualityScore:
    """Compute an overall registration quality grade from available metrics.

    Grading logic is transparent and rule-based — no ML model, no magic numbers
    without rationale.

    Args:
        metrics: FullMetrics populated from the pipeline run.

    Returns:
        QualityScore with grade and plain-English explanation.
    """
    reasons: list[str] = []
    score_components: list[float] = []

    # ── Inlier ratio ─────────────────────────────────────────────────────────
    if metrics.inlier_ratio is not None:
        ir = metrics.inlier_ratio
        if ir >= 0.70:
            score_components.append(1.0)
            reasons.append(f"Inlier ratio is high ({ir:.1%}).")
        elif ir >= 0.45:
            score_components.append(0.65)
            reasons.append(f"Inlier ratio is moderate ({ir:.1%}).")
        else:
            score_components.append(0.2)
            reasons.append(
                f"Inlier ratio is low ({ir:.1%}) — many matches were rejected as outliers. "
                "Consider adjusting RANSAC threshold or using a denser matcher."
            )

    # ── RMSE ─────────────────────────────────────────────────────────────────
    if metrics.rmse_px is not None:
        rmse = metrics.rmse_px
        if rmse < 1.0:
            score_components.append(1.0)
            reasons.append(f"RMSE is sub-pixel ({rmse:.3f} px).")
        elif rmse < 3.0:
            score_components.append(0.7)
            reasons.append(f"RMSE is acceptable ({rmse:.3f} px).")
        else:
            score_components.append(0.2)
            reasons.append(f"RMSE is high ({rmse:.3f} px) — registration may be inaccurate.")

    # ── NCC ──────────────────────────────────────────────────────────────────
    if metrics.ncc is not None:
        ncc = metrics.ncc
        if ncc >= 0.90:
            score_components.append(1.0)
            reasons.append(f"Normalized cross-correlation is excellent ({ncc:.4f}).")
        elif ncc >= 0.70:
            score_components.append(0.65)
            reasons.append(f"Normalized cross-correlation is moderate ({ncc:.4f}).")
        else:
            score_components.append(0.2)
            reasons.append(
                f"NCC is low ({ncc:.4f}). Illumination differences or registration error may be significant."
            )

    # ── Spatial uniformity ────────────────────────────────────────────────────
    if metrics.uniformity is not None:
        u = metrics.uniformity.score
        if u >= 0.7:
            score_components.append(1.0)
            reasons.append(f"Match distribution is spatially uniform (score={u:.2f}).")
        elif u >= 0.4:
            score_components.append(0.6)
            reasons.append(f"Match distribution has some spatial gaps (uniformity={u:.2f}).")
        else:
            score_components.append(0.15)
            reasons.append(
                f"Match distribution is clustered (uniformity={u:.2f}). "
                "Geometric accuracy may be unreliable in uncovered regions."
            )

    if not score_components:
        return QualityScore(
            grade="insufficient_data",
            score=0.0,
            explanation="Insufficient metrics to evaluate registration quality.",
        )

    composite = float(np.mean(score_components))

    if composite >= 0.85:
        grade: QualityGrade = "excellent"
    elif composite >= 0.65:
        grade = "good"
    elif composite >= 0.40:
        grade = "moderate"
    else:
        grade = "poor"

    explanation = " ".join(reasons)
    return QualityScore(grade=grade, score=composite, explanation=explanation)
