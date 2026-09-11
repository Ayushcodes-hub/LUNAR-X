"""Tests for preprocessing normalizer."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.exceptions import PreprocessingError
from app.preprocessing.normalizer import clahe_normalize, homomorphic_filter, normalize_image


class TestCLAHE:
    def test_output_shape_preserved(self) -> None:
        img = np.random.randint(0, 256, (128, 128), dtype=np.uint8)
        out = clahe_normalize(img)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_float_input_accepted(self) -> None:
        img = np.random.rand(64, 64).astype(np.float32) * 255
        out = clahe_normalize(img)
        assert out.dtype == np.uint8

    def test_rejects_color_image(self) -> None:
        img = np.zeros((64, 64, 3), dtype=np.uint8)
        with pytest.raises(PreprocessingError, match="2D"):
            clahe_normalize(img)

    def test_rejects_zero_contrast(self) -> None:
        img = np.full((64, 64), 128, dtype=np.float32)
        with pytest.raises(PreprocessingError, match="zero contrast"):
            clahe_normalize(img)

    def test_increases_local_contrast(self) -> None:
        """CLAHE should change the image (not be identity)."""
        rng = np.random.default_rng(42)
        img = rng.integers(100, 160, (128, 128), dtype=np.uint8)  # low-contrast input
        out = clahe_normalize(img)
        assert not np.array_equal(out, img), "CLAHE should modify the image."


class TestHomomorphicFilter:
    def test_output_shape_preserved(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        out = homomorphic_filter(img)
        assert out.shape == img.shape
        assert out.dtype == np.uint8

    def test_no_nan_inf(self) -> None:
        img = np.random.randint(1, 255, (64, 64), dtype=np.uint8)
        out = homomorphic_filter(img)
        assert np.isfinite(out.astype(float)).all()

    def test_rejects_color_image(self) -> None:
        img = np.zeros((64, 64, 3), dtype=np.uint8)
        with pytest.raises(PreprocessingError, match="2D"):
            homomorphic_filter(img)


class TestDispatcher:
    def test_clahe_dispatch(self) -> None:
        img = np.random.randint(0, 256, (64, 64), dtype=np.uint8)
        out = normalize_image(img, method="clahe")
        assert out.dtype == np.uint8

    def test_homomorphic_dispatch(self) -> None:
        img = np.random.randint(1, 255, (64, 64), dtype=np.uint8)
        out = normalize_image(img, method="homomorphic")
        assert out.dtype == np.uint8

    def test_none_dispatch_uint8_passthrough(self) -> None:
        img = np.random.randint(0, 256, (32, 32), dtype=np.uint8)
        out = normalize_image(img, method="none")
        np.testing.assert_array_equal(out, img)

    def test_unknown_method_raises(self) -> None:
        img = np.zeros((32, 32), dtype=np.uint8)
        with pytest.raises(PreprocessingError, match="Unknown normalization"):
            normalize_image(img, method="nonexistent_method")
