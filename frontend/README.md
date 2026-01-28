## Frontend (Vue + Vite)

### Run (dev)

```powershell
cd e:\source\zc_web_poc\frontend
npm install
npm run dev
```

### Config

- Default backend base: `ws://127.0.0.1:8000`
- Build-time: `VITE_WS_BASE_URL` (recommended for deployments)
- Runtime override: `?wsBase=wss://...`
