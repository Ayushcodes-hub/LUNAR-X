"""Tests for cross-modal projection and contrastive alignment."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pytest
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.matching.cross_modal import CrossModalProjectionHead, compute_contrastive_loss


class TestCrossModalProjection:
    def test_forward_output_dimension(self) -> None:
        head = CrossModalProjectionHead(in_dim=384, proj_dim=128)
        x = torch.randn(4, 384)
        out = head(x)

        assert out.shape == (4, 128)
        # Verify L2 normalization
        norms = torch.norm(out, p=2, dim=1)
        np.testing.assert_allclose(norms.detach().numpy(), 1.0, atol=1e-4)

    def test_contrastive_loss_decreases_for_similar_pairs(self) -> None:
        torch.manual_seed(42)
        f_src = torch.randn(8, 128)
        f_src = torch.nn.functional.normalize(f_src, p=2, dim=-1)

        # Identical embeddings (perfect alignment) should yield low loss
        loss_perfect = compute_contrastive_loss(f_src, f_src, temperature=0.1)

        # Random orthogonal embeddings should yield higher loss
        f_rand = torch.randn(8, 128)
        f_rand = torch.nn.functional.normalize(f_rand, p=2, dim=-1)
        loss_random = compute_contrastive_loss(f_src, f_rand, temperature=0.1)

        assert loss_perfect.item() < loss_random.item()
