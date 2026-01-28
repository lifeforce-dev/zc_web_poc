from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from zc_api.config import settings
from zc_api.routers import admin, health, ws_game, ws_matchmaking
from zc_api.session.registry import SessionRegistry

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    registry = SessionRegistry()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        await registry.Start()
        logger.info("Session cleanup task started")
        yield
        await registry.Stop()
        logger.info("Session cleanup task stopped")

    app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

    app.state.zc_registry = registry

    app.include_router(health.router, tags=["health"])
    app.include_router(admin.router)
    app.include_router(ws_matchmaking.create_router(registry), tags=["ws"])
    app.include_router(ws_game.create_router(registry), tags=["ws"])

    return app


app = create_app()
