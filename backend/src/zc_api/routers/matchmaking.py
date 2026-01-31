"""Matchmaking router - finding opponents."""
from __future__ import annotations

import asyncio
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from zc_api.game_manager import GameManager
from zc_api.game_manager.manager import get_game_manager
from zc_api.models.matchmaking import ServerStatus, ServerMatchFound
from zc_api.routers.utils import RejectIfOriginNotAllowed

router = APIRouter(tags=["matchmaking"])


def _default_name() -> str:
    return f"Player-{secrets.randbelow(10_000):04d}"


@router.websocket("/ws/matchmaking")
async def ws_matchmaking(
    websocket: WebSocket,
    game_manager: GameManager = Depends(get_game_manager),
) -> None:
    """WebSocket endpoint for matchmaking queue."""
    if await RejectIfOriginNotAllowed(websocket):
        return

    name = (websocket.query_params.get("name") or "").strip() or _default_name()
    elemental = (websocket.query_params.get("elemental") or "").strip() or "unknown"

    await websocket.accept()
    await websocket.send_json(
        ServerStatus(type="status", status="queueing", detail="waiting for opponent").model_dump()
    )

    match_task = asyncio.create_task(game_manager.wait_for_match(name, elemental))
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
            ServerMatchFound(
                type="match_found",
                match_id=assignment.match_id,
                player_token=assignment.player_token,
            ).model_dump()
        )
        await websocket.close()
        return

    match_task.cancel()

    try:
        await disconnect_task
    except WebSocketDisconnect:
        return
