"""Database-backed vehicle CRUD. No in-memory / placeholder fallbacks."""

from __future__ import annotations

import math
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Query, Session

from app.models.vehicle import Vehicle
from app.schemas.vehicle import (
    SortByField,
    SortOrder,
    VehicleCreate,
    VehicleListResponse,
    VehicleUpdate,
)

_SORT_COLUMNS = {
    "price": Vehicle.price,
    "mileage": Vehicle.mileage,
    "created_at": Vehicle.created_at,
}


def _rollback_and_raise(db: Session, exc: Exception) -> None:
    """Rollback the current transaction, then re-raise for global handlers."""
    try:
        db.rollback()
    except Exception:
        pass
    raise exc


def _apply_filters(
    query: Query,
    *,
    brand: Optional[str] = None,
    fuel_type: Optional[str] = None,
    transmission: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_mileage: Optional[float] = None,
    max_mileage: Optional[float] = None,
    seating_capacity: Optional[int] = None,
    search: Optional[str] = None,
) -> Query:
    if brand:
        query = query.filter(Vehicle.brand.ilike(brand.strip()))
    if fuel_type:
        query = query.filter(Vehicle.fuel_type == fuel_type)
    if transmission:
        query = query.filter(Vehicle.transmission == transmission)
    if vehicle_type:
        query = query.filter(Vehicle.vehicle_type == vehicle_type)
    if min_price is not None:
        query = query.filter(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.filter(Vehicle.price <= max_price)
    if min_mileage is not None:
        query = query.filter(Vehicle.mileage >= min_mileage)
    if max_mileage is not None:
        query = query.filter(Vehicle.mileage <= max_mileage)
    if seating_capacity is not None:
        query = query.filter(Vehicle.seating_capacity == seating_capacity)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Vehicle.brand.ilike(term), Vehicle.model.ilike(term)))
    return query


def get_vehicles(
    db: Session,
    *,
    page: int = 1,
    limit: int = 10,
    brand: Optional[str] = None,
    fuel_type: Optional[str] = None,
    transmission: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_mileage: Optional[float] = None,
    max_mileage: Optional[float] = None,
    seating_capacity: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: SortByField = "created_at",
    sort_order: SortOrder = "desc",
) -> VehicleListResponse:
    """List vehicles with pagination, filters, and sorting. Empty list if none match."""
    try:
        query = db.query(Vehicle)
        query = _apply_filters(
            query,
            brand=brand,
            fuel_type=fuel_type,
            transmission=transmission,
            vehicle_type=vehicle_type,
            min_price=min_price,
            max_price=max_price,
            min_mileage=min_mileage,
            max_mileage=max_mileage,
            seating_capacity=seating_capacity,
            search=search,
        )

        total = query.with_entities(func.count(Vehicle.id)).scalar() or 0

        sort_column = _SORT_COLUMNS.get(sort_by, Vehicle.created_at)
        order_fn = asc if sort_order == "asc" else desc
        query = query.order_by(order_fn(sort_column), asc(Vehicle.id))

        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()
        pages = math.ceil(total / limit) if limit and total else 0

        return VehicleListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)


def get_vehicle_by_id(db: Session, vehicle_id: int) -> Vehicle:
    try:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found",
        )
    return vehicle


def get_vehicle_by_ref(db: Session, vehicle_ref: str) -> Vehicle:
    """Resolve a vehicle by numeric id or public slug (…-id)."""
    from app.utils.vehicle_slug import (
        build_vehicle_slug_from_obj,
        parse_vehicle_id_from_ref,
    )

    ref = (vehicle_ref or "").strip()
    vehicle_id = parse_vehicle_id_from_ref(ref)
    if vehicle_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_ref}' not found",
        )

    vehicle = get_vehicle_by_id(db, vehicle_id)

    # Numeric legacy URLs are accepted as-is; slug URLs must match the canonical slug.
    if ref.isdigit():
        return vehicle

    canonical = build_vehicle_slug_from_obj(vehicle)
    if canonical != ref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_ref}' not found",
        )
    return vehicle


def create_vehicle(db: Session, payload: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(**payload.model_dump())
    try:
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
        return vehicle
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)


def update_vehicle(db: Session, vehicle_id: int, payload: VehicleUpdate) -> Vehicle:
    vehicle = get_vehicle_by_id(db, vehicle_id)
    updates = payload.model_dump(exclude_unset=True)
    try:
        for key, value in updates.items():
            setattr(vehicle, key, value)
        db.commit()
        db.refresh(vehicle)
        return vehicle
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)


def delete_vehicle(db: Session, vehicle_id: int) -> None:
    vehicle = get_vehicle_by_id(db, vehicle_id)
    try:
        db.delete(vehicle)
        db.commit()
    except SQLAlchemyError as exc:
        _rollback_and_raise(db, exc)
