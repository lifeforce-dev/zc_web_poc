from __future__ import annotations

import asyncio
import secrets
from dataclasses import dataclass

from fastapi import WebSocket


@dataclass(frozen=True, slots=True)
class PlayerSlot:
    token: str
    name: str


class GameSession:
    def __init__(self, match_id: str, player_a: PlayerSlot, player_b: PlayerSlot) -> None:
        self.match_id = match_id
        self._players = (player_a, player_b)
        self._sockets_by_token: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    def GetPlayers(self) -> tuple[PlayerSlot, PlayerSlot]:
        return self._players

    def TryGetOpponentName(self, token: str) -> str | None:
        player_a, player_b = self._players
        if token == player_a.token:
            return player_b.name

        if token == player_b.token:
            return player_a.name

        return None

    async def Join(self, token: str, websocket: WebSocket) -> PlayerSlot:
        async with self._lock:
            player_a, player_b = self._players

            if token not in (player_a.token, player_b.token):
                raise ValueError("invalid token")

            self._sockets_by_token[token] = websocket

            if token == player_a.token:
                return player_a

            return player_b

    async def GetConnectedCount(self) -> int:
        async with self._lock:
            return len(self._sockets_by_token)

    async def TryNotifyReady(self) -> None:
        player_a, player_b = self._players

        async with self._lock:
            ws_a = self._sockets_by_token.get(player_a.token)
            ws_b = self._sockets_by_token.get(player_b.token)

        if ws_a is None or ws_b is None:
            return

        await ws_a.send_json(
            {"type": "game_ready", "match_id": self.match_id, "you": player_a.name, "opponent": player_b.name}
        )
        await ws_b.send_json(
            {"type": "game_ready", "match_id": self.match_id, "you": player_b.name, "opponent": player_a.name}
        )

    async def Leave(self, token: str) -> None:
        async with self._lock:
            self._sockets_by_token.pop(token, None)

    async def TrySendToOpponent(self, token: str, payload: dict) -> None:
        async with self._lock:
            player_a, player_b = self._players
            opponent_token = player_b.token if token == player_a.token else player_a.token
            ws = self._sockets_by_token.get(opponent_token)

        if ws is None:
            return

        await ws.send_json(payload)

    async def TryBroadcast(self, payload: dict) -> None:
        async with self._lock:
            sockets = list(self._sockets_by_token.values())

        for ws in sockets:
            await ws.send_json(payload)


class SessionRegistry:
    def __init__(self) -> None:
        self._sessions: dict[str, GameSession] = {}
        self._lock = asyncio.Lock()

    async def CreateMatch(self, name_a: str, name_b: str) -> tuple[str, str, str]:
        match_id = secrets.token_urlsafe(12)
        token_a = secrets.token_urlsafe(24)
        token_b = secrets.token_urlsafe(24)

        session = GameSession(
            match_id=match_id,
            player_a=PlayerSlot(token=token_a, name=name_a),
            player_b=PlayerSlot(token=token_b, name=name_b),
        )

        async with self._lock:
            self._sessions[match_id] = session

        return match_id, token_a, token_b

    async def GetSession(self, match_id: str) -> GameSession | None:
        async with self._lock:
            return self._sessions.get(match_id)

    async def RemoveSession(self, match_id: str) -> None:
        async with self._lock:
            self._sessions.pop(match_id, None)
