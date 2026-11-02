"""Phase 3.4 — cosine similarity between user preferences and eligible vehicles.

Uses a single fitted preprocessing pipeline shared by the user preference
vector and all candidate vehicles (never fit separate encoders / scalers
independently for user vs vehicles).

Feature set (Vehicle model fields only)
---------------------------------------
Numeric: price, mileage, seating_capacity, boot_space, safety_rating,
         performance (parsed power / engine via ``parse_power_value``).
Categorical: brand, fuel_type, transmission, vehicle_type.

Encoding / scaling
------------------
- Categoricals → ``OneHotEncoder(handle_unknown=\"ignore\")``.
- Numerics → ``SimpleImputer(strategy=\"median\")`` then ``MinMaxScaler``.
  MinMax keeps features non-negative so cosine similarity lands naturally
  in ``[0, 1]`` more often than StandardScaler (which centers to negatives).
- The imputer / encoder / scaler are fitted once on the stacked matrix of
  candidates **plus** the user preference row, then both are transformed
  with the same fitted objects.

Missing-value handling
----------------------
- Vehicle nulls: numeric → median imputation (fitted); categorical →
  sentinel ``\"__MISSING__\"`` before one-hot.
- Incomplete user prefs: unset numeric fields are ``np.nan`` (same imputer);
  unset categoricals use ``\"__MISSING__\"``. Brand is never on the request,
  so the user brand is always the missing sentinel.
- Empty candidate list → empty similarity list (no fit).
- Single candidate / small sets: still valid; MinMax with constant column
  yields zeros for that feature (sklearn default) without crashing.
- Zero / near-zero vectors after transform → similarity ``0.0`` (no NaN).
- Cosine results are clipped into ``[0, 1]``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder

from app.schemas.vehicle import RecommendationRequest
from app.services.weighted_scoring import parse_power_value

NUMERIC_FEATURES: tuple[str, ...] = (
    "price",
    "mileage",
    "seating_capacity",
    "boot_space",
    "safety_rating",
    "performance",
)
CATEGORICAL_FEATURES: tuple[str, ...] = (
    "brand",
    "fuel_type",
    "transmission",
    "vehicle_type",
)

_MISSING_CAT = "__MISSING__"


def _as_optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _categorical(value: Any) -> str:
    if value is None:
        return _MISSING_CAT
    text = str(value).strip()
    return text if text else _MISSING_CAT


def candidate_feature_row(candidate: Mapping[str, Any]) -> Dict[str, Any]:
    """Extract the similarity feature dict from a prepared candidate."""
    return {
        "price": _as_optional_float(candidate.get("price")),
        "mileage": _as_optional_float(candidate.get("mileage")),
        "seating_capacity": _as_optional_float(candidate.get("seating_capacity")),
        "boot_space": _as_optional_float(candidate.get("boot_space")),
        "safety_rating": _as_optional_float(candidate.get("safety_rating")),
        "performance": parse_power_value(
            candidate.get("power"), candidate.get("engine")
        ),
        "brand": _categorical(candidate.get("brand")),
        "fuel_type": _categorical(candidate.get("fuel_type")),
        "transmission": _categorical(candidate.get("transmission")),
        "vehicle_type": _categorical(candidate.get("vehicle_type")),
    }


def user_preference_feature_row(
    requirements: RecommendationRequest,
) -> Dict[str, Any]:
    """Build a preference feature row aligned with vehicle features.

    Price preference: midpoint of budget_min/budget_max when both set;
    otherwise whichever bound is present. Mileage / safety use preferred_*
    soft signals. Seating uses the request minimum. Boot / performance /
    brand are typically unset → missing (imputed / sentinel).
    """
    price: Optional[float] = None
    if requirements.budget_min is not None and requirements.budget_max is not None:
        price = (float(requirements.budget_min) + float(requirements.budget_max)) / 2.0
    elif requirements.budget_max is not None:
        price = float(requirements.budget_max)
    elif requirements.budget_min is not None:
        price = float(requirements.budget_min)

    return {
        "price": price,
        "mileage": _as_optional_float(requirements.preferred_mileage),
        "seating_capacity": _as_optional_float(requirements.seating_capacity),
        "boot_space": None,
        "safety_rating": _as_optional_float(requirements.preferred_safety_rating),
        "performance": None,
        "brand": _MISSING_CAT,
        "fuel_type": _categorical(requirements.fuel_type),
        "transmission": _categorical(requirements.transmission),
        "vehicle_type": _categorical(requirements.vehicle_type),
    }


def _numeric_matrix(rows: Sequence[Mapping[str, Any]]) -> np.ndarray:
    matrix = np.empty((len(rows), len(NUMERIC_FEATURES)), dtype=float)
    for i, row in enumerate(rows):
        for j, name in enumerate(NUMERIC_FEATURES):
            value = row.get(name)
            matrix[i, j] = np.nan if value is None else float(value)
    return matrix


def _categorical_matrix(rows: Sequence[Mapping[str, Any]]) -> np.ndarray:
    # Object array of shape (n, n_cat) for OneHotEncoder.
    matrix = np.empty((len(rows), len(CATEGORICAL_FEATURES)), dtype=object)
    for i, row in enumerate(rows):
        for j, name in enumerate(CATEGORICAL_FEATURES):
            matrix[i, j] = _categorical(row.get(name))
    return matrix


def _impute_numeric(matrix: np.ndarray) -> np.ndarray:
    """Column-wise median imputation; all-NaN columns become 0.0."""
    out = matrix.copy()
    for col in range(out.shape[1]):
        column = out[:, col]
        finite = column[~np.isnan(column)]
        if finite.size == 0:
            fill = 0.0
        else:
            fill = float(np.median(finite))
        nan_mask = np.isnan(column)
        if nan_mask.any():
            out[nan_mask, col] = fill
    return out


def _safe_cosine(user_vec: np.ndarray, candidate_matrix: np.ndarray) -> np.ndarray:
    """Cosine similarity in ``[0, 1]``; zero-norm vectors → 0.0."""
    if candidate_matrix.size == 0:
        return np.zeros(0, dtype=float)

    user = user_vec.reshape(1, -1)
    # Manual path to control zero-vector behavior without sklearn warnings noise.
    user_norm = np.linalg.norm(user)
    cand_norms = np.linalg.norm(candidate_matrix, axis=1)

    sims = np.zeros(candidate_matrix.shape[0], dtype=float)
    if user_norm == 0.0:
        return sims

    # Prefer sklearn cosine when both sides are non-zero; fall back per-row.
    try:
        raw = cosine_similarity(user, candidate_matrix)[0]
    except ValueError:
        raw = np.zeros(candidate_matrix.shape[0], dtype=float)

    for i, (sim, cnorm) in enumerate(zip(raw, cand_norms)):
        if cnorm == 0.0 or not np.isfinite(sim):
            sims[i] = 0.0
        else:
            sims[i] = float(np.clip(sim, 0.0, 1.0))
    return sims


def compute_similarity_scores(
    candidates: Sequence[Mapping[str, Any]],
    requirements: RecommendationRequest,
) -> List[float]:
    """Return per-candidate cosine similarity scores in ``[0, 1]``.

    Empty ``candidates`` → ``[]``. Encoder/scaler fitted once on
    candidates + user preference row.
    """
    if not candidates:
        return []

    vehicle_rows = [candidate_feature_row(c) for c in candidates]
    user_row = user_preference_feature_row(requirements)
    all_rows: List[Dict[str, Any]] = list(vehicle_rows) + [user_row]

    numeric_all = _impute_numeric(_numeric_matrix(all_rows))
    categorical_all = _categorical_matrix(all_rows)

    scaler = MinMaxScaler()
    numeric_scaled = scaler.fit_transform(numeric_all)

    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    categorical_encoded = encoder.fit_transform(categorical_all)

    combined = np.hstack([numeric_scaled, categorical_encoded])
    candidate_matrix = combined[:-1]
    user_vec = combined[-1]

    sims = _safe_cosine(user_vec, candidate_matrix)
    return [float(s) for s in sims]
