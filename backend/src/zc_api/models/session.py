"""Session models - active gameplay."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


# === Server -> Client ===

class ServerGameReady(BaseModel):
    """Both players connected, game can begin."""
    type: Literal["game_ready"]
    match_id: str
    you: str
    opponent: str
    opponent_elemental: str


class ServerPinged(BaseModel):
    """Opponent sent a ping."""
    type: Literal["pinged"]


class ServerOpponentDisconnected(BaseModel):
    """Opponent left the game."""
    type: Literal["opponent_disconnected"]


SessionServerMessage = ServerGameReady | ServerPinged | ServerOpponentDisconnected


# === Client -> Server ===

class ClientPing(BaseModel):
    """Ping the opponent."""
    type: Literal["ping"]


SessionClientMessage = ClientPing
