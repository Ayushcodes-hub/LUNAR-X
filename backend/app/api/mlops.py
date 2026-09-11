"""MLOps API router — real fine-tuning, model registry, and DEM endpoints."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.mlops.registry import ModelCheckpoint, ModelRegistry
from app.mlops.training import FineTuningEngine, TrainingStepRecord
from scripts.make_synthetic_pair import _generate_lunar_surface

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/mlops", tags=["mlops"])

_registry = ModelRegistry()
_fine_tuner = FineTuningEngine()


class TrainRequest(BaseModel):
    epochs: int = Field(3, ge=1, le=20, description="Training epochs")
    batch_size: int = Field(4, ge=2, le=32)
    learning_rate: float = Field(1e-3, gt=0)
    use_sample_dem: bool = Field(True, description="Use sample crater DEM if no custom DEM path provided")
    dem_path: str | None = Field(None, description="Path to custom uploaded DEM heightmap")


class PromotionRequest(BaseModel):
    target_stage: str = Field(..., description="'staging' or 'production'")
    user: str = Field("analyst", description="User identifier initiating promotion")


@router.get("/models")
async def list_registered_models() -> list[dict[str, Any]]:
    """Return all registered foundation models and fine-tuned checkpoints."""
    from dataclasses import asdict
    models = _registry.list_models()
    return [asdict(m) for m in models]


@router.post("/models/{model_id}/promote")
async def promote_model(model_id: str, req: PromotionRequest) -> dict[str, Any]:
    """Promote a model checkpoint through stages (Development -> Staging -> Production)."""
    try:
        success = _registry.promote_model(model_id, req.target_stage, req.user)
        return {"status": "promoted", "model_id": model_id, "new_stage": req.target_stage, "success": success}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/train")
async def run_training(req: TrainRequest) -> dict[str, Any]:
    """Trigger synchronous PyTorch training loop and register resulting checkpoint."""
    from dataclasses import asdict
    from datetime import datetime, timezone

    # 1. Load or generate DEM
    if req.dem_path:
        import cv2
        dem = cv2.imread(req.dem_path, cv2.IMREAD_UNCHANGED)
        if dem is None:
            raise HTTPException(status_code=400, detail=f"Cannot load DEM from {req.dem_path}")
    else:
        # Generate procedural lunar crater DEM
        dem = _generate_lunar_surface(256, 256, seed=42).astype(np.float32)

    # 2. Run real PyTorch loop
    result = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: _fine_tuner.train_projection_head(
            dem_data=dem,
            epochs=req.epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate,
        ),
    )

    # 3. Register checkpoint
    checkpoint = ModelCheckpoint(
        model_id=result.run_id,
        name=f"FineTuned-Projection-{result.run_id}",
        architecture="CrossModal-DINOv2-Head",
        checkpoint_path=result.checkpoint_path,
        stage="staging" if result.evaluation_gate_passed else "development",
        created_at=datetime.now(timezone.utc).isoformat(),
        validation_metrics=result.evaluation_metrics,
        evaluation_gate_passed=result.evaluation_gate_passed,
        promoted_by="training_engine",
        promotion_notes=f"Auto-evaluated: Val loss = {result.validation_loss}",
    )
    _registry.register_checkpoint(checkpoint)

    return asdict(result)


@router.get("/dem/sample")
async def get_sample_dem() -> dict[str, Any]:
    """Return a real sample digital elevation grid for 3D terrain draping."""
    dem = _generate_lunar_surface(128, 128, seed=42)
    return {
        "width": 128,
        "height": 128,
        "grid": dem.tolist(),
        "min_elevation_m": float(dem.min()),
        "max_elevation_m": float(dem.max()),
        "resolution_m": 5.0,
    }
