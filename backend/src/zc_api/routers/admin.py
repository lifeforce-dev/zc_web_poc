from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/sessions")
async def list_sessions(request: Request) -> dict[str, object]:
    """List all active game sessions with connection info."""
    registry = request.app.state.zc_registry
    sessions = await registry.GetAllSessionsInfo()

    return {
        "count": len(sessions),
        "sessions": sessions,
    }
