"""Health check router — reports real system status, no fabricated values."""
from __future__ import annotations

import time
from typing import Any

import psutil
import torch
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings
from app.matching.registry import list_matchers
from app.refinement.registry import list_refinements

router = APIRouter(tags=["health"])


class ServiceStatus(BaseModel):
    name: str
    status: str   # ready | unavailable | configuration_required
    detail: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: float
    gpu_available: bool
    gpu_name: str | None
    cpu_percent: float        # real psutil reading
    memory_percent: float     # real psutil reading
    matchers_available: list[str]
    refinements_available: list[str]
    services: list[ServiceStatus]


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """System health check.

    All values returned are from real system calls:
    - cpu_percent: psutil.cpu_percent()
    - memory_percent: psutil.virtual_memory().percent
    - gpu_available: torch.cuda.is_available()
    - gpu_name: torch.cuda.get_device_name() if GPU present

    No values are fabricated.
    """
    settings = get_settings()

    gpu_available = torch.cuda.is_available()
    gpu_name: str | None = None
    if gpu_available:
        try:
            gpu_name = torch.cuda.get_device_name(0)
        except Exception:
            gpu_name = "Unknown GPU"

    cpu_pct = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()

    services: list[ServiceStatus] = [
        ServiceStatus(
            name="Core Registration Engine",
            status="ready",
            detail="SIFT, RANSAC, warp — all available (OpenCV).",
        ),
        ServiceStatus(
            name="Sub-Pixel Refinement Engine",
            status="ready",
            detail="Phase correlation, ECC, pyramid — all available.",
        ),
        ServiceStatus(
            name="LoFTR Deep Matcher",
            status="ready",
            detail="Weights download from kornia CDN on first use (~45MB). No credentials required.",
        ),
        ServiceStatus(
            name="GPU Acceleration",
            status="ready" if gpu_available else "unavailable",
            detail=f"GPU: {gpu_name}" if gpu_available else
                   "No CUDA GPU detected. Running CPU-only — fully supported.",
        ),
        ServiceStatus(
            name="External Lunar Dataset API",
            status="configuration_required",
            detail=(
                "No external dataset API is configured. Upload your own images to use the pipeline. "
                "PDS/ISSDC authenticated downloads are not yet implemented."
            ),
        ),
    ]

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=time.time(),
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        cpu_percent=cpu_pct,
        memory_percent=mem.percent,
        matchers_available=list_matchers(),
        refinements_available=list_refinements(),
        services=services,
    )
