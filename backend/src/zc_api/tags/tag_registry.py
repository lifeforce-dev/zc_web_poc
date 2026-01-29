"""
TagRegistry - Singleton managing all tag registrations.

The registry interns tag path strings and assigns unique IDs.
Parent tags are created automatically when requesting child tags.

Example:
    >>> registry = TagRegistry.get()
    >>> tag = registry.request_tag("Player.Owner.P1")
    >>> # Also creates "Player" and "Player.Owner" as parents
"""

from __future__ import annotations
from typing import Callable
from .gameplay_tag import GameplayTag


class TagRegistry:
    """
    Singleton registry for gameplay tag management.
    
    Responsibilities:
    - Intern tag path strings (deduplicate)
    - Assign unique IDs to tags
    - Track parent-child relationships
    - Enforce strict mode (reject unknown tags)
    """
    
    _instance: TagRegistry | None = None
    
    def __init__(self) -> None:
        """Private constructor. Use TagRegistry.get() instead."""
        if TagRegistry._instance is not None:
            raise RuntimeError("TagRegistry is a singleton. Use TagRegistry.get()")
        
        # Index 0 is reserved for invalid/none tag
        self._strings: list[str] = [""]
        self._lookup: dict[str, int] = {"": 0}
        self._parent_ids: list[int] = [0]
        self._strict_mode: bool = False
    
    @classmethod
    def get(cls) -> TagRegistry:
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = TagRegistry()
        return cls._instance
    
    def request_tag(self, tag_path: str) -> GameplayTag:
        """
        Get or create a tag by path.
        
        In normal mode: Creates the tag and all parent tags if not exists.
        In strict mode: Returns NONE if tag not pre-registered.
        
        Args:
            tag_path: Hierarchical path (e.g., "Player.Owner.P1")
        
        Returns:
            GameplayTag handle (or NONE if invalid/unknown in strict mode)
        
        Example:
            >>> tag = registry.request_tag("A.B.C")
            >>> # Creates A, A.B, A.B.C
        """
        if not tag_path or not tag_path.strip():
            return GameplayTag.NONE
        
        tag_path = tag_path.strip()
        
        # Check if already registered
        tag_id = self._find_tag(tag_path)
        if tag_id != 0:
            return GameplayTag(tag_id)
        
        # In strict mode, don't create new tags
        if self._strict_mode:
            return GameplayTag.NONE
        
        # Create the tag (and any missing parent tags)
        tag_id = self._intern_tag(tag_path)
        return GameplayTag(tag_id)
    
    def register_tags_from_source(self, loader: Callable[[], list[str]]) -> None:
        """
        Register tags from an external source (e.g., config file).
        
        Loader should return a list of tag paths to register.
        All tags are interned, creating parent tags as needed.
        
        Args:
            loader: Function returning list of tag path strings
        
        Example:
            >>> def load_config():
            ...     return ["Player.Owner.P1", "GameData.Elemental.Fire"]
            >>> registry.register_tags_from_source(load_config)
        """
        tag_paths = loader()
        for tag_path in tag_paths:
            if tag_path and tag_path.strip():
                self._intern_tag(tag_path.strip())
    
    def set_strict_mode(self, strict: bool) -> None:
        """
        Enable/disable strict mode.
        
        When enabled, request_tag() returns NONE for unknown tags.
        Use this after loading all tags to catch typos at runtime.
        
        Args:
            strict: True to enable strict mode
        """
        self._strict_mode = strict
    
    def is_strict_mode(self) -> bool:
        """Check if strict mode is enabled."""
        return self._strict_mode
    
    def get_tag_name(self, tag_id: int) -> str:
        """
        Internal: Get tag path string by ID.
        
        Args:
            tag_id: Internal tag ID
        
        Returns:
            Tag path string (empty if invalid ID)
        """
        if 0 <= tag_id < len(self._strings):
            return self._strings[tag_id]
        return ""
    
    def get_parent_id(self, tag_id: int) -> int:
        """
        Internal: Get parent tag ID.
        
        Args:
            tag_id: Internal tag ID
        
        Returns:
            Parent tag ID (0 if no parent)
        """
        if 0 <= tag_id < len(self._parent_ids):
            return self._parent_ids[tag_id]
        return 0
    
    def _find_tag(self, tag_path: str) -> int:
        """
        Find tag ID by path (returns 0 if not found).
        
        Args:
            tag_path: Tag path to lookup
        
        Returns:
            Tag ID or 0 if not found
        """
        return self._lookup.get(tag_path, 0)
    
    def _intern_tag(self, tag_path: str) -> int:
        """
        Intern a tag path (create if not exists).
        
        Recursively ensures parent tags exist first.
        
        Args:
            tag_path: Tag path to intern
        
        Returns:
            Tag ID
        """
        # Check if already exists
        existing = self._find_tag(tag_path)
        if existing != 0:
            return existing
        
        # Find parent path (everything before last '.')
        parent_id = 0
        last_dot = tag_path.rfind('.')
        if last_dot != -1:
            parent_path = tag_path[:last_dot]
            parent_id = self._intern_tag(parent_path)  # Recursively ensure parent exists
        
        # Create new entry
        new_id = len(self._strings)
        self._strings.append(tag_path)
        self._parent_ids.append(parent_id)
        self._lookup[tag_path] = new_id
        
        return new_id
    
    def get_all_tags(self) -> list[str]:
        """
        Get all registered tag paths (for debug/inspection).
        
        Returns:
            List of all tag paths (excluding empty string at index 0)
        """
        return self._strings[1:]  # Skip index 0 (invalid tag)
    
    def get_tag_count(self) -> int:
        """Get total number of registered tags (excluding NONE)."""
        return len(self._strings) - 1
