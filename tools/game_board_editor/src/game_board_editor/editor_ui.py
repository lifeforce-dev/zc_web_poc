"""
Board editor UI and interaction logic.
"""

import dearpygui.dearpygui as dpg
from pathlib import Path
from typing import Optional

from .board_data import BoardData


class BoardEditor:
	"""Main editor application."""

	TILE_SIZE = 50
	TILE_GAP = 4

	TILE_COLORS = {
		"Normal": (220, 220, 220, 255),
		"Wall": (60, 60, 60, 255),
	}

	def __init__(self):
		self.board = BoardData(size=4)
		self.current_file: Optional[Path] = None
		self.auto_save_enabled = True
		self.game_data_dir = Path(__file__).parents[4] / "backend" / "game_data" / "game_boards"
		self.game_data_dir.mkdir(parents=True, exist_ok=True)
		self.available_boards = []

	def refresh_board_list(self):
		"""Scan game_boards directory for available maps."""
		self.available_boards = sorted([
			f.stem for f in self.game_data_dir.glob("*.json")
		])
		return self.available_boards

	def get_save_path(self) -> Path:
		"""Get save path based on board name."""
		filename = self.board.name.replace(" ", "_").lower()
		if not filename.endswith(".json"):
			filename += ".json"
		return self.game_data_dir / filename

	def setup_ui(self):
		"""Initialize DearPyGui UI."""
		dpg.create_context()

		with dpg.handler_registry():
			dpg.add_mouse_click_handler(button=dpg.mvMouseButton_Left, callback=self.on_canvas_clicked)

		with dpg.window(label="ZoneControl Board Editor", tag="main_window"):
			with dpg.menu_bar():
				with dpg.menu(label="File"):
					dpg.add_menu_item(label="New", callback=self.new_board, shortcut="Ctrl+N")
					dpg.add_menu_item(label="Open", callback=self.open_board_dialog, shortcut="Ctrl+O")
					dpg.add_menu_item(label="Save", callback=self.save_board, shortcut="Ctrl+S")
					dpg.add_menu_item(label="Save As", callback=self.save_board_as_dialog)

			with dpg.group(horizontal=True):
				with dpg.child_window(width=500, height=500, tag="board_canvas"):
					with dpg.drawlist(width=500, height=500, tag="board_drawlist"):
						pass

				with dpg.child_window(width=350, tag="properties_panel"):
					self._setup_properties_panel()

		self.draw_board()

		dpg.create_viewport(title="ZoneControl Board Editor", width=900, height=550)
		dpg.setup_dearpygui()
		dpg.show_viewport()
		dpg.set_primary_window("main_window", True)

	def _setup_properties_panel(self):
		"""Setup the properties panel UI."""
		dpg.add_text("Board Properties", color=(255, 255, 100))
		dpg.add_separator()

		with dpg.group(horizontal=True):
			dpg.add_input_text(
				label="",
				default_value=self.board.name,
				callback=self.on_board_name_changed,
				tag="board_name_input",
				width=200
			)
			dpg.add_button(label="Save Name", callback=self.save_board)

		dpg.add_separator()
		dpg.add_text("Grid Size:", color=(255, 255, 100))
		dpg.add_slider_int(
			label="Size",
			default_value=self.board.size,
			min_value=4,
			max_value=16,
			callback=self.on_grid_size_changed,
			tag="grid_size_slider",
			width=200
		)

		dpg.add_separator()
		dpg.add_text("Available Boards:", color=(255, 255, 100))
		with dpg.child_window(height=150, tag="board_list_window"):
			dpg.add_listbox(
				items=self.refresh_board_list(),
				callback=self.on_board_selected,
				tag="board_listbox",
				width=300,
				num_items=8
			)

		dpg.add_separator()
		dpg.add_text("Tile Types:", color=(255, 255, 100))
		dpg.add_text("  Normal (light): Playable tiles", color=(200, 200, 200))
		dpg.add_text("  Wall (dark): Blocks movement", color=(100, 100, 100))

		dpg.add_separator()
		dpg.add_text("Controls:", color=(255, 255, 100))
		dpg.add_text("Left Click: Toggle Normal/Wall")
		dpg.add_text("Auto-saves on tile changes")

	def draw_board(self):
		"""Draw the grid with spacing between tiles."""
		dpg.delete_item("board_drawlist", children_only=True)

		for row in range(self.board.size):
			for col in range(self.board.size):
				x = col * (self.TILE_SIZE + self.TILE_GAP) + 10
				y = row * (self.TILE_SIZE + self.TILE_GAP) + 10

				tile_type = self.board.get_tile(row, col)
				color = self.TILE_COLORS[tile_type]

				dpg.draw_rectangle(
					pmin=(x, y),
					pmax=(x + self.TILE_SIZE, y + self.TILE_SIZE),
					color=color,
					fill=color,
					thickness=1,
					parent="board_drawlist"
				)

	def on_canvas_clicked(self):
		"""Handle mouse clicks on canvas."""
		mouse_pos = dpg.get_mouse_pos(local=False)
		canvas_pos = dpg.get_item_pos("board_canvas")

		rel_x = mouse_pos[0] - canvas_pos[0] - 10
		rel_y = mouse_pos[1] - canvas_pos[1] - 10

		if rel_x < 0 or rel_y < 0:
			return

		col = int(rel_x // (self.TILE_SIZE + self.TILE_GAP))
		row = int(rel_y // (self.TILE_SIZE + self.TILE_GAP))

		if 0 <= row < self.board.size and 0 <= col < self.board.size:
			current = self.board.get_tile(row, col)
			new_type = "Wall" if current == "Normal" else "Normal"
			self.board.set_tile(row, col, new_type)
			self.draw_board()

			if self.auto_save_enabled:
				self.current_file = self.get_save_path()
				self.board.save_to_file(self.current_file)
				dpg.configure_item("board_listbox", items=self.refresh_board_list())

	def on_board_name_changed(self, sender, app_data):
		"""Update board name (requires manual save)."""
		self.board.name = app_data

	def on_grid_size_changed(self, sender, app_data):
		"""Resize grid and redraw."""
		self.board.resize(app_data)
		self.draw_board()

		if self.auto_save_enabled:
			self.current_file = self.get_save_path()
			self.board.save_to_file(self.current_file)
			dpg.configure_item("board_listbox", items=self.refresh_board_list())

	def on_board_selected(self, sender, app_data):
		"""Load selected board from listbox."""
		if not app_data:
			return

		board_path = self.game_data_dir / f"{app_data}.json"
		if board_path.exists():
			self.board = BoardData.load_from_file(board_path)
			self.current_file = board_path
			dpg.set_value("board_name_input", self.board.name)
			dpg.set_value("grid_size_slider", self.board.size)
			self.draw_board()

	def new_board(self):
		"""Create a new empty board."""
		self.board = BoardData(size=4)
		self.current_file = None
		dpg.set_value("board_name_input", self.board.name)
		dpg.set_value("grid_size_slider", self.board.size)
		self.draw_board()

	def open_board_dialog(self):
		"""Open file picker dialog."""
		save_path = self.get_save_path()
		if save_path.exists():
			self.board = BoardData.load_from_file(save_path)
			self.current_file = save_path
			dpg.set_value("board_name_input", self.board.name)
			dpg.set_value("grid_size_slider", self.board.size)
			self.draw_board()

	def save_board(self):
		"""Save current board."""
		self.current_file = self.get_save_path()
		self.board.save_to_file(self.current_file)
		print(f"Saved to {self.current_file}")

	def save_board_as_dialog(self):
		"""Save board with new filename."""
		self.current_file = self.get_save_path()
		self.board.save_to_file(self.current_file)
		print(f"Saved to {self.current_file.absolute()}")

	def run(self):
		"""Start the editor."""
		self.setup_ui()

		while dpg.is_dearpygui_running():
			dpg.render_dearpygui_frame()

		dpg.destroy_context()
