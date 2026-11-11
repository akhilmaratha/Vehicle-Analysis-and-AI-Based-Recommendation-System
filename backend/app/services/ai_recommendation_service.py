"""Phase 4 orchestrator: extract → validate → existing pipeline → explain.

Gemini never changes ranking, scores, or mandatory filters.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.schemas.ai import (
    AiRecommendationItem,
    AiRecommendationRequest,
    AiRecommendationResponse,
    VehicleExplanation,
)
from app.schemas.vehicle import RecommendationItem, RecommendationRequest
from app.services import recommendation_service
from app.services.explanation_service import explain_recommendations
from app.services.gemini_client import GeminiClient, get_gemini_client
from app.services.preference_extraction import extract_preferences

logger = logging.getLogger(__name__)


def _attach_explanations(
    items: List[RecommendationItem],
    by_id: Dict[int, VehicleExplanation],
) -> List[AiRecommendationItem]:
    result: List[AiRecommendationItem] = []
    for item in items:
        data = item.model_dump()
        data["ai_explanation"] = by_id.get(item.id)
        result.append(AiRecommendationItem.model_validate(data))
    return result


def get_ai_recommendations(
    db: Session,
    payload: AiRecommendationRequest,
    *,
    client: Optional[GeminiClient] = None,
) -> AiRecommendationResponse:
    """Resolve preferences, run Phase 3 pipeline, optionally explain."""
    gemini = client or get_gemini_client()
    preferences: Optional[RecommendationRequest] = payload.preferences

    # 1. Resolve preferences (confirmed skips extraction)
    if preferences is None:
        message = (payload.message or "").strip()
        extraction = extract_preferences(
            message,
            previous_preferences=payload.previous_preferences,
            client=gemini,
        )
        if extraction.status == "error":
            return AiRecommendationResponse(
                success=False,
                status="error",
                message=extraction.message or "Preference extraction failed",
                clarification_questions=extraction.clarification_questions,
            )
        if extraction.status == "needs_clarification":
            return AiRecommendationResponse(
                success=True,
                status="needs_clarification",
                message=extraction.message,
                clarification_questions=extraction.clarification_questions,
                preferences=extraction.preferences,
            )
        preferences = extraction.preferences

    if preferences is None:
        return AiRecommendationResponse(
            success=False,
            status="error",
            message="No valid preferences available",
            clarification_questions=[
                "Please provide preferences or a clearer natural-language request."
            ],
        )

    # 2. Existing Phase 3 pipeline only (Gemini does not rank)
    recommendation = recommendation_service.get_recommendations(db, preferences)

    comparison_summary = ""
    alternatives_summary = ""
    by_id: Dict[int, VehicleExplanation] = {}

    # 3. Optional explanations grounded on ranked results
    if payload.generate_explanations and (
        recommendation.recommendations or recommendation.alternatives
    ):
        explained = explain_recommendations(
            preferences,
            recommendation.recommendations,
            recommendation.alternatives,
            client=gemini,
        )
        if explained.success:
            comparison_summary = explained.comparison_summary
            alternatives_summary = explained.alternatives_summary
            by_id = {e.vehicle_id: e for e in explained.explanations}
        else:
            # Rankings still returned; note explanation failure
            logger.warning("Explanations failed: %s", explained.message)

    primary = _attach_explanations(list(recommendation.recommendations), by_id)
    alts = _attach_explanations(list(recommendation.alternatives), by_id)

    return AiRecommendationResponse(
        success=True,
        status=recommendation.status,
        message=recommendation.message
        or (
            "Recommendations ready"
            if recommendation.status == "matches_found"
            else "No vehicles matched the mandatory filters"
        ),
        preferences=preferences,
        recommendation=recommendation,
        recommendations=primary,
        alternatives=alts,
        comparison_summary=comparison_summary,
        alternatives_summary=alternatives_summary,
    )
