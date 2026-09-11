"""Tests for Deep Learning Matchers (RoMa and LightGlue)."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.matching.lightglue_matcher import LightGlueMatcher
from app.matching.roma_matcher import RoMaMatcher
from scripts.make_synthetic_pair import _generate_lunar_surface, generate_pair


def _make_pair():
    src = _generate_lunar_surface(128, 128, seed=42)
    ref, tgt, _ = generate_pair(src, rotation_deg=3.0, scale=1.02, tx=10.0, ty=-8.0, gamma=1.2, brightness_offset=10)
    return ref, tgt


class TestLightGlueMatcher:
    def test_lightglue_returns_valid_matches(self) -> None:
        ref, tgt = _make_pair()
        matcher = LightGlueMatcher(feature_type="disk")
        result = matcher.match(ref, tgt, max_features=500)

        assert result.match_count >= 4
        assert result.keypoints_ref.shape[1] == 2
        assert result.keypoints_tgt.shape[1] == 2
        assert len(result.scores) == result.match_count

    def test_scores_in_valid_range(self) -> None:
        ref, tgt = _make_pair()
        matcher = LightGlueMatcher()
        result = matcher.match(ref, tgt, max_features=100)
        assert np.all(result.scores >= 0.0)
        assert np.all(result.scores <= 1.0)


class TestRoMaMatcher:
    def test_roma_dense_matching(self) -> None:
        ref, tgt = _make_pair()
        matcher = RoMaMatcher()
        result = matcher.match(ref, tgt, max_features=200)

        assert result.match_count >= 4
        assert result.keypoints_ref.shape == result.keypoints_tgt.shape
        assert result.keypoints_ref.shape[1] == 2
        assert np.isfinite(result.scores).all()
