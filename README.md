# zc_web_poc

Production-shaped web POC for ZoneControl matchmaking + WebSocket sessions.

## Project Structure

```
zc_web_poc/
├── backend/
│   ├── src/zc_api/
│   │   ├── main.py           # FastAPI app factory
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── dependencies.py   # Shared FastAPI deps
│   │   ├── models/           # Pydantic schemas
│   │   ├── routers/          # API route modules
│   │   ├── services/         # Pure business logic
│   │   ├── session/          # Matchmaking + game sessions
│   │   └── utils/            # Shared utilities
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── views/            # Page-level views
│   │   ├── composables/      # Vue composables
│   │   ├── stores/           # Pinia stores
│   │   ├── types/            # TypeScript types (mirror backend)
│   │   └── utils/            # Shared utilities
│   └── package.json
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── .github/workflows/
```

## Local Run

### Backend (using uv)

```powershell
cd e:\source\zc_web_poc\backend
uv venv
uv pip install -e ".[dev]"
uv run uvicorn zc_api.main:app --reload --port 8000
```

### Frontend

```powershell
cd e:\source\zc_web_poc\frontend
npm install
npm run dev
```

Open two browser tabs at `http://localhost:5173` to see pairing + ping.

## Deployment Notes

- If the frontend is on GitHub Pages (HTTPS), the backend must be reachable via `wss://...`.
- Configure the frontend with `VITE_WS_BASE_URL` (example: `wss://your-backend.example.com`).
- Set `ALLOWED_WS_ORIGINS` on backend to include the Pages URL.
