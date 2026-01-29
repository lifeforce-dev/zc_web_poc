"""
Quick validation test for GameplayTags system.

Run this to verify the tag system works before integrating with rest of backend.
"""

from zc_api.tags import GameplayTag, TagRegistry, GameplayTagContainer


def test_basic_tags():
    """Test basic tag creation and comparison."""
    registry = TagRegistry.get()
    
    # Request tags
    tag1 = registry.request_tag("Player.Owner.P1")
    tag2 = registry.request_tag("Player.Owner.P2")
    tag3 = registry.request_tag("Player.Owner.P1")  # Duplicate
    
    # Same path should return same tag
    assert tag1 == tag3, "Duplicate tags should be equal"
    assert tag1 != tag2, "Different tags should not be equal"
    
    # Check names
    assert tag1.get_name() == "Player.Owner.P1"
    assert tag2.get_name() == "Player.Owner.P2"
    
    # Check parent
    parent = tag1.get_parent()
    assert parent.get_name() == "Player.Owner"
    
    grandparent = parent.get_parent()
    assert grandparent.get_name() == "Player"
    
    root = grandparent.get_parent()
    assert not root.is_valid(), "Root parent should be NONE"
    
    print("✓ Basic tag tests passed")


def test_tag_container():
    """Test tag container with parent matching."""
    container = GameplayTagContainer()
    
    # Add explicit tag
    container.add_tag("Player.Owner.P1")
    
    # Exact match
    assert container.has_tag_exact("Player.Owner.P1")
    assert not container.has_tag_exact("Player.Owner")
    assert not container.has_tag_exact("Player")
    
    # Parent matching
    assert container.has_tag("Player.Owner.P1")  # Explicit
    assert container.has_tag("Player.Owner")     # Parent
    assert container.has_tag("Player")           # Grandparent
    assert not container.has_tag("Player.Owner.P2")  # Different tag
    
    # Add second tag
    container.add_tag("GameData.Elemental.Fire")
    
    # Check both present
    assert container.has_tag("Player.Owner.P1")
    assert container.has_tag("GameData.Elemental.Fire")
    assert container.has_tag("GameData.Elemental")  # Parent
    
    # Count
    assert container.num() == 2
    
    print("✓ Tag container tests passed")


def test_container_operations():
    """Test container set operations."""
    container1 = GameplayTagContainer()
    container1.add_tag("Player.Owner.P1")
    container1.add_tag("Status.Frozen")
    
    container2 = GameplayTagContainer()
    container2.add_tag("Player.Owner.P2")
    container2.add_tag("Status.Frozen")
    
    # has_any: Should match on Status.Frozen
    assert container1.has_any(container2)
    
    # has_all: Should fail (P1 doesn't have P2)
    assert not container1.has_all(container2)
    
    # Exact matching
    assert container1.has_any_exact(container2)  # Status.Frozen matches
    
    print("✓ Container operation tests passed")


def test_serialization():
    """Test to_string/from_string."""
    container1 = GameplayTagContainer()
    container1.add_tag("Player.Owner.P1")
    container1.add_tag("Status.Frozen")
    
    # Serialize
    csv = container1.to_string()
    print(f"  Serialized: {csv}")
    
    # Deserialize
    container2 = GameplayTagContainer.from_string(csv)
    
    # Should have same tags
    assert container2.has_tag_exact("Player.Owner.P1")
    assert container2.has_tag_exact("Status.Frozen")
    assert container2.num() == 2
    
    print("✓ Serialization tests passed")


def test_strict_mode():
    """Test strict mode enforcement."""
    registry = TagRegistry.get()
    
    # Disable strict mode, request new tag
    registry.set_strict_mode(False)
    tag1 = registry.request_tag("Test.NewTag")
    assert tag1.is_valid()
    
    # Enable strict mode
    registry.set_strict_mode(True)
    
    # Existing tag should still work
    tag2 = registry.request_tag("Test.NewTag")
    assert tag2.is_valid()
    assert tag1 == tag2
    
    # Unknown tag should return NONE
    tag3 = registry.request_tag("Test.UnknownTag")
    assert not tag3.is_valid()
    assert tag3 == GameplayTag.NONE
    
    # Disable for rest of tests
    registry.set_strict_mode(False)
    
    print("✓ Strict mode tests passed")


def test_registry_stats():
    """Print registry statistics."""
    registry = TagRegistry.get()
    
    print(f"\nRegistry Statistics:")
    print(f"  Total tags: {registry.get_tag_count()}")
    print(f"  Strict mode: {registry.is_strict_mode()}")
    print(f"  Sample tags:")
    for tag_path in registry.get_all_tags()[:5]:
        print(f"    - {tag_path}")


if __name__ == "__main__":
    print("Testing GameplayTags system...\n")
    
    test_basic_tags()
    test_tag_container()
    test_container_operations()
    test_serialization()
    test_strict_mode()
    test_registry_stats()
    
    print("\n✓ All tests passed!")
