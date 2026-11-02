from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vehicle import (
    FuelType,
    SortByField,
    SortOrder,
    TransmissionType,
    VehicleCreate,
    VehicleListResponse,
    VehicleResponse,
    VehicleType,
    VehicleUpdate,
)
from app.services import vehicle_service

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a vehicle",
    responses={
        201: {"description": "Vehicle created"},
        422: {"description": "Validation error"},
        500: {"description": "Database error"},
    },
)
async def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
) -> VehicleResponse:
    """Persist a new vehicle to PostgreSQL and return the created record."""
    return vehicle_service.create_vehicle(db, payload)


@router.get(
    "",
    response_model=VehicleListResponse,
    summary="List vehicles",
    responses={
        200: {"description": "Paginated vehicle list (may be empty)"},
        422: {"description": "Invalid query parameters"},
        500: {"description": "Database error"},
    },
)
async def list_vehicles(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(10, ge=1, le=100, description="Items per page (max 100)"),
    brand: Optional[str] = Query(
        None,
        description="Filter by brand (case-insensitive exact match)",
        max_length=100,
    ),
    fuel_type: Optional[FuelType] = Query(
        None,
        description="Filter by fuel type (Petrol, Diesel, CNG, Electric, Hybrid)",
    ),
    transmission: Optional[TransmissionType] = Query(
        None,
        description="Filter by transmission (Manual, Automatic)",
    ),
    vehicle_type: Optional[VehicleType] = Query(
        None,
        description="Filter by body type (Hatchback, Sedan, SUV, MUV, Coupe, Other)",
    ),
    min_price: Optional[float] = Query(
        None, ge=0, description="Minimum price in INR (inclusive)"
    ),
    max_price: Optional[float] = Query(
        None, ge=0, description="Maximum price in INR (inclusive)"
    ),
    min_mileage: Optional[float] = Query(
        None, ge=0, description="Minimum mileage (inclusive)"
    ),
    max_mileage: Optional[float] = Query(
        None, ge=0, description="Maximum mileage (inclusive)"
    ),
    seating_capacity: Optional[int] = Query(
        None, ge=1, description="Exact seating capacity"
    ),
    sort_by: SortByField = Query(
        "created_at",
        description="Sort field: price, mileage, or created_at",
    ),
    sort_order: SortOrder = Query(
        "desc",
        description="Sort direction: asc or desc",
    ),
    db: Session = Depends(get_db),
) -> VehicleListResponse:
    """Return paginated vehicles with optional filters and sorting."""
    return vehicle_service.get_vehicles(
        db,
        page=page,
        limit=limit,
        brand=brand,
        fuel_type=fuel_type,
        transmission=transmission,
        vehicle_type=vehicle_type,
        min_price=min_price,
        max_price=max_price,
        min_mileage=min_mileage,
        max_mileage=max_mileage,
        seating_capacity=seating_capacity,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Get vehicle by ID",
    responses={
        200: {"description": "Vehicle found"},
        404: {"description": "Vehicle not found"},
        500: {"description": "Database error"},
    },
)
async def get_vehicle(
    vehicle_id: int = Path(..., ge=1, description="Vehicle primary key"),
    db: Session = Depends(get_db),
) -> VehicleResponse:
    """Fetch a single vehicle by ID."""
    return vehicle_service.get_vehicle_by_id(db, vehicle_id)


@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update a vehicle",
    responses={
        200: {"description": "Vehicle updated"},
        404: {"description": "Vehicle not found"},
        422: {"description": "Validation error"},
        500: {"description": "Database error"},
    },
)
async def update_vehicle(
    payload: VehicleUpdate,
    vehicle_id: int = Path(..., ge=1, description="Vehicle primary key"),
    db: Session = Depends(get_db),
) -> VehicleResponse:
    """Partially update a vehicle (only fields present in the body are applied)."""
    return vehicle_service.update_vehicle(db, vehicle_id, payload)


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vehicle",
    responses={
        204: {"description": "Vehicle deleted"},
        404: {"description": "Vehicle not found"},
        500: {"description": "Database error"},
    },
)
async def delete_vehicle(
    vehicle_id: int = Path(..., ge=1, description="Vehicle primary key"),
    db: Session = Depends(get_db),
) -> Response:
    """Delete a vehicle by ID. Returns 204 with an empty body on success."""
    vehicle_service.delete_vehicle(db, vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
