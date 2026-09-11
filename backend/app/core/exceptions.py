"""LUNARIS — typed exception hierarchy.

Every pipeline module raises a subclass of LunarisError so callers can
catch at the right granularity without bare ``except Exception``.
"""
from __future__ import annotations


class LunarisError(Exception):
    """Base class for all LUNARIS exceptions."""

    def __init__(self, message: str, *, stage: str = "unknown") -> None:
        super().__init__(message)
        self.message = message
        self.stage = stage

    def to_dict(self) -> dict[str, str]:
        return {"error": type(self).__name__, "message": self.message, "stage": self.stage}


class PipelineError(LunarisError):
    """Raised when the pipeline orchestrator cannot proceed."""


class ImageLoadError(LunarisError):
    """Raised when an image cannot be read or decoded."""

    def __init__(self, path: str, reason: str) -> None:
        super().__init__(
            f"Cannot load image '{path}': {reason}",
            stage="ingestion",
        )
        self.path = path
        self.reason = reason


class PreprocessingError(LunarisError):
    """Raised when a preprocessing step fails."""

    def __init__(self, method: str, reason: str) -> None:
        super().__init__(f"Preprocessing '{method}' failed: {reason}", stage="preprocessing")


class MatchingError(LunarisError):
    """Raised when feature matching produces insufficient correspondences."""

    def __init__(self, matcher: str, reason: str, match_count: int = 0) -> None:
        super().__init__(
            f"Matcher '{matcher}' failed ({reason}). Matched {match_count} points.",
            stage="matching",
        )
        self.match_count = match_count


class GeometryError(LunarisError):
    """Raised when geometric estimation (RANSAC, homography) fails."""

    def __init__(self, reason: str, inlier_count: int = 0) -> None:
        super().__init__(
            f"Geometric estimation failed: {reason}. Inliers: {inlier_count}",
            stage="geometry",
        )
        self.inlier_count = inlier_count


class RefinementError(LunarisError):
    """Raised when sub-pixel refinement does not converge."""

    def __init__(self, method: str, reason: str) -> None:
        super().__init__(
            f"Sub-pixel refinement '{method}' failed: {reason}",
            stage="refinement",
        )


class EvaluationError(LunarisError):
    """Raised when metric computation fails."""

    def __init__(self, metric: str, reason: str) -> None:
        super().__init__(f"Metric '{metric}' could not be computed: {reason}", stage="evaluation")


class ModelNotFoundError(LunarisError):
    """Raised when a requested matcher or refinement method is not registered."""

    def __init__(self, registry: str, name: str) -> None:
        super().__init__(
            f"'{name}' is not registered in {registry}. "
            f"Call get_settings() and ensure the model was loaded at startup.",
            stage="registry",
        )
