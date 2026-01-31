from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from zc_api.common.logging import setup_logging
from zc_api.config import settings
from zc_api.routers import admin, health, catalog, game, matchmaking
from zc_api.game_manager import GameManager
from zc_api.game_manager.data_loader import load_game_data
from zc_api.tags import TagRegistry

setup_logging(log_level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        logger.info("Application startup - initializing game systems")

        # Create instances and store in app.state for DI
        game_data = load_game_data()
        app.state.game_manager = GameManager(game_data)
        app.state.tag_registry = TagRegistry()

        # Register gameplay tags
        logger.info("Registering gameplay tags")
        for ability in game_data.abilities:
            app.state.tag_registry.request_tag(ability.gameplay_tag)
        for elemental in game_data.elementals:
            app.state.tag_registry.request_tag(elemental.gameplay_tag)

        app.state.tag_registry.set_strict_mode(True)
        logger.info("Tag registry locked with %d tags", app.state.tag_registry.get_tag_count())

        await app.state.game_manager.start_sessions()
        logger.info("Session cleanup task started")
        logger.info("Application startup complete")
        yield
        await app.state.game_manager.stop_sessions()
        logger.info("Application shutdown")

    app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(admin.router)
    app.include_router(catalog.router)
    app.include_router(matchmaking.router)
    app.include_router(game.router)

    # Serve game assets (icons, audio, etc.) from game_data directory.
    # In production, asset_base_url can point to a CDN instead.
    assets_path = Path(__file__).parent.parent.parent / "game_data"
    if assets_path.exists():
        app.mount(settings.asset_mount_path, StaticFiles(directory=str(assets_path)), name="assets")
        logger.info("Mounted game assets from %s at %s", assets_path, settings.asset_mount_path)

    return app


app = create_app()
