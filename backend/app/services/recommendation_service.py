"""Recommendation pipeline: filter → score → similarity → rank → top-5 / alternatives.

Phases
------
3.2 Mandatory SQL AND filters (preferences never hard-filter).
3.3 Weighted criterion scoring on the eligible set.
3.4 Cosine similarity to the user preference vector.
3.5 Final rank blend + primary top-5 selection.
3.6 Alternatives = next-ranked vehicles from the **same** eligible set
    when more than five match; empty when the eligible set has ≤ 5
    (cannot expand without relaxing mandatory filters).

No Gemini, no fake results, no Phase 4.
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
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    ScoreBreakdown,
)
from app.services.ranking import rank_and_select
from app.services.scoring_weights import PRIMARY_TOP_N
from app.services.similarity import compute_similarity_scores
from app.services.weighted_scoring import score_candidates


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
    are intentionally ignored here — they only affect Phase 3.3 / 3.4.
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


def _score_candidates(
    candidates: List[Dict[str, Any]],
    requirements: RecommendationRequest,
) -> List[Dict[str, Any]]:
    """Attach weighted + similarity scores (3.3 / 3.4) to eligible candidates."""
    weighted = score_candidates(candidates, requirements.priorities)
    similarities = compute_similarity_scores(candidates, requirements)

    scored: List[Dict[str, Any]] = []
    for candidate, w, sim in zip(candidates, weighted, similarities):
        scored.append(
            {
                **candidate,
                "weighted_score": w["weighted_score"],
                "match_percentage": w["match_percentage"],
                "similarity_score": sim,
                "score_breakdown": w["score_breakdown"],
            }
        )
    return scored


def _to_recommendation_item(payload: Dict[str, Any]) -> RecommendationItem:
    """Validate a ranked payload into a RecommendationItem."""
    breakdown = payload.get("score_breakdown")
    if isinstance(breakdown, dict):
        payload = {**payload, "score_breakdown": ScoreBreakdown(**breakdown)}
    return RecommendationItem.model_validate(payload)


def _build_message(
    *,
    total_eligible: int,
    recommendations_count: int,
    alternatives_count: int,
    fewer_than_five_eligible: bool,
    applied_filters: AppliedFilters | None = None,
) -> str:
    if total_eligible == 0:
        filter_bits: List[str] = []
        if applied_filters is not None:
            if applied_filters.budget_max is not None:
                filter_bits.append(f"budget ≤ {int(applied_filters.budget_max)}")
            if applied_filters.budget_min is not None:
                filter_bits.append(f"budget ≥ {int(applied_filters.budget_min)}")
            if applied_filters.vehicle_type:
                filter_bits.append(str(applied_filters.vehicle_type))
            if applied_filters.fuel_type:
                filter_bits.append(str(applied_filters.fuel_type))
            if applied_filters.transmission:
                filter_bits.append(str(applied_filters.transmission))
            if applied_filters.seating_capacity is not None:
                filter_bits.append(f"{applied_filters.seating_capacity}+ seats")
        if filter_bits:
            return (
                "No vehicles in the catalog satisfy all of these filters together: "
                + ", ".join(filter_bits)
                + ". Try clearing fuel, transmission, or raising the budget."
            )
        return "No vehicles matched the provided requirements."

    parts = [
        f"Found {total_eligible} eligible vehicle(s); "
        f"returning {recommendations_count} primary recommendation(s)."
    ]
    if fewer_than_five_eligible:
        parts.append(
            f"Only {total_eligible} vehicle(s) fit every hard filter, "
            "so there are no extra alternatives without relaxing filters."
        )
    elif alternatives_count > 0:
        parts.append(
            f"Also returning {alternatives_count} alternative(s) from the "
            "same eligible pool (next-ranked after the top 5)."
        )
    return " ".join(parts)


def get_recommendations(
    db: Session,
    requirements: RecommendationRequest,
) -> RecommendationResponse:
    """Filter, score, rank, and return primary top-5 plus same-pool alternatives.

    Empty eligible set → status=no_matches (success, not an error).
    DB failures propagate to the global SQLAlchemy handlers (no fake results).
    """
    applied = _build_applied_filters(requirements)
    preferences = _build_preferences(requirements)

    try:
        query = db.query(Vehicle)
        query = apply_mandatory_filters(query, requirements)
        # Stable fetch order; final presentation order comes from ranking.
        vehicles: List[Vehicle] = (
            query.order_by(Vehicle.price.asc(), Vehicle.id.asc()).all()
        )
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)

    candidates = [prepare_candidate(v) for v in vehicles]
    total_eligible = len(candidates)

    if total_eligible == 0:
        return RecommendationResponse(
            success=True,
            status="no_matches",
            message=_build_message(
                total_eligible=0,
                recommendations_count=0,
                alternatives_count=0,
                fewer_than_five_eligible=True,
                applied_filters=applied,
            ),
            total=0,
            total_eligible=0,
            recommendations_count=0,
            alternatives_count=0,
            fewer_than_five_eligible=True,
            recommendations=[],
            alternatives=[],
            applied_filters=applied,
            preferences=preferences,
        )

    scored = _score_candidates(candidates, requirements)
    selection = rank_and_select(scored, requirements)

    primary_items = [_to_recommendation_item(row) for row in selection["primary"]]
    alternative_items = [
        _to_recommendation_item(row) for row in selection["alternatives"]
    ]
    recommendations_count = len(primary_items)
    alternatives_count = len(alternative_items)
    fewer = bool(selection["fewer_than_five_eligible"])

    return RecommendationResponse(
        success=True,
        status="matches_found",
        message=_build_message(
            total_eligible=total_eligible,
            recommendations_count=recommendations_count,
            alternatives_count=alternatives_count,
            fewer_than_five_eligible=fewer,
            applied_filters=applied,
        ),
        total=total_eligible,
        total_eligible=total_eligible,
        recommendations_count=recommendations_count,
        alternatives_count=alternatives_count,
        fewer_than_five_eligible=fewer,
        recommendations=primary_items,
        alternatives=alternative_items,
        applied_filters=applied,
        preferences=preferences,
    )
