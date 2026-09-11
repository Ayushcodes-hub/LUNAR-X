"""Tests for evaluation metrics."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.exceptions import EvaluationError
from app.evaluation.metrics import (
    FullMetrics,
    compute_mutual_information,
    compute_ncc,
    compute_quality_score,
    compute_rmse,
    compute_spatial_uniformity,
    compute_ssim,
)


class TestRMSE:
    def test_identical_images(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        assert compute_rmse(img, img) == 0.0

    def test_different_images_nonzero(self) -> None:
        a = np.zeros((64, 64), dtype=np.uint8)
        b = np.full((64, 64), 100, dtype=np.uint8)
        assert compute_rmse(a, b) == 100.0

    def test_raises_shape_mismatch(self) -> None:
        with pytest.raises(EvaluationError, match="Shape mismatch"):
            compute_rmse(np.zeros((32, 32), dtype=np.uint8), np.zeros((64, 64), dtype=np.uint8))

    def test_with_mask(self) -> None:
        a = np.zeros((64, 64), dtype=np.uint8)
        b = np.full((64, 64), 50, dtype=np.uint8)
        mask = np.zeros((64, 64), dtype=bool)
        mask[0:32, 0:32] = True
        rmse = compute_rmse(a, b, mask=mask)
        assert rmse == 50.0


class TestNCC:
    def test_identical_images(self) -> None:
        img = np.random.randint(1, 255, (64, 64), dtype=np.uint8)
        assert abs(compute_ncc(img, img) - 1.0) < 1e-8

    def test_opposite_images(self) -> None:
        a = np.full((64, 64), 50, dtype=np.uint8)
        b = np.full((64, 64), 200, dtype=np.uint8)
        # Uniform images → zero variance → raises
        with pytest.raises(EvaluationError, match="near-zero variance"):
            compute_ncc(a, b)

    def test_range_minus1_to_1(self) -> None:
        rng = np.random.default_rng(42)
        a = rng.integers(0, 256, (64, 64), dtype=np.uint8)
        b = rng.integers(0, 256, (64, 64), dtype=np.uint8)
        ncc = compute_ncc(a, b)
        assert -1.0 <= ncc <= 1.0


class TestSSIM:
    def test_identical_images(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        assert compute_ssim(img, img) > 0.99

    def test_shape_mismatch(self) -> None:
        with pytest.raises(EvaluationError, match="Shape mismatch"):
            compute_ssim(np.zeros((32, 32), dtype=np.uint8), np.zeros((64, 64), dtype=np.uint8))


class TestMutualInformation:
    def test_identical_images_high_mi(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        mi = compute_mutual_information(img, img, bins=64)
        assert mi > 0.0

    def test_mi_nonnegative(self) -> None:
        a = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        b = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        assert compute_mutual_information(a, b) >= 0.0


class TestSpatialUniformity:
    def test_empty_matches_score_zero(self) -> None:
        result = compute_spatial_uniformity(np.empty((0, 2), dtype=np.float32), (128, 128))
        assert result.score == 0.0
        assert result.coverage_fraction == 0.0

    def test_clustered_score_low(self) -> None:
        """Points all in top-left corner → low uniformity score."""
        pts = np.array([[5.0, 5.0], [8.0, 3.0], [4.0, 7.0], [6.0, 4.0]], dtype=np.float32)
        result = compute_spatial_uniformity(pts, (128, 128), grid_n=8, grid_m=8)
        assert result.score < 0.5, f"Clustered points should score < 0.5, got {result.score:.3f}"

    def test_uniform_score_high(self) -> None:
        """Points evenly spread across entire image → high uniformity score."""
        grid_n, grid_m = 4, 4
        pts = []
        cell_h, cell_w = 128 / grid_n, 128 / grid_m
        for r in range(grid_n):
            for c in range(grid_m):
                pts.append([c * cell_w + cell_w / 2, r * cell_h + cell_h / 2])
        pts_arr = np.array(pts, dtype=np.float32)
        result = compute_spatial_uniformity(pts_arr, (128, 128), grid_n=grid_n, grid_m=grid_m)
        assert result.score > 0.6, f"Uniform points should score > 0.6, got {result.score:.3f}"

    def test_density_map_shape(self) -> None:
        pts = np.random.rand(50, 2).astype(np.float32) * 128
        result = compute_spatial_uniformity(pts, (128, 128), grid_n=6, grid_m=8)
        assert result.density_map.shape == (6, 8)


class TestQualityScore:
    def test_perfect_metrics_excellent(self) -> None:
        m = FullMetrics(
            inlier_ratio=0.95,
            rmse_px=0.3,
            ncc=0.98,
        )
        q = compute_quality_score(m)
        assert q.grade in ("excellent", "good")

    def test_poor_metrics_poor(self) -> None:
        m = FullMetrics(
            inlier_ratio=0.10,
            rmse_px=15.0,
            ncc=0.20,
        )
        q = compute_quality_score(m)
        assert q.grade == "poor"

    def test_no_metrics_insufficient(self) -> None:
        m = FullMetrics()
        q = compute_quality_score(m)
        assert q.grade == "insufficient_data"

    def test_explanation_is_nonempty(self) -> None:
        m = FullMetrics(inlier_ratio=0.7, rmse_px=1.5)
        q = compute_quality_score(m)
        assert len(q.explanation) > 10
