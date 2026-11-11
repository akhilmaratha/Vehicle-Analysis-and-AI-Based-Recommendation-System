# Production Database Guide (Phase 6.4)

This project uses **PostgreSQL** with **Alembic** as the schema source of truth.
Vehicle images are stored as **direct HTTPS URLs** in `vehicles.image_url`.
Cloudinary is not part of this system.

## 1. Connection configuration

Set `DATABASE_URL` in `backend/.env` (never commit real credentials):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

Optional alternative when the URL has no `sslmode`:

```env
DATABASE_SSL_MODE=require
```

Related settings:

| Variable | Production guidance |
|----------|---------------------|
| `REQUIRE_DB_ON_STARTUP` | `true` — fail fast if Postgres is unreachable |
| `AUTO_CREATE_TABLES` | `false` — use Alembic only |
| `DEBUG` | `false` |
| `ALLOWED_ORIGINS` | Include the production frontend origin |
| `JWT_SECRET_KEY` | Strong random secret (24+ chars), not an example value |
| `ADMIN_COOKIE_SECURE` | `true` when serving HTTPS |

SQLAlchemy uses `pool_pre_ping`, a small QueuePool (`pool_size=5`, `max_overflow=10`),
and a 5-second connect timeout. There is **no in-memory database fallback**.

## 2. Migrations (Alembic)

From `backend/` with the venv active:

```bash
alembic current
alembic history
alembic upgrade head
```

Expected head revision after Phase 6: `20261111_0003` (filter indexes).

Rules:

- Prefer `alembic upgrade head` for every environment.
- Do **not** use `AUTO_CREATE_TABLES=true` in production.
- Do **not** drop or recreate an existing production database to “fix” migrations.
- Review downgrade scripts before using them; prefer forward fixes in production.

## 3. Seed data

Demo vehicles:

```bash
python scripts/seed_vehicles.py
```

- Idempotent: skips existing `brand + model + variant`
- Does **not** run on API startup
- Does **not** delete rows unless you pass `--replace` (avoid in production)
- Validates rows with `VehicleCreate` (including HTTPS `image_url`)
- Sample file is demonstration data — do not treat specs as verified facts

Initial admin (once):

```bash
python scripts/seed_admin.py
```

Skips creation if the email already exists.

## 4. Backup with `pg_dump`

Custom format (recommended for `pg_restore`):

```bash
pg_dump --format=custom --file=vehicle_recommendation_YYYYMMDD.dump \
  --dbname="$DATABASE_URL"
```

Plain SQL:

```bash
pg_dump --format=plain --file=vehicle_recommendation_YYYYMMDD.sql \
  --dbname="$DATABASE_URL"
```

Protect dump files (restricted filesystem permissions; encrypt at rest if stored off-host).
Never commit dumps or credentials to Git.

## 5. Restore (destructive — use a spare database)

Custom dump:

```bash
# Create an empty target DB first, then:
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DATABASE_URL" \
  vehicle_recommendation_YYYYMMDD.dump
```

Plain SQL:

```bash
psql --dbname="$TARGET_DATABASE_URL" -f vehicle_recommendation_YYYYMMDD.sql
```

**Do not restore over the live production database** without an explicit maintenance window
and a verified prior backup.

### Verify restored data

```sql
SELECT COUNT(*) FROM vehicles;
SELECT COUNT(*) FROM admins;
SELECT version_num FROM alembic_version;
```

Also hit `GET /api/health` and `GET /api/vehicles?limit=1` against an app pointed at the restored DB.

## 6. Scheduling backups

Use whatever scheduler the host supports (examples only — not configured by this repo):

- Linux cron / systemd timer calling `pg_dump`
- Managed Postgres automated backups (RDS, Cloud SQL, Neon, Supabase, etc.)
- Windows Task Scheduler calling `pg_dump`

Verify at least one restore drill on a **non-production** database before relying on backups.

## 7. Image URL limitation

External HTTPS image links can break or change over time. The UI shows a fallback when
an image fails to load. Prefer durable URLs you control for long-lived production catalogs.
