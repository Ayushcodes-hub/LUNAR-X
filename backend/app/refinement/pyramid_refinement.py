"""Multi-scale Gaussian pyramid coarse-to-fine refinement.

Builds a Gaussian pyramid and performs ECC optimization at each level
from coarsest to finest resolution. Each level refines the result from
the previous level, enabling convergence to sub-pixel accuracy even
when the initial estimate has large error.

Pipeline per level (coarse→fine):
  1. Downsample ref and tgt by 2^level
  2. Run ECC at that resolution
  3. Upscale the refined homography and use as init for next level
  4. At finest level, run phase correlation for sub-pixel residual
"""
from __future__ import annotations

import numpy as np
import cv2

from app.core.exceptions import RefinementError
from app.refinement.base import IterationMetric, RefinementBase, RefinementResult
from app.refinement.ecc_refinement import ECCRefinement
from app.refinement.phase_correlation import PhaseCorrelationRefinement


class PyramidRefinement(RefinementBase):
    """Multi-scale coarse-to-fine sub-pixel refinement.

    Runs ECC at each pyramid level (coarse→fine), then phase correlation
    at native resolution for the final sub-pixel residual correction.
    """

    def __init__(self, n_levels: int = 4, motion_model: str = "homography") -> None:
        self._n_levels = n_levels
        self._ecc = ECCRefinement(motion_model=motion_model)
        self._phase = PhaseCorrelationRefinement(upsample_factor=100)

    @property
    def name(self) -> str:
        return "pyramid"

    def refine(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        H_initial: np.ndarray,
        max_iterations: int = 50,
        convergence_threshold: float = 1e-5,
    ) -> RefinementResult:
        """Refine using Gaussian pyramid coarse-to-fine + phase correlation.

        Args:
            img_ref: Reference image, grayscale.
            img_tgt: Target image, grayscale.
            H_initial: Initial 3×3 homography from RANSAC.
            max_iterations: Max iterations per pyramid level.
            convergence_threshold: ECC stop criterion per level.

        Returns:
            RefinementResult with sub-pixel accuracy and full convergence history.

        Raises:
            RefinementError: If any level fails critically.
        """
        if img_ref.shape != img_tgt.shape:
            raise RefinementError(
                "pyramid",
                f"Images must have same shape: ref={img_ref.shape}, tgt={img_tgt.shape}.",
            )

        # Build Gaussian pyramids
        pyramid_ref = _build_gaussian_pyramid(img_ref, self._n_levels)
        pyramid_tgt = _build_gaussian_pyramid(img_tgt, self._n_levels)

        H_current = H_initial.copy()
        all_history: list[IterationMetric] = []
        iteration_offset = 0

        # Coarse → fine levels
        for level in range(self._n_levels - 1, -1, -1):
            scale = 2 ** level
            ref_l = pyramid_ref[level]
            tgt_l = pyramid_tgt[level]

            # Scale H to this pyramid level
            S = np.array([[1.0 / scale, 0, 0], [0, 1.0 / scale, 0], [0, 0, 1.0]], dtype=np.float64)
            S_inv = np.diag([float(scale), float(scale), 1.0])
            H_scaled = S @ H_current @ S_inv

            try:
                result_l = self._ecc.refine(
                    ref_l, tgt_l, H_scaled,
                    max_iterations=max(10, max_iterations // self._n_levels),
                    convergence_threshold=convergence_threshold,
                )
            except RefinementError as e:
                # Non-fatal: keep current H and continue to finer level
                continue

            # Scale refined H back to full resolution
            H_current = S_inv @ result_l.H_refined @ S

            # Record history with offset iteration indices
            for m in result_l.convergence_history:
                all_history.append(IterationMetric(
                    iteration=iteration_offset + m.iteration,
                    loss=m.loss,
                    similarity=m.similarity,
                    delta_x_px=m.delta_x_px * scale,
                    delta_y_px=m.delta_y_px * scale,
                    confidence=m.confidence,
                ))
            iteration_offset += len(result_l.convergence_history)

        # Final sub-pixel phase correlation at native resolution
        try:
            phase_result = self._phase.refine(img_ref, img_tgt, H_current)
            H_final = phase_result.H_refined
            delta_x = phase_result.delta_x_px
            delta_y = phase_result.delta_y_px
            confidence = phase_result.confidence
            correlation_surface = phase_result.correlation_surface

            # Append phase correlation step to history
            if phase_result.convergence_history:
                pc_step = phase_result.convergence_history[0]
                all_history.append(IterationMetric(
                    iteration=iteration_offset + 1,
                    loss=pc_step.loss,
                    similarity=pc_step.similarity,
                    delta_x_px=delta_x,
                    delta_y_px=delta_y,
                    confidence=confidence,
                ))
        except RefinementError:
            # Phase correlation failed — use best ECC result
            H_final = H_current
            delta_x = 0.0
            delta_y = 0.0
            confidence = all_history[-1].confidence if all_history else 0.0
            correlation_surface = None

        # Total deltas
        total_delta_H = H_final @ np.linalg.inv(H_initial)
        total_dx = float(total_delta_H[0, 2]) + delta_x
        total_dy = float(total_delta_H[1, 2]) + delta_y
        total_rot = float(np.degrees(np.arctan2(total_delta_H[1, 0], total_delta_H[0, 0])))
        total_scale = float(np.sqrt(total_delta_H[0, 0] ** 2 + total_delta_H[1, 0] ** 2))

        return RefinementResult(
            H_refined=H_final,
            delta_x_px=total_dx,
            delta_y_px=total_dy,
            delta_rotation_deg=total_rot,
            delta_scale=total_scale,
            convergence_history=all_history,
            confidence=confidence,
            method_used="pyramid",
            converged=len(all_history) > 0,
            correlation_surface=correlation_surface,
        )


def _build_gaussian_pyramid(img: np.ndarray, n_levels: int) -> list[np.ndarray]:
    """Build a Gaussian image pyramid with n_levels levels.

    pyramid[0] = full resolution, pyramid[n-1] = coarsest.
    """
    pyramid = [img.copy()]
    for _ in range(n_levels - 1):
        pyramid.append(cv2.pyrDown(pyramid[-1]))
    return pyramid
