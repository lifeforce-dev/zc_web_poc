import json
import logging
from pathlib import Path
from functools import lru_cache
from typing import Optional

from zc_api.models.game import AbilityData, ElementalData, GameData
from zc_api.config import settings

logger = logging.getLogger(__name__)

# Cache storage for manual cache management in dev mode
_cached_game_data: Optional[GameData] = None


def _load_game_data_impl() -> GameData:
    """Actually load game data from disk."""
    game_data_dir = Path(__file__).parents[3] / "game_data"
    
    logger.info("Loading game data from %s", game_data_dir)
    
    abilities_path = game_data_dir / "abilities.json"
    with open(abilities_path, encoding="utf-8") as f:
        abilities_raw = json.load(f)
    
    elementals_path = game_data_dir / "elementals.json"
    with open(elementals_path, encoding="utf-8") as f:
        elementals_raw = json.load(f)
    
    abilities = [AbilityData(**ability) for ability in abilities_raw]
    elementals = [ElementalData(**elemental) for elemental in elementals_raw]
    
    logger.info(
        "Loaded %d abilities and %d elementals",
        len(abilities),
        len(elementals)
    )
    
    return GameData(abilities=abilities, elementals=elementals)


def load_game_data() -> GameData:
    """
    Load game data. In dev mode, always reloads from disk.
    In prod mode, caches after first load.
    """
    global _cached_game_data
    
    if settings.environment == "dev":
        # Always reload in dev mode for hot-reload of JSON files
        return _load_game_data_impl()
    
    # Production: cache forever
    if _cached_game_data is None:
        _cached_game_data = _load_game_data_impl()
    return _cached_game_data
