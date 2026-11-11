"""add vehicle filter indexes for list/recommend queries

Revision ID: 20261111_0003
Revises: 20261111_0002
Create Date: 2026-11-11 21:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20261111_0003"
down_revision: Union[str, Sequence[str], None] = "20261111_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Common filter/sort columns used by GET /api/vehicles and recommendations.
    op.create_index("ix_vehicles_price", "vehicles", ["price"], unique=False)
    op.create_index("ix_vehicles_fuel_type", "vehicles", ["fuel_type"], unique=False)
    op.create_index(
        "ix_vehicles_transmission", "vehicles", ["transmission"], unique=False
    )
    op.create_index(
        "ix_vehicles_vehicle_type", "vehicles", ["vehicle_type"], unique=False
    )
    op.create_index(
        "ix_vehicles_seating_capacity",
        "vehicles",
        ["seating_capacity"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_vehicles_seating_capacity", table_name="vehicles")
    op.drop_index("ix_vehicles_vehicle_type", table_name="vehicles")
    op.drop_index("ix_vehicles_transmission", table_name="vehicles")
    op.drop_index("ix_vehicles_fuel_type", table_name="vehicles")
    op.drop_index("ix_vehicles_price", table_name="vehicles")
