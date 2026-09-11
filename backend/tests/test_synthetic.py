"""Tests for synthetic pair generator and ingestion."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

# Make backend importable from tests/
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.make_synthetic_pair import (
    _generate_lunar_surface,
    apply_relighting,
    build_homography,
    generate_pair,
)


class TestLunarSurfaceGenerator:
    def test_generates_correct_shape(self) -> None:
        img = _generate_lunar_surface(256, 256, seed=1)
        assert img.shape == (256, 256)
        assert img.dtype == np.uint8

    def test_has_sufficient_contrast(self) -> None:
        img = _generate_lunar_surface(256, 256, seed=2)
        # Procedural surface should not be uniform
        assert img.std() > 10, "Generated surface has too little contrast."

    def test_reproducible_with_same_seed(self) -> None:
        a = _generate_lunar_surface(128, 128, seed=99)
        b = _generate_lunar_surface(128, 128, seed=99)
        np.testing.assert_array_equal(a, b)

    def test_different_seeds_differ(self) -> None:
        a = _generate_lunar_surface(128, 128, seed=1)
        b = _generate_lunar_surface(128, 128, seed=2)
        assert not np.array_equal(a, b)


class TestBuildHomography:
    def test_identity_transform(self) -> None:
        H = build_homography(0.0, 1.0, 0.0, 0.0, 128.0, 128.0)
        np.testing.assert_allclose(H, np.eye(3), atol=1e-10)

    def test_invertible(self) -> None:
        H = build_homography(5.0, 1.05, 30.0, -20.0, 256.0, 256.0)
        H_inv = np.linalg.inv(H)
        identity = H @ H_inv
        np.testing.assert_allclose(identity, np.eye(3), atol=1e-10,
                                   err_msg="H @ H_inv should be identity")

    def test_determinant_nonzero(self) -> None:
        H = build_homography(15.0, 0.9, 50.0, -30.0, 256.0, 256.0)
        assert abs(np.linalg.det(H)) > 1e-6

    def test_pure_translation(self) -> None:
        H = build_homography(0.0, 1.0, 10.0, 5.0, 100.0, 100.0)
        # Should move point (100, 100) by (10, 5)
        pt = np.array([100.0, 100.0, 1.0])
        result = H @ pt
        result /= result[2]
        np.testing.assert_allclose(result[:2], [110.0, 105.0], atol=1e-8)


class TestRelighting:
    def test_gamma_darkens(self) -> None:
        img = np.full((64, 64), 200, dtype=np.uint8)
        relighted = apply_relighting(img, gamma=2.0, brightness_offset=0)
        # gamma > 1 darkens mid-tones
        assert relighted.mean() < img.mean()

    def test_output_is_uint8(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        out = apply_relighting(img, gamma=1.3, brightness_offset=10)
        assert out.dtype == np.uint8

    def test_no_overflow(self) -> None:
        img = np.full((64, 64), 240, dtype=np.uint8)
        out = apply_relighting(img, gamma=0.5, brightness_offset=50)
        assert out.max() <= 255


class TestGeneratePair:
    def test_output_shapes_match(self) -> None:
        src = _generate_lunar_surface(256, 256, seed=5)
        ref, tgt, H = generate_pair(src, 5.0, 1.0, 10.0, 5.0, 1.3, 15)
        assert ref.shape == tgt.shape == src.shape

    def test_homography_invertible(self) -> None:
        src = _generate_lunar_surface(256, 256, seed=7)
        _, _, H = generate_pair(src, 8.0, 1.02, 20.0, -15.0, 1.5, 25)
        H_inv = np.linalg.inv(H)
        identity = H @ H_inv
        np.testing.assert_allclose(identity, np.eye(3), atol=1e-8,
                                   err_msg="Ground-truth H must be invertible.")

    def test_gt_json_roundtrip(self, tmp_path: Path) -> None:
        """Simulate the full make_synthetic_pair.py workflow and verify GT JSON."""
        import subprocess, json
        script = Path(__file__).parent.parent / "scripts" / "make_synthetic_pair.py"
        out_dir = tmp_path / "pair"
        result = subprocess.run(
            [sys.executable, str(script),
             "--output", str(out_dir),
             "--rotation", "3.7",
             "--scale", "1.03",
             "--tx", "15",
             "--ty", "-10",
             "--gamma", "1.2"],
            capture_output=True, text=True,
        )
        assert result.returncode == 0, f"Script failed: {result.stderr}"
        gt = json.loads((out_dir / "ground_truth.json").read_text())
        assert gt["data_type"] == "SYNTHETIC TEST DATA"
        assert gt["transform"]["rotation_deg"] == 3.7
        H = np.array(gt["homography_ref_to_target"])
        H_inv = np.array(gt["homography_target_to_ref"])
        identity = H @ H_inv
        np.testing.assert_allclose(identity, np.eye(3), atol=1e-8)

    def test_target_differs_from_reference(self) -> None:
        src = _generate_lunar_surface(256, 256, seed=3)
        ref, tgt, _ = generate_pair(src, 5.0, 1.0, 20.0, 10.0, 1.4, 20)
        # Target must not be identical to reference
        assert not np.array_equal(ref, tgt)
