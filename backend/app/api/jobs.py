"""Jobs router — create, stream, and retrieve registration runs."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.database import RegistrationJob, get_session
from app.pipelines.events import EventEmitter
from app.pipelines.orchestrator import run_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])

# In-memory emitter registry: job_id → EventEmitter
_emitters: dict[str, EventEmitter] = {}


class JobParams(BaseModel):
    reference_path: str = Field(..., description="Absolute path to reference image on server.")
    target_path: str = Field(..., description="Absolute path to target image on server.")
    matcher: str = Field("sift", description="'sift' or 'loftr'")
    preprocessing: str = Field("clahe", description="'clahe', 'homomorphic', or 'none'")
    refinement_method: str = Field("phase_correlation", description="'phase_correlation', 'ecc', or 'pyramid'")
    ransac_threshold: float = Field(4.0, gt=0, description="RANSAC reprojection threshold in pixels.")
    ratio_threshold: float = Field(0.75, gt=0, le=1.0, description="Lowe ratio test threshold.")
    max_features: int = Field(8000, gt=0, le=50000)
    grid_n: int = Field(8, gt=0, le=32, description="Uniformity grid rows.")
    grid_m: int = Field(8, gt=0, le=32, description="Uniformity grid columns.")


class JobCreated(BaseModel):
    job_id: str
    status: str


async def _run_and_store(
    job_id: str,
    params: dict[str, Any],
    emitter: EventEmitter,
    db_session_factory: Any,
) -> None:
    """Background task: run pipeline, then persist result to DB."""
    async with db_session_factory() as session:
        try:
            result = await run_pipeline(job_id, params, emitter)
            job = await session.get(RegistrationJob, job_id)
            if job:
                job.status = "done"
                job.result_json = result
                await session.commit()
        except Exception as e:
            logger.exception("Pipeline failed for job %s: %s", job_id, e)
            job = await session.get(RegistrationJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(e)
                await session.commit()
        finally:
            _emitters.pop(job_id, None)


@router.post("/jobs", response_model=JobCreated, status_code=202)
async def create_job(
    params: JobParams,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> JobCreated:
    """Create and immediately start a registration job.

    Returns the job_id. Use GET /jobs/{job_id}/stream to follow progress.
    """
    from app.core.database import AsyncSessionLocal
    import uuid

    job_id = str(uuid.uuid4())
    emitter = EventEmitter()
    _emitters[job_id] = emitter

    job = RegistrationJob(
        id=job_id,
        status="running",
        params_json=params.model_dump(),
    )
    session.add(job)
    await session.commit()

    background_tasks.add_task(
        _run_and_store,
        job_id,
        params.model_dump(),
        emitter,
        AsyncSessionLocal,
    )

    return JobCreated(job_id=job_id, status="running")


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str) -> EventSourceResponse:
    """SSE endpoint — streams real pipeline stage events as they happen.

    Each event has:
        data: JSON string with {job_id, stage, status, progress_pct, message, metrics, timestamp}

    Progress values correspond to actual pipeline stages completed.
    No cosmetic timers or fabricated progress.
    """
    async def generator():  # type: ignore[return]
        emitter = _emitters.get(job_id)
        if emitter is None:
            # Job already complete — send a single done event
            yield {"event": "complete", "data": json.dumps({"job_id": job_id, "status": "already_complete"})}
            return
        async for event in emitter:
            yield {"event": event.stage, "data": event.to_sse_data()}

    return EventSourceResponse(generator())


@router.get("/jobs/{job_id}/result")
async def get_job_result(
    job_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Return the full result of a completed job.

    Raises 404 if not found, 202 if still running, 500 if failed.
    """
    job = await session.get(RegistrationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job.status == "running":
        raise HTTPException(status_code=202, detail="Job still running. Use /stream to follow progress.")
    if job.status == "failed":
        raise HTTPException(
            status_code=500,
            detail=f"Job failed: {job.error_message or 'Unknown error. Check server logs.'}",
        )
    return job.result_json or {}


@router.get("/jobs/{job_id}/raster")
async def get_job_raster(job_id: str) -> FileResponse:
    """Return the registered warped raster image for a completed job."""
    from fastapi.responses import FileResponse
    from app.core.config import get_settings
    settings = get_settings()
    reg_path = settings.upload_dir / f"{job_id}_registered.png"
    if not reg_path.exists():
        raise HTTPException(status_code=404, detail=f"Registered raster for job '{job_id}' not found or still processing.")
    return FileResponse(path=reg_path, media_type="image/png")


@router.get("/jobs")
async def list_jobs(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """List recent jobs with status (no result data)."""
    stmt = select(RegistrationJob).order_by(RegistrationJob.created_at.desc()).limit(limit)
    rows = await session.execute(stmt)
    jobs = rows.scalars().all()
    return [
        {
            "job_id": j.id,
            "status": j.status,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "params": j.params_json,
            "error": j.error_message,
        }
        for j in jobs
    ]
