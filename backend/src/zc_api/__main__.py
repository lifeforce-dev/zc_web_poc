"""CLI entry point for running the server directly."""

import uvicorn


def main() -> None:
    uvicorn.run("zc_api.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
