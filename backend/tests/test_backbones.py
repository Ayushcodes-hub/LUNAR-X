"""Tests for DINOv2 and Vision Transformer feature backbones."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.matching.backbones import DINOv2Backbone, get_backbone


class TestDINOv2Backbone:
    def test_extract_dense_features_shape(self) -> None:
        img = np.random.randint(0, 256, (128, 128), dtype=np.uint8)
        backbone = get_backbone("dinov2_vits14")
        feats = backbone.extract_dense_features(img, target_size=140)

        assert isinstance(feats, torch.Tensor)
        assert feats.ndim == 4
        assert feats.shape[0] == 1  # batch size 1
        assert feats.shape[1] == backbone.embedding_dim  # channel dimension

    def test_extracted_features_are_l2_normalized(self) -> None:
        img = np.random.randint(0, 256, (112, 112), dtype=np.uint8)
        backbone = get_backbone("dinov2_vits14")
        feats = backbone.extract_dense_features(img, target_size=112)

        # L2 norm along channel dimension should be approximately 1.0
        norms = torch.norm(feats, p=2, dim=1)
        np.testing.assert_allclose(norms.cpu().numpy(), 1.0, atol=1e-4)

    def test_grayscale_and_rgb_inputs_supported(self) -> None:
        gray = np.random.randint(0, 256, (98, 98), dtype=np.uint8)
        rgb = np.random.randint(0, 256, (98, 98, 3), dtype=np.uint8)
        backbone = get_backbone("dinov2_vits14")

        fg = backbone.extract_dense_features(gray, target_size=98)
        fr = backbone.extract_dense_features(rgb, target_size=98)
        assert fg.shape[1] == fr.shape[1] == backbone.embedding_dim
