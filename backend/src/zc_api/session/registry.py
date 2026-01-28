from __future__ import annotations

import asyncio
import logging
import secrets
import time
from dataclasses import dataclass, field

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Sessions without activity for this duration are considered stale.
SESSION_TTL_SECONDS = 300  # 5 minutes


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
        self._last_activity = time.monotonic()

    def GetPlayers(self) -> tuple[PlayerSlot, PlayerSlot]:
        return self._players

    def _touch(self) -> None:
        self._last_activity = time.monotonic()

    def IsStale(self, ttl_seconds: float = SESSION_TTL_SECONDS) -> bool:
        return (time.monotonic() - self._last_activity) > ttl_seconds

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
            self._touch()

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
        self._touch()

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
        self._cleanup_task: asyncio.Task[None] | None = None

    async def Start(self) -> None:
        """Start background cleanup task. Call on app startup."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def Stop(self) -> None:
        """Stop background cleanup task. Call on app shutdown."""
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    async def _cleanup_loop(self) -> None:
        """Periodically remove stale sessions."""
        while True:
            await asyncio.sleep(60)  # Check every minute.
            await self._remove_stale_sessions()

    async def _remove_stale_sessions(self) -> None:
        async with self._lock:
            stale_ids = [mid for mid, session in self._sessions.items() if session.IsStale()]
            for mid in stale_ids:
                self._sessions.pop(mid, None)

        if stale_ids:
            logger.info("Removed %d stale session(s): %s", len(stale_ids), stale_ids)

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

    async def GetAllSessionsInfo(self) -> list[dict[str, object]]:
        """Return info about all active sessions for debugging/monitoring."""
        async with self._lock:
            sessions = list(self._sessions.values())

        result: list[dict[str, object]] = []
        for session in sessions:
            player_a, player_b = session.GetPlayers()
            connected_count = await session.GetConnectedCount()
            result.append({
                "match_id": session.match_id,
                "players": [player_a.name, player_b.name],
                "connected_count": connected_count,
                "is_stale": session.IsStale(),
            })

        return result
