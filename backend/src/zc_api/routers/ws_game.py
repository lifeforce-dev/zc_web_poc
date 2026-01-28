from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import TypeAdapter

from zc_api.models.client import ClientMessage
from zc_api.routers.ws_utils import RejectIfOriginNotAllowed
from zc_api.session.registry import SessionRegistry

logger = logging.getLogger(__name__)

_client_adapter = TypeAdapter(ClientMessage)


def create_router(registry: SessionRegistry) -> APIRouter:
    router = APIRouter()

    @router.websocket("/ws/game/{match_id}")
    async def ws_game(websocket: WebSocket, match_id: str) -> None:
        if await RejectIfOriginNotAllowed(websocket):
            return

        token = (websocket.query_params.get("token") or "").strip()
        if not token:
            await websocket.close(code=1008, reason="missing token")
            return

        session = await registry.GetSession(match_id)
        if session is None:
            await websocket.close(code=1008, reason="unknown match")
            return

        await websocket.accept()

        try:
            player = await session.Join(token=token, websocket=websocket)
        except ValueError:
            await websocket.close(code=1008, reason="invalid token")
            return

        try:
            await session.TryNotifyReady()

            while True:
                raw = await websocket.receive_text()
                msg = _client_adapter.validate_json(raw)

                if msg.type == "ping":
                    await session.TrySendToOpponent(token, {"type": "pinged"})

        except WebSocketDisconnect:
            await session.Leave(token)
            await session.TrySendToOpponent(token, {"type": "opponent_disconnected"})

            if await session.GetConnectedCount() == 0:
                await registry.RemoveSession(match_id)

            return
        except Exception:
            logger.exception("Unhandled error in ws_game")
            try:
                await websocket.send_json({"type": "error", "message": "server error"})
            finally:
                await websocket.close()

    return router
