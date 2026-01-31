"""Catalog API - game content that rarely changes (elementals, abilities)."""
import logging
from fastapi import APIRouter, Depends

from zc_api.game_manager import GameManager
from zc_api.game_manager.manager import get_game_manager
from zc_api.models.game import (
    AvailableElementalsResponse,
    AvailableAbilitiesResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/elementals", response_model=AvailableElementalsResponse)
async def get_available_elementals(
    manager: GameManager = Depends(get_game_manager)
) -> AvailableElementalsResponse:
    """
    Get elementals available for player selection.
    
    Returns only elementals that are enabled for the current game version.
    """
    logger.info("Client requested available elementals")
    elementals = manager.get_available_elementals()
    return AvailableElementalsResponse(elementals=elementals)


@router.get("/abilities", response_model=AvailableAbilitiesResponse)
async def get_available_abilities(
    manager: GameManager = Depends(get_game_manager)
) -> AvailableAbilitiesResponse:
    """
    Get abilities available in the game.
    
    Returns only abilities that are enabled for the current game version.
    """
    logger.info("Client requested available abilities")
    abilities = manager.get_available_abilities()
    return AvailableAbilitiesResponse(abilities=abilities)
