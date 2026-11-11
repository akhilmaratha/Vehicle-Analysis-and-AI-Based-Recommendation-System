"""Phase 4.4 — fact-grounded explanation generation."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.schemas.vehicle import (
    RecommendationItem,
    RecommendationRequest,
    ScoreBreakdown,
)
from app.services.explanation_service import explain_recommendations
from app.services.gemini_client import GeminiAuthError


def _item(vehicle_id: int = 1, **overrides) -> RecommendationItem:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    data = {
        "id": vehicle_id,
        "brand": "Hyundai",
        "model": "Creta",
        "variant": "SX",
        "price": 1450000.0,
        "fuel_type": "Diesel",
        "transmission": "Automatic",
        "vehicle_type": "SUV",
        "mileage": 17.4,
        "engine": "1.5L",
        "power": "115 PS",
        "torque": "144 Nm",
        "seating_capacity": 5,
        "boot_space": 433.0,
        "safety_rating": 5.0,
        "description": "demo",
        "image_url": None,
        "created_at": now,
        "updated_at": now,
        "rank": 1,
        "weighted_score": 0.9,
        "match_percentage": 90,
        "similarity_score": 0.8,
        "final_rank_score": 0.87,
        "score_breakdown": ScoreBreakdown(
            criterion_scores={"mileage": 0.9, "safety": 0.95},
            effective_weights={"mileage": 0.5, "safety": 0.5},
            base_weights={"mileage": 0.5, "safety": 0.5},
            final_score=0.9,
        ),
        "reason": "Strong mileage and safety fit",
    }
    data.update(overrides)
    return RecommendationItem.model_validate(data)


def test_explanations_grounded_on_provided_ids():
    client = MagicMock()
    client.generate_json.return_value = {
        "explanations": [
            {
                "vehicle_id": 1,
                "why_matches": "Diesel automatic SUV within budget with high safety.",
                "advantages": ["safety_rating 5.0", "match 90%"],
                "compromises": ["price near budget ceiling"],
            },
            {
                "vehicle_id": 999,
                "why_matches": "Invented vehicle should be dropped",
                "advantages": [],
                "compromises": [],
            },
        ],
        "comparison_summary": "Only one primary recommendation.",
        "alternatives_summary": "",
    }
    prefs = RecommendationRequest(budget_max=1500000, vehicle_type="SUV")
    result = explain_recommendations(prefs, [_item(1)], [], client=client)
    assert result.success is True
    assert result.status == "ok"
    assert len(result.explanations) == 1
    assert result.explanations[0].vehicle_id == 1
    assert "Diesel" in result.explanations[0].why_matches or result.explanations[0].why_matches
    assert result.comparison_summary


def test_empty_lists_skip_gemini():
    client = MagicMock()
    prefs = RecommendationRequest(budget_max=1000000)
    result = explain_recommendations(prefs, [], [], client=client)
    assert result.success is True
    client.generate_json.assert_not_called()


def test_gemini_failure_returns_error_status():
    client = MagicMock()
    client.generate_json.side_effect = GeminiAuthError()
    prefs = RecommendationRequest(budget_max=1500000)
    result = explain_recommendations(prefs, [_item()], [], client=client)
    assert result.success is False
    assert result.status == "error"


def test_prompt_receives_fact_payload_not_free_invention():
    client = MagicMock()
    client.generate_json.return_value = {
        "explanations": [],
        "comparison_summary": "",
        "alternatives_summary": "",
    }
    prefs = RecommendationRequest(budget_max=1500000, fuel_type="Diesel")
    explain_recommendations(prefs, [_item()], [], client=client)
    prompt = client.generate_json.call_args.args[0]
    assert "1450000" in prompt or "1450000.0" in prompt
    assert "Creta" in prompt
    assert "Diesel" in prompt
