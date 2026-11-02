"""Phase 3.5 / 3.6 — final ranking, top-N selection, and alternatives.

Pipeline position: runs after weighted scoring (3.3) and similarity (3.4)
on the mandatory-filtered eligible set ``E``.

Final rank
----------
``final_rank_score = weighted_score * RANK_WEIGHT_WEIGHTED
                   + similarity_score * RANK_WEIGHT_SIMILARITY``

Primary vs alternatives
-----------------------
- Primary: top ``PRIMARY_TOP_N`` (default 5) of ``E`` by ``final_rank_score``
  DESC, with deterministic tie-break (lower price, then lower id).
- Alternatives: next up to ``ALTERNATIVES_MAX`` vehicles from the **same**
  eligible set ``E`` (ranks 6..10). Mandatory filters are never relaxed.
- When ``|E| <= PRIMARY_TOP_N``, alternatives are empty — there are no
  additional mandatory-compliant vehicles left. Expanding further would
  require relaxing a hard filter (documented future enhancement).

Reasons are short and rule-based: top contributing criteria from the
score breakdown plus matched request filters. Nothing is fabricated.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, MutableMapping, Optional, Sequence, Tuple

from app.schemas.vehicle import RecommendationRequest
from app.services.scoring_weights import (
    ALTERNATIVES_MAX,
    CRITERIA,
    PRIMARY_TOP_N,
    RANK_WEIGHT_SIMILARITY,
    RANK_WEIGHT_WEIGHTED,
)

_CRITERION_LABELS: Dict[str, str] = {
    "price": "price",
    "mileage": "mileage",
    "safety": "safety",
    "performance": "performance",
    "comfort": "comfort",
}


def compute_final_rank_score(
    weighted_score: float,
    similarity_score: float,
    *,
    weight_weighted: float = RANK_WEIGHT_WEIGHTED,
    weight_similarity: float = RANK_WEIGHT_SIMILARITY,
) -> float:
    """Blend weighted and similarity scores into a single rank score in ``[0, 1]``."""
    score = (float(weighted_score) * weight_weighted) + (
        float(similarity_score) * weight_similarity
    )
    return max(0.0, min(1.0, score))


def ranking_sort_key(item: Mapping[str, Any]) -> Tuple[float, float, int]:
    """Sort key for DESC final_rank_score with deterministic tie-breaks.

    Returns a tuple suitable for ``sorted(..., key=ranking_sort_key)`` when
    used with negation on the first component, or for ``reverse`` patterns.
    Prefer :func:`sort_by_final_rank` instead of calling this directly.
    """
    final = float(item.get("final_rank_score", 0.0))
    price = item.get("price")
    price_key = float(price) if price is not None else float("inf")
    vehicle_id = int(item.get("id") or 0)
    # Negate final so ascending sort yields DESC rank score.
    return (-final, price_key, vehicle_id)


def sort_by_final_rank(
    items: Sequence[MutableMapping[str, Any]],
) -> List[MutableMapping[str, Any]]:
    """Return a new list sorted by final_rank_score DESC, then price, then id."""
    return sorted(items, key=ranking_sort_key)


def attach_final_rank_scores(
    items: Sequence[MutableMapping[str, Any]],
) -> List[MutableMapping[str, Any]]:
    """Set ``final_rank_score`` on each item from weighted + similarity scores."""
    enriched: List[MutableMapping[str, Any]] = []
    for item in items:
        row = dict(item)
        row["final_rank_score"] = compute_final_rank_score(
            float(row.get("weighted_score", 0.0)),
            float(row.get("similarity_score", 0.0)),
        )
        enriched.append(row)
    return enriched


def select_top(
    ranked: Sequence[Mapping[str, Any]],
    limit: int = PRIMARY_TOP_N,
) -> List[Mapping[str, Any]]:
    """Return the first ``limit`` items from an already-sorted ranked list."""
    if limit <= 0:
        return []
    return list(ranked[:limit])


def select_alternatives(
    ranked: Sequence[Mapping[str, Any]],
    *,
    primary_count: int = PRIMARY_TOP_N,
    limit: int = ALTERNATIVES_MAX,
) -> List[Mapping[str, Any]]:
    """Return next-ranked eligible vehicles after primary (same mandatory set).

    When ``len(ranked) <= primary_count``, returns ``[]`` — primary already
    covers the full eligible set, and mandatory filters are not relaxed.
    When more eligible vehicles exist, returns up to ``limit`` vehicles
    starting at index ``primary_count`` (typically ranks 6–10).
    """
    if limit <= 0 or primary_count < 0:
        return []
    if len(ranked) <= primary_count:
        return []
    return list(ranked[primary_count : primary_count + limit])


def _top_contributing_criteria(
    score_breakdown: Mapping[str, Any],
    *,
    top_n: int = 2,
) -> List[str]:
    """Criteria with the highest score × effective_weight contribution."""
    criterion_scores = score_breakdown.get("criterion_scores") or {}
    effective_weights = score_breakdown.get("effective_weights") or {}
    contributions: List[Tuple[str, float]] = []
    for name in CRITERIA:
        raw_score = criterion_scores.get(name)
        weight = float(effective_weights.get(name, 0.0) or 0.0)
        if raw_score is None or weight <= 0.0:
            continue
        contributions.append((name, float(raw_score) * weight))
    contributions.sort(key=lambda pair: (-pair[1], pair[0]))
    return [name for name, _ in contributions[:top_n]]


def _matched_filter_labels(
    candidate: Mapping[str, Any],
    requirements: RecommendationRequest,
) -> List[str]:
    """List request filters that this candidate satisfies (for the reason text)."""
    labels: List[str] = []
    if requirements.vehicle_type and candidate.get("vehicle_type") == requirements.vehicle_type:
        labels.append(requirements.vehicle_type)
    if requirements.fuel_type and candidate.get("fuel_type") == requirements.fuel_type:
        labels.append(requirements.fuel_type)
    if (
        requirements.transmission
        and candidate.get("transmission") == requirements.transmission
    ):
        labels.append(requirements.transmission)
    if requirements.seating_capacity is not None:
        seats = candidate.get("seating_capacity")
        if seats is not None and int(seats) >= int(requirements.seating_capacity):
            labels.append(f"{int(seats)} seats")
    if requirements.budget_min is not None or requirements.budget_max is not None:
        price = candidate.get("price")
        if price is not None:
            ok_min = (
                requirements.budget_min is None
                or float(price) >= float(requirements.budget_min)
            )
            ok_max = (
                requirements.budget_max is None
                or float(price) <= float(requirements.budget_max)
            )
            if ok_min and ok_max:
                labels.append("within budget")
    return labels


def build_reason(
    candidate: Mapping[str, Any],
    score_breakdown: Mapping[str, Any],
    requirements: RecommendationRequest,
) -> str:
    """Short rule-based reason from top criteria contributions and matched filters."""
    parts: List[str] = []
    top_criteria = _top_contributing_criteria(score_breakdown)
    if top_criteria:
        labels = [_CRITERION_LABELS.get(c, c) for c in top_criteria]
        if len(labels) == 1:
            parts.append(f"Strongest match on {labels[0]}")
        else:
            parts.append(f"Strongest match on {labels[0]} and {labels[1]}")

    matched = _matched_filter_labels(candidate, requirements)
    if matched:
        parts.append("meets " + " / ".join(matched))

    if not parts:
        return "Eligible under the applied mandatory filters."
    return "; ".join(parts) + "."


def assign_ranks_and_reasons(
    items: Sequence[Mapping[str, Any]],
    requirements: RecommendationRequest,
    *,
    start_rank: int = 1,
) -> List[Dict[str, Any]]:
    """Attach 1-based ``rank`` and rule-based ``reason`` to ordered items."""
    result: List[Dict[str, Any]] = []
    for offset, item in enumerate(items):
        row = dict(item)
        breakdown = row.get("score_breakdown") or {}
        if hasattr(breakdown, "model_dump"):
            breakdown = breakdown.model_dump()
        row["rank"] = start_rank + offset
        row["reason"] = build_reason(row, breakdown, requirements)
        result.append(row)
    return result


def rank_and_select(
    scored_items: Sequence[MutableMapping[str, Any]],
    requirements: RecommendationRequest,
    *,
    primary_limit: int = PRIMARY_TOP_N,
    alternatives_limit: int = ALTERNATIVES_MAX,
) -> Dict[str, Any]:
    """Compute final ranks, select primary top-N and same-pool alternatives.

    Returns a dict with ``primary``, ``alternatives``, ``total_eligible``,
    ``fewer_than_five_eligible``, and the fully sorted ``ranked`` list.
    """
    with_scores = attach_final_rank_scores(scored_items)
    ranked = sort_by_final_rank(with_scores)
    total_eligible = len(ranked)

    primary_raw = select_top(ranked, primary_limit)
    alternatives_raw = select_alternatives(
        ranked,
        primary_count=primary_limit,
        limit=alternatives_limit,
    )

    primary = assign_ranks_and_reasons(primary_raw, requirements, start_rank=1)
    alternatives = assign_ranks_and_reasons(
        alternatives_raw,
        requirements,
        start_rank=len(primary) + 1,
    )

    return {
        "ranked": ranked,
        "primary": primary,
        "alternatives": alternatives,
        "total_eligible": total_eligible,
        "fewer_than_five_eligible": total_eligible < primary_limit,
    }
