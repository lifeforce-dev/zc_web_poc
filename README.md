# zc_web_poc

Web prototype for a turn based strategy game called ZoneControl

Frontend is live at:
https://lifeforce-dev.github.io/zc_web_poc/

Style Guide:
https://lifeforce-dev.github.io/zc_web_poc/style-guide/fire.html

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


