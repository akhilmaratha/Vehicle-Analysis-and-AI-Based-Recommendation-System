"""Pydantic validation tests for RecommendationRequest (Phase 3.1)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.vehicle import RecommendationRequest


class TestBudgetValidation:
    def test_budget_max_only(self):
        req = RecommendationRequest(budget_max=1_500_000)
        assert req.budget_max == 1_500_000
        assert req.budget_min is None
        assert req.applied_mandatory_filters() == {"budget_max": 1_500_000}

    def test_budget_min_and_max(self):
        req = RecommendationRequest(budget_min=800_000, budget_max=1_500_000)
        assert req.budget_min == 800_000
        assert req.budget_max == 1_500_000
        assert req.applied_mandatory_filters() == {
            "budget_min": 800_000,
            "budget_max": 1_500_000,
        }

    def test_legacy_budget_maps_to_budget_max(self):
        req = RecommendationRequest.model_validate({"budget": 1_200_000})
        assert req.budget_max == 1_200_000
        assert req.budget_min is None

    def test_budget_max_prefers_explicit_over_legacy(self):
        req = RecommendationRequest.model_validate(
            {"budget": 999, "budget_max": 2_000_000}
        )
        assert req.budget_max == 2_000_000

    def test_invalid_budget_range(self):
        with pytest.raises(ValidationError) as exc_info:
            RecommendationRequest(budget_min=2_000_000, budget_max=1_000_000)
        errors = exc_info.value.errors()
        assert any(
            "budget_min must be less than or equal to budget_max" in str(e)
            for e in errors
        )

    def test_budget_must_be_positive(self):
        with pytest.raises(ValidationError):
            RecommendationRequest(budget_max=0)
        with pytest.raises(ValidationError):
            RecommendationRequest(budget_min=-100)


class TestCategoricalAndSeatingFilters:
    def test_vehicle_type(self):
        req = RecommendationRequest(vehicle_type="SUV")
        assert req.vehicle_type == "SUV"
        assert req.applied_mandatory_filters() == {"vehicle_type": "SUV"}

    def test_fuel_type_case_normalization(self):
        req = RecommendationRequest(fuel_type="petrol")
        assert req.fuel_type == "Petrol"

    def test_transmission(self):
        req = RecommendationRequest(transmission="Automatic")
        assert req.transmission == "Automatic"

    def test_seating_capacity_minimum(self):
        req = RecommendationRequest(seating_capacity=5)
        assert req.seating_capacity == 5
        assert req.applied_mandatory_filters() == {"seating_capacity": 5}

    def test_seating_must_be_positive(self):
        with pytest.raises(ValidationError):
            RecommendationRequest(seating_capacity=0)

    def test_invalid_fuel_type(self):
        with pytest.raises(ValidationError):
            RecommendationRequest(fuel_type="Hydrogen")

    def test_multiple_filters_together(self):
        req = RecommendationRequest(
            budget_min=500_000,
            budget_max=1_500_000,
            vehicle_type="suv",
            fuel_type="PETROL",
            transmission="automatic",
            seating_capacity=5,
        )
        assert req.applied_mandatory_filters() == {
            "budget_min": 500_000,
            "budget_max": 1_500_000,
            "vehicle_type": "SUV",
            "fuel_type": "Petrol",
            "transmission": "Automatic",
            "seating_capacity": 5,
        }


class TestPreferencesAndPriorities:
    def test_missing_optional_preferences(self):
        req = RecommendationRequest(budget_max=1_000_000)
        assert req.priorities == []
        assert req.preferred_mileage is None
        assert req.preferred_safety_rating is None
        meta = req.preference_metadata()
        assert meta == {
            "priorities": [],
            "preferred_mileage": None,
            "preferred_safety_rating": None,
        }
        # Preferences must not appear in mandatory filters.
        assert "preferred_mileage" not in req.applied_mandatory_filters()

    def test_legacy_minimum_mileage_maps_to_preferred(self):
        req = RecommendationRequest.model_validate(
            {"budget": 1_500_000, "minimum_mileage": 15}
        )
        assert req.budget_max == 1_500_000
        assert req.preferred_mileage == 15
        assert "preferred_mileage" not in req.applied_mandatory_filters()

    def test_valid_priorities(self):
        req = RecommendationRequest(priorities=["Price", "SAFETY", "mileage"])
        assert req.priorities == ["price", "safety", "mileage"]

    def test_invalid_priority(self):
        with pytest.raises(ValidationError) as exc_info:
            RecommendationRequest(priorities=["mileage", "color"])
        assert any("Invalid priority" in str(e) for e in exc_info.value.errors())

    def test_preferred_safety_rating_range(self):
        req = RecommendationRequest(preferred_safety_rating=4.5)
        assert req.preferred_safety_rating == 4.5
        with pytest.raises(ValidationError):
            RecommendationRequest(preferred_safety_rating=6)
        with pytest.raises(ValidationError):
            RecommendationRequest(preferred_safety_rating=-1)

    def test_preferred_mileage_non_negative(self):
        req = RecommendationRequest(preferred_mileage=0)
        assert req.preferred_mileage == 0
        with pytest.raises(ValidationError):
            RecommendationRequest(preferred_mileage=-1)

    def test_legacy_frontend_payload_shape(self):
        """Full old VehicleSearchForm / api.js payload still validates."""
        req = RecommendationRequest.model_validate(
            {
                "budget": 1_500_000,
                "fuel_type": "Petrol",
                "transmission": "Automatic",
                "vehicle_type": "SUV",
                "minimum_mileage": 15,
                "seating_capacity": 5,
                "priorities": ["mileage", "safety"],
            }
        )
        assert req.budget_max == 1_500_000
        assert req.preferred_mileage == 15
        assert req.fuel_type == "Petrol"
        assert req.seating_capacity == 5
        assert req.priorities == ["mileage", "safety"]
