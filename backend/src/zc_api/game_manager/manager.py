"""GameManager - manages game content, sessions, and availability."""
import logging
from typing import Optional

from fastapi import Request, WebSocket

from .data_loader import load_game_data
from .session import SessionRegistry, GameSession, Matchmaker, MatchAssignment
from zc_api.config import settings
from zc_api.models.game import (
    ElementalData, AbilityData, DisplayData, GameData,
    AvailableElemental, AvailableAbility, DisplayDataResponse,
)
from zc_api.models.session import ServerGameReady, ServerOpponentDisconnected

logger = logging.getLogger(__name__)


def _resolve_display_data(display_data: DisplayData) -> DisplayDataResponse:
    """Convert icon_path to full icon_url using configured asset base."""
    base = settings.asset_base_url.rstrip("/")
    icon_url = f"{base}/icons/{display_data.icon_path}"
    return DisplayDataResponse(icon_url=icon_url)


class GameManager:
    """
    Manages game content, sessions, and orchestrates gameplay.
    
    Responsibilities:
    - Determine what content is available to players
    - Filter content based on development flags
    - Own session registry and matchmaker
    - Orchestrate player join/leave lifecycle
    """

    def __init__(self, game_data: GameData) -> None:
        logger.info("GameManager initializing")

        self._game_data = game_data
        self._registry = SessionRegistry()
        self._matchmaker = Matchmaker(self._registry)

        logger.info(
            "GameManager initialized with %d elementals and %d abilities",
            len(self._game_data.elementals),
            len(self._game_data.abilities),
        )
    
    def get_available_elementals(self) -> list[AvailableElemental]:
        """
        Get elementals that are currently available for player selection.
        
        Filters by development_enabled flag and converts to response format.
        """
        enabled = [e for e in self._game_data.elementals if e.development_enabled]
        logger.debug("Returning %d available elementals", len(enabled))
        
        return [
            AvailableElemental(
                id=e.id,
                name=e.name,
                description=e.description,
                color=e.color,
                primary_ability_id=e.primary_ability_id,
                display_data=_resolve_display_data(e.display_data)
            )
            for e in enabled
        ]
    
    def get_available_abilities(self) -> list[AvailableAbility]:
        """
        Get abilities that are currently available in the game.
        
        Filters by development_enabled flag and converts to response format.
        """
        enabled = [a for a in self._game_data.abilities if a.development_enabled]
        logger.debug("Returning %d available abilities", len(enabled))
        
        return [
            AvailableAbility(
                id=a.id,
                name=a.name,
                description=a.description,
                display_data=_resolve_display_data(a.display_data),
                can_target_friendly=a.can_target_friendly,
                cooldown_turns=a.cooldown_turns
            )
            for a in enabled
        ]
    
    def get_elemental_by_id(self, elemental_id: str) -> Optional[ElementalData]:
        """Get elemental by ID, or None if not found."""
        for elemental in self._game_data.elementals:
            if elemental.id == elemental_id:
                return elemental
        return None
    
    def get_ability_by_id(self, ability_id: str) -> Optional[AbilityData]:
        """Get ability by ID, or None if not found."""
        for ability in self._game_data.abilities:
            if ability.id == ability_id:
                return ability
        return None

    # ========================================
    # SESSION LIFECYCLE
    # ========================================

    async def start_sessions(self) -> None:
        """Start session cleanup task. Call on app startup."""
        await self._registry.start()

    async def stop_sessions(self) -> None:
        """Stop session cleanup task. Call on app shutdown."""
        await self._registry.stop()

    async def wait_for_match(self, name: str, elemental: str) -> MatchAssignment:
        """Queue player for matchmaking. Returns when matched."""
        return await self._matchmaker.wait_for_match(name, elemental)

    async def get_session(self, match_id: str) -> GameSession | None:
        """Get session by match ID."""
        return await self._registry.get_session(match_id)

    async def get_sessions_info(self) -> list[dict]:
        """Get info about all active sessions for admin/debug purposes."""
        return await self._registry.get_all_sessions_info()

    async def on_player_joined(
        self,
        match_id: str,
        token: str,
        websocket: WebSocket,
    ) -> GameSession:
        """
        Handle player joining a game session.
        
        Registers the WebSocket, and if both players are now connected,
        sends game_ready messages to both.
        """
        session = await self._registry.get_session(match_id)

        if session is None:
            raise ValueError("unknown match")

        player = await session.join(token, websocket)
        logger.info("Player %s joined match %s", player.name, match_id)

        if await session.are_both_connected():
            await self._notify_game_ready(session)

        return session

    async def _notify_game_ready(self, session: GameSession) -> None:
        """Send game_ready message to both players."""
        player_a, player_b = session.get_players()

        msg_a = ServerGameReady(
            type="game_ready",
            match_id=session.match_id,
            you=player_a.name,
            opponent=player_b.name,
            opponent_elemental=player_b.elemental,
        ).model_dump()
        msg_b = ServerGameReady(
            type="game_ready",
            match_id=session.match_id,
            you=player_b.name,
            opponent=player_a.name,
            opponent_elemental=player_a.elemental,
        ).model_dump()

        await session.send_to(player_a.token, msg_a)
        await session.send_to(player_b.token, msg_b)

        logger.info("Sent game_ready to both players in match %s", session.match_id)

    async def on_player_left(self, session: GameSession, token: str) -> None:
        """
        Handle player leaving a game session.
        
        Notifies opponent and cleans up session if empty.
        """
        player = session.get_player_by_token(token)
        player_name = player.name if player else "unknown"

        await session.leave(token)
        await session.send_to_opponent(
            token,
            ServerOpponentDisconnected(type="opponent_disconnected").model_dump(),
        )

        logger.info("Player %s left match %s", player_name, session.match_id)

        if await session.get_connected_count() == 0:
            await self._registry.remove_session(session.match_id)
            logger.info("Removed empty session %s", session.match_id)


def get_game_manager(request: Request = None, websocket: WebSocket = None) -> GameManager:
    """
    Dependency that retrieves GameManager from app.state.
    
    Works with both HTTP requests and WebSocket connections. Use with Depends():
        game_manager: GameManager = Depends(get_game_manager)
    """
    # FastAPI injects either request or websocket depending on endpoint type
    app = (request or websocket).app
    return app.state.game_manager
