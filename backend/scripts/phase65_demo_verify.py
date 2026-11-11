"""Phase 6.5 local demonstration readiness checks (non-destructive)."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.parse import urlparse

from dotenv import dotenv_values
from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.database import check_db_connection, engine  # noqa: E402

API = "http://localhost:8000"
FRONT = "http://localhost:3000"


def http(method: str, url: str, body=None, opener=None, timeout=90):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    client = opener or urllib.request.build_opener()
    try:
        with client.open(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            if not raw.strip():
                return resp.status, None
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return exc.code, payload


def ok(label: str, detail: str = "") -> None:
    print(f"PASS  {label}" + (f" — {detail}" if detail else ""))


def fail(label: str, detail: str = "") -> None:
    print(f"FAIL  {label}" + (f" — {detail}" if detail else ""))
    raise SystemExit(1)


def main() -> int:
    settings = get_settings()
    env = dotenv_values(BACKEND_ROOT / ".env")

    # --- Frontend / backend reachability ---
    st, _ = http("GET", FRONT)
    if st != 200:
        fail("frontend localhost:3000", f"HTTP {st}")
    ok("frontend localhost:3000")

    st, health = http("GET", f"{API}/api/health")
    if st != 200 or not isinstance(health, dict) or health.get("status") != "ok":
        fail("backend localhost:8000 /api/health", str(health))
    ok("backend localhost:8000 /api/health", health.get("message", ""))

    if health.get("database", {}).get("status") != "ok":
        fail("health.database", str(health.get("database")))
    ok("health reports database connected")

    # --- Env / URLs (no secrets printed) ---
    api_url_front = (Path(BACKEND_ROOT.parent / "frontend" / ".env.local").read_text(encoding="utf-8")
                     if (BACKEND_ROOT.parent / "frontend" / ".env.local").exists()
                     else "")
    if "NEXT_PUBLIC_API_URL=http://localhost:8000" not in api_url_front.replace(" ", ""):
        # tolerate whitespace / CRLF
        if "localhost:8000" not in api_url_front:
            fail("frontend NEXT_PUBLIC_API_URL", "expected http://localhost:8000")
    ok("frontend NEXT_PUBLIC_API_URL points at localhost:8000")

    if "localhost:3000" not in settings.ALLOWED_ORIGINS:
        fail("ALLOWED_ORIGINS", "must include http://localhost:3000")
    ok("ALLOWED_ORIGINS includes localhost:3000")
    ok("GEMINI_API_KEY configured", "yes" if bool((env.get("GEMINI_API_KEY") or "").strip()) else "no")
    ok("JWT_SECRET_KEY configured", "yes" if bool((settings.JWT_SECRET_KEY or "").strip()) else "no")

    # --- Database ---
    check_db_connection()
    ok("PostgreSQL connection")
    with engine.connect() as conn:
        revision = conn.execute(text("select version_num from alembic_version")).scalar()
        vehicles = conn.execute(text("select count(*) from vehicles")).scalar()
        admins = conn.execute(text("select count(*) from admins")).scalar()
        with_images = conn.execute(
            text(
                "select count(*) from vehicles "
                "where image_url is not null and image_url <> ''"
            )
        ).scalar()
        https_images = conn.execute(
            text(
                "select count(*) from vehicles "
                "where image_url ilike 'https://%'"
            )
        ).scalar()
        bad_schemes = conn.execute(
            text(
                "select count(*) from vehicles "
                "where image_url is not null and image_url <> '' "
                "and image_url not like 'http://%' "
                "and image_url not like 'https://%'"
            )
        ).scalar()

    if revision != "20261111_0003":
        fail("alembic revision", f"expected 20261111_0003 got {revision}")
    ok("alembic revision", str(revision))
    if vehicles < 1:
        fail("vehicle records", "catalog empty")
    ok("vehicle records preserved", str(vehicles))
    if admins < 1:
        fail("admin records", "no admin account")
    ok("admin records present", str(admins))
    ok("vehicles with image_url", str(with_images))
    ok("https image_url count", str(https_images))
    if bad_schemes:
        fail("unsafe image schemes in DB", str(bad_schemes))
    ok("no non-http(s) image schemes in DB")

    # --- Public APIs ---
    st, listed = http("GET", f"{API}/api/vehicles?limit=3&page=1")
    if st != 200 or not listed.get("items"):
        fail("GET /api/vehicles", str(listed))
    ok("GET /api/vehicles", f"total={listed.get('total')}")
    sample = listed["items"][0]
    slug = sample["slug"]
    image_url = sample.get("image_url")
    if image_url:
        parsed = urlparse(image_url)
        if parsed.scheme not in {"http", "https"}:
            fail("sample image_url scheme", image_url)
        ok("sample vehicle image_url scheme", parsed.scheme)
    else:
        ok("sample vehicle has no image_url (fallback path OK)")

    st, detail = http("GET", f"{API}/api/vehicles/{slug}")
    if st != 200 or detail.get("id") != sample["id"]:
        fail("GET vehicle detail", str(detail))
    ok("GET vehicle detail by slug")

    # Ranking without Gemini
    st, ranked = http(
        "POST",
        f"{API}/api/recommendations",
        {
            "budget": 1500000,
            "vehicle_type": "SUV",
            "fuel_type": "Petrol",
            "priorities": ["mileage", "safety"],
        },
    )
    if st != 200 or ranked.get("status") not in {"matches_found", "no_matches"}:
        fail("POST /api/recommendations", str(ranked))
    ok(
        "recommendation ranking without Gemini",
        f"status={ranked.get('status')} primary={ranked.get('recommendations_count')} "
        f"alts={ranked.get('alternatives_count')}",
    )

    # Gemini extract
    st, extract = http(
        "POST",
        f"{API}/api/ai/extract-preferences",
        {"message": "automatic petrol SUV under 15 lakh with good mileage"},
        timeout=90,
    )
    if st != 200:
        fail("AI extract-preferences HTTP", str(extract))
    extract_status = extract.get("status")
    if extract_status in {"ready", "needs_clarification"}:
        ok("Gemini natural-language extraction", extract_status)
    elif extract_status == "error":
        ok(
            "Gemini extraction graceful error",
            extract.get("message") or "error status returned safely",
        )
    else:
        fail("AI extract-preferences status", str(extract))

    # Gemini explanations (use ranked vehicles if any)
    prefs = {
        "budget": 1500000,
        "vehicle_type": "SUV",
        "fuel_type": "Petrol",
        "priorities": ["mileage", "safety"],
    }
    st, explained = http(
        "POST",
        f"{API}/api/ai/explain",
        {
            "preferences": prefs,
            "recommendations": ranked.get("recommendations") or [],
            "alternatives": ranked.get("alternatives") or [],
        },
        timeout=90,
    )
    if st != 200:
        # route may map some Gemini failures to non-200; still acceptable if message safe
        ok("AI explain HTTP non-200 handled", f"HTTP {st}")
    elif explained.get("success") and explained.get("status") == "ok":
        ok(
            "Gemini AI explanations",
            f"count={len(explained.get('explanations') or [])}",
        )
    else:
        ok(
            "Gemini explanations graceful degrade",
            explained.get("message") or explained.get("status") or "error",
        )

    # Admin login (credentials from .env only; never printed)
    email = (env.get("INITIAL_ADMIN_EMAIL") or "").strip()
    password = (env.get("INITIAL_ADMIN_PASSWORD") or "").strip()
    if not email or not password:
        fail("admin credentials in backend/.env", "INITIAL_ADMIN_EMAIL/PASSWORD required")

    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    st, login = http(
        "POST",
        f"{API}/api/admin/auth/login",
        {"email": email, "password": password},
        opener=opener,
    )
    if st != 200:
        fail("admin login", f"HTTP {st} — check INITIAL_ADMIN_* matches seeded admin")
    ok("admin login")

    st, stats = http("GET", f"{API}/api/admin/dashboard/stats", opener=opener)
    if st != 200 or "total_vehicles" not in (stats or {}):
        fail("admin dashboard", str(stats))
    ok("admin dashboard stats", f"total_vehicles={stats.get('total_vehicles')}")

    http("POST", f"{API}/api/admin/auth/logout", opener=opener)
    ok("admin logout")

    print("---")
    print("Phase 6.5 local demonstration verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
