# ZoneControl Board Editor

Standalone DearPyGui tool for designing game boards.

## Installation

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

## Usage

```powershell
python -m game_board_editor.main
```

## Features

- Visual 9x9 grid (81 tiles total)
- Tile type assignment (Normal or Wall)
- Zone boundaries shown (3x3 regions for scoring)
- Zone spawn weight configuration (affects random block spawning)
- JSON export for backend consumption
- Load/save board files

## Controls

- **Left Click**: Toggle tile between Normal and Wall
- **Zone Weight Sliders**: Adjust spawn probability (0-100)
- **Ctrl+S**: Save board
- **Ctrl+O**: Open board
- **Ctrl+N**: New board

## Board Data Format

Exports JSON with:
- 81 tiles in row-major order (9x9 grid)
- Each tile is "Normal" or "Wall"
- 9 zone spawn weights (one per 3x3 region)
