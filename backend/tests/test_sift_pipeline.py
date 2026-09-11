"""Tests for SIFT pipeline (matching + geometry + warp)."""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.make_synthetic_pair import _generate_lunar_surface, generate_pair
from app.core.exceptions import GeometryError, MatchingError
from app.geometry.estimator import estimate_homography, warp_image
from app.matching.sift_matcher import SIFTMatcher
from app.preprocessing.normalizer import clahe_normalize


def _make_pair(rotation: float = 5.0, scale: float = 1.0, tx: float = 20.0, ty: float = -10.0):
    src = _generate_lunar_surface(256, 256, seed=42)
    ref, tgt, H_gt = generate_pair(src, rotation, scale, tx, ty, gamma=1.2, brightness_offset=10)
    return clahe_normalize(ref), clahe_normalize(tgt), H_gt


class TestSIFTMatcher:
    def test_returns_matches_on_synthetic_pair(self) -> None:
        ref, tgt, _ = _make_pair()
        matcher = SIFTMatcher()
        result = matcher.match(ref, tgt)
        assert result.match_count >= 4, "Expected at least 4 SIFT matches on synthetic pair."

    def test_raises_on_noise_images(self) -> None:
        """Random noise should produce too few matches — MatchingError expected."""
        rng = np.random.default_rng(99)
        img1 = rng.integers(0, 256, (128, 128), dtype=np.uint8)
        img2 = rng.integers(0, 256, (128, 128), dtype=np.uint8)
        matcher = SIFTMatcher()
        with pytest.raises(MatchingError):
            matcher.match(img1, img2, ratio_threshold=0.5)

    def test_raises_on_non_grayscale(self) -> None:
        img = np.zeros((64, 64, 3), dtype=np.uint8)
        matcher = SIFTMatcher()
        with pytest.raises(MatchingError, match="grayscale"):
            matcher.match(img, img)  # type: ignore

    def test_keypoint_shapes_consistent(self) -> None:
        ref, tgt, _ = _make_pair()
        matcher = SIFTMatcher()
        result = matcher.match(ref, tgt)
        assert result.keypoints_ref.shape == result.keypoints_tgt.shape
        assert result.keypoints_ref.shape[1] == 2


class TestRANSACHomography:
    def test_recovers_transform_within_tolerance(self) -> None:
        """Core correctness test: recovered H should be close to GT H."""
        ref, tgt, H_gt = _make_pair(rotation=5.0, scale=1.0, tx=20.0, ty=-10.0)
        matcher = SIFTMatcher()
        match_result = matcher.match(ref, tgt)

        geo = estimate_homography(
            match_result.keypoints_ref,
            match_result.keypoints_tgt,
            ransac_threshold=4.0,
        )

        # Check inlier quality
        assert geo.inlier_ratio >= 0.4, f"Inlier ratio too low: {geo.inlier_ratio:.2f}"
        assert geo.inlier_count >= 8

        # Check recovered H is close to GT at image corners
        h, w = ref.shape
        corners_ref = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
        corners_gt = cv2.perspectiveTransform(corners_ref.reshape(-1, 1, 2), H_gt).reshape(-1, 2)
        corners_rec = cv2.perspectiveTransform(corners_ref.reshape(-1, 1, 2), geo.H).reshape(-1, 2)

        corner_error = float(np.mean(np.linalg.norm(corners_gt - corners_rec, axis=1)))
        assert corner_error < 10.0, (
            f"Corner RMSE = {corner_error:.2f}px — homography far from ground truth. "
            "Check SIFT matching quality on synthetic pair."
        )

    def test_raises_on_too_few_points(self) -> None:
        pts = np.array([[0, 0], [1, 1], [2, 0]], dtype=np.float32)
        with pytest.raises(GeometryError):
            estimate_homography(pts, pts)

    def test_inlier_ratio_in_valid_range(self) -> None:
        ref, tgt, _ = _make_pair()
        matcher = SIFTMatcher()
        result = matcher.match(ref, tgt)
        geo = estimate_homography(result.keypoints_ref, result.keypoints_tgt)
        assert 0.0 <= geo.inlier_ratio <= 1.0

    def test_reprojection_error_is_finite(self) -> None:
        ref, tgt, _ = _make_pair()
        matcher = SIFTMatcher()
        result = matcher.match(ref, tgt)
        geo = estimate_homography(result.keypoints_ref, result.keypoints_tgt)
        assert np.isfinite(geo.reprojection_error_px)
        assert geo.reprojection_error_px >= 0.0


class TestWarpImage:
    def test_warp_produces_correct_shape(self) -> None:
        img = np.random.randint(0, 256, (128, 128), dtype=np.uint8)
        H = np.eye(3, dtype=np.float64)
        warped = warp_image(img, H, (128, 128))
        assert warped.shape == (128, 128)

    def test_identity_warp_preserves_image(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        H = np.eye(3, dtype=np.float64)
        warped = warp_image(img, H, (64, 64))
        np.testing.assert_array_equal(warped, img)
