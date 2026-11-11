from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.schemas.dashboard import CategoryCount, DashboardStatsResponse, PriceStats


def _category_counts(db: Session, column) -> list[CategoryCount]:
    rows = (
        db.query(column.label("name"), func.count(Vehicle.id).label("count"))
        .group_by(column)
        .order_by(func.count(Vehicle.id).desc(), column.asc())
        .all()
    )
    return [CategoryCount(name=row.name or "Unknown", count=row.count) for row in rows]


def get_dashboard_stats(db: Session) -> DashboardStatsResponse:
    total_vehicles = db.query(func.count(Vehicle.id)).scalar() or 0
    total_brands = db.query(func.count(func.distinct(Vehicle.brand))).scalar() or 0
    avg_price, min_price, max_price = (
        db.query(func.avg(Vehicle.price), func.min(Vehicle.price), func.max(Vehicle.price))
        .one()
    )
    recent = db.query(Vehicle).order_by(Vehicle.created_at.desc(), Vehicle.id.desc()).limit(5).all()

    return DashboardStatsResponse(
        total_vehicles=total_vehicles,
        total_brands=total_brands,
        counts_by_fuel_type=_category_counts(db, Vehicle.fuel_type),
        counts_by_transmission=_category_counts(db, Vehicle.transmission),
        counts_by_vehicle_type=_category_counts(db, Vehicle.vehicle_type),
        price_stats=PriceStats(
            average=float(avg_price) if avg_price is not None else None,
            minimum=float(min_price) if min_price is not None else None,
            maximum=float(max_price) if max_price is not None else None,
        ),
        recently_added=recent,
        generated_at=datetime.now(timezone.utc),
    )
