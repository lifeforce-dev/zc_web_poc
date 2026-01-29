"""
ZoneControl GameplayTags System

Lightweight hierarchical tag system for type-safe game entity identification.
Ported from custom C++ implementation at e:\\source\\GameplayTags.

Public API:
- GameplayTag: Immutable tag handle
- GameplayTagContainer: Set-based container with parent matching
- TagRegistry: Singleton for tag registration and lookup
"""

from .gameplay_tag import GameplayTag
from .tag_registry import TagRegistry
from .gameplay_tag_container import GameplayTagContainer

__all__ = [
    "GameplayTag",
    "TagRegistry",
    "GameplayTagContainer",
]
