"""
Phase 6.3 live API integration smoke (non-destructive).

Uses the running API. Creates one temporary admin vehicle and deletes it.
Does not wipe or reset the database.

Usage (backend venv, API running):
    python scripts/phase63_api_smoke.py
    python scripts/phase63_api_smoke.py --base-url http://127.0.0.1:8000

Credentials from backend/.env:
    INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

from dotenv import dotenv_values

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )

    def request(self, method: str, path: str, body=None, timeout: float = 60):
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(
            self.base_url + path, data=data, headers=headers, method=method
        )
        try:
            with self.opener.open(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                payload = json.loads(raw) if raw.strip() else None
                return resp.status, payload
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8")
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = {"raw": raw}
            return exc.code, payload


def expect(condition: bool, label: str, detail: str = "") -> None:
    if condition:
        print(f"PASS  {label}")
    else:
        print(f"FAIL  {label} {detail}".rstrip())
        raise SystemExit(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    env = dotenv_values(BACKEND_ROOT / ".env")
    email = (env.get("INITIAL_ADMIN_EMAIL") or "").strip()
    password = (env.get("INITIAL_ADMIN_PASSWORD") or "").strip()
    if not email or not password:
        print("FAIL  admin credentials missing in backend/.env")
        return 1

    api = ApiClient(args.base_url)
    created_id = None

    try:
        st, health = api.request("GET", "/api/health")
        expect(st == 200 and health.get("status") == "ok", "GET /api/health")
        expect(
            health.get("database", {}).get("status") == "ok",
            "health.database connected",
        )

        st, listed = api.request("GET", "/api/vehicles?limit=2&page=1")
        expect(st == 200 and listed.get("total", 0) >= 1, "GET /api/vehicles")
        slug = listed["items"][0]["slug"]
        vehicle_id = listed["items"][0]["id"]

        st, detail = api.request("GET", f"/api/vehicles/{urllib.parse.quote(slug)}")
        expect(st == 200 and detail.get("id") == vehicle_id, "GET vehicle by slug")

        st, missing = api.request("GET", "/api/vehicles/99999999")
        expect(st == 404, "GET missing vehicle → 404")

        st, filtered = api.request(
            "GET",
            "/api/vehicles?fuel_type=Petrol&transmission=Automatic"
            "&vehicle_type=SUV&min_price=100000&max_price=5000000"
            "&sort_by=price&sort_order=asc&limit=5",
        )
        expect(st == 200 and "items" in filtered, "GET vehicles filtered/sorted")

        st, unauth = api.request("GET", "/api/admin/dashboard/stats")
        expect(st == 401, "admin stats without auth → 401")

        st, bad_login = api.request(
            "POST",
            "/api/admin/auth/login",
            {"email": email, "password": "definitely-wrong-password"},
        )
        expect(st == 401, "admin invalid login → 401")

        st, login = api.request(
            "POST",
            "/api/admin/auth/login",
            {"email": email, "password": password},
        )
        expect(st == 200 and "admin" in (login or {}), "admin login")

        st, me = api.request("GET", "/api/admin/auth/me")
        expect(st == 200 and me.get("email") == email.lower(), "GET /api/admin/auth/me")

        st, stats = api.request("GET", "/api/admin/dashboard/stats")
        expect(st == 200 and "total_vehicles" in (stats or {}), "admin dashboard stats")

        st, rec = api.request(
            "POST",
            "/api/recommendations",
            {
                "budget": 1500000,
                "vehicle_type": "SUV",
                "fuel_type": "Petrol",
                "priorities": ["mileage", "safety"],
            },
        )
        expect(st == 200 and rec.get("status") in {"matches_found", "no_matches"}, "recommendations")
        if rec.get("status") == "matches_found":
            expect(
                isinstance(rec.get("recommendations"), list)
                and len(rec["recommendations"]) <= 5,
                "top recommendations ≤ 5",
            )
            first = rec["recommendations"][0]
            expect(
                "final_rank_score" in first and "weighted_score" in first,
                "ranking scores present",
            )

        st, empty = api.request(
            "POST",
            "/api/recommendations",
            {"budget": 1000, "vehicle_type": "Coupe", "fuel_type": "Electric"},
        )
        expect(
            st == 200
            and empty.get("status") == "no_matches"
            and empty.get("recommendations") == [],
            "recommendations no-match response",
        )

        st, extract = api.request(
            "POST",
            "/api/ai/extract-preferences",
            {"message": "automatic petrol SUV under 15 lakh with good mileage"},
            timeout=90,
        )
        expect(
            st == 200 and extract.get("status") in {"ready", "needs_clarification", "error"},
            "AI extract-preferences",
            detail=str(extract.get("status")),
        )

        # Temporary vehicle — always deleted below.
        payload = {
            "brand": "E2ETemp",
            "model": "Probe",
            "variant": "Phase63",
            "price": 999999,
            "fuel_type": "Petrol",
            "transmission": "Manual",
            "vehicle_type": "Hatchback",
            "mileage": 18.5,
            "seating_capacity": 5,
            "image_url": "https://example.com/e2e-temp.jpg",
            "description": "Temporary Phase 6.3 integration probe",
        }
        st, created = api.request("POST", "/api/admin/vehicles", payload)
        expect(st == 201 and created.get("id"), "admin create vehicle")
        created_id = created["id"]

        st, bad_image = api.request(
            "POST",
            "/api/admin/vehicles",
            {**payload, "variant": "BadImage", "image_url": "javascript:alert(1)"},
        )
        expect(st == 422, "reject unsafe image_url")

        st, updated = api.request(
            "PUT",
            f"/api/admin/vehicles/{created_id}",
            {"image_url": "https://example.com/e2e-temp-updated.jpg", "price": 1000001},
        )
        expect(
            st == 200
            and updated.get("image_url") == "https://example.com/e2e-temp-updated.jpg",
            "admin update image_url",
        )

        st, cleared = api.request(
            "PUT",
            f"/api/admin/vehicles/{created_id}",
            {"image_url": None},
        )
        expect(st == 200 and cleared.get("image_url") is None, "admin clear image_url")

        st, deleted = api.request("DELETE", f"/api/admin/vehicles/{created_id}")
        expect(st == 204, "admin delete temporary vehicle")
        created_id = None

        st, logout = api.request("POST", "/api/admin/auth/logout")
        expect(st == 200, "admin logout")

        st, after = api.request("GET", "/api/admin/auth/me")
        expect(st == 401, "session cleared after logout")

        print("---")
        print("All Phase 6.3 API smoke checks passed.")
        return 0
    finally:
        if created_id is not None:
            api.request("DELETE", f"/api/admin/vehicles/{created_id}")
            print(f"CLEANUP deleted temporary vehicle id={created_id}")


if __name__ == "__main__":
    raise SystemExit(main())
