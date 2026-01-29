"""
ZoneControl Board Editor - Main Entry Point

DearPyGui-based visual editor for designing game boards.
"""

from .editor_ui import BoardEditor


def main():
	"""Entry point for the board editor."""
	editor = BoardEditor()
	editor.run()


if __name__ == "__main__":
	main()
