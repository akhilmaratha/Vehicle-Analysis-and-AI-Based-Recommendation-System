"""URL slug helpers for public vehicle detail pages."""

from __future__ import annotations

import re
from typing import Any, Optional


_SLUG_RE = re.compile(r"[^a-z0-9]+")
_TRAILING_ID_RE = re.compile(r"^(?P<body>.+)-(?P<id>\d+)$")


def slugify_segment(value: Optional[str]) -> str:
    """Lowercase alphanumeric slug piece; empty input → empty string."""
    if value is None:
        return ""
    text = str(value).strip().lower()
    if not text:
        return ""
    text = _SLUG_RE.sub("-", text)
    return text.strip("-")


def build_vehicle_slug(
    brand: Optional[str],
    model: Optional[str],
    variant: Optional[str] = None,
    vehicle_id: Optional[int] = None,
) -> str:
    """Build a stable public slug: ``brand-model-variant-id`` (id always last)."""
    parts = [
        slugify_segment(brand),
        slugify_segment(model),
        slugify_segment(variant),
    ]
    body = "-".join(part for part in parts if part) or "vehicle"
    if vehicle_id is None:
        return body
    return f"{body}-{int(vehicle_id)}"


def build_vehicle_slug_from_obj(vehicle: Any) -> str:
    return build_vehicle_slug(
        getattr(vehicle, "brand", None),
        getattr(vehicle, "model", None),
        getattr(vehicle, "variant", None),
        getattr(vehicle, "id", None),
    )


def parse_vehicle_id_from_ref(ref: str) -> Optional[int]:
    """Extract a vehicle id from a numeric path or a trailing ``-123`` slug."""
    text = (ref or "").strip()
    if not text:
        return None
    if text.isdigit():
        value = int(text)
        return value if value >= 1 else None
    match = _TRAILING_ID_RE.match(text)
    if not match:
        return None
    value = int(match.group("id"))
    return value if value >= 1 else None
