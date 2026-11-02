"""Rule-based recommendation filtering (Phase 3.1 data prep + Phase 3.2 filters).

Hard filters run as a single SQLAlchemy AND query against PostgreSQL.
Preferences / priorities are returned in response metadata only — not used
as filters in this phase. No scoring, ranking, or ML.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Query, Session

from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    AppliedFilters,
    PreferenceMetadata,
    RecommendationRequest,
    RecommendationResponse,
    VehicleResponse,
)


def _to_float(value: Any) -> Optional[float]:
    """Convert Numeric/Decimal/int to float; preserve None (never coerce null→0)."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_categorical(value: Optional[str]) -> Optional[str]:
    """Null-safe categorical cleanup for matching / later phases (no DB mutation)."""
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def prepare_candidate(vehicle: Vehicle) -> Dict[str, Any]:
    """Build an internal clean candidate dict from an ORM Vehicle.

    Does not mutate the ORM instance. Null numerics stay None so later
    scoring cannot treat missing mileage/safety as zero.
    """
    return {
        "id": vehicle.id,
        "brand": _normalize_categorical(vehicle.brand),
        "model": _normalize_categorical(vehicle.model),
        "variant": _normalize_categorical(vehicle.variant),
        "price": _to_float(vehicle.price),
        "fuel_type": _normalize_categorical(vehicle.fuel_type),
        "transmission": _normalize_categorical(vehicle.transmission),
        "vehicle_type": _normalize_categorical(vehicle.vehicle_type),
        "mileage": _to_float(vehicle.mileage),
        "engine": _normalize_categorical(vehicle.engine),
        "power": _normalize_categorical(vehicle.power),
        "torque": _normalize_categorical(vehicle.torque),
        "seating_capacity": vehicle.seating_capacity,
        "boot_space": _to_float(vehicle.boot_space),
        "safety_rating": _to_float(vehicle.safety_rating),
        "description": vehicle.description,
        "image_url": _normalize_categorical(vehicle.image_url),
        "created_at": vehicle.created_at,
        "updated_at": vehicle.updated_at,
    }


def apply_mandatory_filters(
    query: Query,
    requirements: RecommendationRequest,
) -> Query:
    """Apply AND hard filters for fields that are set on the request.

    Preferences (priorities, preferred_mileage, preferred_safety_rating)
    are intentionally ignored here.
    """
    if requirements.budget_min is not None:
        query = query.filter(Vehicle.price >= requirements.budget_min)
    if requirements.budget_max is not None:
        query = query.filter(Vehicle.price <= requirements.budget_max)
    if requirements.vehicle_type is not None:
        # Case-consistent: schema already normalized to canonical casing.
        query = query.filter(Vehicle.vehicle_type == requirements.vehicle_type)
    if requirements.fuel_type is not None:
        query = query.filter(Vehicle.fuel_type == requirements.fuel_type)
    if requirements.transmission is not None:
        query = query.filter(Vehicle.transmission == requirements.transmission)
    if requirements.seating_capacity is not None:
        # Minimum seats: null seating_capacity rows do not satisfy >=.
        query = query.filter(
            Vehicle.seating_capacity >= requirements.seating_capacity
        )
    return query


def _rollback_and_raise(db: Session, exc: Exception) -> None:
    try:
        db.rollback()
    except Exception:
        pass
    raise exc


def _build_applied_filters(requirements: RecommendationRequest) -> AppliedFilters:
    summary = requirements.applied_mandatory_filters()
    return AppliedFilters(**summary)


def _build_preferences(requirements: RecommendationRequest) -> PreferenceMetadata:
    meta = requirements.preference_metadata()
    return PreferenceMetadata(**meta)


def get_recommendations(
    db: Session,
    requirements: RecommendationRequest,
) -> RecommendationResponse:
    """Query PostgreSQL for vehicles matching mandatory filters.

    Returns an empty recommendations list with status=no_matches when none
    match — that is success, not an error. DB failures propagate to the
    global SQLAlchemy handlers (no fake results).
    """
    applied = _build_applied_filters(requirements)
    preferences = _build_preferences(requirements)

    try:
        query = db.query(Vehicle)
        query = apply_mandatory_filters(query, requirements)
        # Stable order for deterministic API output; ranking comes later.
        vehicles: List[Vehicle] = (
            query.order_by(Vehicle.price.asc(), Vehicle.id.asc()).all()
        )
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)

    # Null-safe internal representation (does not mutate ORM / DB rows).
    candidates = [prepare_candidate(v) for v in vehicles]
    total = len(candidates)
    recommendations = [VehicleResponse.model_validate(c) for c in candidates]

    if total == 0:
        return RecommendationResponse(
            success=True,
            status="no_matches",
            message="No vehicles matched the provided requirements.",
            total=0,
            recommendations=[],
            applied_filters=applied,
            preferences=preferences,
        )

    return RecommendationResponse(
        success=True,
        status="matches_found",
        message=f"Found {total} vehicle(s) matching the provided requirements.",
        total=total,
        recommendations=recommendations,
        applied_filters=applied,
        preferences=preferences,
    )
