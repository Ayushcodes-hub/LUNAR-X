"""SIFT feature matcher with Lowe ratio test."""
from __future__ import annotations

import cv2
import numpy as np

from app.core.exceptions import MatchingError
from app.matching.base import MatchResult, MatcherBase


class SIFTMatcher(MatcherBase):
    """SIFT feature detection + BFMatcher with Lowe's ratio test.

    Uses OpenCV's SIFT (Scale-Invariant Feature Transform).
    Robust to scale and rotation changes. Good baseline for all lunar imagery.
    """

    @property
    def name(self) -> str:
        return "sift"

    def match(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        ratio_threshold: float = 0.75,
        max_features: int = 8000,
    ) -> MatchResult:
        """Detect SIFT keypoints and match with ratio test.

        Args:
            img_ref: Reference image, grayscale uint8.
            img_tgt: Target image, grayscale uint8.
            ratio_threshold: Lowe ratio test threshold (0.6–0.8 typical).
            max_features: Max SIFT keypoints per image.

        Returns:
            MatchResult with matched point pairs and match scores.

        Raises:
            MatchingError: If fewer than 4 matches survive the ratio test.
        """
        if img_ref.ndim != 2 or img_tgt.ndim != 2:
            raise MatchingError("sift", "Expected grayscale (2D) images")
        if img_ref.dtype != np.uint8 or img_tgt.dtype != np.uint8:
            raise MatchingError("sift", "Images must be uint8. Apply normalize_image() first.")

        sift = cv2.SIFT_create(nfeatures=max_features)

        kp1, desc1 = sift.detectAndCompute(img_ref, None)
        kp2, desc2 = sift.detectAndCompute(img_tgt, None)

        n_ref = len(kp1)
        n_tgt = len(kp2)

        if desc1 is None or len(kp1) < 2:
            raise MatchingError("sift", f"Too few features in reference image ({n_ref} detected).", n_ref)
        if desc2 is None or len(kp2) < 2:
            raise MatchingError("sift", f"Too few features in target image ({n_tgt} detected).", n_tgt)

        matcher = cv2.BFMatcher(cv2.NORM_L2)
        raw_matches = matcher.knnMatch(desc1, desc2, k=2)

        # Lowe ratio test
        good_matches: list[cv2.DMatch] = []
        for m_pair in raw_matches:
            if len(m_pair) == 2:
                m, n = m_pair
                if m.distance < ratio_threshold * n.distance:
                    good_matches.append(m)

        if len(good_matches) < 4:
            raise MatchingError(
                "sift",
                f"Only {len(good_matches)} matches survived ratio test (threshold={ratio_threshold}). "
                "Try increasing ratio_threshold or using a different matcher.",
                len(good_matches),
            )

        pts_ref = np.array([kp1[m.queryIdx].pt for m in good_matches], dtype=np.float32)
        pts_tgt = np.array([kp2[m.trainIdx].pt for m in good_matches], dtype=np.float32)
        # Score: inverse of distance ratio (higher = better match)
        scores = np.array(
            [1.0 - m.distance / (ratio_threshold * raw_matches[i][1].distance + 1e-6)
             for i, m in enumerate(good_matches)],
            dtype=np.float32,
        )
        scores = np.clip(scores, 0.0, 1.0)

        return MatchResult(
            keypoints_ref=pts_ref,
            keypoints_tgt=pts_tgt,
            scores=scores,
            features_detected_ref=n_ref,
            features_detected_tgt=n_tgt,
            matcher_name="sift",
        )
