from datetime import datetime, timezone
from typing import Any, List

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate

_NOW = datetime.now(timezone.utc)

# Used when the database is empty or unavailable so the frontend still has demo data.
PLACEHOLDER_VEHICLES = [
    {
        "id": 1,
        "brand": "Hyundai",
        "model": "Creta",
        "variant": "SX",
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
        "description": "Popular compact SUV with strong safety features.",
        "image_url": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
    {
        "id": 2,
        "brand": "Maruti Suzuki",
        "model": "Grand Vitara",
        "variant": "Alpha",
        "price": 1550000,
        "fuel_type": "Hybrid",
        "transmission": "Automatic",
        "vehicle_type": "SUV",
        "mileage": 27.9,
        "engine": "1.5L Hybrid",
        "power": "115 PS",
        "torque": "141 Nm",
        "seating_capacity": 5,
        "boot_space": 373,
        "safety_rating": 5.0,
        "description": "Efficient hybrid SUV for city and highway driving.",
        "image_url": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
    {
        "id": 3,
        "brand": "Tata",
        "model": "Nexon",
        "variant": "Fearless+",
        "price": 1250000,
        "fuel_type": "Petrol",
        "transmission": "Manual",
        "vehicle_type": "SUV",
        "mileage": 17.4,
        "engine": "1.2L Turbo",
        "power": "120 PS",
        "torque": "170 Nm",
        "seating_capacity": 5,
        "boot_space": 382,
        "safety_rating": 5.0,
        "description": "Feature-rich compact SUV with a strong safety rating.",
        "image_url": None,
        "created_at": _NOW,
        "updated_at": _NOW,
    },
]


def get_vehicles(db: Session) -> List[Any]:
    try:
        vehicles = db.query(Vehicle).order_by(Vehicle.id).all()
        if vehicles:
            return vehicles
    except SQLAlchemyError:
        db.rollback()
    return PLACEHOLDER_VEHICLES


def get_vehicle_by_id(db: Session, vehicle_id: int) -> Any:
    try:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if vehicle:
            return vehicle
    except SQLAlchemyError:
        db.rollback()

    for item in PLACEHOLDER_VEHICLES:
        if item["id"] == vehicle_id:
            return item

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Vehicle with id {vehicle_id} not found",
    )


def create_vehicle(db: Session, payload: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle_id: int, payload: VehicleUpdate) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found",
        )

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle


def delete_vehicle(db: Session, vehicle_id: int) -> None:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found",
        )

    db.delete(vehicle)
    db.commit()
