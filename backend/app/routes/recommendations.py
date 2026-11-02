from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vehicle import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Filter vehicles by recommendation requirements",
    responses={
        200: {"description": "Matching vehicles (may be empty)"},
        422: {"description": "Validation error"},
        500: {"description": "Database error"},
    },
)
async def create_recommendations(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """Apply mandatory filters from the request and return matching vehicles.

    Preferences and priorities are accepted and echoed in metadata but are
    not used as hard filters in Phase 3.2.
    """
    return recommendation_service.get_recommendations(db, payload)
