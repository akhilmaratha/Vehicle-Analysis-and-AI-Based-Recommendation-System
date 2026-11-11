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

Optional `--replace` deletes matching brand/model/variant rows then re-inserts.
**Avoid `--replace` against production data.**

## Phase 6.3 API smoke

With FastAPI running:

```bash
python scripts/phase63_api_smoke.py
```

Creates and deletes one temporary admin vehicle; does not wipe the database.

## Phase 6.4 / 6.5 readiness

```bash
python scripts/phase64_db_verify.py
python scripts/phase65_demo_verify.py
```

Local demo startup docs: `docs/LOCAL_DEMO.md`  
Helper scripts (from repo root): `scripts/start-local.ps1`, `scripts/stop-local.ps1`
