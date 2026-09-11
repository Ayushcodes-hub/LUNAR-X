"""Refinement registry — factory for all registered refinement methods."""
from __future__ import annotations

from app.core.exceptions import ModelNotFoundError
from app.refinement.base import RefinementBase
from app.refinement.phase_correlation import PhaseCorrelationRefinement
from app.refinement.ecc_refinement import ECCRefinement
from app.refinement.pyramid_refinement import PyramidRefinement
from app.refinement.learned_refiner import LearnedSubPixelRefiner


_REGISTRY: dict[str, RefinementBase] = {}


def _build_registry() -> dict[str, RefinementBase]:
    methods: list[RefinementBase] = [
        PhaseCorrelationRefinement(upsample_factor=100),
        ECCRefinement(motion_model="homography"),
        PyramidRefinement(n_levels=4, motion_model="homography"),
        LearnedSubPixelRefiner(),
    ]
    return {m.name: m for m in methods}


def get_refinement(name: str) -> RefinementBase:
    """Return a refinement method by name.

    Supported methods:
    - 'phase_correlation': Classical upsampled cross-correlation
    - 'ecc': Enhanced Correlation Coefficient continuous optimization
    - 'pyramid': Coarse-to-fine Gaussian pyramid refinement
    - 'learned_subpixel': Deep correlation patch regressor
    """
    global _REGISTRY  # noqa: PLW0603
    if not _REGISTRY:
        _REGISTRY = _build_registry()
    if name not in _REGISTRY:
        raise ModelNotFoundError("RefinementRegistry", name)
    return _REGISTRY[name]


def list_refinements() -> list[str]:
    """Return all registered refinement method names."""
    global _REGISTRY  # noqa: PLW0603
    if not _REGISTRY:
        _REGISTRY = _build_registry()
    return list(_REGISTRY.keys())
