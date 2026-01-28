from __future__ import annotations

import logging

from fastapi import FastAPI

from zc_api.config import settings
from zc_api.routers import health, ws_game, ws_matchmaking
from zc_api.session.registry import SessionRegistry

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.version)

    registry = SessionRegistry()

    app.state.zc_registry = registry

    app.include_router(health.router, tags=["health"])
    app.include_router(ws_matchmaking.create_router(registry), tags=["ws"])
    app.include_router(ws_game.create_router(registry), tags=["ws"])

    return app


app = create_app()
