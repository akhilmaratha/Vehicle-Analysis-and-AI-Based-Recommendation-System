"""Unit tests for Phase 3.3 weighted scoring and Phase 3.4 similarity.

Uses in-memory candidate dicts / mocked sessions — no PostgreSQL writes.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import pytest

from app.schemas.vehicle import RecommendationRequest
from app.services.recommendation_service import get_recommendations, prepare_candidate
from app.services.scoring_weights import (
    CRITERIA,
    DEFAULT_WEIGHTS,
    renormalize_weights,
    resolve_base_weights,
)
from app.services.similarity import (
    compute_similarity_scores,
    user_preference_feature_row,
)
from app.services.weighted_scoring import (
    compute_criterion_scores,
    parse_power_value,
    score_candidates,
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


class TestResolveBaseWeights:
    def test_defaults_when_no_priorities(self):
        weights = resolve_base_weights([])
        assert weights == DEFAULT_WEIGHTS
        assert abs(sum(weights.values()) - 1.0) < 1e-9
        for c in CRITERIA:
            assert weights[c] == pytest.approx(0.20)

    def test_none_priorities_use_defaults(self):
        assert resolve_base_weights(None) == DEFAULT_WEIGHTS

    def test_single_priority_gets_full_weight(self):
        weights = resolve_base_weights(["mileage"])
        assert weights["mileage"] == pytest.approx(1.0)
        assert sum(weights[c] for c in CRITERIA if c != "mileage") == pytest.approx(0.0)
        assert abs(sum(weights.values()) - 1.0) < 1e-9

    def test_multiple_priorities_equal_share(self):
        weights = resolve_base_weights(["price", "safety", "comfort"])
        assert weights["price"] == pytest.approx(1 / 3)
        assert weights["safety"] == pytest.approx(1 / 3)
        assert weights["comfort"] == pytest.approx(1 / 3)
        assert weights["mileage"] == 0.0
        assert weights["performance"] == 0.0
        assert abs(sum(weights.values()) - 1.0) < 1e-9


class TestRenormalizeWeights:
    def test_drops_unavailable_and_renormalizes(self):
        base = resolve_base_weights(["price", "mileage"])
        effective = renormalize_weights(base, ["price"])
        assert effective["price"] == pytest.approx(1.0)
        assert effective["mileage"] == 0.0

    def test_fallback_equal_when_selected_unavailable(self):
        # Single priority mileage=1.0, but mileage missing → equal among available.
        base = resolve_base_weights(["mileage"])
        effective = renormalize_weights(base, ["price", "safety"])
        assert effective["price"] == pytest.approx(0.5)
        assert effective["safety"] == pytest.approx(0.5)
        assert effective["mileage"] == 0.0

    def test_all_unavailable_zero_weights(self):
        base = resolve_base_weights(["price"])
        effective = renormalize_weights(base, [])
        assert all(v == 0.0 for v in effective.values())


class TestParsePowerValue:
    def test_ps_and_kw(self):
        assert parse_power_value("115 PS") == pytest.approx(115.0)
        assert parse_power_value("90 kW") == pytest.approx(90.0 * 1.35962)

    def test_engine_fallback(self):
        assert parse_power_value(None, "1.5L") == pytest.approx(1.5)
        assert parse_power_value(None, "1497 cc") == pytest.approx(1.497)

    def test_missing_returns_none_not_zero(self):
        assert parse_power_value(None, None) is None
        assert parse_power_value("n/a", "unknown") is None


class TestCriterionScoring:
    def test_lower_price_scores_higher(self):
        cands = [
            _candidate(id=1, price=800_000.0),
            _candidate(id=2, price=1_500_000.0),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["price"] == pytest.approx(1.0)
        assert scores[1]["price"] == pytest.approx(0.0)

    def test_higher_mileage_scores_higher(self):
        cands = [
            _candidate(id=1, mileage=12.0),
            _candidate(id=2, mileage=20.0),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["mileage"] == pytest.approx(0.0)
        assert scores[1]["mileage"] == pytest.approx(1.0)

    def test_higher_safety_scores_higher(self):
        cands = [
            _candidate(id=1, safety_rating=3.0),
            _candidate(id=2, safety_rating=5.0),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["safety"] == pytest.approx(0.0)
        assert scores[1]["safety"] == pytest.approx(1.0)

    def test_null_criterion_stays_none(self):
        cands = [
            _candidate(id=1, mileage=None, safety_rating=None, boot_space=None),
            _candidate(id=2, mileage=18.0, safety_rating=4.0, boot_space=400.0),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["mileage"] is None
        assert scores[0]["safety"] is None
        # Comfort uses seating (present) + boot (missing) → seating-only mean.
        assert scores[0]["comfort"] is not None
        assert scores[1]["mileage"] == pytest.approx(1.0)

    def test_identical_values_score_one(self):
        cands = [
            _candidate(id=1, price=1_000_000.0),
            _candidate(id=2, price=1_000_000.0),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["price"] == pytest.approx(1.0)
        assert scores[1]["price"] == pytest.approx(1.0)

    def test_all_null_mileage_excluded(self):
        cands = [
            _candidate(id=1, mileage=None),
            _candidate(id=2, mileage=None),
        ]
        scores = compute_criterion_scores(cands)
        assert scores[0]["mileage"] is None
        assert scores[1]["mileage"] is None


class TestWeightedScoring:
    def test_single_priority_uses_that_criterion(self):
        cands = [
            _candidate(id=1, price=800_000.0, mileage=10.0),
            _candidate(id=2, price=1_500_000.0, mileage=25.0),
        ]
        priced = score_candidates(cands, ["price"])
        assert priced[0]["weighted_score"] > priced[1]["weighted_score"]
        assert priced[0]["score_breakdown"]["effective_weights"]["price"] == pytest.approx(1.0)

        milage_scored = score_candidates(cands, ["mileage"])
        assert milage_scored[1]["weighted_score"] > milage_scored[0]["weighted_score"]

    def test_default_weights_when_no_priorities(self):
        scored = score_candidates([_candidate()], [])
        breakdown = scored[0]["score_breakdown"]
        assert breakdown["base_weights"] == DEFAULT_WEIGHTS
        assert abs(sum(breakdown["effective_weights"].values()) - 1.0) < 1e-9

    def test_missing_criterion_renormalizes(self):
        # Only mileage priority, but mileage null → fallback equal among available.
        cands = [_candidate(mileage=None, safety_rating=4.0)]
        scored = score_candidates(cands, ["mileage"])
        eff = scored[0]["score_breakdown"]["effective_weights"]
        assert eff["mileage"] == 0.0
        assert abs(sum(eff.values()) - 1.0) < 1e-9
        assert scored[0]["score_breakdown"]["criterion_scores"]["mileage"] is None

    def test_match_percentage_derived_from_weighted_score(self):
        scored = score_candidates(
            [_candidate(id=1), _candidate(id=2, price=900_000.0)],
            ["price"],
        )
        for row in scored:
            assert row["match_percentage"] == int(round(row["weighted_score"] * 100))
            assert 0 <= row["weighted_score"] <= 1
            assert 0 <= row["match_percentage"] <= 100

    def test_empty_candidates(self):
        assert score_candidates([], ["price"]) == []


class TestSimilarity:
    def test_scores_in_unit_interval(self):
        cands = [
            _candidate(id=1, price=1_000_000.0, mileage=18.0),
            _candidate(id=2, brand="Kia", model="Seltos", price=1_400_000.0, mileage=16.0),
        ]
        req = RecommendationRequest(
            budget_max=1_200_000,
            fuel_type="Petrol",
            transmission="Automatic",
            vehicle_type="SUV",
            preferred_mileage=18,
            preferred_safety_rating=5,
            seating_capacity=5,
        )
        sims = compute_similarity_scores(cands, req)
        assert len(sims) == 2
        for s in sims:
            assert 0.0 <= s <= 1.0

    def test_empty_candidates(self):
        assert compute_similarity_scores([], RecommendationRequest()) == []

    def test_incomplete_preferences(self):
        cands = [_candidate(), _candidate(id=2, brand="Tata", price=900_000.0)]
        req = RecommendationRequest()  # no filters / prefs
        sims = compute_similarity_scores(cands, req)
        assert len(sims) == 2
        assert all(0.0 <= s <= 1.0 for s in sims)

    def test_single_candidate_small_dataset(self):
        sims = compute_similarity_scores(
            [_candidate()],
            RecommendationRequest(budget_max=1_500_000, fuel_type="Petrol"),
        )
        assert len(sims) == 1
        assert 0.0 <= sims[0] <= 1.0

    def test_null_vehicle_attrs_do_not_crash(self):
        cands = [
            _candidate(
                mileage=None,
                boot_space=None,
                safety_rating=None,
                power=None,
                engine=None,
                seating_capacity=None,
            )
        ]
        sims = compute_similarity_scores(
            cands,
            RecommendationRequest(preferred_mileage=15),
        )
        assert len(sims) == 1
        assert 0.0 <= sims[0] <= 1.0

    def test_user_price_midpoint(self):
        row = user_preference_feature_row(
            RecommendationRequest(budget_min=800_000, budget_max=1_200_000)
        )
        assert row["price"] == pytest.approx(1_000_000.0)


class TestIntegrationScoringInService:
    def test_recommendations_include_scores_and_breakdown(self):
        vehicles = [
            _make_vehicle(id=1, price=Decimal("900000"), mileage=Decimal("18")),
            _make_vehicle(
                id=2,
                brand="Kia",
                model="Seltos",
                price=Decimal("1400000"),
                mileage=Decimal("15"),
            ),
        ]
        db = _mock_db(vehicles)
        req = RecommendationRequest(
            budget_max=2_000_000,
            priorities=["price", "mileage"],
            preferred_mileage=17,
            preferred_safety_rating=4,
        )
        result = get_recommendations(db, req)

        assert result.success is True
        assert result.status == "matches_found"
        assert result.total == 2
        assert result.total_eligible == 2
        assert result.recommendations_count == 2
        assert len(result.recommendations) == 2
        assert result.alternatives == []

        for item in result.recommendations:
            assert item.rank >= 1
            assert 0.0 <= item.weighted_score <= 1.0
            assert 0.0 <= item.similarity_score <= 1.0
            assert 0.0 <= item.final_rank_score <= 1.0
            assert item.reason
            assert item.match_percentage == int(round(item.weighted_score * 100))
            assert set(item.score_breakdown.criterion_scores) == set(CRITERIA)
            assert set(item.score_breakdown.effective_weights) == set(CRITERIA)
            assert abs(sum(item.score_breakdown.effective_weights.values()) - 1.0) < 1e-6
            assert item.score_breakdown.final_score == pytest.approx(item.weighted_score)

        # Cheaper / higher-mileage vehicle should rank higher on weighted score
        # under price+mileage priorities (relative within set).
        by_id = {i.id: i for i in result.recommendations}
        assert by_id[1].weighted_score >= by_id[2].weighted_score
        # Primary list is ordered by final_rank_score descending.
        ranks = [item.rank for item in result.recommendations]
        assert ranks == sorted(ranks)
        scores = [item.final_rank_score for item in result.recommendations]
        assert scores == sorted(scores, reverse=True)

    def test_empty_list_no_scoring_crash(self):
        db = _mock_db([])
        result = get_recommendations(db, RecommendationRequest(budget_max=100_000))
        assert result.status == "no_matches"
        assert result.recommendations == []

    def test_filters_still_applied_before_scoring(self):
        """Service still calls query.filter; scoring only sees mocked return set."""
        vehicles = [_make_vehicle(id=1, price=Decimal("900000"))]
        db = _mock_db(vehicles)
        req = RecommendationRequest(
            budget_max=1_000_000,
            fuel_type="Petrol",
            priorities=["safety"],
        )
        result = get_recommendations(db, req)
        assert result.total == 1
        assert result.applied_filters.budget_max == 1_000_000
        assert result.applied_filters.fuel_type == "Petrol"
        # filter was invoked (mandatory filters present)
        assert db.query.return_value.filter.called
        assert result.recommendations[0].weighted_score is not None
        assert result.recommendations[0].similarity_score is not None

    def test_null_fields_do_not_become_zero_scores_silently(self):
        vehicle = _make_vehicle(
            mileage=None,
            safety_rating=None,
            boot_space=None,
            power=None,
            engine=None,
        )
        db = _mock_db([vehicle])
        result = get_recommendations(
            db,
            RecommendationRequest(priorities=["mileage", "safety", "performance"]),
        )
        item = result.recommendations[0]
        cs = item.score_breakdown.criterion_scores
        assert cs["mileage"] is None
        assert cs["safety"] is None
        assert cs["performance"] is None
        # Effective weights should not put mass on missing criteria.
        assert item.score_breakdown.effective_weights["mileage"] == 0.0
        assert item.score_breakdown.effective_weights["safety"] == 0.0
        assert item.score_breakdown.effective_weights["performance"] == 0.0

    def test_prepare_candidate_still_null_safe(self):
        vehicle = _make_vehicle(mileage=None, safety_rating=None)
        cand = prepare_candidate(vehicle)
        assert cand["mileage"] is None
        assert cand["safety_rating"] is None
