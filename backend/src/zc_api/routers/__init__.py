"""FastAPI routers organized by domain."""
__all__ = ["admin", "catalog", "game", "health", "matchmaking"]

from zc_api.routers import admin, catalog, game, health, matchmaking
