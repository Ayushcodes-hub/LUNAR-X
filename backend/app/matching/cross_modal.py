"""Cross-Modal Alignment Layer for Multi-Sensor Lunar Datasets (OHRC / TMC / IIRS vs LRO NAC).

Implements a lightweight 2-layer MLP projection head trained with contrastive/metric loss
that projects heterogeneous sensor token embeddings into a calibrated, shared metric space.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class CrossModalProjectionHead(nn.Module):
    """Calibrated projection head for aligning multi-sensor representations.

    Maps disparate sensor embedding distributions (e.g. 0.25m OHRC optical vs 80m IIRS hyperspectral)
    into a joint unit hypersphere where true correspondences have maximal cosine similarity.
    """

    def __init__(self, in_dim: int = 384, proj_dim: int = 256) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, in_dim),
            nn.GELU(),
            nn.LayerNorm(in_dim),
            nn.Linear(in_dim, proj_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass projecting and L2-normalizing features."""
        # Accepts shape (B, C, H, W) or (B, N, C) or (N, C)
        if x.ndim == 4:
            b, c, h, w = x.shape
            flat = x.permute(0, 2, 3, 1).reshape(-1, c)
            out = self.net(flat)
            out = F.normalize(out, p=2, dim=-1)
            return out.reshape(b, h, w, -1).permute(0, 3, 1, 2)
        elif x.ndim == 3:
            b, n, c = x.shape
            flat = x.reshape(-1, c)
            out = self.net(flat)
            out = F.normalize(out, p=2, dim=-1)
            return out.reshape(b, n, -1)
        else:
            out = self.net(x)
            return F.normalize(out, p=2, dim=-1)

    def save_checkpoint(self, path: Path | str) -> None:
        """Save projection head state dict."""
        torch.save(self.state_dict(), str(path))

    def load_checkpoint(self, path: Path | str) -> None:
        """Load fine-tuned projection head state dict."""
        p = Path(path)
        if p.exists():
            state = torch.load(str(p), map_location="cpu")
            self.load_state_dict(state)
            logger.info("Loaded cross-modal projection weights from %s", p)
        else:
            logger.warning("Checkpoint path %s not found. Using initialized weights.", p)


def compute_contrastive_loss(
    feat_src: torch.Tensor,
    feat_ref: torch.Tensor,
    temperature: float = 0.07,
) -> torch.Tensor:
    """Compute InfoNCE contrastive loss on aligned positive tile pairs.

    Args:
        feat_src: (N, D) normalized embeddings from source sensor (e.g. OHRC/IIRS).
        feat_ref: (N, D) normalized embeddings from reference sensor (e.g. LRO NAC).
        temperature: Softmax temperature parameter.

    Returns:
        Scalar symmetric contrastive loss.
    """
    logits = torch.mm(feat_src, feat_ref.t()) / temperature  # (N, N)
    labels = torch.arange(feat_src.shape[0], device=feat_src.device)
    loss_i = F.cross_entropy(logits, labels)
    loss_j = F.cross_entropy(logits.t(), labels)
    return 0.5 * (loss_i + loss_j)
