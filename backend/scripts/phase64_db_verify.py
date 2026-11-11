"""Non-destructive Phase 6.4 database readiness checks."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import check_db_connection, engine


def main() -> int:
    settings = get_settings()
    check_db_connection()
    print("PASS  database connection")
    print(f"INFO  AUTO_CREATE_TABLES={settings.AUTO_CREATE_TABLES}")
    print(f"INFO  REQUIRE_DB_ON_STARTUP={settings.REQUIRE_DB_ON_STARTUP}")
    print(f"INFO  DATABASE_SSL_MODE={settings.DATABASE_SSL_MODE!r}")
    print(
        "INFO  url_has_sslmode=",
        "sslmode=" in (settings.DATABASE_URL or "").lower(),
    )

    with engine.connect() as connection:
        revision = connection.execute(
            text("select version_num from alembic_version")
        ).scalar()
        vehicle_count = connection.execute(
            text("select count(*) from vehicles")
        ).scalar()
        admin_count = connection.execute(
            text("select count(*) from admins")
        ).scalar()
        indexes = connection.execute(
            text(
                "select indexname from pg_indexes "
                "where tablename = 'vehicles' order by indexname"
            )
        ).fetchall()

    print(f"PASS  alembic_revision={revision}")
    print(f"PASS  vehicle_count={vehicle_count}")
    print(f"PASS  admin_count={admin_count}")
    print("PASS  indexes=" + ",".join(row[0] for row in indexes))

    expected = {
        "ix_vehicles_price",
        "ix_vehicles_fuel_type",
        "ix_vehicles_transmission",
        "ix_vehicles_vehicle_type",
        "ix_vehicles_seating_capacity",
    }
    present = {row[0] for row in indexes}
    missing = sorted(expected - present)
    if missing:
        print("FAIL  missing indexes: " + ",".join(missing))
        return 1
    print("PASS  filter indexes present")
    if revision != "20261111_0003":
        print(f"FAIL  expected alembic head 20261111_0003, got {revision}")
        return 1
    print("PASS  alembic at expected head")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
