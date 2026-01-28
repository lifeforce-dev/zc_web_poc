from __future__ import annotations

import asyncio
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from zc_api.routers.ws_utils import RejectIfOriginNotAllowed
from zc_api.session.matchmaker import Matchmaker
from zc_api.session.registry import SessionRegistry


def _default_name() -> str:
    return f"Player-{secrets.randbelow(10_000):04d}"


def create_router(registry: SessionRegistry) -> APIRouter:
    router = APIRouter()
    matchmaker = Matchmaker(registry)

    @router.websocket("/ws/matchmaking")
    async def ws_matchmaking(websocket: WebSocket) -> None:
        if await RejectIfOriginNotAllowed(websocket):
            return

        name = (websocket.query_params.get("name") or "").strip() or _default_name()

        await websocket.accept()
        await websocket.send_json({"type": "status", "status": "queueing", "detail": "waiting for opponent"})

        match_task = asyncio.create_task(matchmaker.WaitForMatch(name))
        disconnect_task = asyncio.create_task(websocket.receive_text())

        done, pending = await asyncio.wait(
            {match_task, disconnect_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

        if match_task in done and not match_task.cancelled():
            assignment = match_task.result()
            await websocket.send_json(
                {"type": "match_found", "match_id": assignment.match_id, "player_token": assignment.player_token}
            )
            await websocket.close()
            return

        match_task.cancel()

        try:
            await disconnect_task
        except WebSocketDisconnect:
            return

    return router
