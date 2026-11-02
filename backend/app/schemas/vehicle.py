from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


FuelType = Literal["Petrol", "Diesel", "CNG", "Electric", "Hybrid"]
TransmissionType = Literal["Manual", "Automatic"]
VehicleType = Literal["Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Other"]
Priority = Literal["price", "mileage", "safety", "performance", "comfort"]

_FUEL_TYPE_MAP = {v.lower(): v for v in ("Petrol", "Diesel", "CNG", "Electric", "Hybrid")}
_TRANSMISSION_MAP = {v.lower(): v for v in ("Manual", "Automatic")}
_VEHICLE_TYPE_MAP = {
    v.lower(): v for v in ("Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Other")
}
_PRIORITY_VALUES = frozenset({"price", "mileage", "safety", "performance", "comfort"})


def _normalize_enum(value: Any, mapping: Dict[str, str], field_name: str) -> Optional[str]:
    """Normalize categorical input to canonical casing; blank → None."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    stripped = value.strip()
    if not stripped:
        return None
    canonical = mapping.get(stripped.lower())
    if canonical is None:
        allowed = ", ".join(sorted(set(mapping.values())))
        raise ValueError(f"Invalid {field_name} '{value}'. Allowed: {allowed}")
    return canonical


class VehicleBase(BaseModel):
    """Shared vehicle fields aligned with the SQLAlchemy Vehicle model."""

    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    variant: Optional[str] = Field(default=None, max_length=100)
    price: float = Field(..., gt=0, description="Must be greater than 0")
    fuel_type: FuelType
    transmission: TransmissionType
    vehicle_type: VehicleType
    mileage: Optional[float] = Field(default=None, ge=0)
    engine: Optional[str] = Field(default=None, max_length=100)
    power: Optional[str] = Field(default=None, max_length=50)
    torque: Optional[str] = Field(default=None, max_length=50)
    seating_capacity: Optional[int] = Field(default=None, ge=1)
    boot_space: Optional[float] = Field(default=None, ge=0)
    safety_rating: Optional[float] = Field(default=None, ge=0, le=5)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("brand", "model")
    @classmethod
    def non_empty_stripped(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must be a non-empty string")
        return stripped

    @field_validator("variant", "engine", "power", "torque", "description", "image_url")
    @classmethod
    def empty_optional_to_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class VehicleCreate(VehicleBase):
    """Payload for creating a vehicle. Required identification, pricing, and type fields."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "brand": "Hyundai",
                "model": "Creta",
                "variant": "SX (O)",
                "price": 1450000,
                "fuel_type": "Petrol",
                "transmission": "Automatic",
                "vehicle_type": "SUV",
                "mileage": 17.4,
                "engine": "1.5L",
                "power": "115 PS",
                "torque": "144 Nm",
                "seating_capacity": 5,
                "boot_space": 433,
                "safety_rating": 5.0,
                "description": "Sample compact SUV entry for API demos.",
                "image_url": None,
            }
        }
    )


class VehicleUpdate(BaseModel):
    """Partial update payload. Excludes id, created_at, and updated_at."""

    brand: Optional[str] = Field(default=None, min_length=1, max_length=100)
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    variant: Optional[str] = Field(default=None, max_length=100)
    price: Optional[float] = Field(default=None, gt=0)
    fuel_type: Optional[FuelType] = None
    transmission: Optional[TransmissionType] = None
    vehicle_type: Optional[VehicleType] = None
    mileage: Optional[float] = Field(default=None, ge=0)
    engine: Optional[str] = Field(default=None, max_length=100)
    power: Optional[str] = Field(default=None, max_length=50)
    torque: Optional[str] = Field(default=None, max_length=50)
    seating_capacity: Optional[int] = Field(default=None, ge=1)
    boot_space: Optional[float] = Field(default=None, ge=0)
    safety_rating: Optional[float] = Field(default=None, ge=0, le=5)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("brand", "model")
    @classmethod
    def non_empty_stripped_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("must be a non-empty string")
        return stripped

    @field_validator("variant", "engine", "power", "torque", "description", "image_url")
    @classmethod
    def empty_optional_to_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class VehicleResponse(VehicleBase):
    """Full vehicle representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# Compatibility alias for existing routes/services that import VehicleRead.
VehicleRead = VehicleResponse


SortByField = Literal["price", "mileage", "created_at"]
SortOrder = Literal["asc", "desc"]


class VehicleListResponse(BaseModel):
    """Paginated vehicle list with filter/sort metadata."""

    items: List[VehicleResponse] = Field(default_factory=list)
    total: int = Field(..., ge=0, description="Total vehicles matching filters")
    page: int = Field(..., ge=1, description="Current page (1-based)")
    limit: int = Field(..., ge=1, description="Page size")
    pages: int = Field(..., ge=0, description="Total pages for the current limit")


class RecommendationRequest(BaseModel):
    """User requirements for vehicle recommendations (Phase 3.1).

    Mandatory-style filters (applied as hard SQL filters when provided):
      budget_min, budget_max, vehicle_type, fuel_type, transmission,
      seating_capacity (minimum seats).

    Preferred fields (stored in response metadata; not hard filters yet):
      priorities, preferred_mileage, preferred_safety_rating.

    Backward-compatible aliases:
      budget → budget_max
      minimum_mileage → preferred_mileage
    """

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "examples": [
                {
                    "budget_max": 1500000,
                    "budget_min": 800000,
                    "fuel_type": "Petrol",
                    "transmission": "Automatic",
                    "vehicle_type": "SUV",
                    "seating_capacity": 5,
                    "priorities": ["mileage", "safety"],
                    "preferred_mileage": 15,
                    "preferred_safety_rating": 4.0,
                },
                {
                    "budget": 1500000,
                    "fuel_type": "Petrol",
                    "transmission": "Automatic",
                    "vehicle_type": "SUV",
                    "minimum_mileage": 15,
                    "seating_capacity": 5,
                    "priorities": ["mileage", "safety"],
                },
            ]
        },
    )

    budget_min: Optional[float] = Field(
        default=None,
        gt=0,
        description="Minimum price filter (inclusive). Ignored when omitted.",
    )
    budget_max: Optional[float] = Field(
        default=None,
        gt=0,
        description="Maximum price filter (inclusive). Alias: budget.",
    )
    vehicle_type: Optional[VehicleType] = Field(
        default=None,
        description="Body type filter. Ignored when omitted.",
    )
    fuel_type: Optional[FuelType] = Field(
        default=None,
        description="Fuel type filter. Ignored when omitted.",
    )
    transmission: Optional[TransmissionType] = Field(
        default=None,
        description="Transmission filter. Ignored when omitted.",
    )
    seating_capacity: Optional[int] = Field(
        default=None,
        gt=0,
        description="Minimum seating capacity (vehicle seats >= this value).",
    )
    priorities: List[Priority] = Field(
        default_factory=list,
        description="Preferred ranking factors (not hard filters in Phase 3.2).",
    )
    preferred_mileage: Optional[float] = Field(
        default=None,
        ge=0,
        description="Preferred mileage soft signal. Alias: minimum_mileage.",
    )
    preferred_safety_rating: Optional[float] = Field(
        default=None,
        ge=0,
        le=5,
        description="Preferred safety rating soft signal (0–5).",
    )

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_aliases(cls, data: Any) -> Any:
        """Map legacy frontend fields onto the Phase 3.1 names."""
        if not isinstance(data, dict):
            return data
        # Shallow copy so we do not mutate the caller's dict.
        data = dict(data)

        if "budget_max" not in data or data.get("budget_max") is None:
            if data.get("budget") is not None:
                data["budget_max"] = data["budget"]
        data.pop("budget", None)

        if "preferred_mileage" not in data or data.get("preferred_mileage") is None:
            if data.get("minimum_mileage") is not None:
                data["preferred_mileage"] = data["minimum_mileage"]
        data.pop("minimum_mileage", None)

        # Normalize blank strings to None for optional categoricals.
        for key in ("vehicle_type", "fuel_type", "transmission"):
            if key in data and isinstance(data[key], str) and not data[key].strip():
                data[key] = None

        return data

    @field_validator("fuel_type", mode="before")
    @classmethod
    def normalize_fuel_type(cls, value: Any) -> Any:
        return _normalize_enum(value, _FUEL_TYPE_MAP, "fuel_type")

    @field_validator("transmission", mode="before")
    @classmethod
    def normalize_transmission(cls, value: Any) -> Any:
        return _normalize_enum(value, _TRANSMISSION_MAP, "transmission")

    @field_validator("vehicle_type", mode="before")
    @classmethod
    def normalize_vehicle_type(cls, value: Any) -> Any:
        return _normalize_enum(value, _VEHICLE_TYPE_MAP, "vehicle_type")

    @field_validator("priorities", mode="before")
    @classmethod
    def normalize_priorities(cls, value: Any) -> Any:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("priorities must be a list")
        normalized: List[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("each priority must be a string")
            key = item.strip().lower()
            if key not in _PRIORITY_VALUES:
                allowed = ", ".join(sorted(_PRIORITY_VALUES))
                raise ValueError(
                    f"Invalid priority '{item}'. Allowed: {allowed}"
                )
            if key not in normalized:
                normalized.append(key)
        return normalized

    @model_validator(mode="after")
    def validate_budget_range(self) -> "RecommendationRequest":
        if (
            self.budget_min is not None
            and self.budget_max is not None
            and self.budget_min > self.budget_max
        ):
            raise ValueError(
                "budget_min must be less than or equal to budget_max"
            )
        return self

    def applied_mandatory_filters(self) -> Dict[str, Union[float, int, str]]:
        """Summary of hard filters that will be applied (unset keys omitted)."""
        summary: Dict[str, Union[float, int, str]] = {}
        if self.budget_min is not None:
            summary["budget_min"] = self.budget_min
        if self.budget_max is not None:
            summary["budget_max"] = self.budget_max
        if self.vehicle_type is not None:
            summary["vehicle_type"] = self.vehicle_type
        if self.fuel_type is not None:
            summary["fuel_type"] = self.fuel_type
        if self.transmission is not None:
            summary["transmission"] = self.transmission
        if self.seating_capacity is not None:
            summary["seating_capacity"] = self.seating_capacity
        return summary

    def preference_metadata(self) -> Dict[str, Any]:
        """Soft preferences stored for later ranking phases."""
        return {
            "priorities": list(self.priorities),
            "preferred_mileage": self.preferred_mileage,
            "preferred_safety_rating": self.preferred_safety_rating,
        }


class AppliedFilters(BaseModel):
    """Mandatory filters that were applied to the candidate query."""

    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    vehicle_type: Optional[str] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    seating_capacity: Optional[int] = None


class PreferenceMetadata(BaseModel):
    """Preferred signals retained for Phase 3.3+ ranking (not hard filters)."""

    priorities: List[Priority] = Field(default_factory=list)
    preferred_mileage: Optional[float] = None
    preferred_safety_rating: Optional[float] = None


class ScoreBreakdown(BaseModel):
    """Per-vehicle weighted scoring detail (Phase 3.3).

    ``criterion_scores`` values are ``None`` when the criterion was unavailable
    (missing / unparseable) for that vehicle — never invented as 0 or 1.
    ``effective_weights`` are the renormalized weights actually used for
    ``final_score`` (sum to 1.0, or all 0.0 when nothing was scorable).
    ``base_weights`` are the priority-derived weights before per-vehicle
    availability renormalization.
    """

    criterion_scores: Dict[str, Optional[float]] = Field(default_factory=dict)
    effective_weights: Dict[str, float] = Field(default_factory=dict)
    base_weights: Dict[str, float] = Field(default_factory=dict)
    final_score: float = Field(..., ge=0, le=1)


class RecommendationItem(VehicleResponse):
    """Vehicle plus scores, rank, and rule-based reason (Phases 3.3–3.6)."""

    rank: int = Field(
        ...,
        ge=1,
        description="1-based position by final_rank_score within the result set.",
    )
    weighted_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Weighted multi-criterion score in [0, 1].",
    )
    match_percentage: int = Field(
        ...,
        ge=0,
        le=100,
        description="Convenience percentage: round(weighted_score * 100).",
    )
    similarity_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Cosine similarity to user preference vector in [0, 1].",
    )
    final_rank_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Blend: weighted_score * 0.70 + similarity_score * 0.30.",
    )
    score_breakdown: ScoreBreakdown
    reason: str = Field(
        default="",
        description="Short rule-based explanation from top criteria / matched filters.",
    )


class RecommendationResponse(BaseModel):
    """Ranked recommendation results (Phases 3.2–3.6).

    Envelope keeps success / status / message / total / applied_filters /
    preferences. ``total`` remains the eligible count (before top-5) for
    backward compatibility; ``total_eligible`` mirrors it explicitly.
    ``recommendations`` is the primary top-5; ``alternatives`` holds the
    next-ranked eligible vehicles when more than five match.
    """

    success: bool = True
    status: Literal["matches_found", "no_matches"] = "no_matches"
    message: str = ""
    total: int = Field(
        default=0,
        ge=0,
        description="Eligible vehicles after mandatory filters (alias of total_eligible).",
    )
    total_eligible: int = Field(
        default=0,
        ge=0,
        description="Eligible vehicles after mandatory filters, before top-N truncation.",
    )
    recommendations_count: int = Field(
        default=0,
        ge=0,
        description="Number of primary recommendations returned (≤ 5).",
    )
    alternatives_count: int = Field(
        default=0,
        ge=0,
        description="Number of alternative recommendations returned (≤ 5).",
    )
    fewer_than_five_eligible: bool = Field(
        default=False,
        description="True when fewer than five vehicles passed mandatory filters.",
    )
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    alternatives: List[RecommendationItem] = Field(default_factory=list)
    applied_filters: AppliedFilters = Field(default_factory=AppliedFilters)
    preferences: PreferenceMetadata = Field(default_factory=PreferenceMetadata)
