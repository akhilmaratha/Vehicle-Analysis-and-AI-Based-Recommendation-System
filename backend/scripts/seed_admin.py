"""Create the initial admin from environment variables.

Required:
    INITIAL_ADMIN_NAME
    INITIAL_ADMIN_EMAIL
    INITIAL_ADMIN_PASSWORD

Run after migrations:
    python scripts/seed_admin.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.admin import Admin  # noqa: E402


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def main() -> None:
    name = _required_env("INITIAL_ADMIN_NAME")
    email = _required_env("INITIAL_ADMIN_EMAIL").lower()
    password = _required_env("INITIAL_ADMIN_PASSWORD")

    db = SessionLocal()
    try:
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            print(f"Admin already exists: {email}")
            return
        admin = Admin(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role=os.getenv("INITIAL_ADMIN_ROLE", "admin").strip() or "admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Created admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
