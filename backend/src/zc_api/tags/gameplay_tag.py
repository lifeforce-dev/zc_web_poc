"""
GameplayTag - Lightweight handle to an interned tag path.

A GameplayTag is an immutable identifier backed by an integer ID.
Tags support hierarchical matching via parent relationships.

Example:
    >>> tag = TagRegistry.get().request_tag("Player.Owner.P1")
    >>> tag.get_name()
    'Player.Owner.P1'
    >>> tag.get_parent().get_name()
    'Player.Owner'
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .tag_registry import TagRegistry


class GameplayTag:
    """
    Immutable handle to a registered gameplay tag.
    
    Tags are compared by ID (fast) and support hierarchical parent queries.
    Use TagRegistry.request_tag() to create tags, not the constructor directly.
    """
    
    __slots__ = ('_id',)
    
    # Singleton for invalid/none tag
    NONE: GameplayTag
    
    def __init__(self, _id: int) -> None:
        """
        Private constructor. Use TagRegistry.request_tag() instead.
        
        Args:
            _id: Internal tag ID (0 = invalid/none)
        """
        object.__setattr__(self, '_id', _id)
    
    def is_valid(self) -> bool:
        """Check if this tag is valid (not NONE)."""
        return self._id != 0
    
    def get_name(self) -> str:
        """
        Return the full tag path (e.g., "Gameplay.Character.Status.Stunned").
        
        Use for debugging/serialization only - not for runtime comparisons.
        Runtime logic should use tag identity (==, !=) or parent queries.
        """
        if self._id == 0:
            return ""
        
        from .tag_registry import TagRegistry
        return TagRegistry.get().get_tag_name(self._id)
    
    def get_parent(self) -> GameplayTag:
        """
        Return the parent tag, or NONE if this is a root-level tag.
        
        Example:
            >>> tag = registry.request_tag("A.B.C")
            >>> tag.get_parent().get_name()
            'A.B'
        """
        if self._id == 0:
            return GameplayTag.NONE
        
        from .tag_registry import TagRegistry
        parent_id = TagRegistry.get().get_parent_id(self._id)
        return GameplayTag(parent_id)
    
    def __eq__(self, other: object) -> bool:
        """Tag equality based on ID."""
        if not isinstance(other, GameplayTag):
            return NotImplemented
        return self._id == other._id
    
    def __ne__(self, other: object) -> bool:
        """Tag inequality based on ID."""
        if not isinstance(other, GameplayTag):
            return NotImplemented
        return self._id != other._id
    
    def __lt__(self, other: GameplayTag) -> bool:
        """Tag ordering based on ID (for sorted containers)."""
        if not isinstance(other, GameplayTag):
            return NotImplemented
        return self._id < other._id
    
    def __hash__(self) -> int:
        """Hash based on ID for use in sets/dicts."""
        return hash(self._id)
    
    def __bool__(self) -> bool:
        """Truthiness check (True if valid)."""
        return self.is_valid()
    
    def __repr__(self) -> str:
        """Debug representation."""
        if self.is_valid():
            return f"GameplayTag('{self.get_name()}')"
        return "GameplayTag.NONE"
    
    def __str__(self) -> str:
        """String representation (returns tag name)."""
        return self.get_name()


# Initialize the NONE singleton
GameplayTag.NONE = GameplayTag(0)
