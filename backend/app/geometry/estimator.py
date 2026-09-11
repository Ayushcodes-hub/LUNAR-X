"""Geometric estimation — RANSAC homography and affine fitting."""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.core.exceptions import GeometryError


@dataclass
class HomographyResult:
    """Result of homography estimation with inlier statistics."""

    H: np.ndarray              # 3×3 homography matrix
    inlier_mask: np.ndarray    # bool array shape (N,)
    inlier_count: int
    inlier_ratio: float
    reprojection_error_px: float  # mean reprojection error of inliers


@dataclass
class AffineResult:
    """Result of partial affine (4-DOF) estimation."""

    M: np.ndarray              # 2×3 affine matrix
    inlier_mask: np.ndarray    # bool array shape (N,)
    inlier_count: int
    inlier_ratio: float


def estimate_homography(
    pts_ref: np.ndarray,
    pts_tgt: np.ndarray,
    ransac_threshold: float = 4.0,
    confidence: float = 0.995,
    max_iters: int = 10_000,
) -> HomographyResult:
    """Estimate a projective homography with RANSAC.

    Args:
        pts_ref: Reference image points, shape (N, 2) float32.
        pts_tgt: Target image points, shape (N, 2) float32.
        ransac_threshold: Maximum pixel reprojection error for inliers.
        confidence: RANSAC confidence level (0–1).
        max_iters: Maximum RANSAC iterations.

    Returns:
        HomographyResult with H matrix and inlier statistics.

    Raises:
        GeometryError: If fewer than 4 inliers or cv2 returns None.
    """
    if len(pts_ref) < 4:
        raise GeometryError(f"Need at least 4 point pairs, got {len(pts_ref)}.")

    H, mask = cv2.findHomography(
        pts_ref,
        pts_tgt,
        cv2.RANSAC,
        ransacReprojThreshold=ransac_threshold,
        confidence=confidence,
        maxIters=max_iters,
    )

    if H is None or mask is None:
        raise GeometryError(
            "cv2.findHomography returned None — likely insufficient or collinear point correspondences.",
            inlier_count=0,
        )

    inlier_mask = mask.ravel().astype(bool)
    inlier_count = int(inlier_mask.sum())

    if inlier_count < 4:
        raise GeometryError(
            f"Only {inlier_count} inliers after RANSAC (threshold={ransac_threshold}px). "
            "Try increasing ransac_threshold or using a denser feature matcher.",
            inlier_count=inlier_count,
        )

    inlier_ratio = inlier_count / len(pts_ref)

    # Mean reprojection error on inliers
    pts_ref_in = pts_ref[inlier_mask]
    pts_tgt_in = pts_tgt[inlier_mask]
    pts_proj = cv2.perspectiveTransform(pts_ref_in.reshape(-1, 1, 2), H).reshape(-1, 2)
    reprojection_error = float(np.mean(np.linalg.norm(pts_proj - pts_tgt_in, axis=1)))

    return HomographyResult(
        H=H,
        inlier_mask=inlier_mask,
        inlier_count=inlier_count,
        inlier_ratio=inlier_ratio,
        reprojection_error_px=reprojection_error,
    )


def estimate_affine(
    pts_ref: np.ndarray,
    pts_tgt: np.ndarray,
    ransac_threshold: float = 4.0,
    confidence: float = 0.995,
) -> AffineResult:
    """Estimate a partial affine (translation + rotation + scale) with RANSAC.

    Useful when the transformation is known to be similarity/rigid — fewer DOF
    means more robust estimation from fewer correspondences.

    Args:
        pts_ref: Reference image points, shape (N, 2) float32.
        pts_tgt: Target image points, shape (N, 2) float32.
        ransac_threshold: Maximum pixel reprojection error for inliers.
        confidence: RANSAC confidence level.

    Returns:
        AffineResult with M matrix and inlier statistics.

    Raises:
        GeometryError: If estimation fails.
    """
    if len(pts_ref) < 3:
        raise GeometryError(f"Need at least 3 point pairs for affine, got {len(pts_ref)}.")

    M, mask = cv2.estimateAffinePartial2D(
        pts_ref,
        pts_tgt,
        method=cv2.RANSAC,
        ransacReprojThreshold=ransac_threshold,
        confidence=confidence,
    )

    if M is None or mask is None:
        raise GeometryError("cv2.estimateAffinePartial2D returned None.", inlier_count=0)

    inlier_mask = mask.ravel().astype(bool)
    inlier_count = int(inlier_mask.sum())

    if inlier_count < 3:
        raise GeometryError(
            f"Only {inlier_count} inliers after affine RANSAC.",
            inlier_count=inlier_count,
        )

    return AffineResult(
        M=M,
        inlier_mask=inlier_mask,
        inlier_count=inlier_count,
        inlier_ratio=inlier_count / len(pts_ref),
    )


def warp_image(
    img_tgt: np.ndarray,
    H: np.ndarray,
    output_shape: tuple[int, int],
    interpolation: int = cv2.INTER_LANCZOS4,
) -> np.ndarray:
    """Warp target image into the reference frame using homography H.

    Args:
        img_tgt: Target image to warp (any dtype).
        H: 3×3 homography matrix mapping ref → tgt (will be inverted internally).
        output_shape: (height, width) of output.
        interpolation: OpenCV interpolation flag.

    Returns:
        Warped target image aligned to reference frame.
    """
    h, w = output_shape
    return cv2.warpPerspective(img_tgt, H, (w, h), flags=interpolation)
