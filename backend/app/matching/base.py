"""Feature matching — abstract base and result types."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np


@dataclass
class MatchResult:
    """Output of a feature matcher, before geometric estimation."""

    # Matched keypoint coordinates — shape (N, 2) float32, in pixel space
    keypoints_ref: np.ndarray   # reference image points
    keypoints_tgt: np.ndarray   # target image points

    # Per-match confidence score (0–1), shape (N,)
    scores: np.ndarray

    # Number of detected features (before matching)
    features_detected_ref: int = 0
    features_detected_tgt: int = 0

    # Matcher that produced this result
    matcher_name: str = "unknown"

    @property
    def match_count(self) -> int:
        return len(self.keypoints_ref)

    def validate(self) -> None:
        """Raise ValueError if result is malformed."""
        if self.keypoints_ref.shape != self.keypoints_tgt.shape:
            raise ValueError(
                f"keypoints_ref shape {self.keypoints_ref.shape} != "
                f"keypoints_tgt shape {self.keypoints_tgt.shape}"
            )
        if self.keypoints_ref.ndim != 2 or self.keypoints_ref.shape[1] != 2:
            raise ValueError(f"Keypoints must be (N,2), got {self.keypoints_ref.shape}")


class MatcherBase(ABC):
    """Abstract base for all feature matchers."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def match(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        ratio_threshold: float = 0.75,
        max_features: int = 8000,
    ) -> MatchResult:
        """Match features between two grayscale images.

        Args:
            img_ref: Reference image, grayscale uint8.
            img_tgt: Target image, grayscale uint8.
            ratio_threshold: Lowe ratio test threshold (SIFT) or confidence cutoff (LoFTR).
            max_features: Maximum number of features to extract/use.

        Returns:
            MatchResult with matched keypoint pairs and scores.

        Raises:
            MatchingError: If matching produces fewer than 4 point pairs.
        """
        ...
