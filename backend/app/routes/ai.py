"""Phase 4 Gemini AI routes — extraction, NL recommend, explanations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.ai import (
    AiRecommendationRequest,
    AiRecommendationResponse,
    ExplainRecommendationsRequest,
    ExplainRecommendationsResponse,
    ExtractPreferencesRequest,
    ExtractPreferencesResponse,
)
from app.services.ai_recommendation_service import get_ai_recommendations
from app.services.explanation_service import explain_recommendations
from app.services.gemini_client import GeminiConfigError, GeminiError
from app.services.preference_extraction import extract_preferences

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _http_for_gemini(exc: GeminiError) -> HTTPException:
    status = 503
    if isinstance(exc, GeminiConfigError):
        status = 503
    elif exc.code == "gemini_auth_error":
        status = 502
    elif exc.code == "gemini_quota_error":
        status = 429
    elif exc.code == "gemini_timeout":
        status = 504
    return HTTPException(status_code=status, detail=exc.message)


@router.post(
    "/extract-preferences",
    response_model=ExtractPreferencesResponse,
    summary="Extract structured preferences from natural language",
)
async def extract_preferences_endpoint(
    payload: ExtractPreferencesRequest,
) -> ExtractPreferencesResponse:
    """Gemini → JSON preferences → RecommendationRequest validation. No DB access."""
    return extract_preferences(
        payload.message,
        previous_preferences=payload.previous_preferences,
    )


@router.post(
    "/recommendations",
    response_model=AiRecommendationResponse,
    summary="NL / follow-up / confirmed prefs → Phase 3 pipeline → explanations",
)
async def ai_recommendations_endpoint(
    payload: AiRecommendationRequest,
    db: Session = Depends(get_db),
) -> AiRecommendationResponse:
    """Extract (unless preferences provided), then existing recommendation pipeline."""
    try:
        return get_ai_recommendations(db, payload)
    except GeminiError as exc:
        raise _http_for_gemini(exc) from exc


@router.post(
    "/explain",
    response_model=ExplainRecommendationsResponse,
    summary="Explain already-ranked recommendations (facts only)",
)
async def explain_endpoint(
    payload: ExplainRecommendationsRequest,
) -> ExplainRecommendationsResponse:
    """Gemini explains ranked vehicles using only provided records and scores."""
    try:
        return explain_recommendations(
            payload.preferences,
            payload.recommendations,
            payload.alternatives,
        )
    except GeminiError as exc:
        raise _http_for_gemini(exc) from exc
