from __future__ import annotations

from fastapi import WebSocket

from zc_api.config import settings


def IsAllowedWsOrigin(origin: str | None) -> bool:
    if origin is None:
        return False

    return origin in settings.allowed_origins


async def RejectIfOriginNotAllowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if IsAllowedWsOrigin(origin):
        return False

    await websocket.close(code=1008, reason="origin not allowed")
    return True
