# Garuda Lens

Garuda Lens is an open-source satellite land-use intelligence platform for comparing Sentinel-2 imagery across time. It combines a FastAPI geospatial backend with a Next.js operator console to help users draw an area of interest, select before/after date windows, detect vegetation, water, and urban change, and generate concise site-level advisory insights.

The project is designed for environmental screening, planning workflows, agricultural assessment, site-selection research, and academic geospatial experimentation. It should be treated as a decision-support tool, not as a replacement for field surveys, certified remote-sensing analysis, or legal due diligence.

## Highlights

- Interactive AOI workflow with OpenStreetMap search, Leaflet drawing tools, and persisted workspace state.
- Sentinel-2 L2A scene discovery through Microsoft Planetary Computer STAC.
- Raster clipping and downsampling for practical browser-facing analysis.
- NDVI and NDWI computation for vegetation and water signal comparison.
- Urban-change heuristic based on brightness deltas and white-roof/building detection.
- Metrics dashboard with total, vegetation, urban, water, and index summaries.
- Before/after satellite preview panels with a split-view comparison slider.
- Optional Groq-powered advisory chat grounded only in computed site metrics.
- Modern frontend stack with Next.js 16, TypeScript, Tailwind CSS, Zustand, Recharts, and React Leaflet.

## Architecture

```text
Garuda Lens
|-- backend
|   |-- FastAPI application and API routes
|   |-- STAC scene search against Microsoft Planetary Computer
|   |-- Rasterio-based band clipping and AOI masking
|   |-- NumPy/OpenCV land-use change calculations
|   `-- Optional Groq AI insight service
`-- frontend
    |-- Next.js App Router application
    |-- Leaflet map workbench and AOI drawing
    |-- Zustand state persisted across app pages
    |-- Recharts analytics dashboard
    `-- Satellite preview and AI insight views
```

## How It Works

1. The user searches for a place and draws a Polygon or MultiPolygon AOI in the browser.
2. The frontend sends the AOI, date windows, and cloud-cover limit to the FastAPI backend.
3. The backend searches Sentinel-2 L2A scenes from Microsoft Planetary Computer and selects the clearest scene per time window.
4. Rasterio clips red, green, blue, and near-infrared bands to the AOI and creates valid-pixel masks.
5. NumPy computes NDVI and NDWI before/after arrays, then derives vegetation, water, and urban-change masks.
6. The frontend renders metrics, charts, scene previews, and optional AI advisory output.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16, React 18, TypeScript, Tailwind CSS, React Leaflet, Leaflet Draw, Recharts, Zustand, Lucide Icons |
| Backend | FastAPI, Pydantic, Uvicorn, Rasterio, NumPy, OpenCV, GeoPandas, PyProj, Shapely, pystac-client |
| Data | Sentinel-2 L2A imagery via Microsoft Planetary Computer |
| AI | Groq OpenAI-compatible chat completions |
| Maps | OpenStreetMap tiles and Nominatim geocoding |

## Requirements

- Node.js 20.9 or newer. Node 22 is recommended for the current frontend toolchain.
- npm 10 or newer.
- Python 3.11 or 3.12. Python 3.12 is recommended for local development.
- Internet access for OpenStreetMap, Nominatim, Microsoft Planetary Computer, and optional Groq calls.
- Native geospatial libraries if wheels are not available on your platform. The provided Dockerfile installs GDAL-related system packages for the backend image.

## Environment Variables

Create local environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Backend variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_NAME` | API display name | `Garuda Lens API` |
| `APP_ENV` | Runtime environment label | `development` |
| `APP_HOST` | Backend bind host | `0.0.0.0` |
| `APP_PORT` | Backend port | `8000` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `PLANETARY_COMPUTER_STAC_URL` | STAC endpoint | Microsoft Planetary Computer |
| `SENTINEL_COLLECTION` | STAC collection | `sentinel-2-l2a` |
| `GROQ_API_KEY` | Optional Groq API key for AI insights | empty |
| `GROQ_MODEL` | Groq model used for advisory chat | `openai/gpt-oss-20b` |

Frontend variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Public URL of the FastAPI backend | `http://localhost:8000` |

## Local Development

Start the backend:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

Backend API documentation is available at:

```text
http://localhost:8000/docs
```

## Docker Backend

Build and run the backend container:

```bash
cd backend
docker build -t garuda-lens-api .
docker run --env-file .env -p 8000:8000 garuda-lens-api
```

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns API health and service name |
| `POST` | `/fetch-sentinel` | Finds before/after Sentinel scenes and preview URLs |
| `POST` | `/analyze-area` | Runs AOI clipping, index calculation, and change detection |
| `GET` | `/ndvi` | Computes mean NDVI for a bbox and date range |
| `GET` | `/change` | Computes change metrics for bbox-based before/after ranges |
| `POST` | `/ai-insights` | Generates optional Groq advisory text from computed metrics |

Example analysis payload:

```json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [
      [
        [77.55, 12.90],
        [77.65, 12.90],
        [77.65, 13.00],
        [77.55, 13.00],
        [77.55, 12.90]
      ]
    ]
  },
  "before": {
    "start": "2023-01-01",
    "end": "2023-06-30"
  },
  "after": {
    "start": "2024-01-01",
    "end": "2024-06-30"
  },
  "max_cloud_cover": 20
}
```

## Quality Checks

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm audit --audit-level=high
```

Backend:

```bash
cd backend
source .venv/bin/activate
python -m compileall app
python -c "from app.main import app; print(app.title)"
```

Quick API smoke test:

```bash
cd backend
source .venv/bin/activate
python - <<'PY'
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
print(client.get("/health").json())
PY
```

## Project Structure

```text
.
|-- backend
|   |-- app
|   |   |-- api
|   |   |-- core
|   |   |-- models
|   |   `-- services
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend
|   |-- app
|   |-- components
|   |-- lib
|   |-- store
|   |-- types
|   `-- package.json
`-- README.md
```

## Troubleshooting

No Sentinel scenes found:

Try a wider date range, a larger AOI, or a higher `max_cloud_cover` value. Very cloudy regions and very small polygons may return no usable scenes.

CORS error in the browser:

Add the frontend origin to `ALLOWED_ORIGINS` in `backend/.env`, then restart the backend.

Backend geospatial install fails:

Use Python 3.11 or 3.12, upgrade `pip`, and make sure GDAL/GEOS/PROJ system libraries are available. The Dockerfile is the most repeatable backend runtime path.

AI insight says the Groq key is missing:

Set `GROQ_API_KEY` in `backend/.env` and restart the backend. The core geospatial analysis works without this key.

Map search is slow or unavailable:

Nominatim is a public OpenStreetMap service and may rate-limit requests. For production, replace it with an approved geocoding provider or a self-hosted Nominatim instance.

## Notes

- Do not commit `.env`, `.env.local`, virtual environments, `node_modules`, or build outputs.
- Planetary Computer preview URLs are signed and may expire.
- OpenStreetMap and Nominatim usage must follow their respective service policies.
- The urban-change output is a lightweight heuristic and should be validated against higher-resolution imagery or field evidence before operational use.
- The AI response is generated from computed metrics only and should not be treated as professional, legal, financial, agricultural, or environmental advice.
