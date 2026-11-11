# Vehicle Analysis and AI-Based Recommendation System

College mini-project foundation for searching, comparing, and (later) recommending vehicles using AI and machine learning.

## 1. Project Overview

This system helps users find suitable vehicles based on budget, fuel type, transmission, mileage, seating, and priorities such as safety and mileage. The current phase delivers a clean, scalable foundation: placeholder UI pages, REST API structure, PostgreSQL configuration, and frontend–backend communication. AI (Gemini) and the scikit-learn recommendation engine are intentionally deferred.

## 2. Architecture

```text
Next.js (App Router)
        │
        │ REST API
        ↓
    FastAPI
        │
        ├── Vehicle Service
        ├── Recommendation Service (stub)
        └── AI Service (Gemini: extract prefs + explain; never ranks)
        │
        ↓
    PostgreSQL
```

**Future additions**

- Recommendation Service → Python ML → scikit-learn → Vehicle Ranking  
- FastAPI → Gemini API → Natural Language Requirement Extraction  

## 3. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, JavaScript |
| Styling / UI | Tailwind CSS, shadcn/ui, Lucide React |
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL |
| ORM / Validation | SQLAlchemy, Pydantic |
| AI / ML (later) | Gemini API, scikit-learn |

## 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

## 5. Backend Setup

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

Edit `.env` with your PostgreSQL `DATABASE_URL` and optional settings.

## 6. PostgreSQL Setup

1. Install and start PostgreSQL.
2. Create a database, for example:

```sql
CREATE DATABASE vehicle_recommendation;
```

3. Set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/vehicle_recommendation
```

Apply schema with Alembic (do not rely on `create_all` in production):

```bash
cd backend
alembic upgrade head
```

See [docs/PRODUCTION_DATABASE.md](docs/PRODUCTION_DATABASE.md) for SSL, backups, restore, and seed guidance.

## 7. Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)

Copy from `backend/.env.example`. Important production values:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/vehicle_recommendation
GEMINI_API_KEY=
JWT_SECRET_KEY=replace-with-a-long-random-secret-key
ALLOWED_ORIGINS=http://localhost:3000
DEBUG=false
REQUIRE_DB_ON_STARTUP=true
```

Do **not** expose `GEMINI_API_KEY` or `JWT_SECRET_KEY` to the frontend.
Vehicle images use direct HTTPS URLs stored in PostgreSQL (no Cloudinary).

## 8. How to Run Frontend

```bash
cd frontend
npm run dev -- --hostname localhost --port 3000
```

Open [http://localhost:3000](http://localhost:3000).

## 9. How to Run Backend

From the `backend` directory (with venv activated):

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: [http://localhost:8000](http://localhost:8000)

Helper scripts (from repo root):

```powershell
.\scripts\start-local.ps1
.\scripts\stop-local.ps1
```

## 10. Local college demonstration

Full local demo guide, admin setup, Gemini notes, and examiner checklist:

→ **[docs/LOCAL_DEMO.md](docs/LOCAL_DEMO.md)**

Pre-demo verification (servers must be running):

```bash
cd backend
python scripts/phase65_demo_verify.py
```

## 11. API overview

- Health: `GET /api/health`
- Vehicles (public): `GET /api/vehicles`, `GET /api/vehicles/{id|slug}`
- Recommendations: `POST /api/recommendations`
- AI: `POST /api/ai/extract-preferences`, `/api/ai/recommendations`, `/api/ai/explain`
- Admin: `/api/admin/auth/*`, `/api/admin/dashboard/stats`, `/api/admin/vehicles`

Swagger UI is available at `/docs` only when `DEBUG=true`.

---

Frontend and backend are independently runnable. See `frontend/README.md`, `backend/README.md`, and `docs/PRODUCTION_DATABASE.md` for more detail.
