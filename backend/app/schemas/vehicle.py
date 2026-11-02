from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


FuelType = Literal["Petrol", "Diesel", "CNG", "Electric", "Hybrid"]
TransmissionType = Literal["Manual", "Automatic"]
VehicleType = Literal["Hatchback", "Sedan", "SUV", "MUV", "Coupe", "Other"]


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
    budget: float = Field(..., ge=0)
    fuel_type: str
    transmission: str
    vehicle_type: str
    minimum_mileage: float = Field(..., ge=0)
    seating_capacity: int = Field(..., ge=1)
    priorities: List[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    success: bool = True
    recommendations: list = Field(default_factory=list)
    message: str = "Recommendation engine will be implemented later."
