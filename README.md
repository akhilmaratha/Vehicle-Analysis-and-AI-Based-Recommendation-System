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

Tables are created automatically on API startup via SQLAlchemy (`Base.metadata.create_all`).

## 7. Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://username:password@localhost:5432/vehicle_recommendation
GEMINI_API_KEY=
ALLOWED_ORIGINS=http://localhost:3000
DEBUG=true
```

Do **not** expose `GEMINI_API_KEY` to the frontend.

## 8. How to Run Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 9. How to Run Backend

From the `backend` directory (with venv activated):

```bash
uvicorn app.main:app --reload
```

API: [http://localhost:8000](http://localhost:8000)

## 10. API Documentation

- Health: `GET /api/health`
- Vehicles: `GET/POST /api/vehicles`, `GET/PUT/DELETE /api/vehicles/{id}`
- Recommendations (stub): `POST /api/recommendations`
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

## 11. Future AI / Recommendation Implementation

- Wire Gemini for natural-language preference extraction.
- Implement ranking with scikit-learn in `recommendation_service.py`.
- Expand filtering, auth, and migrations (e.g. Alembic) as needed.

---

Frontend and backend are independently runnable. See `frontend/README.md` and `backend/README.md` for package-specific notes.
