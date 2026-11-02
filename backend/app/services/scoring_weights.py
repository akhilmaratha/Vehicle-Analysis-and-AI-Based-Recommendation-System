"""Single source of truth for recommendation scoring / ranking weights.

Phase 3.3 criterion weights and Phase 3.5 final-rank blend live here so
tuning stays in one place.

Weight resolution strategy (Phase 3.3)
--------------------------------------
Criteria (fixed order): price, mileage, safety, performance, comfort.

1. **No priorities** — use ``DEFAULT_WEIGHTS`` (balanced; each 0.20; sum = 1.0).
2. **One priority** — that criterion gets weight 1.0; all others get 0.0.
   If that criterion is later unavailable for a vehicle, ``effective_weights``
   falls back to equal shares among *available* criteria (documented in
   ``weighted_scoring``).
3. **Multiple priorities** — equal share among the selected priorities only
   (each ``1 / n``); unselected criteria get 0.0. Sum of base weights = 1.0.

Effective-weight renormalization (per vehicle) happens in weighted scoring:
unavailable criterion scores are dropped and remaining positive base weights
are renormalized to sum to 1.0 before ``final_score = Σ(score × weight)``.
"""

from __future__ import annotations

from typing import Dict, List, Mapping, Sequence

CRITERIA: tuple[str, ...] = (
    "price",
    "mileage",
    "safety",
    "performance",
    "comfort",
)

# Balanced defaults when the user supplies no priorities. Sum = 1.0.
DEFAULT_WEIGHTS: Dict[str, float] = {
    "price": 0.20,
    "mileage": 0.20,
    "safety": 0.20,
    "performance": 0.20,
    "comfort": 0.20,
}

# Phase 3.5 — final rank blend (single source of truth). Sum must be 1.0.
RANK_WEIGHT_WEIGHTED: float = 0.70
RANK_WEIGHT_SIMILARITY: float = 0.30
PRIMARY_TOP_N: int = 5
ALTERNATIVES_MAX: int = 5

if abs(RANK_WEIGHT_WEIGHTED + RANK_WEIGHT_SIMILARITY - 1.0) > 1e-9:
    raise ValueError(
        "RANK_WEIGHT_WEIGHTED + RANK_WEIGHT_SIMILARITY must equal 1.0"
    )


def resolve_base_weights(priorities: Sequence[str] | None) -> Dict[str, float]:
    """Map user priorities to base criterion weights that sum to 1.0.

    See module docstring for the one / many / none strategies.
    Unknown priority strings are ignored (schema normally validates first).
    """
    if not priorities:
        return dict(DEFAULT_WEIGHTS)

    selected: List[str] = []
    for raw in priorities:
        key = str(raw).strip().lower()
        if key in CRITERIA and key not in selected:
            selected.append(key)

    if not selected:
        return dict(DEFAULT_WEIGHTS)

    weights = {c: 0.0 for c in CRITERIA}
    share = 1.0 / len(selected)
    for key in selected:
        weights[key] = share
    return weights


def renormalize_weights(
    base_weights: Mapping[str, float],
    available: Sequence[str],
) -> Dict[str, float]:
    """Drop unavailable criteria and renormalize remaining weights to sum 1.0.

    Fallback when no positive base weight remains among available criteria:
    equal weight across available criteria. If nothing is available, all
    effective weights are 0.0 (caller should treat final_score as 0.0).
    """
    available_set = {c for c in available if c in CRITERIA}
    effective = {c: 0.0 for c in CRITERIA}

    positive = {
        c: float(base_weights.get(c, 0.0))
        for c in available_set
        if float(base_weights.get(c, 0.0)) > 0.0
    }

    if positive:
        total = sum(positive.values())
        if total > 0.0:
            for c, w in positive.items():
                effective[c] = w / total
        return effective

    if available_set:
        share = 1.0 / len(available_set)
        for c in available_set:
            effective[c] = share
    return effective
