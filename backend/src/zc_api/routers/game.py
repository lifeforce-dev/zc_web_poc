"""Game router - active gameplay session (WebSocket + future HTTP endpoints)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from pydantic import TypeAdapter

from zc_api.game_manager import GameManager
from zc_api.game_manager.manager import get_game_manager
from zc_api.models.session import SessionClientMessage, ServerPinged
from zc_api.models.common import ServerError
from zc_api.routers.utils import RejectIfOriginNotAllowed

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game"])

_client_adapter = TypeAdapter(SessionClientMessage)


@router.websocket("/ws/game/{match_id}")
async def ws_game_session(
    websocket: WebSocket,
    match_id: str,
    game_manager: GameManager = Depends(get_game_manager),
) -> None:
    """WebSocket endpoint for active gameplay session."""
    if await RejectIfOriginNotAllowed(websocket):
        return

    token = (websocket.query_params.get("token") or "").strip()
    if not token:
        await websocket.close(code=1008, reason="missing token")
        return

    await websocket.accept()

    try:
        session = await game_manager.on_player_joined(match_id, token, websocket)
    except ValueError as e:
        await websocket.close(code=1008, reason=str(e))
        return

    try:
        while True:
            raw = await websocket.receive_text()
            msg = _client_adapter.validate_json(raw)

            if msg.type == "ping":
                await session.send_to_opponent(token, ServerPinged(type="pinged").model_dump())

    except WebSocketDisconnect:
        await game_manager.on_player_left(session, token)
    except Exception:
        logger.exception("Unhandled error in ws_game_session")
        try:
            await websocket.send_json(ServerError(type="error", message="server error").model_dump())
        finally:
            await websocket.close()
