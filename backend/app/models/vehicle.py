from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    variant: Mapped[str | None] = mapped_column(String(100), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fuel_type: Mapped[str] = mapped_column(String(50), nullable=False)
    transmission: Mapped[str] = mapped_column(String(50), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mileage: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    engine: Mapped[str | None] = mapped_column(String(100), nullable=True)
    power: Mapped[str | None] = mapped_column(String(50), nullable=True)
    torque: Mapped[str | None] = mapped_column(String(50), nullable=True)
    seating_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    boot_space: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    safety_rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
