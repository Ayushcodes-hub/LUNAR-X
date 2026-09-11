"""Matcher registry — factory for all registered feature matchers."""
from __future__ import annotations

from app.core.exceptions import ModelNotFoundError
from app.matching.base import MatcherBase
from app.matching.sift_matcher import SIFTMatcher
from app.matching.loftr_matcher import LoFTRMatcher
from app.matching.lightglue_matcher import LightGlueMatcher
from app.matching.roma_matcher import RoMaMatcher


_REGISTRY: dict[str, MatcherBase] = {}


def _build_registry() -> dict[str, MatcherBase]:
    matchers: list[MatcherBase] = [
        RoMaMatcher(),
        LightGlueMatcher(feature_type="disk"),
        LoFTRMatcher(pretrained="outdoor"),
        SIFTMatcher(),
    ]
    return {m.name: m for m in matchers}


def get_matcher(name: str) -> MatcherBase:
    """Return a matcher by registered name.

    Supported matchers:
    - 'roma': Flagship dense feature matcher with ViT correlation volume
    - 'lightglue' or 'lightglue_disk': Fast adaptive GNN matcher
    - 'loftr': Coarse-to-fine transformer baseline
    - 'sift': Classical comparison baseline
    """
    global _REGISTRY  # noqa: PLW0603
    if not _REGISTRY:
        _REGISTRY = _build_registry()

    normalized_name = name.lower()
    if normalized_name in _REGISTRY:
        return _REGISTRY[normalized_name]
    if normalized_name == "lightglue" and "lightglue_disk" in _REGISTRY:
        return _REGISTRY["lightglue_disk"]

    raise ModelNotFoundError("MatcherRegistry", name)


def list_matchers() -> list[str]:
    """Return all registered matcher names."""
    global _REGISTRY  # noqa: PLW0603
    if not _REGISTRY:
        _REGISTRY = _build_registry()
    return list(_REGISTRY.keys())
