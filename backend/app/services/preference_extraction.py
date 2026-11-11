"""Natural-language preference extraction via Gemini (Phase 4.2 / 4.6).

Gemini only produces structured preference JSON. Validation uses
``RecommendationRequest``. Gemini never queries the database.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from pydantic import ValidationError

from app.schemas.ai import ExtractPreferencesResponse
from app.schemas.vehicle import RecommendationRequest
from app.services.gemini_client import (
    GeminiClient,
    GeminiError,
    get_gemini_client,
)

logger = logging.getLogger(__name__)

_ALLOWED_KEYS = frozenset(
    {
        "budget_min",
        "budget_max",
        "vehicle_type",
        "fuel_type",
        "transmission",
        "seating_capacity",
        "priorities",
        "preferred_mileage",
        "preferred_safety_rating",
        # legacy aliases accepted by RecommendationRequest
        "budget",
        "minimum_mileage",
    }
)

_SYSTEM_INSTRUCTION = """You extract vehicle shopping preferences into JSON for a recommendation API.
You NEVER invent preferences the user did not state or clearly imply.
You NEVER query databases or invent vehicle recommendations.
Respond with a single JSON object only (no markdown).
"""

_EXTRACTION_PROMPT = """Convert the user request into structured vehicle preferences.

Allowed preference fields (omit a field entirely if not stated or clearly implied):
- budget_min (number, INR, > 0)
- budget_max (number, INR, > 0) — use for "under X", "below X", "max X"
- vehicle_type: one of Hatchback, Sedan, SUV, MUV, Coupe, Other
- fuel_type: one of Petrol, Diesel, CNG, Electric, Hybrid
- transmission: one of Manual, Automatic
- seating_capacity: integer minimum seats (> 0)
- priorities: list subset of [price, mileage, safety, performance, comfort]
- preferred_mileage: number km/l soft preference (>= 0)
- preferred_safety_rating: number 0–5 soft preference

Rules:
1. Convert Indian currency phrases: "15 lakh" / "₹15 lakh" / "15L" → 1500000; "1 crore" → 10000000.
2. Do not invent missing fields. If unsure, omit the field.
3. Soft language ("good mileage", "safer") may set priorities and/or preferred_* only when clearly implied.
4. If essential requirements are ambiguous (e.g. vague request with no budget and no vehicle type and no fuel), set needs_clarification true and ask short clarification_questions.
5. If previous_preferences are provided, treat the user message as a follow-up refinement. Return the FULL updated preferences object (merge previous with the delta). Examples: "cheaper" → lower budget_max; "automatic" → transmission Automatic; "safer" → add safety to priorities / raise preferred_safety_rating when appropriate.
6. Off-topic messages that do not refine vehicle preferences → needs_clarification with a question asking for vehicle preferences.

Return JSON shape:
{{
  "needs_clarification": boolean,
  "clarification_questions": ["..."],
  "preferences": {{ ... only stated/updated fields ... }}
}}

previous_preferences (JSON or null):
{previous_json}

user_message:
{message}
"""


def _preferences_to_dict(prefs: Optional[RecommendationRequest]) -> Optional[Dict[str, Any]]:
    if prefs is None:
        return None
    data = prefs.model_dump(exclude_none=True)
    # Always include priorities list for merge context
    data["priorities"] = list(prefs.priorities)
    return data


def _sanitize_extracted(raw: Any) -> Dict[str, Any]:
    """Keep only known preference keys; drop nulls/empty strings."""
    if not isinstance(raw, dict):
        return {}
    cleaned: Dict[str, Any] = {}
    for key, value in raw.items():
        if key not in _ALLOWED_KEYS:
            continue
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        cleaned[key] = value
    return cleaned


def _has_usable_signal(prefs: RecommendationRequest) -> bool:
    """True when at least one hard or soft preference is present."""
    if prefs.applied_mandatory_filters():
        return True
    meta = prefs.preference_metadata()
    if meta.get("priorities"):
        return True
    if meta.get("preferred_mileage") is not None:
        return True
    if meta.get("preferred_safety_rating") is not None:
        return True
    return False


def extract_preferences(
    message: str,
    *,
    previous_preferences: Optional[RecommendationRequest] = None,
    client: Optional[GeminiClient] = None,
) -> ExtractPreferencesResponse:
    """Extract/merge preferences via Gemini, then validate with RecommendationRequest."""
    text = (message or "").strip()
    if not text:
        return ExtractPreferencesResponse(
            success=False,
            status="error",
            message="Message is required",
            clarification_questions=["Please describe the vehicle you are looking for."],
        )

    gemini = client or get_gemini_client()
    previous_json = json.dumps(_preferences_to_dict(previous_preferences), ensure_ascii=True)
    prompt = _EXTRACTION_PROMPT.format(previous_json=previous_json, message=text)

    try:
        payload = gemini.generate_json(prompt, system_instruction=_SYSTEM_INSTRUCTION)
    except GeminiError as exc:
        logger.warning("Preference extraction Gemini error: %s", exc.code)
        return ExtractPreferencesResponse(
            success=False,
            status="error",
            message=exc.message,
            clarification_questions=[],
        )

    needs_clarification = bool(payload.get("needs_clarification"))
    questions_raw = payload.get("clarification_questions") or []
    questions: List[str] = [
        str(q).strip() for q in questions_raw if isinstance(q, (str, int, float)) and str(q).strip()
    ]
    raw_prefs = _sanitize_extracted(payload.get("preferences") or {})

    # Follow-up: if Gemini returned a partial delta, merge onto previous in code as safety net.
    if previous_preferences is not None and raw_prefs:
        merged = _preferences_to_dict(previous_preferences) or {}
        merged.update(raw_prefs)
        raw_prefs = _sanitize_extracted(merged)

    if needs_clarification and not raw_prefs:
        return ExtractPreferencesResponse(
            success=True,
            status="needs_clarification",
            message="More details are needed to build preferences",
            clarification_questions=questions
            or ["Could you share your budget and preferred vehicle type?"],
            raw_extracted={},
        )

    try:
        preferences = RecommendationRequest.model_validate(raw_prefs)
    except ValidationError as exc:
        errors = "; ".join(
            f"{'.'.join(str(p) for p in err.get('loc', ()))}: {err.get('msg')}"
            for err in exc.errors()
        )
        return ExtractPreferencesResponse(
            success=True,
            status="needs_clarification",
            message=f"Extracted preferences failed validation: {errors}",
            clarification_questions=questions
            or [
                "Some values looked invalid. Please clarify budget, fuel type, transmission, or vehicle type."
            ],
            raw_extracted=raw_prefs,
        )

    if not _has_usable_signal(preferences):
        return ExtractPreferencesResponse(
            success=True,
            status="needs_clarification",
            message="Could not identify usable vehicle preferences",
            preferences=preferences,
            clarification_questions=questions
            or ["Please specify at least a budget, vehicle type, fuel type, or priority."],
            raw_extracted=raw_prefs,
        )

    if needs_clarification:
        return ExtractPreferencesResponse(
            success=True,
            status="needs_clarification",
            message="Preferences need clarification before recommending",
            preferences=preferences,
            clarification_questions=questions
            or ["Please confirm or clarify your requirements."],
            raw_extracted=raw_prefs,
        )

    return ExtractPreferencesResponse(
        success=True,
        status="ready",
        message="Preferences extracted successfully",
        preferences=preferences,
        clarification_questions=[],
        raw_extracted=raw_prefs,
    )
