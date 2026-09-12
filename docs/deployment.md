# Deployment layout

Earth Vision is intentionally split into two deployable services:

```text
repository root
├── backend/   Render Docker Web Service
└── frontend/  Vercel Next.js project
```

## Backend: Render

The root `render.yaml` configures the backend service. In Render, create a Blueprint from this repository or create a Web Service manually with:

- Root directory: `backend`
- Runtime: Docker
- Dockerfile: `backend/Dockerfile`
- Health check: `/health`

Set `ALLOWED_ORIGINS` to the final Vercel URL. Set `GROQ_API_KEY` only in Render's secret environment variables. Do not commit either value.

The Docker image accepts Render's `PORT` variable and binds to `0.0.0.0`. The backend Docker context excludes local environments, tests, source-control data, and environment files.

## Frontend: Vercel

Create a Vercel project from the same repository with:

- Root directory: `frontend`
- Framework: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Environment variable: `NEXT_PUBLIC_API_URL=https://<backend-host>`

After the first frontend deployment, update the backend's `ALLOWED_ORIGINS` to the exact Vercel origin and redeploy the backend.

## Local commands

From the repository root:

```bash
make install
make backend
make frontend
make check
```

If `make` is unavailable, run the commands from `README.md` directly inside `backend` and `frontend`.

## Smoke checks

```bash
curl https://<backend-host>/health
curl -I https://<frontend-host>/
```

Then draw a small AOI in the frontend, review the proposal, confirm it, and wait for the analysis response. Satellite processing is remote and can take longer than ordinary web requests.
