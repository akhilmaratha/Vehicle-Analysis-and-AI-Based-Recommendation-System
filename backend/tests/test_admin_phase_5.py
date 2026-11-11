from __future__ import annotations

import os
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session, sessionmaker

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["ADMIN_COOKIE_SECURE"] = "false"
os.environ["AUTO_CREATE_TABLES"] = "false"

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.vehicle import Vehicle  # noqa: E402


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


app.dependency_overrides[get_db] = _override_db


@pytest.fixture(autouse=True)
def reset_db():
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
        db.add_all(
            [
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
                ),
                Vehicle(
                    brand="Tata",
                    model="Nexon",
                    variant="XZ",
                    price=950000,
                    fuel_type="Diesel",
                    transmission="Manual",
                    vehicle_type="SUV",
                    mileage=21.0,
                    seating_capacity=5,
                    safety_rating=5.0,
                ),
            ]
        )
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _login(client: TestClient) -> None:
    response = client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "CorrectHorse123!"},
    )
    assert response.status_code == 200


def _vehicle_payload(**overrides):
    payload = {
        "brand": "Honda",
        "model": "City",
        "variant": "ZX",
        "price": 1550000,
        "fuel_type": "Petrol",
        "transmission": "Manual",
        "vehicle_type": "Sedan",
        "mileage": 18.0,
        "engine": "1.5L",
        "power": "121 PS",
        "torque": "145 Nm",
        "seating_capacity": 5,
        "boot_space": 506,
        "safety_rating": 4.5,
        "description": "Admin-created sedan",
        "image_url": None,
    }
    payload.update(overrides)
    return payload


def test_valid_admin_login_sets_cookie(client: TestClient):
    response = client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "CorrectHorse123!"},
    )
    assert response.status_code == 200
    assert response.json()["admin"]["email"] == "admin@example.com"
    assert "hashed_password" not in response.text
    assert get_settings().ADMIN_COOKIE_NAME in response.cookies


def test_invalid_credentials_rejected(client: TestClient):
    response = client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_expired_and_invalid_jwt_rejected(client: TestClient):
    expired = create_access_token("1", timedelta(seconds=-1))
    response = client.get(
        "/api/admin/auth/me", headers={"Authorization": f"Bearer {expired}"}
    )
    assert response.status_code == 401

    response = client.get(
        "/api/admin/auth/me", headers={"Authorization": "Bearer not-a-token"}
    )
    assert response.status_code == 401


def test_unauthorized_dashboard(client: TestClient):
    response = client.get("/api/admin/dashboard/stats")
    assert response.status_code == 401


def test_unauthorized_vehicle_mutations(client: TestClient):
    assert client.post("/api/admin/vehicles", json=_vehicle_payload()).status_code == 401
    assert client.put("/api/admin/vehicles/1", json={"price": 1}).status_code == 401
    assert client.delete("/api/admin/vehicles/1").status_code == 401


def test_dashboard_stats_match_database(client: TestClient):
    _login(client)
    response = client.get("/api/admin/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_vehicles"] == 2
    assert data["total_brands"] == 2
    assert data["price_stats"]["minimum"] == 950000
    assert data["price_stats"]["maximum"] == 1450000
    assert {item["name"]: item["count"] for item in data["counts_by_fuel_type"]} == {
        "Diesel": 1,
        "Petrol": 1,
    }


def test_admin_vehicle_crud(client: TestClient):
    _login(client)
    create_response = client.post("/api/admin/vehicles", json=_vehicle_payload())
    assert create_response.status_code == 201
    vehicle_id = create_response.json()["id"]

    list_response = client.get("/api/admin/vehicles", params={"search": "city"})
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    get_response = client.get(f"/api/admin/vehicles/{vehicle_id}")
    assert get_response.status_code == 200
    assert get_response.json()["model"] == "City"

    update_response = client.put(
        f"/api/admin/vehicles/{vehicle_id}", json={"price": 1600000}
    )
    assert update_response.status_code == 200
    assert update_response.json()["price"] == 1600000

    delete_response = client.delete(f"/api/admin/vehicles/{vehicle_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/api/admin/vehicles/{vehicle_id}").status_code == 404


def test_invalid_vehicle_input(client: TestClient):
    _login(client)
    response = client.post("/api/admin/vehicles", json=_vehicle_payload(price=-10))
    assert response.status_code == 422


def test_nonexistent_vehicle_id(client: TestClient):
    _login(client)
    response = client.get("/api/admin/vehicles/999")
    assert response.status_code == 404
    response = client.put("/api/admin/vehicles/999", json={"price": 1000000})
    assert response.status_code == 404


def test_public_browsing_and_recommendations_after_admin_change(client: TestClient):
    _login(client)
    created = client.post(
        "/api/admin/vehicles",
        json=_vehicle_payload(brand="Kia", model="Seltos", vehicle_type="SUV"),
    )
    assert created.status_code == 201

    public_list = client.get("/api/vehicles", params={"brand": "Kia"})
    assert public_list.status_code == 200
    assert public_list.json()["total"] == 1

    recommendations = client.post(
        "/api/recommendations",
        json={"budget_max": 1700000, "vehicle_type": "SUV"},
    )
    assert recommendations.status_code == 200
    models = [item["model"] for item in recommendations.json()["recommendations"]]
    assert "Seltos" in models
