"""Pydantic schemas for Phase 4 Gemini AI endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.vehicle import RecommendationItem, RecommendationRequest, RecommendationResponse


class ExtractPreferencesRequest(BaseModel):
    """Natural-language preference extraction (and optional follow-up merge)."""

    message: str = Field(..., min_length=1, description="User natural-language request")
    previous_preferences: Optional[RecommendationRequest] = Field(
        default=None,
        description="Prior validated preferences for follow-up refinement",
    )


class ExtractPreferencesResponse(BaseModel):
    """Structured extraction result — never free-form vehicle data."""

    success: bool = True
    status: Literal["ready", "needs_clarification", "error"] = "error"
    message: str = ""
    preferences: Optional[RecommendationRequest] = None
    clarification_questions: List[str] = Field(default_factory=list)
    raw_extracted: Dict[str, Any] = Field(
        default_factory=dict,
        description="Fields Gemini claimed were present (post-parse, pre/post validation)",
    )


class VehicleExplanation(BaseModel):
    """Fact-grounded explanation for one ranked vehicle."""

    vehicle_id: int
    why_matches: str = ""
    advantages: List[str] = Field(default_factory=list)
    compromises: List[str] = Field(default_factory=list)


class ExplainRecommendationsRequest(BaseModel):
    """Explain already-ranked recommendations using only provided facts."""

    preferences: RecommendationRequest
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    alternatives: List[RecommendationItem] = Field(default_factory=list)


class ExplainRecommendationsResponse(BaseModel):
    success: bool = True
    status: Literal["ok", "error"] = "ok"
    message: str = ""
    explanations: List[VehicleExplanation] = Field(default_factory=list)
    comparison_summary: str = ""
    alternatives_summary: str = ""


class AiRecommendationItem(RecommendationItem):
    """Ranked vehicle plus optional Gemini explanation."""

    ai_explanation: Optional[VehicleExplanation] = None


class AiRecommendationRequest(BaseModel):
    """NL recommend, follow-up, or confirmed-preferences recommend."""

    message: Optional[str] = Field(
        default=None,
        description="Natural language request or follow-up refinement",
    )
    preferences: Optional[RecommendationRequest] = Field(
        default=None,
        description="Confirmed/edited preferences — skips extraction when set",
    )
    previous_preferences: Optional[RecommendationRequest] = Field(
        default=None,
        description="Context for follow-up when extracting from message",
    )
    generate_explanations: bool = True

    @model_validator(mode="after")
    def require_message_or_preferences(self) -> "AiRecommendationRequest":
        has_message = bool(self.message and self.message.strip())
        if not has_message and self.preferences is None:
            raise ValueError("Provide message and/or preferences")
        return self


class AiRecommendationResponse(BaseModel):
    """Extraction + Phase 3 recommendations + optional explanations."""

    success: bool = True
    status: Literal[
        "matches_found",
        "no_matches",
        "needs_clarification",
        "error",
    ] = "error"
    message: str = ""
    clarification_questions: List[str] = Field(default_factory=list)
    preferences: Optional[RecommendationRequest] = None
    recommendation: Optional[RecommendationResponse] = None
    recommendations: List[AiRecommendationItem] = Field(default_factory=list)
    alternatives: List[AiRecommendationItem] = Field(default_factory=list)
    comparison_summary: str = ""
    alternatives_summary: str = ""
