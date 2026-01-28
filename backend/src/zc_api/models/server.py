from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ServerStatus(BaseModel):
    type: Literal["status"]
    status: Literal["queueing", "matched"]
    detail: str


class ServerMatchFound(BaseModel):
    type: Literal["match_found"]
    match_id: str
    player_token: str


class ServerGameReady(BaseModel):
    type: Literal["game_ready"]
    match_id: str
    you: str
    opponent: str


class ServerPinged(BaseModel):
    type: Literal["pinged"]


class ServerOpponentDisconnected(BaseModel):
    type: Literal["opponent_disconnected"]


class ServerError(BaseModel):
    type: Literal["error"]
    message: str


ServerMessage = (
    ServerStatus
    | ServerMatchFound
    | ServerGameReady
    | ServerPinged
    | ServerOpponentDisconnected
    | ServerError
)
