from typing import Optional

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.admin import Admin
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

router = APIRouter(prefix="/api/admin/vehicles", tags=["admin-vehicles"])


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_vehicle(
    payload: VehicleCreate,
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VehicleResponse:
    return vehicle_service.create_vehicle(db, payload)


@router.get("", response_model=VehicleListResponse)
async def list_admin_vehicles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=100),
    brand: Optional[str] = Query(None, max_length=100),
    fuel_type: Optional[FuelType] = Query(None),
    transmission: Optional[TransmissionType] = Query(None),
    vehicle_type: Optional[VehicleType] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_mileage: Optional[float] = Query(None, ge=0),
    max_mileage: Optional[float] = Query(None, ge=0),
    seating_capacity: Optional[int] = Query(None, ge=1),
    sort_by: SortByField = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VehicleListResponse:
    return vehicle_service.get_vehicles(
        db,
        page=page,
        limit=limit,
        search=search,
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


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_admin_vehicle(
    vehicle_id: int = Path(..., ge=1),
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VehicleResponse:
    return vehicle_service.get_vehicle_by_id(db, vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_admin_vehicle(
    payload: VehicleUpdate,
    vehicle_id: int = Path(..., ge=1),
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> VehicleResponse:
    return vehicle_service.update_vehicle(db, vehicle_id, payload)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_vehicle(
    vehicle_id: int = Path(..., ge=1),
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Response:
    vehicle_service.delete_vehicle(db, vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
