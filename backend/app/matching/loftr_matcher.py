"""LoFTR dense matcher via kornia."""
from __future__ import annotations

import logging
import numpy as np

from app.core.exceptions import MatchingError
from app.matching.base import MatchResult, MatcherBase

logger = logging.getLogger(__name__)

_loftr_model = None


def _get_loftr(pretrained: str = "outdoor") -> object:
    """Load (and cache) the LoFTR model.

    Weights are downloaded from kornia's public CDN on first call (~45MB).
    No HuggingFace credentials required.
    """
    global _loftr_model  # noqa: PLW0603
    if _loftr_model is None:
        try:
            import ssl
            import torch
            import kornia.feature as KF

            # Windows Python SSL workaround for public model checkpoints
            try:
                import certifi
                ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
            except Exception:
                ssl._create_default_https_context = ssl._create_unverified_context

            device = "cuda" if _cuda_available() else "cpu"
            logger.info("Loading LoFTR (%s weights) on %s…", pretrained, device)
            _loftr_model = KF.LoFTR(pretrained=pretrained).eval().to(device)
            logger.info("LoFTR loaded successfully.")
        except ImportError as e:
            raise MatchingError(
                "loftr",
                f"kornia is not installed. Run: pip install kornia. Original error: {e}",
            ) from e
        except Exception as e:
            raise MatchingError(
                "loftr",
                f"Failed to load LoFTR weights ({pretrained}). "
                f"Check internet connection for first-run download. Error: {e}",
            ) from e
    return _loftr_model


def _cuda_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


class LoFTRMatcher(MatcherBase):
    """Dense feature matcher using kornia's LoFTR (Local Feature TRansformer).

    LoFTR produces dense semi-dense correspondences without explicit keypoint detection.
    More robust than SIFT for low-texture and illumination-varying lunar imagery.

    Weights: auto-downloaded from kornia CDN (no credentials needed).
    CPU: supported (slow, ~2–5s per 640×480 pair).
    """

    def __init__(self, pretrained: str = "outdoor") -> None:
        self._pretrained = pretrained

    @property
    def name(self) -> str:
        return "loftr"

    def match(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        ratio_threshold: float = 0.0,  # not used by LoFTR (confidence threshold instead)
        max_features: int = 8000,
        confidence_threshold: float = 0.2,
    ) -> MatchResult:
        """Run LoFTR dense matching.

        Args:
            img_ref: Reference image, grayscale uint8 or float32.
            img_tgt: Target image, grayscale uint8 or float32.
            ratio_threshold: Unused (LoFTR uses confidence scores).
            max_features: Max correspondences to keep (top by confidence).
            confidence_threshold: Minimum LoFTR confidence to accept a match.

        Returns:
            MatchResult with dense correspondences.

        Raises:
            MatchingError: If fewer than 4 matches survive confidence filter.
        """
        try:
            import cv2
            import torch
        except ImportError as e:
            raise MatchingError("loftr", f"Dependencies not installed: {e}") from e

        model = _get_loftr(self._pretrained)
        device = next(model.parameters()).device  # type: ignore[attr-defined]

        # LoFTR requires dimensions divisible by 8
        def _prepare_image(img: np.ndarray, max_dim: int = 840) -> tuple[torch.Tensor, float, float]:
            h, w = img.shape[:2]
            scale = min(1.0, max_dim / max(h, w))
            new_w = max(8, int(round(w * scale / 8.0) * 8))
            new_h = max(8, int(round(h * scale / 8.0) * 8))
            
            if new_w != w or new_h != h:
                resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            else:
                resized = img

            img_f = resized.astype(np.float32) / 255.0 if resized.dtype == np.uint8 else resized.astype(np.float32)
            tensor = torch.from_numpy(img_f)[None, None].to(device)
            scale_x = w / float(new_w)
            scale_y = h / float(new_h)
            return tensor, scale_x, scale_y

        t_ref, sx0, sy0 = _prepare_image(img_ref)
        t_tgt, sx1, sy1 = _prepare_image(img_tgt)

        with torch.inference_mode():
            out = model({"image0": t_ref, "image1": t_tgt})  # type: ignore[operator]

        mkpts0 = out["keypoints0"].cpu().numpy()  # (N, 2)
        mkpts1 = out["keypoints1"].cpu().numpy()  # (N, 2)
        conf = out["confidence"].cpu().numpy()    # (N,)

        # Rescale keypoints back to original coordinate space
        if len(mkpts0) > 0:
            mkpts0[:, 0] *= sx0
            mkpts0[:, 1] *= sy0
            mkpts1[:, 0] *= sx1
            mkpts1[:, 1] *= sy1

        # Apply confidence filter
        mask = conf >= confidence_threshold
        mkpts0, mkpts1, conf = mkpts0[mask], mkpts1[mask], conf[mask]

        # Keep top max_features by confidence
        if len(conf) > max_features:
            top_idx = np.argsort(conf)[::-1][:max_features]
            mkpts0, mkpts1, conf = mkpts0[top_idx], mkpts1[top_idx], conf[top_idx]

        if len(mkpts0) < 4:
            raise MatchingError(
                "loftr",
                f"Only {len(mkpts0)} correspondences survived confidence filter "
                f"(threshold={confidence_threshold}). "
                "Images may have insufficient overlap or extreme illumination difference.",
                len(mkpts0),
            )

        return MatchResult(
            keypoints_ref=mkpts0.astype(np.float32),
            keypoints_tgt=mkpts1.astype(np.float32),
            scores=conf.astype(np.float32),
            features_detected_ref=int(out["keypoints0"].shape[0]),
            features_detected_tgt=int(out["keypoints1"].shape[0]),
            matcher_name="loftr",
        )
