"""create vehicles table

Revision ID: 20261102_0001
Revises:
Create Date: 2026-11-02 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261102_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("variant", sa.String(length=100), nullable=True),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("fuel_type", sa.String(length=50), nullable=False),
        sa.Column("transmission", sa.String(length=50), nullable=False),
        sa.Column("vehicle_type", sa.String(length=50), nullable=False),
        sa.Column("mileage", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("engine", sa.String(length=100), nullable=True),
        sa.Column("power", sa.String(length=50), nullable=True),
        sa.Column("torque", sa.String(length=50), nullable=True),
        sa.Column("seating_capacity", sa.Integer(), nullable=True),
        sa.Column("boot_space", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("safety_rating", sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vehicles_id"), "vehicles", ["id"], unique=False)
    op.create_index(op.f("ix_vehicles_brand"), "vehicles", ["brand"], unique=False)
    op.create_index(op.f("ix_vehicles_model"), "vehicles", ["model"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_vehicles_model"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_brand"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_id"), table_name="vehicles")
    op.drop_table("vehicles")
