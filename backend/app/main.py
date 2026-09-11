"""FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup / shutdown lifecycle."""
    settings = get_settings()
    settings.ensure_dirs()
    await init_db()
    logger.info("LUNARIS backend started. DB: %s", settings.database_url)
    yield
    logger.info("LUNARIS backend shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="LUNARIS — Lunar Image Registration API",
        description=(
            "Real-time, sub-pixel-precision lunar image registration. "
            "Every metric returned by this API originates from actual computation."
        ),
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.api.health import router as health_router
    from app.api.jobs import router as jobs_router
    from app.api.images import router as images_router
    from app.api.integrations import router as integrations_router
    from app.api.mlops import router as mlops_router

    app.include_router(health_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api/v1")
    app.include_router(images_router, prefix="/api/v1")
    app.include_router(integrations_router, prefix="/api/v1")
    app.include_router(mlops_router, prefix="/api")

    return app


app = create_app()
