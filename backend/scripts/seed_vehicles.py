"""
Seed PostgreSQL with demo Indian-market vehicle variants.

DEMO / SAMPLE DATA ONLY — specs and prices are approximate for development
and must not be treated as verified manufacturer facts.

Usage (from backend/ with venv active):
    python scripts/seed_vehicles.py
    python scripts/seed_vehicles.py --replace

Idempotent by default: skips rows that already exist for the same
brand + model + variant (case-insensitive).

With --replace: deletes existing vehicles that match brand+model+variant
keys from the JSON file, then inserts fresh rows (updates image_url etc.).
Does not run on app startup.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.exc import SQLAlchemyError  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.vehicle import Vehicle  # noqa: E402
from app.schemas.vehicle import VehicleCreate  # noqa: E402

DATA_FILE = BACKEND_ROOT / "data" / "sample_vehicles.json"


def _normalize_key(brand: str, model: str, variant: str | None) -> tuple[str, str, str]:
    return (
        (brand or "").strip().lower(),
        (model or "").strip().lower(),
        (variant or "").strip().lower(),
    )


def _existing_keys(db) -> set[tuple[str, str, str]]:
    rows = db.query(Vehicle.brand, Vehicle.model, Vehicle.variant).all()
    return {_normalize_key(b, m, v) for b, m, v in rows}


def load_records() -> list[dict]:
    if not DATA_FILE.is_file():
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")
    with DATA_FILE.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("sample_vehicles.json must be a JSON array")
    return data


def _delete_matching(db, keys: set[tuple[str, str, str]]) -> int:
    """Delete DB vehicles whose normalized brand/model/variant is in keys."""
    if not keys:
        return 0
    deleted = 0
    rows = db.query(Vehicle).all()
    for row in rows:
        key = _normalize_key(row.brand, row.model, row.variant)
        if key in keys:
            db.delete(row)
            deleted += 1
    return deleted


def seed(*, replace: bool = False) -> int:
    print("Loading demo dataset from:", DATA_FILE)
    print("NOTE: Records are demonstration/sample data, not verified specs.")
    raw_records = load_records()
    print(f"Records in file: {len(raw_records)}")
    if replace:
        print("Mode: --replace (delete matching brand/model/variant, then insert)")

    inserted = 0
    skipped = 0
    failed = 0
    deleted = 0

    db = SessionLocal()
    try:
        seen_in_file: set[tuple[str, str, str]] = set()
        file_keys: set[tuple[str, str, str]] = set()
        validated: list[tuple[int, VehicleCreate, tuple[str, str, str]]] = []

        for index, raw in enumerate(raw_records, start=1):
            try:
                payload = VehicleCreate.model_validate(raw)
            except Exception as exc:
                failed += 1
                print(f"  [{index}] VALIDATION FAILED: {exc}")
                continue

            key = _normalize_key(payload.brand, payload.model, payload.variant)
            if key in seen_in_file:
                skipped += 1
                print(
                    f"  [{index}] SKIP duplicate in file: "
                    f"{payload.brand} {payload.model} {payload.variant}"
                )
                continue
            seen_in_file.add(key)
            file_keys.add(key)
            validated.append((index, payload, key))

        if replace:
            deleted = _delete_matching(db, file_keys)
            print(f"Deleted matching rows: {deleted}")
            db.flush()

        existing = _existing_keys(db)

        for index, payload, key in validated:
            if key in existing:
                skipped += 1
                print(
                    f"  [{index}] SKIP already in DB: "
                    f"{payload.brand} {payload.model} {payload.variant}"
                )
                continue

            db.add(Vehicle(**payload.model_dump()))
            existing.add(key)
            inserted += 1
            print(
                f"  [{index}] INSERT: {payload.brand} {payload.model} {payload.variant}"
            )

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        print("ERROR: Database transaction rolled back.")
        print(f"  {type(exc).__name__}: {exc}")
        return 1
    except Exception as exc:
        db.rollback()
        print("ERROR: Unexpected failure; transaction rolled back.")
        print(f"  {type(exc).__name__}: {exc}")
        return 1
    finally:
        db.close()

    print("---")
    if replace:
        print(f"Deleted:  {deleted}")
    print(f"Inserted: {inserted}")
    print(f"Skipped:  {skipped}")
    print(f"Failed:   {failed}")
    print(f"Total processed from file: {len(raw_records)}")
    return 0 if failed == 0 else 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed demo vehicles into PostgreSQL")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete matching brand/model/variant rows from the DB, then insert from JSON",
    )
    args = parser.parse_args(argv)
    return seed(replace=args.replace)


if __name__ == "__main__":
    raise SystemExit(main())
