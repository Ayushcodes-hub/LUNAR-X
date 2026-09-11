"""Sub-pixel refinement — abstract base and result types."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np


@dataclass
class IterationMetric:
    """Metrics recorded at a single optimization iteration."""

    iteration: int
    loss: float           # Registration loss (lower = better)
    similarity: float     # Normalized similarity score (higher = better)
    delta_x_px: float     # Current sub-pixel X displacement estimate
    delta_y_px: float     # Current sub-pixel Y displacement estimate
    confidence: float     # Confidence in current estimate (0–1)


@dataclass
class RefinementResult:
    """Output of a sub-pixel refinement step."""

    H_refined: np.ndarray            # Refined 3×3 homography
    delta_x_px: float                # Sub-pixel X correction applied (fractional pixels)
    delta_y_px: float                # Sub-pixel Y correction applied (fractional pixels)
    delta_rotation_deg: float        # Rotation correction (degrees)
    delta_scale: float               # Scale correction factor (1.0 = no change)
    convergence_history: list[IterationMetric] = field(default_factory=list)
    confidence: float = 0.0
    method_used: str = "unknown"
    converged: bool = False
    # Optional: 2D correlation surface data for the sub-pixel analysis lab visualization
    correlation_surface: np.ndarray | None = None  # shape (M, M) float32


class RefinementBase(ABC):
    """Abstract base for all sub-pixel refinement methods."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def refine(
        self,
        img_ref: np.ndarray,
        img_tgt: np.ndarray,
        H_initial: np.ndarray,
        max_iterations: int = 100,
        convergence_threshold: float = 1e-4,
    ) -> RefinementResult:
        """Refine the initial homography to sub-pixel accuracy.

        Args:
            img_ref: Reference image, grayscale uint8 or float32.
            img_tgt: Target (warped) image, same shape as img_ref.
            H_initial: Initial 3×3 homography from geometric estimation.
            max_iterations: Maximum optimization iterations.
            convergence_threshold: Stop when parameter change < this value.

        Returns:
            RefinementResult with refined H and sub-pixel displacement.

        Raises:
            RefinementError: If refinement fails or produces degenerate output.
        """
        ...
