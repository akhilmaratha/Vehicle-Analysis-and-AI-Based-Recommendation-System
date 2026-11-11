"""Phase 6 security / integration checks (isolated SQLite; no production DB writes)."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-24-chars"
os.environ["ADMIN_COOKIE_SECURE"] = "false"
os.environ["AUTO_CREATE_TABLES"] = "false"
os.environ["REQUIRE_DB_ON_STARTUP"] = "false"
os.environ["DEBUG"] = "false"
os.environ["GEMINI_API_KEY"] = ""

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.vehicle import Vehicle  # noqa: E402
from app.schemas.vehicle import VehicleCreate  # noqa: E402


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    # Re-bind for this module — other test modules also override get_db on the
    # shared FastAPI app instance.
    app.dependency_overrides[get_db] = _override_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        db.add(
            Admin(
                name="Admin User",
                email="admin@example.com",
                hashed_password=hash_password("CorrectHorse123!"),
                role="admin",
                is_active=True,
            )
        )
        db.add(
            Admin(
                name="Inactive",
                email="inactive@example.com",
                hashed_password=hash_password("CorrectHorse123!"),
                role="admin",
                is_active=False,
            )
        )
        db.add(
            Vehicle(
                brand="Hyundai",
                model="Creta",
                variant="SX",
                price=1450000,
                fuel_type="Petrol",
                transmission="Automatic",
                vehicle_type="SUV",
                mileage=17.4,
                seating_capacity=5,
                safety_rating=5.0,
                image_url="https://example.com/creta.jpg",
            )
        )
        db.commit()
    finally:
        db.close()

    # Match admin tests: avoid lifespan binding to the module SQLite engine.
    yield TestClient(app)


def test_openapi_disabled_when_debug_false(client: TestClient):
    assert client.get("/openapi.json").status_code == 404
    assert client.get("/docs").status_code == 404


def test_unauthenticated_admin_routes_rejected(client: TestClient):
    assert client.get("/api/admin/dashboard/stats").status_code == 401
    assert client.get("/api/admin/vehicles").status_code == 401
    assert client.post(
        "/api/admin/vehicles",
        json={
            "brand": "X",
            "model": "Y",
            "price": 100000,
            "fuel_type": "Petrol",
            "transmission": "Manual",
            "vehicle_type": "Sedan",
        },
    ).status_code == 401


def test_invalid_bearer_token_rejected(client: TestClient):
    response = client.get(
        "/api/admin/auth/me",
        headers={"Authorization": "Bearer totally-invalid"},
    )
    assert response.status_code == 401
    assert "success" in response.json()


def test_inactive_admin_cannot_login(client: TestClient):
    response = client.post(
        "/api/admin/auth/login",
        json={"email": "inactive@example.com", "password": "CorrectHorse123!"},
    )
    assert response.status_code == 401


def test_admin_login_me_logout_flow(client: TestClient):
    login = client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "CorrectHorse123!"},
    )
    assert login.status_code == 200
    assert "vehicle_admin_token" in login.cookies

    me = client.get("/api/admin/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "admin@example.com"

    stats = client.get("/api/admin/dashboard/stats")
    assert stats.status_code == 200
    assert stats.json()["total_vehicles"] == 1

    logout = client.post("/api/admin/auth/logout")
    assert logout.status_code == 200

    # After logout cookie cleared, protected route should fail.
    client.cookies.clear()
    assert client.get("/api/admin/auth/me").status_code == 401


def test_vehicle_list_and_recommend(client: TestClient):
    listed = client.get("/api/vehicles?limit=10")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["items"][0]["slug"]

    ranked = client.post(
        "/api/recommendations",
        json={
            "budget": 2000000,
            "vehicle_type": "SUV",
            "fuel_type": "Petrol",
            "priorities": ["mileage", "safety"],
        },
    )
    assert ranked.status_code == 200
    data = ranked.json()
    assert data["status"] == "matches_found"
    assert data["recommendations_count"] == 1
    assert data["recommendations"][0]["rank"] == 1


def test_recommendation_empty_matches(client: TestClient):
    ranked = client.post(
        "/api/recommendations",
        json={"budget": 1000, "vehicle_type": "Coupe"},
    )
    assert ranked.status_code == 200
    data = ranked.json()
    assert data["status"] == "no_matches"
    assert data["recommendations"] == []
    assert data["alternatives"] == []


def test_image_url_rejects_unsafe_schemes():
    with pytest.raises(ValidationError):
        VehicleCreate(
            brand="A",
            model="B",
            price=100000,
            fuel_type="Petrol",
            transmission="Manual",
            vehicle_type="Sedan",
            image_url="javascript:alert(1)",
        )


def test_admin_rejects_unsafe_image_url(client: TestClient):
    login = client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "CorrectHorse123!"},
    )
    assert login.status_code == 200
    response = client.post(
        "/api/admin/vehicles",
        json={
            "brand": "Unsafe",
            "model": "Image",
            "price": 500000,
            "fuel_type": "Petrol",
            "transmission": "Manual",
            "vehicle_type": "Hatchback",
            "image_url": "data:text/html;base64,abc",
        },
    )
    assert response.status_code == 422


def test_oversized_content_length_rejected(client: TestClient):
    response = client.post(
        "/api/recommendations",
        headers={"Content-Length": str(2_000_000)},
        content=b"{}",
    )
    assert response.status_code == 413


def test_jwt_secret_validation_rejects_placeholder():
    settings = get_settings()
    original = settings.JWT_SECRET_KEY
    try:
        settings.JWT_SECRET_KEY = "change-this-in-your-local-env"
        with pytest.raises(RuntimeError):
            settings.validate_security_settings()
    finally:
        settings.JWT_SECRET_KEY = original
