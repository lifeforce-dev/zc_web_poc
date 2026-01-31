"""
Pure WebSocket transport layer.

GameSession handles only connection management - no game logic.
GameManager orchestrates when to send messages and what they contain.
"""
from __future__ import annotations

import asyncio
import logging
import secrets
import time
from dataclasses import dataclass

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Sessions without activity for this duration are considered stale.
SESSION_TTL_SECONDS = 300  # 5 minutes


@dataclass(frozen=True, slots=True)
class PlayerSlot:
    token: str
    name: str
    elemental: str


class GameSession:
    """
    Pure transport layer for a game session.
    
    Responsibilities:
    - Manage WebSocket connections for a match
    - Provide send/broadcast primitives
    - Track connection state
    
    Does NOT contain game logic or message construction.
    """

    def __init__(self, match_id: str, player_a: PlayerSlot, player_b: PlayerSlot) -> None:
        self.match_id = match_id
        self._players = (player_a, player_b)
        self._sockets_by_token: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()
        self._last_activity = time.monotonic()

    def get_players(self) -> tuple[PlayerSlot, PlayerSlot]:
        return self._players

    def _touch(self) -> None:
        self._last_activity = time.monotonic()

    def is_stale(self, ttl_seconds: float = SESSION_TTL_SECONDS) -> bool:
        return (time.monotonic() - self._last_activity) > ttl_seconds

    def get_player_by_token(self, token: str) -> PlayerSlot | None:
        """Get player slot by token, or None if not found."""
        player_a, player_b = self._players

        if token == player_a.token:
            return player_a

        if token == player_b.token:
            return player_b

        return None

    def get_opponent_of(self, token: str) -> PlayerSlot | None:
        """Get opponent slot for the given token, or None if not found."""
        player_a, player_b = self._players

        if token == player_a.token:
            return player_b

        if token == player_b.token:
            return player_a

        return None

    async def join(self, token: str, websocket: WebSocket) -> PlayerSlot:
        """Register a WebSocket for the given token. Returns the player slot."""
        async with self._lock:
            player = self.get_player_by_token(token)

            if player is None:
                raise ValueError("invalid token")

            self._sockets_by_token[token] = websocket
            self._touch()

            return player

    async def leave(self, token: str) -> None:
        """Remove WebSocket for the given token."""
        async with self._lock:
            self._sockets_by_token.pop(token, None)

    async def get_connected_count(self) -> int:
        """Return number of connected WebSockets."""
        async with self._lock:
            return len(self._sockets_by_token)

    async def are_both_connected(self) -> bool:
        """Return True if both players are connected."""
        return await self.get_connected_count() == 2

    async def send_to(self, token: str, payload: dict) -> bool:
        """Send payload to specific player by token. Returns True if sent."""
        self._touch()

        async with self._lock:
            ws = self._sockets_by_token.get(token)

        if ws is None:
            return False

        await ws.send_json(payload)
        return True

    async def send_to_opponent(self, token: str, payload: dict) -> bool:
        """Send payload to opponent of given token. Returns True if sent."""
        opponent = self.get_opponent_of(token)

        if opponent is None:
            return False

        return await self.send_to(opponent.token, payload)

    async def broadcast(self, payload: dict) -> None:
        """Send payload to all connected players."""
        self._touch()

        async with self._lock:
            sockets = list(self._sockets_by_token.values())

        for ws in sockets:
            await ws.send_json(payload)


class SessionRegistry:
    """Registry of active game sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, GameSession] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Start background cleanup task. Call on app startup."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop(self) -> None:
        """Stop background cleanup task and notify all connected players. Call on app shutdown."""
        # First, notify all connected players about shutdown
        await self._notify_shutdown()

        # Then cancel cleanup task
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    async def _notify_shutdown(self) -> None:
        """Send shutdown notification to all connected players."""
        async with self._lock:
            sessions = list(self._sessions.values())

        shutdown_msg = {"type": "server_shutdown", "message": "Server is shutting down"}
        for session in sessions:
            try:
                await session.broadcast(shutdown_msg)
            except Exception:
                # Ignore errors during shutdown - connection may already be closed
                pass

        logger.info("Sent shutdown notification to %d session(s)", len(sessions))

    async def _cleanup_loop(self) -> None:
        """Periodically remove stale sessions."""
        while True:
            await asyncio.sleep(60)
            await self._remove_stale_sessions()

    async def _remove_stale_sessions(self) -> None:
        async with self._lock:
            stale_ids = [mid for mid, session in self._sessions.items() if session.is_stale()]
            for mid in stale_ids:
                self._sessions.pop(mid, None)

        if stale_ids:
            logger.info("Removed %d stale session(s): %s", len(stale_ids), stale_ids)

    async def create_match(
        self,
        name_a: str,
        elemental_a: str,
        name_b: str,
        elemental_b: str,
    ) -> tuple[str, str, str]:
        """Create a new match session. Returns (match_id, token_a, token_b)."""
        match_id = secrets.token_urlsafe(12)
        token_a = secrets.token_urlsafe(24)
        token_b = secrets.token_urlsafe(24)

        session = GameSession(
            match_id=match_id,
            player_a=PlayerSlot(token=token_a, name=name_a, elemental=elemental_a),
            player_b=PlayerSlot(token=token_b, name=name_b, elemental=elemental_b),
        )

        async with self._lock:
            self._sessions[match_id] = session

        return match_id, token_a, token_b

    async def get_session(self, match_id: str) -> GameSession | None:
        async with self._lock:
            return self._sessions.get(match_id)

    async def remove_session(self, match_id: str) -> None:
        async with self._lock:
            self._sessions.pop(match_id, None)

    async def get_all_sessions_info(self) -> list[dict]:
        """Get info about all active sessions for admin/debug purposes."""
        # Collect sessions under lock, then query each outside to avoid holding lock during await
        async with self._lock:
            sessions = list(self._sessions.values())

        result = []
        for session in sessions:
            result.append({
                "match_id": session.match_id,
                "players": [
                    {"name": p.name, "elemental": p.elemental}
                    for p in session.get_players()
                ],
                "connected_count": await session.get_connected_count(),
                "is_stale": session.is_stale(),
            })
        return result
