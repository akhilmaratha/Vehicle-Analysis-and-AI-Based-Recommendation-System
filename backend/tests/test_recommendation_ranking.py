"""Phase 3.5 / 3.6 / 3.7 — ranking, top-5, alternatives, and end-to-end tests.

Uses mocked DB sessions for unit/service tests. HTTP integration uses
FastAPI TestClient with dependency overrides (no live PostgreSQL).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import pytest

from app.schemas.vehicle import RecommendationRequest
from app.services.ranking import (
    attach_final_rank_scores,
    build_reason,
    compute_final_rank_score,
    rank_and_select,
    select_alternatives,
    select_top,
    sort_by_final_rank,
)
from app.services.recommendation_service import get_recommendations
from app.services.scoring_weights import (
    ALTERNATIVES_MAX,
    PRIMARY_TOP_N,
    RANK_WEIGHT_SIMILARITY,
    RANK_WEIGHT_WEIGHTED,
)


def _now() -> datetime:
    return datetime(2026, 1, 1, tzinfo=timezone.utc)


def _candidate(**overrides: Any) -> Dict[str, Any]:
    now = _now()
    base: Dict[str, Any] = {
        "id": 1,
        "brand": "Hyundai",
        "model": "Creta",
        "variant": "SX",
        "price": 1_450_000.0,
        "fuel_type": "Petrol",
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
        "weighted_score": 0.8,
        "match_percentage": 80,
        "similarity_score": 0.6,
        "score_breakdown": {
            "criterion_scores": {
                "price": 0.9,
                "mileage": 0.7,
                "safety": 0.8,
                "performance": 0.5,
                "comfort": 0.6,
            },
            "effective_weights": {
                "price": 0.2,
                "mileage": 0.2,
                "safety": 0.2,
                "performance": 0.2,
                "comfort": 0.2,
            },
            "base_weights": {
                "price": 0.2,
                "mileage": 0.2,
                "safety": 0.2,
                "performance": 0.2,
                "comfort": 0.2,
            },
            "final_score": 0.8,
        },
    }
    base.update(overrides)
    return base


def _make_vehicle(**overrides: Any) -> SimpleNamespace:
    now = _now()
    base = dict(
        id=1,
        brand="Hyundai",
        model="Creta",
        variant="SX",
        price=Decimal("1450000.00"),
        fuel_type="Petrol",
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


def _fleet(n: int, *, price_start: float = 800_000.0) -> List[SimpleNamespace]:
    """Build n distinct eligible-looking vehicles with increasing prices."""
    brands = ["Hyundai", "Kia", "Tata", "Toyota", "Honda", "MG", "Skoda", "VW"]
    models = ["A", "B", "C", "D", "E", "F", "G", "H"]
    vehicles: List[SimpleNamespace] = []
    for i in range(n):
        vehicles.append(
            _make_vehicle(
                id=i + 1,
                brand=brands[i % len(brands)],
                model=models[i % len(models)],
                price=Decimal(str(price_start + i * 50_000)),
                mileage=Decimal(str(20.0 - i * 0.5)),
                safety_rating=Decimal(str(max(3.0, 5.0 - i * 0.25))),
            )
        )
    return vehicles


# ---------------------------------------------------------------------------
# A — Final rank blend configuration
# ---------------------------------------------------------------------------


class TestFinalRankScore:
    def test_blend_weights_sum_to_one(self):
        assert abs(RANK_WEIGHT_WEIGHTED + RANK_WEIGHT_SIMILARITY - 1.0) < 1e-9
        assert RANK_WEIGHT_WEIGHTED == pytest.approx(0.70)
        assert RANK_WEIGHT_SIMILARITY == pytest.approx(0.30)

    def test_compute_final_rank_score_formula(self):
        score = compute_final_rank_score(1.0, 0.0)
        assert score == pytest.approx(0.70)
        score = compute_final_rank_score(0.0, 1.0)
        assert score == pytest.approx(0.30)
        score = compute_final_rank_score(0.5, 0.5)
        assert score == pytest.approx(0.5)

    def test_attach_final_rank_scores(self):
        items = [
            _candidate(id=1, weighted_score=1.0, similarity_score=0.0),
            _candidate(id=2, weighted_score=0.0, similarity_score=1.0),
        ]
        enriched = attach_final_rank_scores(items)
        assert enriched[0]["final_rank_score"] == pytest.approx(0.70)
        assert enriched[1]["final_rank_score"] == pytest.approx(0.30)


# ---------------------------------------------------------------------------
# B — Sorting, top-5, deterministic tie-break
# ---------------------------------------------------------------------------


class TestTopFiveSelection:
    def test_sort_desc_by_final_rank_score(self):
        items = attach_final_rank_scores(
            [
                _candidate(id=1, weighted_score=0.4, similarity_score=0.4, price=1_000_000),
                _candidate(id=2, weighted_score=0.9, similarity_score=0.9, price=1_200_000),
                _candidate(id=3, weighted_score=0.6, similarity_score=0.5, price=900_000),
            ]
        )
        ranked = sort_by_final_rank(items)
        assert [r["id"] for r in ranked] == [2, 3, 1]

    def test_tie_break_lower_price_then_id(self):
        # Identical weighted + similarity → identical final_rank_score.
        items = attach_final_rank_scores(
            [
                _candidate(id=3, weighted_score=0.5, similarity_score=0.5, price=1_000_000),
                _candidate(id=1, weighted_score=0.5, similarity_score=0.5, price=900_000),
                _candidate(id=2, weighted_score=0.5, similarity_score=0.5, price=900_000),
            ]
        )
        ranked = sort_by_final_rank(items)
        assert [r["id"] for r in ranked] == [1, 2, 3]

    def test_select_top_caps_at_five(self):
        ranked = [{"id": i, "final_rank_score": 1.0 - i * 0.01} for i in range(1, 9)]
        top = select_top(ranked, PRIMARY_TOP_N)
        assert len(top) == 5
        assert [t["id"] for t in top] == [1, 2, 3, 4, 5]

    def test_select_top_when_fewer_than_five(self):
        ranked = [{"id": 1}, {"id": 2}, {"id": 3}]
        assert len(select_top(ranked, PRIMARY_TOP_N)) == 3


# ---------------------------------------------------------------------------
# C — Alternatives from same eligible pool
# ---------------------------------------------------------------------------


class TestAlternativesSelection:
    def test_alternatives_empty_when_eligible_le_five(self):
        ranked = [{"id": i} for i in range(1, 5)]
        assert select_alternatives(ranked, primary_count=5, limit=5) == []

    def test_alternatives_are_next_ranked_when_eligible_gt_five(self):
        ranked = [{"id": i} for i in range(1, 12)]
        alts = select_alternatives(ranked, primary_count=5, limit=5)
        assert [a["id"] for a in alts] == [6, 7, 8, 9, 10]
        assert len(alts) == ALTERNATIVES_MAX

    def test_alternatives_exclude_primary_ids(self):
        ranked = [{"id": i} for i in range(1, 9)]
        primary = select_top(ranked, 5)
        alts = select_alternatives(ranked, primary_count=5, limit=5)
        primary_ids = {p["id"] for p in primary}
        assert primary_ids.isdisjoint({a["id"] for a in alts})

    def test_rank_and_select_integration_unit(self):
        items = [
            _candidate(
                id=i,
                weighted_score=1.0 - i * 0.05,
                similarity_score=0.5,
                price=800_000 + i * 10_000,
            )
            for i in range(1, 9)
        ]
        req = RecommendationRequest(budget_max=2_000_000, fuel_type="Petrol")
        result = rank_and_select(items, req)
        assert result["total_eligible"] == 8
        assert result["fewer_than_five_eligible"] is False
        assert len(result["primary"]) == 5
        assert len(result["alternatives"]) == 3
        assert result["primary"][0]["rank"] == 1
        assert result["alternatives"][0]["rank"] == 6


# ---------------------------------------------------------------------------
# D — Rule-based reasons (not fabricated)
# ---------------------------------------------------------------------------


class TestBuildReason:
    def test_reason_mentions_top_criteria(self):
        item = _candidate(
            score_breakdown={
                "criterion_scores": {
                    "price": 0.1,
                    "mileage": 1.0,
                    "safety": 0.9,
                    "performance": 0.1,
                    "comfort": 0.1,
                },
                "effective_weights": {
                    "price": 0.0,
                    "mileage": 0.5,
                    "safety": 0.5,
                    "performance": 0.0,
                    "comfort": 0.0,
                },
                "base_weights": {},
                "final_score": 0.95,
            }
        )
        req = RecommendationRequest(priorities=["mileage", "safety"])
        reason = build_reason(item, item["score_breakdown"], req)
        assert "mileage" in reason.lower()
        assert "safety" in reason.lower()

    def test_reason_mentions_matched_filters(self):
        item = _candidate()
        req = RecommendationRequest(
            budget_max=2_000_000,
            fuel_type="Petrol",
            transmission="Automatic",
            vehicle_type="SUV",
            seating_capacity=5,
        )
        reason = build_reason(item, item["score_breakdown"], req)
        assert "Petrol" in reason
        assert "Automatic" in reason
        assert "SUV" in reason
        assert "within budget" in reason


# ---------------------------------------------------------------------------
# E — Service: eligible > 5 → primary 5 + alternatives
# ---------------------------------------------------------------------------


class TestServiceTopFiveAndAlternatives:
    def test_more_than_five_eligible_returns_top_five_and_alts(self):
        db = _mock_db(_fleet(8))
        req = RecommendationRequest(
            budget_max=5_000_000,
            priorities=["price", "mileage"],
            preferred_mileage=18,
            preferred_safety_rating=4,
        )
        result = get_recommendations(db, req)

        assert result.success is True
        assert result.status == "matches_found"
        assert result.total_eligible == 8
        assert result.total == 8
        assert result.recommendations_count == 5
        assert len(result.recommendations) == 5
        assert result.alternatives_count == 3
        assert len(result.alternatives) == 3
        assert result.fewer_than_five_eligible is False

        primary_ids = {item.id for item in result.recommendations}
        alt_ids = {item.id for item in result.alternatives}
        assert primary_ids.isdisjoint(alt_ids)

        # Descending final_rank_score across primary.
        primary_scores = [i.final_rank_score for i in result.recommendations]
        assert primary_scores == sorted(primary_scores, reverse=True)
        # Alternatives continue after primary and are also DESC.
        assert result.recommendations[-1].final_rank_score >= result.alternatives[0].final_rank_score
        alt_scores = [i.final_rank_score for i in result.alternatives]
        assert alt_scores == sorted(alt_scores, reverse=True)

        for item in result.recommendations + result.alternatives:
            assert item.reason
            assert 0.0 <= item.final_rank_score <= 1.0
            expected = compute_final_rank_score(item.weighted_score, item.similarity_score)
            assert item.final_rank_score == pytest.approx(expected)

    def test_exactly_five_eligible_no_alternatives(self):
        db = _mock_db(_fleet(5))
        result = get_recommendations(db, RecommendationRequest(budget_max=5_000_000))
        assert result.total_eligible == 5
        assert result.recommendations_count == 5
        assert result.alternatives_count == 0
        assert result.alternatives == []
        assert result.fewer_than_five_eligible is False

    def test_fewer_than_five_eligible_flag_and_empty_alts(self):
        db = _mock_db(_fleet(3))
        result = get_recommendations(db, RecommendationRequest(budget_max=5_000_000))
        assert result.total_eligible == 3
        assert result.recommendations_count == 3
        assert result.alternatives == []
        assert result.fewer_than_five_eligible is True
        assert "Fewer than 5" in result.message


# ---------------------------------------------------------------------------
# F — Mandatory filters unchanged; soft prefs do not expand pool
# ---------------------------------------------------------------------------


class TestMandatoryFiltersPreserved:
    def test_service_still_applies_query_filters(self):
        db = _mock_db(_fleet(2))
        req = RecommendationRequest(
            budget_min=800_000,
            budget_max=2_000_000,
            vehicle_type="SUV",
            fuel_type="Petrol",
            transmission="Automatic",
            seating_capacity=5,
            preferred_mileage=25,
            preferred_safety_rating=5,
            priorities=["mileage"],
        )
        result = get_recommendations(db, req)
        assert db.query.return_value.filter.called
        assert result.applied_filters.budget_max == 2_000_000
        assert result.applied_filters.fuel_type == "Petrol"
        assert result.preferences.preferred_mileage == 25
        # Soft prefs do not remove the mocked eligible vehicles.
        assert result.total_eligible == 2

    def test_no_matches_keeps_empty_lists(self):
        db = _mock_db([])
        result = get_recommendations(
            db,
            RecommendationRequest(budget_max=50_000, vehicle_type="Coupe"),
        )
        assert result.status == "no_matches"
        assert result.recommendations == []
        assert result.alternatives == []
        assert result.recommendations_count == 0
        assert result.alternatives_count == 0
        assert result.fewer_than_five_eligible is True


# ---------------------------------------------------------------------------
# G — HTTP API integration (TestClient + dependency override)
# ---------------------------------------------------------------------------


class TestRecommendationsHttpApi:
    def test_post_recommendations_returns_ranked_payload(self):
        httpx = pytest.importorskip("httpx")
        from fastapi.testclient import TestClient

        from app.core.database import get_db
        from app.main import app

        vehicles = _fleet(7)
        db = _mock_db(vehicles)

        def _override_db():
            yield db

        app.dependency_overrides[get_db] = _override_db
        try:
            client = TestClient(app)
            response = client.post(
                "/api/recommendations",
                json={
                    "budget_max": 5_000_000,
                    "fuel_type": "Petrol",
                    "priorities": ["price", "mileage"],
                    "preferred_mileage": 18,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["status"] == "matches_found"
        assert body["total_eligible"] == 7
        assert body["recommendations_count"] == 5
        assert body["alternatives_count"] == 2
        assert len(body["recommendations"]) == 5
        assert len(body["alternatives"]) == 2
        assert body["fewer_than_five_eligible"] is False

        first = body["recommendations"][0]
        for key in (
            "rank",
            "weighted_score",
            "similarity_score",
            "final_rank_score",
            "score_breakdown",
            "reason",
            "brand",
            "model",
            "price",
        ):
            assert key in first
        assert first["rank"] == 1

    def test_post_validation_error_on_bad_budget(self):
        pytest.importorskip("httpx")
        from fastapi.testclient import TestClient

        from app.main import app

        client = TestClient(app)
        response = client.post(
            "/api/recommendations",
            json={"budget_min": 2_000_000, "budget_max": 1_000_000},
        )
        assert response.status_code == 422

    def test_post_no_matches_shape(self):
        pytest.importorskip("httpx")
        from fastapi.testclient import TestClient

        from app.core.database import get_db
        from app.main import app

        db = _mock_db([])

        def _override_db():
            yield db

        app.dependency_overrides[get_db] = _override_db
        try:
            client = TestClient(app)
            response = client.post(
                "/api/recommendations",
                json={"budget_max": 10_000, "vehicle_type": "Coupe"},
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "no_matches"
        assert body["recommendations"] == []
        assert body["alternatives"] == []
        assert body["total_eligible"] == 0
