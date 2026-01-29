"""
Board data model and serialization.
"""

import json
from pathlib import Path


class BoardData:
	"""Variable-sized grid of tiles. Just Normal or Wall."""

	def __init__(self, name: str = "Untitled Board", size: int = 4):
		self.name = name
		self.size = size
		self.tiles = ["Normal"] * (size * size)

	def get_tile(self, row: int, col: int) -> str:
		"""Get tile type at grid position."""
		if 0 <= row < self.size and 0 <= col < self.size:
			return self.tiles[row * self.size + col]
		return "Normal"

	def set_tile(self, row: int, col: int, tile_type: str):
		"""Set tile type at grid position."""
		if 0 <= row < self.size and 0 <= col < self.size:
			self.tiles[row * self.size + col] = tile_type

	def resize(self, new_size: int):
		"""Resize grid, preserving existing tiles where possible."""
		new_tiles = ["Normal"] * (new_size * new_size)

		for row in range(min(self.size, new_size)):
			for col in range(min(self.size, new_size)):
				old_idx = row * self.size + col
				new_idx = row * new_size + col
				new_tiles[new_idx] = self.tiles[old_idx]

		self.size = new_size
		self.tiles = new_tiles

	def to_json(self) -> str:
		"""Serialize to JSON with 0=Normal, 1=Wall, formatted as grid."""
		tile_values = [1 if t == "Wall" else 0 for t in self.tiles]

		rows = []
		for i in range(self.size):
			row_start = i * self.size
			row_end = row_start + self.size
			rows.append(tile_values[row_start:row_end])

		return json.dumps({
			"name": self.name,
			"size": self.size,
			"tiles": rows,
		}, indent=2)

	@classmethod
	def from_json(cls, json_str: str) -> "BoardData":
		"""Deserialize from JSON."""
		data = json.loads(json_str)
		size = data.get("size", 9)
		board = cls(name=data["name"], size=size)

		tiles_data = data["tiles"]
		if isinstance(tiles_data[0], list):
			flat_tiles = [val for row in tiles_data for val in row]
		else:
			flat_tiles = tiles_data

		board.tiles = ["Wall" if val == 1 else "Normal" for val in flat_tiles]
		return board

	def save_to_file(self, path: Path):
		"""Save board to file."""
		path.write_text(self.to_json())

	@classmethod
	def load_from_file(cls, path: Path) -> "BoardData":
		"""Load board from file."""
		return cls.from_json(path.read_text())
