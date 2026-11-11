from datetime import datetime
from typing import List

from pydantic import BaseModel

from app.schemas.vehicle import VehicleResponse


class CategoryCount(BaseModel):
    name: str
    count: int


class PriceStats(BaseModel):
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None


class DashboardStatsResponse(BaseModel):
    total_vehicles: int
    total_brands: int
    counts_by_fuel_type: List[CategoryCount]
    counts_by_transmission: List[CategoryCount]
    counts_by_vehicle_type: List[CategoryCount]
    price_stats: PriceStats
    recently_added: List[VehicleResponse]
    generated_at: datetime
