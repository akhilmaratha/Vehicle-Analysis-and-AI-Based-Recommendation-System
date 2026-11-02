"""Unit tests for Phase 3.2 rule-based recommendation filtering.

Uses mocked SQLAlchemy sessions — no PostgreSQL required.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any, List, Optional
from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList

from app.models.vehicle import Vehicle
from app.schemas.vehicle import RecommendationRequest
from app.services.recommendation_service import (
    apply_mandatory_filters,
    get_recommendations,
    prepare_candidate,
)


def _criterion_sql(criterion: Any) -> str:
    """Render a SQLAlchemy criterion to a comparable string."""
    return str(criterion.compile(compile_kwargs={"literal_binds": True}))


def _collect_filter_sql(requirements: RecommendationRequest) -> List[str]:
    """Apply filters to a stub query and return compiled criterion SQL fragments."""
    collected: List[str] = []

    class StubQuery:
        def filter(self, *criterion: Any) -> "StubQuery":
            for c in criterion:
                collected.append(_criterion_sql(c))
            return self

    apply_mandatory_filters(StubQuery(), requirements)
    return collected


def _make_vehicle(**overrides: Any) -> SimpleNamespace:
    """Lightweight stand-in for Vehicle ORM rows (no DB)."""
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    base = dict(
        id=1,
        brand=" Hyundai ",
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
    """Session whose query(...).filter(...).order_by(...).all() returns vehicles."""
    db = MagicMock()
    query = MagicMock()
    db.query.return_value = query
    query.filter.return_value = query
    query.order_by.return_value = query
    query.all.return_value = list(vehicles or [])
    return db


class TestApplyMandatoryFilters:
    def test_only_budget_max(self):
        sqls = _collect_filter_sql(RecommendationRequest(budget_max=1_500_000))
        assert len(sqls) == 1
        assert "price" in sqls[0].lower()
        assert "1500000" in sqls[0].replace(",", "")

    def test_budget_min_and_budget_max(self):
        sqls = _collect_filter_sql(
            RecommendationRequest(budget_min=800_000, budget_max=1_500_000)
        )
        assert len(sqls) == 2
        joined = " ".join(sqls).lower()
        assert "price" in joined
        assert "800000" in joined.replace(",", "")
        assert "1500000" in joined.replace(",", "")

    def test_vehicle_type(self):
        sqls = _collect_filter_sql(RecommendationRequest(vehicle_type="SUV"))
        assert len(sqls) == 1
        assert "vehicle_type" in sqls[0].lower()
        assert "SUV" in sqls[0]

    def test_fuel_type(self):
        sqls = _collect_filter_sql(RecommendationRequest(fuel_type="Diesel"))
        assert len(sqls) == 1
        assert "fuel_type" in sqls[0].lower()
        assert "Diesel" in sqls[0]

    def test_transmission(self):
        sqls = _collect_filter_sql(RecommendationRequest(transmission="Manual"))
        assert len(sqls) == 1
        assert "transmission" in sqls[0].lower()
        assert "Manual" in sqls[0]

    def test_seating_capacity_uses_minimum(self):
        sqls = _collect_filter_sql(RecommendationRequest(seating_capacity=5))
        assert len(sqls) == 1
        assert "seating_capacity" in sqls[0].lower()
        # Must be >= (minimum), not equality-only.
        assert ">=" in sqls[0] or "seating_capacity >=" in sqls[0].replace(" ", "")

    def test_multiple_filters_together(self):
        sqls = _collect_filter_sql(
            RecommendationRequest(
                budget_min=500_000,
                budget_max=2_000_000,
                vehicle_type="Sedan",
                fuel_type="Petrol",
                transmission="Automatic",
                seating_capacity=5,
            )
        )
        assert len(sqls) == 6

    def test_preferences_are_not_hard_filters(self):
        sqls = _collect_filter_sql(
            RecommendationRequest(
                budget_max=1_000_000,
                preferred_mileage=18,
                preferred_safety_rating=4,
                priorities=["mileage", "safety"],
            )
        )
        # Only budget_max is a hard filter.
        assert len(sqls) == 1
        joined = " ".join(sqls).lower()
        assert "mileage" not in joined
        assert "safety" not in joined

    def test_unset_filters_produce_no_criteria(self):
        sqls = _collect_filter_sql(RecommendationRequest())
        assert sqls == []


class TestPrepareCandidateNullSafety:
    def test_nullable_mileage_and_safety_preserved(self):
        vehicle = _make_vehicle(mileage=None, safety_rating=None, boot_space=None)
        candidate = prepare_candidate(vehicle)
        assert candidate["mileage"] is None
        assert candidate["safety_rating"] is None
        assert candidate["boot_space"] is None
        # Must not coerce null → 0 for scoring/filter misuse later.
        assert candidate["mileage"] != 0
        assert candidate["safety_rating"] != 0

    def test_numeric_decimal_conversion(self):
        vehicle = _make_vehicle()
        candidate = prepare_candidate(vehicle)
        assert candidate["price"] == 1_450_000.0
        assert candidate["mileage"] == 17.4
        assert candidate["safety_rating"] == 5.0

    def test_categorical_trim_and_null_safe(self):
        vehicle = _make_vehicle(brand=" Toyota ", variant=None, engine="  ")
        candidate = prepare_candidate(vehicle)
        assert candidate["brand"] == "Toyota"
        assert candidate["variant"] is None
        assert candidate["engine"] is None

    def test_does_not_mutate_source(self):
        vehicle = _make_vehicle(brand=" Honda ")
        original_brand = vehicle.brand
        prepare_candidate(vehicle)
        assert vehicle.brand == original_brand


class TestGetRecommendationsService:
    def test_matches_found_response(self):
        vehicles = [
            _make_vehicle(id=1, price=Decimal("900000")),
            _make_vehicle(id=2, brand="Kia", model="Seltos", price=Decimal("1400000")),
        ]
        db = _mock_db(vehicles)
        req = RecommendationRequest(budget_max=1_500_000, fuel_type="Petrol")
        result = get_recommendations(db, req)

        assert result.success is True
        assert result.status == "matches_found"
        assert result.total == 2
        assert len(result.recommendations) == 2
        assert result.applied_filters.budget_max == 1_500_000
        assert result.applied_filters.fuel_type == "Petrol"
        assert result.preferences.priorities == []
        assert "Found 2" in result.message
        db.query.assert_called_once_with(Vehicle)

    def test_no_matches_is_success(self):
        db = _mock_db([])
        req = RecommendationRequest(
            budget_max=100_000,
            vehicle_type="Coupe",
            fuel_type="Electric",
        )
        result = get_recommendations(db, req)

        assert result.success is True
        assert result.status == "no_matches"
        assert result.total == 0
        assert result.recommendations == []
        assert result.applied_filters.vehicle_type == "Coupe"
        assert "No vehicles matched" in result.message

    def test_missing_optional_preferences_echoed(self):
        db = _mock_db([_make_vehicle()])
        req = RecommendationRequest(budget_max=2_000_000)
        result = get_recommendations(db, req)
        assert result.preferences.preferred_mileage is None
        assert result.preferences.preferred_safety_rating is None
        assert result.preferences.priorities == []

    def test_preferences_stored_but_not_used_as_filters(self):
        db = _mock_db([_make_vehicle(mileage=None, safety_rating=None)])
        req = RecommendationRequest(
            budget_max=2_000_000,
            preferred_mileage=20,
            preferred_safety_rating=5,
            priorities=["mileage", "safety"],
        )
        result = get_recommendations(db, req)
        # Soft prefs echoed
        assert result.preferences.preferred_mileage == 20
        assert result.preferences.preferred_safety_rating == 5
        assert result.preferences.priorities == ["mileage", "safety"]
        # Null mileage/safety vehicle still returned (prefs are not hard filters)
        assert result.total == 1
        assert result.recommendations[0].mileage is None
        assert result.recommendations[0].safety_rating is None

    def test_db_failure_propagates_without_fake_results(self):
        db = MagicMock()
        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        query.order_by.return_value = query
        query.all.side_effect = SQLAlchemyError("connection refused")

        with pytest.raises(SQLAlchemyError):
            get_recommendations(db, RecommendationRequest(budget_max=1_000_000))
        db.rollback.assert_called()


class TestFilterCriterionTypes:
    """Sanity-check that filter builders produce SQLAlchemy expressions."""

    def test_criteria_are_sqlalchemy_expressions(self):
        class CapturingQuery:
            def __init__(self) -> None:
                self.parts: List[Any] = []

            def filter(self, *criterion: Any) -> "CapturingQuery":
                self.parts.extend(criterion)
                return self

        q = CapturingQuery()
        apply_mandatory_filters(
            q,
            RecommendationRequest(budget_max=1_000_000, seating_capacity=5),
        )
        assert len(q.parts) == 2
        for part in q.parts:
            assert isinstance(part, (BinaryExpression, BooleanClauseList))
