"""Phase 3.3 — weighted criterion scoring for filtered recommendation candidates.

Pipeline position: runs only on vehicles that already passed Phase 3.2
mandatory filters. Does not re-filter or select a top-N subset.

Normalized criterion scores are relative to the *eligible* (filtered) set
and always lie in ``[0, 1]`` when a value is present.

Missing-value policy
--------------------
- ``None`` / unparseable fields are **not** treated as 0 or as best/worst.
- A missing criterion score is excluded from that vehicle's effective weights;
  remaining positive base weights are renormalized to sum to 1.0
  (see ``scoring_weights.renormalize_weights``).
- If every criterion is missing for a vehicle, ``final_score`` is 0.0 and
  all effective weights are 0.0.
- Min–max range with a single distinct value → score 1.0 for all non-null
  members (no division by zero).
- Units: price as stored; mileage as stored; safety 0–5 as stored;
  performance from parsed power (PS; kW converted) or engine displacement
  (liters) as a within-set relative proxy; comfort from seating + boot
  (each min–max'd, then mean of available components).

Final score
-----------
``final_score = Σ (criterion_score × effective_weight)`` with effective
weights summing to 1.0 (or all zero → final_score 0.0). Exposed as a
float in ``[0, 1]``; callers may derive ``match_percentage = round(score * 100)``.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Mapping, Optional, Sequence

from app.services.scoring_weights import (
    CRITERIA,
    renormalize_weights,
    resolve_base_weights,
)

# Power strings: "115 PS", "85 bhp", "90 kW", "118hp"
_POWER_RE = re.compile(
    r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>ps|bhp|hp|kw)?",
    re.IGNORECASE,
)
# Engine displacement: "1.5L", "1497 cc", "2.0 L"
_ENGINE_RE = re.compile(
    r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>l|litre|liter|cc|cu)?",
    re.IGNORECASE,
)

_KW_TO_PS = 1.35962


def parse_power_value(
    power: Optional[str] = None,
    engine: Optional[str] = None,
) -> Optional[float]:
    """Parse a comparable performance numeric from power and/or engine text.

    Prefers ``power`` (normalized to PS). If power is missing/unparseable,
    falls back to engine displacement in liters (cc → /1000). Returns
    ``None`` when neither field yields a usable number — never 0 by default.
    """
    if power:
        match = _POWER_RE.search(power.strip())
        if match:
            value = float(match.group("value"))
            unit = (match.group("unit") or "ps").lower()
            if unit == "kw":
                return value * _KW_TO_PS
            return value

    if engine:
        match = _ENGINE_RE.search(engine.strip())
        if match:
            value = float(match.group("value"))
            unit = (match.group("unit") or "").lower()
            if unit in ("cc", "cu"):
                return value / 1000.0
            # Bare number or liters — treat as liters when plausible (< 20),
            # otherwise as cc if large.
            if unit in ("l", "litre", "liter") or value < 20:
                return value
            return value / 1000.0

    return None


def _min_max_scores(
    values: Sequence[Optional[float]],
    *,
    higher_is_better: bool,
) -> List[Optional[float]]:
    """Min–max normalize optional values to ``[0, 1]``; ``None`` stays ``None``."""
    known = [v for v in values if v is not None]
    if not known:
        return [None] * len(values)

    lo = min(known)
    hi = max(known)
    scores: List[Optional[float]] = []
    for value in values:
        if value is None:
            scores.append(None)
        elif hi == lo:
            scores.append(1.0)
        elif higher_is_better:
            scores.append((value - lo) / (hi - lo))
        else:
            scores.append((hi - value) / (hi - lo))
    return scores


def _comfort_raw(candidate: Mapping[str, Any]) -> Dict[str, Optional[float]]:
    seating = candidate.get("seating_capacity")
    boot = candidate.get("boot_space")
    seating_f: Optional[float]
    if seating is None:
        seating_f = None
    else:
        try:
            seating_f = float(seating)
        except (TypeError, ValueError):
            seating_f = None
    boot_f: Optional[float]
    if boot is None:
        boot_f = None
    else:
        try:
            boot_f = float(boot)
        except (TypeError, ValueError):
            boot_f = None
    return {"seating": seating_f, "boot": boot_f}


def compute_criterion_scores(
    candidates: Sequence[Mapping[str, Any]],
) -> List[Dict[str, Optional[float]]]:
    """Compute per-vehicle criterion scores in ``[0, 1]`` (or ``None``).

    Normalization is relative to the provided eligible candidate set only.
    """
    n = len(candidates)
    if n == 0:
        return []

    prices: List[Optional[float]] = []
    mileages: List[Optional[float]] = []
    safeties: List[Optional[float]] = []
    performances: List[Optional[float]] = []
    seating_vals: List[Optional[float]] = []
    boot_vals: List[Optional[float]] = []

    for cand in candidates:
        prices.append(cand.get("price"))
        mileages.append(cand.get("mileage"))
        safeties.append(cand.get("safety_rating"))
        performances.append(
            parse_power_value(cand.get("power"), cand.get("engine"))
        )
        parts = _comfort_raw(cand)
        seating_vals.append(parts["seating"])
        boot_vals.append(parts["boot"])

    price_scores = _min_max_scores(prices, higher_is_better=False)
    mileage_scores = _min_max_scores(mileages, higher_is_better=True)
    safety_scores = _min_max_scores(safeties, higher_is_better=True)
    performance_scores = _min_max_scores(performances, higher_is_better=True)
    seating_scores = _min_max_scores(seating_vals, higher_is_better=True)
    boot_scores = _min_max_scores(boot_vals, higher_is_better=True)

    results: List[Dict[str, Optional[float]]] = []
    for i in range(n):
        comfort_parts = [
            s for s in (seating_scores[i], boot_scores[i]) if s is not None
        ]
        comfort: Optional[float]
        if comfort_parts:
            comfort = sum(comfort_parts) / len(comfort_parts)
        else:
            comfort = None

        results.append(
            {
                "price": price_scores[i],
                "mileage": mileage_scores[i],
                "safety": safety_scores[i],
                "performance": performance_scores[i],
                "comfort": comfort,
            }
        )
    return results


def score_candidates(
    candidates: Sequence[Mapping[str, Any]],
    priorities: Sequence[str] | None = None,
) -> List[Dict[str, Any]]:
    """Attach weighted scores and breakdowns to each eligible candidate.

    Returns a list aligned with ``candidates``. Each item::

        {
          "weighted_score": float,          # 0–1
          "match_percentage": int,          # round(weighted_score * 100)
          "score_breakdown": {
            "criterion_scores": {...},      # Optional[float] per criterion
            "effective_weights": {...},     # floats summing to 0 or 1
            "final_score": float,
          },
        }
    """
    if not candidates:
        return []

    base_weights = resolve_base_weights(priorities)
    criterion_rows = compute_criterion_scores(candidates)
    scored: List[Dict[str, Any]] = []

    for scores in criterion_rows:
        available = [c for c in CRITERIA if scores.get(c) is not None]
        effective = renormalize_weights(base_weights, available)

        final = 0.0
        for criterion in CRITERIA:
            score = scores.get(criterion)
            weight = effective[criterion]
            if score is not None and weight > 0.0:
                final += float(score) * weight

        # Clamp numeric noise into [0, 1].
        final = max(0.0, min(1.0, final))

        scored.append(
            {
                "weighted_score": final,
                "match_percentage": int(round(final * 100)),
                "score_breakdown": {
                    "criterion_scores": {c: scores.get(c) for c in CRITERIA},
                    "effective_weights": dict(effective),
                    "base_weights": dict(base_weights),
                    "final_score": final,
                },
            }
        )

    return scored
