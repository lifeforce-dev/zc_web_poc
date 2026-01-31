"""Game models - catalog data and API responses."""
from pydantic import BaseModel, Field


# === Storage format (matches JSON files) ===

class DisplayData(BaseModel):
    """Presentation data for game entities (icons, assets, etc.)."""
    icon_path: str = Field(description="Path to icon file relative to game_data/icons/")


class AbilityData(BaseModel):
    """Ability definition loaded from JSON."""
    id: str = Field(description="Unique ability identifier (e.g., 'burn', 'squirt')")
    name: str = Field(description="Display name")
    description: str = Field(description="Detailed description of ability effect")
    can_target_friendly: bool = Field(description="Whether ability can target own blocks")
    cooldown_turns: int = Field(ge=0, description="Turns before ability can be used again")
    cost_type: str = Field(description="Resource type consumed (e.g., 'rotation_charge', 'none')")
    cost_amount: int = Field(ge=0, description="Amount of resource consumed")
    development_enabled: bool = Field(description="Whether ability is available in current build")
    gameplay_tag: str = Field(description="Tag identifying this ability in game systems")
    display_data: DisplayData = Field(description="Presentation assets for this ability")


class ElementalData(BaseModel):
    """Elemental definition loaded from JSON."""
    id: str = Field(description="Unique elemental identifier (e.g., 'fire', 'water')")
    name: str = Field(description="Display name")
    description: str = Field(description="Detailed description of elemental playstyle")
    color: str = Field(description="Hex color for UI theming (e.g., '#da3633')")
    primary_ability_id: str = Field(description="Reference to primary ability in abilities.json")
    neutral_ability_slot: str | None = Field(description="Optional neutral ability reference")
    development_enabled: bool = Field(description="Whether elemental is available in current build")
    gameplay_tag: str = Field(description="Tag identifying this elemental in game systems")
    display_data: DisplayData = Field(description="Presentation assets for this elemental")


class GameData(BaseModel):
    """Complete game data loaded from JSON files."""
    abilities: list[AbilityData] = Field(description="All ability definitions")
    elementals: list[ElementalData] = Field(description="All elemental definitions")


# === API response format (what clients receive) ===

class DisplayDataResponse(BaseModel):
    """Presentation data with resolved URLs for client consumption."""
    icon_url: str = Field(description="Full URL to icon asset")


class AvailableElemental(BaseModel):
    """Elemental available for player selection."""
    id: str = Field(description="Unique elemental identifier")
    name: str = Field(description="Display name")
    description: str = Field(description="Flavor text")
    color: str = Field(description="Theme color (hex)")
    primary_ability_id: str = Field(description="ID of primary ability")
    display_data: DisplayDataResponse = Field(description="Presentation assets with resolved URLs")


class AvailableAbility(BaseModel):
    """Ability available in the game."""
    id: str = Field(description="Unique ability identifier")
    name: str = Field(description="Display name")
    description: str = Field(description="What the ability does")
    display_data: DisplayDataResponse = Field(description="Presentation assets with resolved URLs")
    can_target_friendly: bool = Field(description="Can target own blocks")
    cooldown_turns: int = Field(description="Turns before reuse")


class AvailableElementalsResponse(BaseModel):
    """Response containing elementals available for selection."""
    elementals: list[AvailableElemental] = Field(description="Available elementals")


class AvailableAbilitiesResponse(BaseModel):
    """Response containing abilities available in game."""
    abilities: list[AvailableAbility] = Field(description="Available abilities")
