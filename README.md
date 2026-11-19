# Portal UI

React analyst portal: case queue, case detail (summary, investigation, alerts), proposals, rules, pipeline health. Dark by default, light when the OS prefers it.

```bash
docker compose up -d --build     # http://localhost:8120
npm ci && npm test               # unit tests (no backend needed); needs Node 22+, Node 18 fails
npm run dev                      # Vite dev server
```

## The contract

`openapi.yaml` is the only interface between this UI and the backend. The UI calls nothing else, and its
types (`src/api/schema.d.ts`) are generated from it with `npm run gen:api`. A backend that serves these
endpoints works with the UI.

`/api/*` is forwarded to `PORTAL_BACKEND_URL`, by default `http://host.docker.internal:8000`, which is a
backend running on the Mac. To point at a backend in another compose project, set `PORTAL_BACKEND_URL`.
