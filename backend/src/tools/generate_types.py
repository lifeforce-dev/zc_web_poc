#!/usr/bin/env python3
"""
Generate OpenAPI schema and TypeScript types from the backend API.

Usage (from backend directory, with backend venv activated):
    python src/tools/generate_types.py

This script:
1. Exports the FastAPI OpenAPI schema to frontend/openapi.json
2. Runs openapi-typescript to generate TypeScript types

Run this whenever the backend API changes, then commit both:
- frontend/openapi.json
- frontend/src/types/api.generated.ts
"""

import json
import subprocess
import sys
from pathlib import Path

# Paths - script is in backend/src/tools/, project root is 3 levels up
SCRIPT_DIR = Path(__file__).parent
BACKEND_SRC = SCRIPT_DIR.parent  # backend/src
BACKEND_DIR = BACKEND_SRC.parent  # backend
PROJECT_ROOT = BACKEND_DIR.parent  # zc_web_poc
FRONTEND_DIR = PROJECT_ROOT / "frontend"
OPENAPI_FILE = FRONTEND_DIR / "openapi.json"
TYPES_FILE = FRONTEND_DIR / "src" / "types" / "api.generated.ts"


def export_openapi_schema() -> None:
    """Export the OpenAPI schema from FastAPI to a JSON file."""
    print("Exporting OpenAPI schema from backend...")
    
    # Import here so script can show usage even if backend not installed
    sys.path.insert(0, str(BACKEND_SRC))
    from zc_api.main import create_app
    
    app = create_app()
    schema = app.openapi()
    
    with open(OPENAPI_FILE, "w") as f:
        json.dump(schema, f, indent=2)
    
    print(f"  Written to: {OPENAPI_FILE}")


def generate_typescript_types() -> None:
    """Run openapi-typescript to generate TypeScript types."""
    print("Generating TypeScript types...")
    
    # Use shell=True on Windows so npx can be found in PATH
    result = subprocess.run(
        f"npx openapi-typescript {OPENAPI_FILE} -o {TYPES_FILE}",
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True,
        shell=True,
    )
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    
    print(f"  Written to: {TYPES_FILE}")


def main() -> None:
    print("=" * 50)
    print("Generating API types")
    print("=" * 50)
    
    export_openapi_schema()
    generate_typescript_types()
    
    print()
    print("Done! Remember to commit:")
    print(f"  - {OPENAPI_FILE.relative_to(PROJECT_ROOT)}")
    print(f"  - {TYPES_FILE.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
