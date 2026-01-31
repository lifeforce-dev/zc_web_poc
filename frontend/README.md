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

### Regenerating API Types

When backend API changes, regenerate TypeScript types:

```powershell
cd e:\source\zc_web_poc
python src/tools/generate_types.py
```

This generates `frontend/src/types/api.generated.ts` from the OpenAPI schema.
