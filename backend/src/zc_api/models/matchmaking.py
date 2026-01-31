"""Matchmaking models - finding opponents."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


# === Server -> Client ===

class ServerStatus(BaseModel):
    """Status update during matchmaking."""
    type: Literal["status"]
    status: Literal["queueing", "matched"]
    detail: str


class ServerMatchFound(BaseModel):
    """Match found, provides connection info for game session."""
    type: Literal["match_found"]
    match_id: str
    player_token: str


MatchmakingServerMessage = ServerStatus | ServerMatchFound
