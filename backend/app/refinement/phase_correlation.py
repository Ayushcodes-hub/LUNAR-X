"""Phase correlation sub-pixel refinement.

Uses skimage.registration.phase_cross_correlation with high upsample_factor
to achieve sub-pixel shift estimation in the Fourier domain.

This method:
- Works in frequency domain (very fast for large images)
- Is robust to uniform noise
- Returns a single fractional shift [dy, dx]
- Does NOT require an initial homography estimate (applied as correction)
"""
from __future__ import annotations

import numpy as np
import cv2
from skimage.registration import phase_cross_correlation

from app.core.exceptions import RefinementError
from app.refinement.base import IterationMetric, RefinementBase, RefinementResult


class PhaseCorrelationRefinement(RefinementBase):
    """Sub-pixel refinement via Fourier-domain phase cross-correlation.

    Precision: 1 / upsample_factor pixels.
    With upsample_factor=100, achieves 0.01px precision.
    """

    def __init__(self, upsample_factor: int = 100) -> None:
        self._upsample_factor = upsample_factor

    @property
    def name(self) -> str:
        return "phase_correlation"

    def refine(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        H_initial: np.ndarray,
        max_iterations: int = 1,  # Phase correlation is a single-shot method
        convergence_threshold: float = 1e-4,
    ) -> RefinementResult:
        """Estimate sub-pixel shift between img_ref and warped img_tgt.

        The target image is first warped using H_initial, then phase correlation
        estimates the residual sub-pixel shift between reference and warped target.

        Args:
            img_ref: Reference image, grayscale.
            img_tgt: Target image (original, not yet warped).
            H_initial: Initial homography from RANSAC.
            max_iterations: Ignored (phase correlation is single-shot).
            convergence_threshold: Ignored (single-shot method).

        Returns:
            RefinementResult with sub-pixel [dx, dy] and correlation surface.

        Raises:
            RefinementError: If images have incompatible shapes or computation fails.
        """
        if img_ref.shape != img_tgt.shape:
            raise RefinementError(
                "phase_correlation",
                f"img_ref {img_ref.shape} and img_tgt {img_tgt.shape} must have the same shape. "
                "Ensure both images are cropped/padded to the same dimensions.",
            )

        h, w = img_ref.shape[:2]

        # Warp target into reference frame using initial homography
        warped_tgt = cv2.warpPerspective(img_tgt, H_initial, (w, h), flags=cv2.INTER_LANCZOS4)

        # Convert to float32 for phase correlation
        ref_f = img_ref.astype(np.float32) / 255.0 if img_ref.dtype == np.uint8 else img_ref.astype(np.float32)
        tgt_f = warped_tgt.astype(np.float32) / 255.0 if warped_tgt.dtype == np.uint8 else warped_tgt.astype(np.float32)

        try:
            result = phase_cross_correlation(
                ref_f,
                tgt_f,
                upsample_factor=self._upsample_factor,
            )
            # skimage ≥0.19 may return 2-tuple (shift, phasediff) or 3-tuple (shift, error, phasediff)
            shift = result[0] if isinstance(result, tuple) else result
        except Exception as e:
            raise RefinementError("phase_correlation", f"phase_cross_correlation failed: {e}") from e

        dy, dx = float(shift[0]), float(shift[1])

        # Compute correlation surface for visualization (at native resolution)
        # This is a 2D cross-correlation map around the peak
        try:
            correlation_surface = self._compute_correlation_surface(ref_f, tgt_f, region_size=64)
        except Exception:
            correlation_surface = None

        # Apply sub-pixel translation correction to H
        # Create translation matrix for the detected sub-pixel shift
        T_correction = np.eye(3, dtype=np.float64)
        T_correction[0, 2] = dx   # shift x
        T_correction[1, 2] = dy   # shift y

        H_refined = T_correction @ H_initial

        # Confidence: based on shift magnitude — large shifts = lower confidence
        shift_magnitude = float(np.sqrt(dx**2 + dy**2))
        similarity = float(np.clip(1.0 - shift_magnitude / 10.0, 0.1, 1.0))

        convergence_history = [
            IterationMetric(
                iteration=1,
                loss=shift_magnitude,
                similarity=similarity,
                delta_x_px=dx,
                delta_y_px=dy,
                confidence=similarity,
            )
        ]

        return RefinementResult(
            H_refined=H_refined,
            delta_x_px=dx,
            delta_y_px=dy,
            delta_rotation_deg=0.0,   # Phase correlation only estimates translation
            delta_scale=1.0,
            convergence_history=convergence_history,
            confidence=similarity,
            method_used="phase_correlation",
            converged=True,
            correlation_surface=correlation_surface,
        )

    def _compute_correlation_surface(
        self,
        ref_f: np.ndarray,
        tgt_f: np.ndarray,
        region_size: int = 64,
    ) -> np.ndarray:
        """Compute a local normalized cross-correlation surface for visualization.

        Returns a (region_size, region_size) float32 array of correlation values.
        The peak location corresponds to the optimal sub-pixel shift.
        """
        cy, cx = ref_f.shape[0] // 2, ref_f.shape[1] // 2
        half = region_size // 2

        r1 = max(0, cy - half)
        r2 = min(ref_f.shape[0], cy + half)
        c1 = max(0, cx - half)
        c2 = min(ref_f.shape[1], cx + half)

        patch_ref = ref_f[r1:r2, c1:c2]
        patch_tgt = tgt_f[r1:r2, c1:c2]

        # Normalized cross-correlation via FFT
        F_ref = np.fft.fft2(patch_ref - patch_ref.mean())
        F_tgt = np.fft.fft2(patch_tgt - patch_tgt.mean())
        cross_power = F_ref * np.conj(F_tgt)
        denom = np.abs(cross_power) + 1e-8
        phase_map = np.abs(np.fft.ifft2(cross_power / denom)).astype(np.float32)
        phase_map = np.fft.fftshift(phase_map)
        # Normalize to [0, 1]
        p_min, p_max = phase_map.min(), phase_map.max()
        if p_max > p_min:
            phase_map = (phase_map - p_min) / (p_max - p_min)
        return phase_map
