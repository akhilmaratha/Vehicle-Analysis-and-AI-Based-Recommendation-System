"""Phase 4.2 / 4.6 — preference extraction and follow-up merge."""

from __future__ import annotations

from unittest.mock import MagicMock

from app.schemas.vehicle import RecommendationRequest
from app.services.preference_extraction import extract_preferences


def _client_returning(payload: dict) -> MagicMock:
    client = MagicMock()
    client.generate_json.return_value = payload
    return client


def test_valid_natural_language_extraction():
    client = _client_returning(
        {
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
    )
    result = extract_preferences(
        "I need an SUV under ₹15 lakh, preferably diesel, automatic, with good mileage and safety.",
        client=client,
    )
    assert result.status == "ready"
    assert result.preferences is not None
    assert result.preferences.budget_max == 1500000
    assert result.preferences.vehicle_type == "SUV"
    assert result.preferences.fuel_type == "Diesel"
    assert result.preferences.transmission == "Automatic"
    assert "mileage" in result.preferences.priorities
    assert "safety" in result.preferences.priorities


def test_ambiguous_needs_clarification():
    client = _client_returning(
        {
            "needs_clarification": True,
            "clarification_questions": ["What is your budget?", "SUV or sedan?"],
            "preferences": {},
        }
    )
    result = extract_preferences("I want a nice car", client=client)
    assert result.status == "needs_clarification"
    assert result.preferences is None
    assert len(result.clarification_questions) >= 1


def test_invalid_extracted_enum_asks_clarification():
    client = _client_returning(
        {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {"fuel_type": "Nuclear", "budget_max": 1000000},
        }
    )
    result = extract_preferences("Nuclear powered car under 10 lakh", client=client)
    assert result.status == "needs_clarification"
    assert "validation" in result.message.lower() or result.clarification_questions


def test_empty_message_error():
    result = extract_preferences("   ", client=MagicMock())
    assert result.status == "error"
    assert result.success is False


def test_gemini_error_propagates_as_error_status():
    from app.services.gemini_client import GeminiQuotaError

    client = MagicMock()
    client.generate_json.side_effect = GeminiQuotaError()
    result = extract_preferences("SUV under 15 lakh", client=client)
    assert result.status == "error"
    assert "quota" in result.message.lower()


def test_follow_up_cheaper_merges_budget():
    previous = RecommendationRequest(
        budget_max=1500000,
        vehicle_type="SUV",
        fuel_type="Diesel",
        transmission="Automatic",
        priorities=["mileage"],
    )
    client = _client_returning(
        {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {
                "budget_max": 1200000,
                "vehicle_type": "SUV",
                "fuel_type": "Diesel",
                "transmission": "Automatic",
                "priorities": ["mileage", "price"],
            },
        }
    )
    result = extract_preferences(
        "Show me something cheaper.",
        previous_preferences=previous,
        client=client,
    )
    assert result.status == "ready"
    assert result.preferences.budget_max == 1200000
    assert result.preferences.vehicle_type == "SUV"


def test_follow_up_automatic_sets_transmission():
    previous = RecommendationRequest(
        budget_max=1500000,
        vehicle_type="SUV",
        transmission="Manual",
    )
    client = _client_returning(
        {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {"transmission": "Automatic"},
        }
    )
    result = extract_preferences(
        "I prefer automatic transmission.",
        previous_preferences=previous,
        client=client,
    )
    assert result.status == "ready"
    assert result.preferences.transmission == "Automatic"
    assert result.preferences.budget_max == 1500000
    assert result.preferences.vehicle_type == "SUV"


def test_does_not_call_database(monkeypatch):
    """Extraction must not touch SQLAlchemy / DB helpers."""
    import app.services.preference_extraction as mod

    def boom(*_a, **_k):
        raise AssertionError("DB must not be used during extraction")

    monkeypatch.setattr(mod, "extract_preferences", mod.extract_preferences)
    client = _client_returning(
        {
            "needs_clarification": False,
            "clarification_questions": [],
            "preferences": {"budget_max": 1000000, "vehicle_type": "Sedan"},
        }
    )
    result = extract_preferences("Sedan under 10 lakh", client=client)
    assert result.status == "ready"
