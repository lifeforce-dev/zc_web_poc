#!/usr/bin/env python3
"""
Simple HTTP server for docs that also serves game_data assets.
Keeps docs separate from the game server.

Usage: python tools/serve-docs.py
Then open http://localhost:8080/style-guide/ice.html
"""

import http.server
import os
from pathlib import Path

PORT = 8080
PROJECT_ROOT = Path(__file__).parent.parent

# Map URL paths to filesystem paths
PATH_MAPPINGS = {
    "/game_data/": PROJECT_ROOT / "backend" / "game_data",
    "/": PROJECT_ROOT / "docs",
}


class MultiDirectoryHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        # Remove query string and fragment
        path = path.split("?")[0].split("#")[0]

        # Check each mapping
        for url_prefix, fs_path in PATH_MAPPINGS.items():
            if path.startswith(url_prefix) and url_prefix != "/":
                relative = path[len(url_prefix) :]
                return str(fs_path / relative)

        # Default to docs folder
        relative = path.lstrip("/")
        return str(PROJECT_ROOT / "docs" / relative)


def main():
    os.chdir(PROJECT_ROOT / "docs")

    with http.server.HTTPServer(("", PORT), MultiDirectoryHandler) as httpd:
        print(f"Serving docs at http://localhost:{PORT}")
        print(f"  /              -> {PROJECT_ROOT / 'docs'}")
        print(f"  /game_data/    -> {PROJECT_ROOT / 'backend' / 'game_data'}")
        print()
        print("Press Ctrl+C to stop")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
