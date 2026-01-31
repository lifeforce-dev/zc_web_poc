from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from zc_api.config import settings
from zc_api.game_manager import GameManager, get_game_manager

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/sessions")
async def list_sessions(
    game_manager: GameManager = Depends(get_game_manager),
) -> dict[str, object]:
    """List all active game sessions with connection info. Disabled in production."""
    if settings.environment == "prod":
        raise HTTPException(status_code=403, detail="Admin endpoints disabled in production")

    sessions = await game_manager.get_sessions_info()

    return {
        "count": len(sessions),
        "sessions": sessions,
    }
