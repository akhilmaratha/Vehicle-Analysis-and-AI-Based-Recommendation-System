# Local Demonstration Guide (Phase 6.5)

This project is intended for **local college demonstration**.
Public deployment is not required.

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- Database: local PostgreSQL
- Vehicle images: direct HTTPS URLs (no Cloudinary)

---

## 1. One-time setup

### 1.1 PostgreSQL

1. Install and start PostgreSQL on Windows.
2. Create the database (once):

```sql
CREATE DATABASE vehicle_recommendation;
```

3. Confirm the service is running (Services app, or):

```powershell
Get-Service postgresql*
```

### 1.2 Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` (never commit this file):

| Variable | Local guidance |
|----------|----------------|
| `DATABASE_URL` | Your local Postgres URL |
| `GEMINI_API_KEY` | Your Gemini key (for NL extract / explanations) |
| `JWT_SECRET_KEY` | Long random string (24+ chars), not the example placeholder |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |
| `DEBUG` | `true` for local docs if useful; prefer `false` for cleaner errors |
| `REQUIRE_DB_ON_STARTUP` | `true` |
| `ADMIN_COOKIE_SECURE` | `false` for `http://localhost` |
| `INITIAL_ADMIN_*` | Used only by `scripts/seed_admin.py` |

Apply migrations:

```powershell
cd backend
.\venv\Scripts\activate
alembic upgrade head
```

Optional seed (idempotent — skips existing brand/model/variant):

```powershell
python scripts/seed_vehicles.py
```

Create the first admin (skips if email already exists):

```powershell
python scripts/seed_admin.py
```

Use values from `backend/.env`. **Do not put the password in git, screenshots, or slides.**

### 1.3 Frontend

```powershell
cd frontend
npm install
copy .env.local.example .env.local
```

`frontend/.env.local` must contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use **`localhost`**, not `127.0.0.1`, so admin cookies match the API host consistently.

---

## 2. Everyday startup

### Option A — helper script

From the project root:

```powershell
.\scripts\start-local.ps1
```

Stop servers later:

```powershell
.\scripts\stop-local.ps1
```

### Option B — manual (two terminals)

**Terminal 1 — PostgreSQL**  
Ensure the Postgres Windows service is Running.

**Terminal 2 — backend**

```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 3 — frontend**

```powershell
cd frontend
npm run dev -- --hostname localhost --port 3000
```

### Verify before the demo

```powershell
cd backend
.\venv\Scripts\activate
python scripts\phase65_demo_verify.py
```

Expected: frontend, backend health, DB revision, vehicles, ranking, Gemini (or graceful error), admin login — all PASS.

Quick manual checks:

- [http://localhost:8000/api/health](http://localhost:8000/api/health) → `"status":"ok"` and database connected  
- [http://localhost:3000](http://localhost:3000) → homepage loads  

---

## 3. Clean shutdown and restart

1. Stop frontend and backend windows (`Ctrl+C`), or run `.\scripts\stop-local.ps1`.
2. Leave PostgreSQL running unless you are shutting down the machine.
3. Restart with `.\scripts\start-local.ps1` (or the manual commands above).
4. Data persists in PostgreSQL — no reseed required unless you want new demo vehicles.

---

## 4. Admin access (demo)

1. Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Sign in with the email/password from your private `backend/.env` (`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`), assuming you ran `seed_admin.py`.
3. Log out when finished.

Never commit or print the password. If you forget it, update `INITIAL_ADMIN_PASSWORD` only after resetting that admin row carefully (prefer creating a new local admin email rather than sharing credentials).

---

## 5. Gemini behavior for demos

| Feature | Depends on Gemini? | If Gemini is down |
|---------|--------------------|-------------------|
| Structured recommendations | No | Works fully |
| Natural-language extraction | Yes | Shows a safe error; use **Use a form** |
| AI explanations | Yes | Rankings still appear; explanations may be empty |
| Ranking / scores | No (Python only) | Always controlled by the backend |

---

## 6. Image behavior

- Images are HTTPS URLs stored in `vehicles.image_url`.
- Missing or broken URLs show an in-app fallback — pages do not crash.
- External hosts can change or block images later; that is expected for URL-based storage.

---

## 7. College demonstration checklist

Run through in order (~8–12 minutes):

### Public site

1. **Homepage** — open `/`; show brand, featured vehicles, quick search.
2. **Quick search** — brand e.g. `Tata` → Explore Vehicles with results.
3. **Explore / filters** — Petrol, SUV, budget range; show sort and pagination.
4. **Vehicle details** — open a card; show specs, image or fallback, Add to compare.
5. **Compare** — add 2–3 vehicles; open `/compare`; highlight differences.
6. **AI recommendations (NL)** — `/recommendations` → Describe it → extract preferences → confirm/edit → Show recommendations.
7. **If Gemini fails** — switch to **Use a form**; submit budget/type/priorities; show top matches still work.
8. **Top-5 + alternatives** — point out ranked list, scores, and alternatives when more than five match.
9. **Explanations** — if Gemini is up, show why-it-matches text; if not, note graceful degrade.

### Admin

10. **Login** — `/admin/login` with local admin (do not show the password on screen if possible).
11. **Dashboard** — totals, fuel/type breakdown, recent vehicles.
12. **Vehicle list** — search/filter/pagination.
13. **Create** — add a temporary vehicle with an `https://…` image URL.
14. **Edit** — change price or image URL; save.
15. **Delete** — remove the temporary vehicle so the catalog stays clean.
16. **Logout** — confirm `/admin/vehicles` redirects to login.

### Closing points for examiners

- Recommendations are filtered and ranked in **Python**; Gemini only extracts language and explains results.
- Data lives in **PostgreSQL**; Alembic owns schema; seed scripts are optional and idempotent.
- System runs fully **locally** for demonstration.

---

## 8. Known limitations

- Gemini may be temporarily unavailable (quota / high demand); structured form remains the reliable demo path.
- Third-party vehicle image URLs can break over time.
- Local `DEBUG=true` may expose OpenAPI at `/docs`; turn off for a stricter demo if desired.
- Mixing `localhost` and `127.0.0.1` in the browser can break admin cookies — prefer `http://localhost:3000`.
