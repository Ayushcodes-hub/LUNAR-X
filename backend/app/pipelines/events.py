"""Pipeline event types for SSE streaming."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


StageStatus = Literal["pending", "running", "done", "failed", "skipped"]

PIPELINE_STAGES = [
    "ingestion",
    "preprocessing",
    "feature_extraction",
    "feature_matching",
    "geometric_estimation",
    "subpixel_refinement",
    "evaluation",
    "complete",
]


class MetricsSnapshot(BaseModel):
    """Partial metrics available mid-pipeline."""

    features_detected: int | None = None
    matches_found: int | None = None
    inlier_count: int | None = None
    inlier_ratio: float | None = None
    rmse_px: float | None = None
    ncc: float | None = None
    delta_x_px: float | None = None
    delta_y_px: float | None = None
    delta_rotation_deg: float | None = None
    delta_scale: float | None = None
    confidence: float | None = None
    iteration: int | None = None


class PipelineEvent(BaseModel):
    """Single SSE event emitted by the pipeline."""

    job_id: str
    stage: str
    status: StageStatus
    progress_pct: float = Field(ge=0.0, le=100.0)
    message: str
    metrics: MetricsSnapshot = Field(default_factory=MetricsSnapshot)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    extra: dict[str, Any] = Field(default_factory=dict)

    def to_sse_data(self) -> str:
        return self.model_dump_json()


class EventEmitter:
    """Thread-safe queue for pipeline → SSE endpoint communication."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[PipelineEvent | None] = asyncio.Queue()

    async def emit(self, event: PipelineEvent) -> None:
        await self._queue.put(event)

    async def done(self) -> None:
        """Signal end of stream."""
        await self._queue.put(None)

    async def __aiter__(self):  # type: ignore[override]
        while True:
            event = await self._queue.get()
            if event is None:
                return
            yield event
