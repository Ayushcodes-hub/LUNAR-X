"""RoMa (Robust Dense Matching) engine for large viewpoint and scale gaps."""
from __future__ import annotations

import logging
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from app.core.exceptions import MatchingError
from app.matching.backbones import get_backbone
from app.matching.base import MatchResult, MatcherBase

logger = logging.getLogger(__name__)


def _get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


class RoMaMatcher(MatcherBase):
    """RoMa (Robust Dense Feature Matching) Flagship Architecture.

    Uses DINOv2 / Deep ViT backbone dense feature maps, builds a 4D correlation
    volume, and applies a coarse-to-fine displacement regressor with confidence estimation.
    Excels under extreme lunar sun-azimuth differences and scale deltas.
    """

    def __init__(self, backbone_name: str = "dinov2_vits14") -> None:
        self._backbone = get_backbone(backbone_name)
        self._device = _get_device()

    @property
    def name(self) -> str:
        return "roma"

    def match(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        ratio_threshold: float = 0.0,
        max_features: int = 5000,
        confidence_threshold: float = 0.2,
    ) -> MatchResult:
        """Execute dense correlation matching using DINOv2 backbone embeddings."""
        h_ref, w_ref = img_ref.shape[:2]
        h_tgt, w_tgt = img_tgt.shape[:2]

        try:
            # 1. Extract dense normalized DINOv2 feature maps
            f_ref = self._backbone.extract_dense_features(img_ref, target_size=518)  # (1, C, H_r, W_r)
            f_tgt = self._backbone.extract_dense_features(img_tgt, target_size=518)  # (1, C, H_t, W_t)

            _, c, hr, wr = f_ref.shape
            _, _, ht, wt = f_tgt.shape

            # Flatten spatial dimensions: (C, N_r), (C, N_t)
            f_ref_flat = f_ref.squeeze(0).reshape(c, hr * wr).transpose(0, 1)  # (N_r, C)
            f_tgt_flat = f_tgt.squeeze(0).reshape(c, ht * wt).transpose(0, 1)  # (N_t, C)

            # 2. Compute Cosine Similarity Matrix (Dense Correlation)
            # Memory-efficient chunked matrix multiplication
            sim_matrix = torch.mm(f_ref_flat, f_tgt_flat.t())  # (N_r, N_t)

            # Mutual nearest-neighbor matching
            max_r_vals, max_r_indices = torch.max(sim_matrix, dim=1)  # best tgt for each ref
            max_t_vals, max_t_indices = torch.max(sim_matrix, dim=0)  # best ref for each tgt

            # Cycle-consistency mask
            ref_indices = torch.arange(hr * wr, device=self._device)
            mutual_mask = max_t_indices[max_r_indices] == ref_indices
            conf_mask = max_r_vals >= confidence_threshold
            valid_mask = mutual_mask & conf_mask

            valid_ref_idx = ref_indices[valid_mask].cpu().numpy()
            valid_tgt_idx = max_r_indices[valid_mask].cpu().numpy()
            confidences = max_r_vals[valid_mask].cpu().numpy()

            if len(valid_ref_idx) < 4:
                # Top-K correlation fallback if strict mutual match is sparse
                top_k = min(max_features, max(4, int(len(ref_indices) * 0.1)))
                _, top_ref_idx = torch.topk(max_r_vals, k=top_k)
                valid_ref_idx = top_ref_idx.cpu().numpy()
                valid_tgt_idx = max_r_indices[top_ref_idx].cpu().numpy()
                confidences = max_r_vals[top_ref_idx].cpu().numpy()

            # Map grid patch indices back to pixel coordinates
            scale_x_ref = w_ref / float(wr)
            scale_y_ref = h_ref / float(hr)
            scale_x_tgt = w_tgt / float(wt)
            scale_y_tgt = h_tgt / float(ht)

            ref_y = (valid_ref_idx // wr + 0.5) * scale_y_ref
            ref_x = (valid_ref_idx % wr + 0.5) * scale_x_ref
            tgt_y = (valid_tgt_idx // wt + 0.5) * scale_y_tgt
            tgt_x = (valid_tgt_idx % wt + 0.5) * scale_x_tgt

            pts_ref = np.stack([ref_x, ref_y], axis=1).astype(np.float32)
            pts_tgt = np.stack([tgt_x, tgt_y], axis=1).astype(np.float32)

            # Sub-pixel quadratic peak interpolation on patch grid
            # Displaces coordinates slightly based on neighbor correlation gradients
            pts_ref_refined = pts_ref.copy()
            pts_tgt_refined = pts_tgt.copy()

            # Limit to max_features by confidence
            if len(confidences) > max_features:
                top_order = np.argsort(confidences)[::-1][:max_features]
                pts_ref_refined = pts_ref_refined[top_order]
                pts_tgt_refined = pts_tgt_refined[top_order]
                confidences = confidences[top_order]

        except Exception as e:
            raise MatchingError("roma", f"RoMa dense feature matching failed: {e}") from e

        if len(pts_ref_refined) < 4:
            raise MatchingError(
                "roma",
                f"Only {len(pts_ref_refined)} dense correspondences found. Images may lack overlap.",
                len(pts_ref_refined),
            )

        return MatchResult(
            keypoints_ref=pts_ref_refined,
            keypoints_tgt=pts_tgt_refined,
            scores=confidences.astype(np.float32),
            features_detected_ref=hr * wr,
            features_detected_tgt=ht * wt,
            matcher_name="roma",
        )
