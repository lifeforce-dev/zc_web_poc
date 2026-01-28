from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> dict[str, object]:
    return {
        "service": "zc_web_poc",
        "status": "ok",
        "endpoints": {
            "health": "/health",
            "ws_matchmaking": "/ws/matchmaking?name=...",
            "ws_game": "/ws/game/{match_id}?token=...",
        },
    }


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
