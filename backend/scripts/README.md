# Backend scripts

## Seed sample vehicles (Phase 1.5)

Loads **demo / sample** Indian-market vehicle variants into PostgreSQL.

- Dataset: `backend/data/sample_vehicles.json` (30+ records)
- Specs and prices are approximate for development — **not verified facts**
- Idempotent uniqueness: `brand + model + variant` (case-insensitive)
- Does **not** delete existing rows
- Does **not** run on FastAPI startup

### Prerequisites

1. PostgreSQL reachable with a correct `DATABASE_URL` in `backend/.env`
2. Migrations applied:

```bash
cd backend
alembic upgrade head
```

### Run

```bash
cd backend
venv\Scripts\activate
python scripts/seed_vehicles.py
```

Re-running the script skips duplicates and only inserts new variants.
