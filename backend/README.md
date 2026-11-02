# Vehicle Recommendation API

Python FastAPI backend for the Vehicle Analysis and AI-Based Recommendation System.

## Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Update `.env` with your PostgreSQL connection string.

## Run

```bash
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/vehicles` | List vehicles |
| GET | `/api/vehicles/{id}` | Get vehicle |
| POST | `/api/vehicles` | Create vehicle |
| PUT | `/api/vehicles/{id}` | Update vehicle |
| DELETE | `/api/vehicles/{id}` | Delete vehicle |
| POST | `/api/recommendations` | Recommendation stub |

## Notes

- `GEMINI_API_KEY` is reserved for a later phase.
- Recommendation ranking with scikit-learn is not implemented yet.
- If the database is empty, list/get endpoints return a small placeholder dataset.
