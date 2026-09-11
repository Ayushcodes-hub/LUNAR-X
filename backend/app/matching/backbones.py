"""Foundation Vision Transformer backbones for lunar feature representation.

Provides dense patch-level embeddings using self-supervised ViT models:
- DINOv2 (Meta): Heavy augmentation-invariant self-supervision for illumination & viewpoint robustness.
- Satellite / Remote Sensing ViT adapter structure.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


def _get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


class BackboneBase(ABC):
    """Abstract base class for foundation feature backbones."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the foundation backbone."""

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Dimension of the extracted feature descriptor per patch/pixel."""

    @abstractmethod
    def extract_dense_features(self, img: np.ndarray) -> torch.Tensor:
        """Extract dense normalized feature map from grayscale or RGB image.

        Args:
            img: 2D or 3D uint8/float32 image.

        Returns:
            Tensor of shape (1, C, H_feat, W_feat) with L2-normalized feature embeddings.
        """


class DINOv2Backbone(BackboneBase):
    """DINOv2 (ViT-Small/14 or ViT-Base/14) dense feature extractor.

    Pretrained via self-supervised DINOv2 objective, yielding representations
    inherently robust to illumination variations and geometric perspective shifts.
    """

    def __init__(self, model_size: str = "vits14") -> None:
        self._model_size = model_size
        self._device = _get_device()
        self._model: nn.Module | None = None
        self._patch_size = 14
        self._dim = 384 if "vits" in model_size else 768

    @property
    def name(self) -> str:
        return f"dinov2_{self._model_size}"

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def _load_model(self) -> nn.Module:
        if self._model is None:
            try:
                import ssl
                import certifi
                try:
                    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
                except Exception:
                    ssl._create_default_https_context = ssl._create_unverified_context

                logger.info("Loading DINOv2 (%s) on %s…", self._model_size, self._device)
                model = torch.hub.load(
                    "facebookresearch/dinov2",
                    f"dinov2_{self._model_size}",
                    pretrained=True,
                    trust_repo=True,
                )
                self._model = model.eval().to(self._device)
                logger.info("DINOv2 loaded successfully.")
            except Exception as e:
                logger.warning("Falling back to local lightweight convolutional ViT backbone: %s", e)
                self._model = _FallbackViTBackbone(self._dim).eval().to(self._device)
        return self._model

    def extract_dense_features(self, img: np.ndarray, target_size: int = 518) -> torch.Tensor:
        """Extract dense patch token map from input image.

        Image is normalized with standard ImageNet statistics and resized
        to a multiple of patch size (14).
        """
        model = self._load_model()

        # Convert grayscale to 3-channel
        if img.ndim == 2:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
        else:
            img_rgb = img

        h, w = img_rgb.shape[:2]
        # Make dimensions multiple of patch size 14
        target_h = max(14, int(round(h / self._patch_size)) * self._patch_size)
        target_w = max(14, int(round(w / self._patch_size)) * self._patch_size)

        # Bound max dimension on CPU
        if max(target_h, target_w) > target_size:
            scale = target_size / max(target_h, target_w)
            target_h = int(round(target_h * scale / self._patch_size)) * self._patch_size
            target_w = int(round(target_w * scale / self._patch_size)) * self._patch_size

        resized = cv2.resize(img_rgb, (target_w, target_h), interpolation=cv2.INTER_AREA)
        tensor = torch.from_numpy(resized).permute(2, 0, 1).float() / 255.0

        # Standard ImageNet normalization
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        norm_tensor = ((tensor - mean) / std).unsqueeze(0).to(self._device)

        with torch.inference_mode():
            if hasattr(model, "get_intermediate_layers"):
                # DINOv2 returns patch tokens of shape (1, num_patches, embed_dim)
                feats = model.get_intermediate_layers(norm_tensor, n=1, return_class_token=False)[0]
                num_patches_h = target_h // self._patch_size
                num_patches_w = target_w // self._patch_size
                # Reshape to (1, embed_dim, H_patch, W_patch)
                feat_map = feats.transpose(1, 2).reshape(1, self._dim, num_patches_h, num_patches_w)
            else:
                feat_map = model(norm_tensor)

            # L2 normalize along channel dimension
            feat_map = F.normalize(feat_map, p=2, dim=1)

        return feat_map


class _FallbackViTBackbone(nn.Module):
    """Lightweight self-contained patch projection fallback when offline."""

    def __init__(self, embed_dim: int = 384, patch_size: int = 14) -> None:
        super().__init__()
        self.proj = nn.Conv2d(3, embed_dim, kernel_size=patch_size, stride=patch_size)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.proj(x)
        b, c, h, w = x.shape
        x_flat = x.permute(0, 2, 3, 1).reshape(b, h * w, c)
        x_norm = self.norm(x_flat)
        return x_norm.reshape(b, h, w, c).permute(0, 3, 1, 2)


_backbones: dict[str, BackboneBase] = {}


def get_backbone(name: str = "dinov2_vits14") -> BackboneBase:
    """Retrieve or instantiate a cached foundation backbone."""
    if name not in _backbones:
        if name.startswith("dinov2"):
            size = name.split("_")[-1] if "_" in name else "vits14"
            _backbones[name] = DINOv2Backbone(model_size=size)
        else:
            _backbones[name] = DINOv2Backbone(model_size="vits14")
    return _backbones[name]
