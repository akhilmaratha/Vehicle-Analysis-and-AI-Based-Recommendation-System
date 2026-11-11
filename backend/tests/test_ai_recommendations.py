"""Phase 4.3 / 4.7 — AI orchestrator integrates with Phase 3 pipeline."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any, List, Optional
from unittest.mock import MagicMock, patch

import pytest

httpx = pytest.importorskip("httpx")

from app.main import app
from app.core.database import get_db
from app.schemas.ai import AiRecommendationRequest
from app.schemas.vehicle import RecommendationRequest
from app.services.ai_recommendation_service import get_ai_recommendations
from app.services.gemini_client import GeminiConfigError


def _now() -> datetime:
    return datetime(2026, 1, 1, tzinfo=timezone.utc)


def _make_vehicle(**overrides: Any) -> SimpleNamespace:
    now = _now()
    base = dict(
        id=1,
        brand="Hyundai",
        model="Creta",
        variant="SX",
        price=Decimal("1450000.00"),
        fuel_type="Diesel",
        transmission="Automatic",
        vehicle_type="SUV",
        mileage=Decimal("17.40"),
        engine="1.5L",
        power="115 PS",
        torque="144 Nm",
        seating_capacity=5,
        boot_space=Decimal("433.00"),
        safety_rating=Decimal("5.0"),
        description="demo",
        image_url=None,
        created_at=now,
        updated_at=now,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _mock_db(vehicles: Optional[List[Any]] = None) -> MagicMock:
    db = MagicMock()
    query = MagicMock()
    db.query.return_value = query
    query.filter.return_value = query
    query.order_by.return_value = query
    query.all.return_value = list(vehicles or [])
    return db


def test_confirmed_preferences_call_pipeline_without_extraction():
    db = _mock_db([_make_vehicle()])
    client = MagicMock()
    # explain path
    client.generate_json.return_value = {
        "explanations": [
            {
                "vehicle_id": 1,
                "why_matches": "Matches diesel SUV budget.",
                "advantages": ["Automatic"],
                "compromises": [],
            }
        ],
        "comparison_summary": "Single match.",
        "alternatives_summary": "",
    }

    payload = AiRecommendationRequest(
        preferences=RecommendationRequest(
            budget_max=1500000,
            vehicle_type="SUV",
            fuel_type="Diesel",
            transmission="Automatic",
            priorities=["mileage", "safety"],
        ),
        generate_explanations=True,
    )
    result = get_ai_recommendations(db, payload, client=client)

    assert result.status == "matches_found"
    assert result.preferences is not None
    assert len(result.recommendations) >= 1
    # Extraction generate_json should not be required before pipeline;
    # only explanation call happens.
    assert client.generate_json.call_count == 1
    assert result.recommendations[0].ai_explanation is not None


def test_extraction_failure_skips_ranking():
    db = _mock_db([_make_vehicle()])
    client = MagicMock()
    client.generate_json.side_effect = GeminiConfigError()

    payload = AiRecommendationRequest(message="SUV under 15 lakh")
    result = get_ai_recommendations(db, payload, client=client)

    assert result.status == "error"
    assert result.recommendations == []
    db.query.assert_not_called()


def test_needs_clarification_skips_ranking():
    db = _mock_db([_make_vehicle()])
    client = MagicMock()
    client.generate_json.return_value = {
        "needs_clarification": True,
        "clarification_questions": ["What is your budget?"],
        "preferences": {},
    }
    payload = AiRecommendationRequest(message="something nice")
    result = get_ai_recommendations(db, payload, client=client)
    assert result.status == "needs_clarification"
    db.query.assert_not_called()


def test_nl_extract_then_recommend():
    db = _mock_db([_make_vehicle(id=1), _make_vehicle(id=2, brand="Kia", model="Seltos")])

    def fake_generate_json(prompt, system_instruction=None):
        if "Explain these already-ranked" in prompt or "already-ranked vehicle" in prompt:
            return {
                "explanations": [
                    {
                        "vehicle_id": 1,
                        "why_matches": "Fits filters",
                        "advantages": ["Diesel"],
                        "compromises": [],
                    }
                ],
                "comparison_summary": "Two candidates ranked.",
                "alternatives_summary": "",
            }
        return {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {
                "budget_max": 1500000,
                "vehicle_type": "SUV",
                "fuel_type": "Diesel",
                "transmission": "Automatic",
                "priorities": ["mileage", "safety"],
            },
        }

    client = MagicMock()
    client.generate_json.side_effect = fake_generate_json

    payload = AiRecommendationRequest(
        message="SUV under 15 lakh diesel automatic good mileage safety"
    )
    result = get_ai_recommendations(db, payload, client=client)
    assert result.status == "matches_found"
    assert result.preferences.budget_max == 1500000
    assert len(result.recommendations) >= 1


def test_structured_recommendations_endpoint_works_without_gemini():
    """Core Phase 3 engine must not depend on Gemini."""
    from fastapi.testclient import TestClient

    vehicles = [_make_vehicle()]

    def override_db():
        yield _mock_db(vehicles)

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/recommendations",
                json={
                    "budget": 1500000,
                    "vehicle_type": "SUV",
                    "fuel_type": "Diesel",
                    "transmission": "Automatic",
                    "priorities": ["mileage", "safety"],
                },
            )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "recommendations" in body
    finally:
        app.dependency_overrides.clear()


def test_ai_extract_endpoint_with_mocked_gemini():
    from fastapi.testclient import TestClient

    with patch(
        "app.services.preference_extraction.get_gemini_client"
    ) as get_client:
        mock = MagicMock()
        mock.generate_json.return_value = {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {
                "budget_max": 1500000,
                "vehicle_type": "SUV",
                "priorities": ["safety"],
            },
        }
        get_client.return_value = mock
        with TestClient(app) as client:
            response = client.post(
                "/api/ai/extract-preferences",
                json={"message": "SUV under 15 lakh with good safety"},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ready"
        assert body["preferences"]["vehicle_type"] == "SUV"
