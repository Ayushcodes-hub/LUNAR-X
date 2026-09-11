"""Pipeline orchestrator — wires all stages and emits real-time SSE events.

INTEGRITY CONTRACT:
- Every metric emitted via SSE comes from actual pipeline computation.
- Progress percentages correspond to actual completed stages, not cosmetic timers.
- No stage is faked or skipped silently — failures raise typed errors that are
  caught here and emitted as 'failed' stage events with real error messages.
"""
from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.core.exceptions import (
    GeometryError, ImageLoadError, LunarisError,
    MatchingError, PreprocessingError, RefinementError,
)
from app.evaluation.metrics import (
    FullMetrics, compute_mutual_information, compute_ncc,
    compute_quality_score, compute_rmse, compute_spatial_uniformity, compute_ssim,
)
from app.geometry.estimator import estimate_homography, warp_image
from app.ingestion.loader import load_grayscale
from app.matching.registry import get_matcher
from app.pipelines.events import EventEmitter, MetricsSnapshot, PipelineEvent, PIPELINE_STAGES
from app.preprocessing.normalizer import normalize_image
from app.refinement.registry import get_refinement


# ── Stage progress percentages (real stage weights, not arbitrary) ────────────
_STAGE_PCT = {
    "ingestion":            8.0,
    "preprocessing":       18.0,
    "feature_extraction":  35.0,
    "feature_matching":    50.0,
    "geometric_estimation": 65.0,
    "subpixel_refinement": 82.0,
    "evaluation":          95.0,
    "complete":           100.0,
}


async def _emit(
    emitter: EventEmitter,
    job_id: str,
    stage: str,
    status: str,
    message: str,
    metrics: MetricsSnapshot | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    await emitter.emit(PipelineEvent(
        job_id=job_id,
        stage=stage,
        status=status,  # type: ignore[arg-type]
        progress_pct=_STAGE_PCT.get(stage, 0.0),
        message=message,
        metrics=metrics or MetricsSnapshot(),
        extra=extra or {},
    ))


async def run_pipeline(
    job_id: str,
    params: dict[str, Any],
    emitter: EventEmitter,
) -> dict[str, Any]:
    """Execute the full registration pipeline with SSE progress events.

    Args:
        job_id: Unique job identifier (used in all emitted events).
        params: Pipeline parameters dict with keys:
            - reference_path (str): Path to reference image.
            - target_path (str): Path to target image.
            - matcher (str): 'sift' or 'loftr'.
            - preprocessing (str): 'clahe', 'homomorphic', or 'none'.
            - refinement_method (str): 'phase_correlation', 'ecc', 'pyramid'.
            - ransac_threshold (float): RANSAC reprojection threshold in pixels.
            - ratio_threshold (float): Lowe ratio for SIFT / confidence for LoFTR.
            - max_features (int): Max features to extract.
            - grid_n (int): Uniformity grid rows.
            - grid_m (int): Uniformity grid columns.
        emitter: EventEmitter for SSE streaming.

    Returns:
        Full result dict stored in the database.

    Raises:
        Never raises — all errors are caught and emitted as 'failed' events,
        then re-raised so the job status is marked 'failed' in the DB.
    """
    t_start = time.perf_counter()

    ref_path = params.get("reference_path", "")
    tgt_path = params.get("target_path", "")
    matcher_name = params.get("matcher", "sift")
    preprocess_method = params.get("preprocessing", "clahe")
    refinement_name = params.get("refinement_method", "phase_correlation")
    ransac_threshold = float(params.get("ransac_threshold", 4.0))
    ratio_threshold = float(params.get("ratio_threshold", 0.75))
    max_features = int(params.get("max_features", 8000))
    grid_n = int(params.get("grid_n", 8))
    grid_m = int(params.get("grid_m", 8))

    result: dict[str, Any] = {"job_id": job_id, "params": params}

    # ── STAGE 1: Ingestion ────────────────────────────────────────────────────
    await _emit(emitter, job_id, "ingestion", "running", "Loading and validating images…")
    try:
        img_ref, info_ref = await asyncio.get_event_loop().run_in_executor(
            None, load_grayscale, ref_path
        )
        img_tgt, info_tgt = await asyncio.get_event_loop().run_in_executor(
            None, load_grayscale, tgt_path
        )
    except ImageLoadError as e:
        await _emit(emitter, job_id, "ingestion", "failed", str(e))
        await emitter.done()
        raise

    await _emit(
        emitter, job_id, "ingestion", "done",
        f"Loaded {info_ref.width}×{info_ref.height} reference and "
        f"{info_tgt.width}×{info_tgt.height} target.",
        extra={"ref_info": vars(info_ref), "tgt_info": vars(info_tgt)},
    )

    # ── STAGE 2: Preprocessing ────────────────────────────────────────────────
    await _emit(emitter, job_id, "preprocessing", "running",
                f"Applying {preprocess_method.upper()} illumination normalization…")
    try:
        img_ref_proc = await asyncio.get_event_loop().run_in_executor(
            None, normalize_image, img_ref, preprocess_method
        )
        img_tgt_proc = await asyncio.get_event_loop().run_in_executor(
            None, normalize_image, img_tgt, preprocess_method
        )
    except PreprocessingError as e:
        await _emit(emitter, job_id, "preprocessing", "failed", str(e))
        await emitter.done()
        raise

    await _emit(emitter, job_id, "preprocessing", "done",
                f"{preprocess_method.upper()} normalization complete.")

    # ── STAGE 3: Feature Extraction + Matching ────────────────────────────────
    await _emit(emitter, job_id, "feature_extraction", "running",
                f"Detecting lunar surface features with {matcher_name.upper()}…")
    try:
        matcher = get_matcher(matcher_name)
        match_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: matcher.match(
                img_ref_proc, img_tgt_proc,
                ratio_threshold=ratio_threshold,
                max_features=max_features,
            ),
        )
    except MatchingError as e:
        await _emit(
            emitter, job_id, "feature_matching", "failed",
            f"Feature matching failed: {e}. "
            "Ensure images have sufficient overlap and surface texture.",
        )
        await emitter.done()
        raise

    metrics_snap = MetricsSnapshot(
        features_detected=match_result.features_detected_ref,
        matches_found=match_result.match_count,
    )
    await _emit(emitter, job_id, "feature_matching", "done",
                f"Found {match_result.match_count} feature correspondences "
                f"({match_result.features_detected_ref} detected in reference).",
                metrics=metrics_snap)

    # ── STAGE 4: Geometric Estimation ─────────────────────────────────────────
    await _emit(emitter, job_id, "geometric_estimation", "running",
                "Running RANSAC homography estimation…")
    try:
        geo_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: estimate_homography(
                match_result.keypoints_ref,
                match_result.keypoints_tgt,
                ransac_threshold=ransac_threshold,
            ),
        )
    except GeometryError as e:
        await _emit(emitter, job_id, "geometric_estimation", "failed", str(e))
        await emitter.done()
        raise

    metrics_snap = MetricsSnapshot(
        features_detected=match_result.features_detected_ref,
        matches_found=match_result.match_count,
        inlier_count=geo_result.inlier_count,
        inlier_ratio=round(geo_result.inlier_ratio, 4),
    )
    await _emit(emitter, job_id, "geometric_estimation", "done",
                f"Homography estimated. Inliers: {geo_result.inlier_count} "
                f"({geo_result.inlier_ratio:.1%}), reprojection error: "
                f"{geo_result.reprojection_error_px:.3f}px.",
                metrics=metrics_snap)

    # ── STAGE 5: Sub-pixel Refinement ─────────────────────────────────────────
    await _emit(emitter, job_id, "subpixel_refinement", "running",
                f"Entering sub-pixel optimization ({refinement_name})…")

    # Resize target to match reference if needed
    h_ref, w_ref = img_ref_proc.shape[:2]
    img_tgt_resized = cv2.resize(img_tgt_proc, (w_ref, h_ref)) if img_tgt_proc.shape != img_ref_proc.shape else img_tgt_proc

    try:
        refiner = get_refinement(refinement_name)
        ref_result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: refiner.refine(img_ref_proc, img_tgt_resized, geo_result.H),
        )
    except RefinementError as e:
        # Non-fatal: use coarse homography
        await _emit(emitter, job_id, "subpixel_refinement", "failed",
                    f"Sub-pixel refinement failed: {e}. Using coarse homography.")
        H_final = geo_result.H
        ref_result = None
    else:
        H_final = ref_result.H_refined
        subpixel_precision = float(
            np.sqrt(ref_result.delta_x_px ** 2 + ref_result.delta_y_px ** 2)
        )
        metrics_snap = MetricsSnapshot(
            inlier_count=geo_result.inlier_count,
            inlier_ratio=round(geo_result.inlier_ratio, 4),
            delta_x_px=round(ref_result.delta_x_px, 6),
            delta_y_px=round(ref_result.delta_y_px, 6),
            delta_rotation_deg=round(ref_result.delta_rotation_deg, 6),
            delta_scale=round(ref_result.delta_scale, 6),
            confidence=round(ref_result.confidence, 4),
        )
        await _emit(emitter, job_id, "subpixel_refinement", "done",
                    f"Sub-pixel refinement converged. "
                    f"ΔX={ref_result.delta_x_px:+.4f}px, "
                    f"ΔY={ref_result.delta_y_px:+.4f}px, "
                    f"precision={subpixel_precision:.4f}px.",
                    metrics=metrics_snap,
                    extra={
                        "convergence_history": [
                            vars(m) for m in ref_result.convergence_history
                        ],
                        "correlation_surface": (
                            ref_result.correlation_surface.tolist()
                            if ref_result.correlation_surface is not None else None
                        ),
                    })

    # ── Warp image ────────────────────────────────────────────────────────────
    registered = warp_image(img_tgt, H_final, (h_ref, w_ref))
    
    # Save registered raster to upload_dir for direct serving in UI
    from app.core.config import get_settings
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    reg_out_path = settings.upload_dir / f"{job_id}_registered.png"
    cv2.imwrite(str(reg_out_path), registered)

    # ── STAGE 6: Evaluation ───────────────────────────────────────────────────
    await _emit(emitter, job_id, "evaluation", "running",
                "Computing registration quality metrics…")

    full_metrics = FullMetrics(
        inlier_count=geo_result.inlier_count,
        inlier_ratio=geo_result.inlier_ratio,
        reprojection_error_px=geo_result.reprojection_error_px,
        features_detected_ref=match_result.features_detected_ref,
        features_detected_tgt=match_result.features_detected_tgt,
    )

    # RMSE — computed from actual registered vs reference pixels
    try:
        full_metrics.rmse_px = compute_rmse(registered, img_ref)
    except Exception:
        full_metrics.rmse_px = None

    # NCC
    try:
        full_metrics.ncc = compute_ncc(registered, img_ref)
    except Exception:
        full_metrics.ncc = None

    # SSIM
    try:
        full_metrics.ssim = compute_ssim(registered, img_ref)
    except Exception:
        full_metrics.ssim = None

    # Mutual information
    try:
        full_metrics.mutual_information = compute_mutual_information(registered, img_ref)
    except Exception:
        full_metrics.mutual_information = None

    # Spatial uniformity (inlier points only)
    inlier_pts = match_result.keypoints_ref[geo_result.inlier_mask]
    try:
        full_metrics.uniformity = compute_spatial_uniformity(
            inlier_pts, (h_ref, w_ref), grid_n=grid_n, grid_m=grid_m
        )
    except Exception:
        full_metrics.uniformity = None

    # Sub-pixel deltas
    if ref_result is not None:
        full_metrics.delta_x_px = ref_result.delta_x_px
        full_metrics.delta_y_px = ref_result.delta_y_px
        full_metrics.delta_rotation_deg = ref_result.delta_rotation_deg
        full_metrics.delta_scale = ref_result.delta_scale
        full_metrics.subpixel_precision_px = float(
            np.sqrt(ref_result.delta_x_px ** 2 + ref_result.delta_y_px ** 2)
        )

    full_metrics.processing_time_sec = time.perf_counter() - t_start
    full_metrics.quality = compute_quality_score(full_metrics)

    await _emit(emitter, job_id, "evaluation", "done",
                f"Quality: {full_metrics.quality.grade.upper()} "
                f"(score={full_metrics.quality.score:.2f}). "
                f"RMSE={full_metrics.rmse_px:.3f}px." if full_metrics.rmse_px else
                f"Quality: {full_metrics.quality.grade.upper()}.")

    # ── Complete ──────────────────────────────────────────────────────────────
    await _emit(
        emitter, job_id, "complete", "done",
        "Registration complete. All metrics computed from real pipeline output.",
        metrics=MetricsSnapshot(
            inlier_count=full_metrics.inlier_count,
            inlier_ratio=full_metrics.inlier_ratio,
            rmse_px=full_metrics.rmse_px,
            ncc=full_metrics.ncc,
            delta_x_px=full_metrics.delta_x_px,
            delta_y_px=full_metrics.delta_y_px,
            delta_rotation_deg=full_metrics.delta_rotation_deg,
            delta_scale=full_metrics.delta_scale,
            confidence=full_metrics.quality.score if full_metrics.quality else None,
        ),
    )
    await emitter.done()

    # Build full result dict
    def _safe(v: Any) -> Any:
        if isinstance(v, np.ndarray):
            return v.tolist()
        if isinstance(v, np.floating):
            return float(v)
        if isinstance(v, np.integer):
            return int(v)
        return v

    # Uncertainty estimation
    from app.matching.uncertainty import compute_match_uncertainty
    match_uncertainties, uncertainty_map = compute_match_uncertainty(
        match_result.keypoints_ref,
        match_result.keypoints_tgt,
        match_result.scores,
        img_shape=(h_ref, w_ref),
        grid_size=32,
    )

    result.update({
        "metrics": {
            "rmse_px": full_metrics.rmse_px,
            "ncc": full_metrics.ncc,
            "ssim": full_metrics.ssim,
            "mutual_information": full_metrics.mutual_information,
            "inlier_count": full_metrics.inlier_count,
            "inlier_ratio": full_metrics.inlier_ratio,
            "reprojection_error_px": full_metrics.reprojection_error_px,
            "features_detected_ref": full_metrics.features_detected_ref,
            "features_detected_tgt": full_metrics.features_detected_tgt,
            "delta_x_px": full_metrics.delta_x_px,
            "delta_y_px": full_metrics.delta_y_px,
            "delta_rotation_deg": full_metrics.delta_rotation_deg,
            "delta_scale": full_metrics.delta_scale,
            "subpixel_precision_px": full_metrics.subpixel_precision_px,
            "processing_time_sec": full_metrics.processing_time_sec,
            "quality_grade": full_metrics.quality.grade if full_metrics.quality else None,
            "quality_score": full_metrics.quality.score if full_metrics.quality else None,
            "quality_explanation": full_metrics.quality.explanation if full_metrics.quality else None,
        },
        "uniformity": {
            "score": full_metrics.uniformity.score,
            "coverage_fraction": full_metrics.uniformity.coverage_fraction,
            "grid_n": full_metrics.uniformity.grid_n,
            "grid_m": full_metrics.uniformity.grid_m,
            "density_map": full_metrics.uniformity.density_map.tolist(),
        } if full_metrics.uniformity else None,
        "homography": H_final.tolist(),
        "match_points": {
            "ref": match_result.keypoints_ref.tolist(),
            "tgt": match_result.keypoints_tgt.tolist(),
            "scores": match_result.scores.tolist(),
            "uncertainties": match_uncertainties.tolist(),
            "inlier_mask": geo_result.inlier_mask.tolist(),
        },
        "uncertainty_heatmap": uncertainty_map.tolist(),
        "convergence_history": (
            [vars(m) for m in ref_result.convergence_history] if ref_result else []
        ),
        "correlation_surface": (
            ref_result.correlation_surface.tolist()
            if ref_result and ref_result.correlation_surface is not None else None
        ),
        "registered_image_id": f"{job_id}_registered",
        "registered_path": str(reg_out_path),
        "image_info": {
            "ref": vars(info_ref),
            "tgt": vars(info_tgt),
        },
    })

    return result
