## Backend (FastAPI + WebSockets)

### Run (dev, using uv)

```powershell
cd e:\source\zc_web_poc\backend
uv venv
uv pip install -e ".[dev]"
uv run uvicorn zc_api.main:app --reload --port 8000
```

### Run tests

```powershell
uv run pytest
```

### Endpoints

- `GET /health`
- `WS /ws/matchmaking?name=...` -> returns `match_found` and closes
- `WS /ws/game/{match_id}?token=...` -> ping/pinged

### CORS / Origin allow list

WebSocket connections are origin-checked.

- Dev defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`.
- For GitHub Pages, set `ALLOWED_WS_ORIGINS` to a JSON list, for example:
	- `ALLOWED_WS_ORIGINS=["https://YOUR_USER.github.io"]`
