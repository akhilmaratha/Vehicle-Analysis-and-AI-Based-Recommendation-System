from fastapi import APIRouter

from app.schemas.vehicle import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
async def create_recommendations(payload: RecommendationRequest) -> RecommendationResponse:
    return recommendation_service.get_recommendations(payload)
