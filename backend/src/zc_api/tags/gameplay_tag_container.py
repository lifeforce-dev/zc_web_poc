"""
GameplayTagContainer - Set-based container with hierarchical matching.

Containers store explicit tags and compute parent tags for efficient queries.
Parent matching allows checking against tag hierarchies without enumerating all children.

Example:
    >>> container = GameplayTagContainer()
    >>> container.add_tag("Player.Owner.P1")
    >>> container.has_tag("Player.Owner")      # True (parent matching)
    >>> container.has_tag_exact("Player.Owner")  # False (exact match only)
"""

from __future__ import annotations
from .gameplay_tag import GameplayTag
from .tag_registry import TagRegistry


class GameplayTagContainer:
    """
    Container holding a set of gameplay tags with parent matching support.
    
    Features:
    - Explicit tags: Tags explicitly added by user
    - Parent tags: Automatically computed from explicit tags
    - has_tag(): Matches explicit OR parent tags
    - has_tag_exact(): Matches explicit tags only
    - Set operations: has_any(), has_all()
    """
    
    __slots__ = ('_explicit_tags', '_parent_tags')
    
    def __init__(self) -> None:
        """Create an empty tag container."""
        self._explicit_tags: list[GameplayTag] = []
        self._parent_tags: list[GameplayTag] = []
    
    def add_tag(self, tag: GameplayTag | str) -> None:
        """
        Add a tag to the container.
        
        Parent tags are automatically recomputed.
        Duplicate tags are ignored.
        
        Args:
            tag: GameplayTag handle or tag path string
        
        Example:
            >>> container.add_tag("Player.Owner.P1")
            >>> # Also enables matching on "Player.Owner" and "Player"
        """
        if isinstance(tag, str):
            tag = TagRegistry.get().request_tag(tag)
        
        if not tag.is_valid():
            return
        
        # Check if already present
        if tag in self._explicit_tags:
            return
        
        self._explicit_tags.append(tag)
        self._rebuild_parent_tags()
    
    def remove_tag(self, tag: GameplayTag | str) -> bool:
        """
        Remove an explicit tag from the container.
        
        Parent tags are automatically recomputed.
        
        Args:
            tag: GameplayTag handle or tag path string
        
        Returns:
            True if tag was removed, False if not found
        """
        if isinstance(tag, str):
            tag = TagRegistry.get().request_tag(tag)
        
        try:
            self._explicit_tags.remove(tag)
            self._rebuild_parent_tags()
            return True
        except ValueError:
            return False
    
    def has_tag(self, tag: GameplayTag | str) -> bool:
        """
        Check if tag is present (matches explicit OR parent tags).
        
        Args:
            tag: GameplayTag handle or tag path string
        
        Returns:
            True if tag matches (including parent matching)
        
        Example:
            >>> container.add_tag("Player.Owner.P1")
            >>> container.has_tag("Player.Owner")  # True (parent match)
            >>> container.has_tag("Player")        # True (grandparent match)
        """
        if isinstance(tag, str):
            tag = TagRegistry.get().request_tag(tag)
        
        if not tag.is_valid():
            return False
        
        return self._contains_in_either(tag)
    
    def has_tag_exact(self, tag: GameplayTag | str) -> bool:
        """
        Check if tag is explicitly present (exact match only, no parent matching).
        
        Args:
            tag: GameplayTag handle or tag path string
        
        Returns:
            True if tag is explicitly in container
        
        Example:
            >>> container.add_tag("Player.Owner.P1")
            >>> container.has_tag_exact("Player.Owner.P1")  # True
            >>> container.has_tag_exact("Player.Owner")     # False
        """
        if isinstance(tag, str):
            tag = TagRegistry.get().request_tag(tag)
        
        if not tag.is_valid():
            return False
        
        return tag in self._explicit_tags
    
    def has_any(self, other: GameplayTagContainer) -> bool:
        """
        Check if this container has ANY of the tags in the other container.
        
        Uses parent matching.
        
        Args:
            other: Another tag container
        
        Returns:
            True if at least one tag matches
        """
        for tag in other._explicit_tags:
            if self.has_tag(tag):
                return True
        return False
    
    def has_all(self, other: GameplayTagContainer) -> bool:
        """
        Check if this container has ALL of the tags in the other container.
        
        Uses parent matching.
        
        Args:
            other: Another tag container
        
        Returns:
            True if all tags match
        """
        for tag in other._explicit_tags:
            if not self.has_tag(tag):
                return False
        return True
    
    def has_any_exact(self, other: GameplayTagContainer) -> bool:
        """
        Check if this container has ANY of the tags in the other container (exact match).
        
        No parent matching.
        
        Args:
            other: Another tag container
        
        Returns:
            True if at least one tag matches exactly
        """
        for tag in other._explicit_tags:
            if self.has_tag_exact(tag):
                return True
        return False
    
    def has_all_exact(self, other: GameplayTagContainer) -> bool:
        """
        Check if this container has ALL of the tags in the other container (exact match).
        
        No parent matching.
        
        Args:
            other: Another tag container
        
        Returns:
            True if all tags match exactly
        """
        for tag in other._explicit_tags:
            if not self.has_tag_exact(tag):
                return False
        return True
    
    def clear(self) -> None:
        """Remove all tags from the container."""
        self._explicit_tags.clear()
        self._parent_tags.clear()
    
    def is_empty(self) -> bool:
        """Check if container has no explicit tags."""
        return len(self._explicit_tags) == 0
    
    def num(self) -> int:
        """Get count of explicit tags (not including computed parents)."""
        return len(self._explicit_tags)
    
    def get_explicit_tags(self) -> list[GameplayTag]:
        """
        Get list of explicit tags (for iteration/serialization).
        
        Returns a copy to prevent external mutation.
        
        Returns:
            List of explicit GameplayTag handles
        """
        return self._explicit_tags.copy()
    
    def to_string(self) -> str:
        """
        Serialize to CSV string.
        
        Returns:
            Comma-separated tag paths (e.g., "A.B,C.D.E")
        
        Example:
            >>> container.to_string()
            'Player.Owner.P1,GameData.Elemental.Fire'
        """
        return ','.join(tag.get_name() for tag in self._explicit_tags)
    
    @staticmethod
    def from_string(s: str) -> GameplayTagContainer:
        """
        Deserialize from CSV string.
        
        Args:
            s: Comma-separated tag paths
        
        Returns:
            New GameplayTagContainer with parsed tags
        
        Example:
            >>> container = GameplayTagContainer.from_string("A.B,C.D")
        """
        container = GameplayTagContainer()
        
        if not s or not s.strip():
            return container
        
        for tag_path in s.split(','):
            tag_path = tag_path.strip()
            if tag_path:
                container.add_tag(tag_path)
        
        return container
    
    def _rebuild_parent_tags(self) -> None:
        """
        Recompute parent tags from explicit tags.
        
        Walks up the hierarchy for each explicit tag and collects all parents.
        """
        self._parent_tags.clear()
        
        for tag in self._explicit_tags:
            parent = tag.get_parent()
            while parent.is_valid():
                # Add if not already present (in either collection)
                if not self._contains_in_either(parent):
                    self._parent_tags.append(parent)
                parent = parent.get_parent()
    
    def _contains_in_either(self, tag: GameplayTag) -> bool:
        """
        Check if tag is in explicit OR parent tags.
        
        Args:
            tag: Tag to check
        
        Returns:
            True if found in either list
        """
        return tag in self._explicit_tags or tag in self._parent_tags
    
    def __repr__(self) -> str:
        """Debug representation."""
        tags_str = self.to_string()
        if tags_str:
            return f"GameplayTagContainer([{tags_str}])"
        return "GameplayTagContainer([])"
    
    def __str__(self) -> str:
        """String representation (CSV format)."""
        return self.to_string()
    
    def __bool__(self) -> bool:
        """Truthiness check (True if not empty)."""
        return not self.is_empty()
