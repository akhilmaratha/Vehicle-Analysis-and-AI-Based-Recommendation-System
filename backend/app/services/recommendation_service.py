from app.schemas.vehicle import RecommendationRequest, RecommendationResponse


def get_recommendations(payload: RecommendationRequest) -> RecommendationResponse:
    """
    Placeholder recommendation service.

    The scikit-learn ranking engine and Gemini-based preference extraction
    will be implemented in a later phase.
    """
    _ = payload  # Request validated; unused until ML is wired
    return RecommendationResponse(
        success=True,
        recommendations=[],
        message="Recommendation engine will be implemented later.",
    )
