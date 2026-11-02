from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vehicle import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Recommend vehicles (filter, score, rank top-5 + alternatives)",
    responses={
        200: {
            "description": (
                "Primary top-5 plus optional same-pool alternatives "
                "(may be empty when no matches)"
            )
        },
        422: {"description": "Validation error"},
        500: {"description": "Database error"},
    },
)
async def create_recommendations(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """Filter → weighted score → similarity → final rank → top-5 / alternatives.

    Hard filters run first. Soft prefs influence scoring only. Alternatives
    are next-ranked vehicles from the same mandatory-filtered set when more
    than five are eligible; never produced by relaxing hard filters.
    """
    return recommendation_service.get_recommendations(db, payload)
