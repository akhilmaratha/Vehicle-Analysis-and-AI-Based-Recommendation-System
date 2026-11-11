"""Gemini explanations for already-ranked recommendations (Phase 4.4).

Explanations must be grounded only in provided vehicle records and scores.
Gemini never invents specifications, prices, or features.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Sequence

from app.schemas.ai import (
    ExplainRecommendationsResponse,
    VehicleExplanation,
)
from app.schemas.vehicle import RecommendationItem, RecommendationRequest
from app.services.gemini_client import (
    GeminiClient,
    GeminiError,
    get_gemini_client,
)

logger = logging.getLogger(__name__)

_SYSTEM_INSTRUCTION = """You explain vehicle recommendations using ONLY the facts provided.
Never invent prices, mileage, safety ratings, features, or scores.
If a fact is missing, say it is not available — do not guess.
Respond with a single JSON object only.
"""

_EXPLAIN_PROMPT = """Explain these already-ranked vehicle recommendations for the user.

User preferences (JSON):
{preferences_json}

Primary recommendations (JSON; ranked; includes calculated scores):
{recommendations_json}

Alternatives (JSON; may be empty):
{alternatives_json}

For each primary recommendation and each alternative, write:
- why_matches: 1–3 sentences citing only provided fields/scores
- advantages: short bullet strings grounded in provided data
- compromises: short bullet strings for trade-offs visible in the data (e.g. higher price, lower mileage). If none, use an empty list.

Also provide:
- comparison_summary: how the primary recommendations differ (facts only)
- alternatives_summary: brief note on alternatives (or empty string if none)

Return JSON:
{{
  "explanations": [
    {{
      "vehicle_id": <int>,
      "why_matches": "...",
      "advantages": ["..."],
      "compromises": ["..."]
    }}
  ],
  "comparison_summary": "...",
  "alternatives_summary": "..."
}}
"""


def _item_fact_dict(item: RecommendationItem) -> Dict[str, Any]:
    """Serialize only factual vehicle + score fields for the prompt."""
    return {
        "id": item.id,
        "brand": item.brand,
        "model": item.model,
        "variant": item.variant,
        "price": item.price,
        "fuel_type": item.fuel_type,
        "transmission": item.transmission,
        "vehicle_type": item.vehicle_type,
        "mileage": item.mileage,
        "engine": item.engine,
        "power": item.power,
        "torque": item.torque,
        "seating_capacity": item.seating_capacity,
        "boot_space": item.boot_space,
        "safety_rating": item.safety_rating,
        "rank": item.rank,
        "weighted_score": item.weighted_score,
        "match_percentage": item.match_percentage,
        "similarity_score": item.similarity_score,
        "final_rank_score": item.final_rank_score,
        "score_breakdown": item.score_breakdown.model_dump(),
        "reason": item.reason,
    }


def _parse_explanations(
    payload: Dict[str, Any],
    allowed_ids: set[int],
) -> List[VehicleExplanation]:
    raw_list = payload.get("explanations") or []
    results: List[VehicleExplanation] = []
    if not isinstance(raw_list, list):
        return results
    for entry in raw_list:
        if not isinstance(entry, dict):
            continue
        try:
            vehicle_id = int(entry.get("vehicle_id"))
        except (TypeError, ValueError):
            continue
        if vehicle_id not in allowed_ids:
            continue
        advantages = entry.get("advantages") or []
        compromises = entry.get("compromises") or []
        if not isinstance(advantages, list):
            advantages = []
        if not isinstance(compromises, list):
            compromises = []
        results.append(
            VehicleExplanation(
                vehicle_id=vehicle_id,
                why_matches=str(entry.get("why_matches") or "").strip(),
                advantages=[str(a).strip() for a in advantages if str(a).strip()],
                compromises=[str(c).strip() for c in compromises if str(c).strip()],
            )
        )
    return results


def explain_recommendations(
    preferences: RecommendationRequest,
    recommendations: Sequence[RecommendationItem],
    alternatives: Sequence[RecommendationItem] | None = None,
    *,
    client: Optional[GeminiClient] = None,
) -> ExplainRecommendationsResponse:
    """Generate fact-grounded explanations for ranked vehicles."""
    alts = list(alternatives or [])
    primaries = list(recommendations)

    if not primaries and not alts:
        return ExplainRecommendationsResponse(
            success=True,
            status="ok",
            message="No vehicles to explain",
            explanations=[],
            comparison_summary="",
            alternatives_summary="",
        )

    gemini = client or get_gemini_client()
    prefs_json = json.dumps(
        preferences.model_dump(exclude_none=True),
        ensure_ascii=True,
    )
    # Ensure priorities always present for context
    prefs_dump = preferences.model_dump(exclude_none=True)
    prefs_dump["priorities"] = list(preferences.priorities)
    prefs_json = json.dumps(prefs_dump, ensure_ascii=True)

    prompt = _EXPLAIN_PROMPT.format(
        preferences_json=prefs_json,
        recommendations_json=json.dumps(
            [_item_fact_dict(i) for i in primaries],
            ensure_ascii=True,
        ),
        alternatives_json=json.dumps(
            [_item_fact_dict(i) for i in alts],
            ensure_ascii=True,
        ),
    )

    try:
        payload = gemini.generate_json(prompt, system_instruction=_SYSTEM_INSTRUCTION)
    except GeminiError as exc:
        logger.warning("Explanation Gemini error: %s", exc.code)
        return ExplainRecommendationsResponse(
            success=False,
            status="error",
            message=exc.message,
        )

    allowed_ids = {item.id for item in primaries} | {item.id for item in alts}
    explanations = _parse_explanations(payload, allowed_ids)

    return ExplainRecommendationsResponse(
        success=True,
        status="ok",
        message="Explanations generated",
        explanations=explanations,
        comparison_summary=str(payload.get("comparison_summary") or "").strip(),
        alternatives_summary=str(payload.get("alternatives_summary") or "").strip(),
    )
