from collections.abc import Generator
from urllib.parse import parse_qs, urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


def _postgresql_connect_args(database_url: str) -> dict:
    """Build psycopg2 connect_args: timeout + optional SSL without logging secrets.

    If DATABASE_URL already includes sslmode=..., leave it there and do not
    duplicate it in connect_args. Otherwise apply Settings.DATABASE_SSL_MODE.
    """
    args: dict = {"connect_timeout": 5}
    parsed = urlparse(database_url)
    query = parse_qs(parsed.query)
    if "sslmode" not in query and settings.DATABASE_SSL_MODE:
        args["sslmode"] = settings.DATABASE_SSL_MODE
    return args


_engine_kwargs: dict = {"pool_pre_ping": True}
# QueuePool sizing is PostgreSQL/MySQL specific; SQLite uses a different pool.
if settings.DATABASE_URL.startswith("postgresql"):
    _engine_kwargs.update(
        pool_size=5,
        max_overflow=10,
        connect_args=_postgresql_connect_args(settings.DATABASE_URL),
    )

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> None:
    """Verify PostgreSQL connectivity. Raises on failure (no silent fallback)."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def init_db() -> None:
    """Optionally create tables via SQLAlchemy metadata.

    Alembic is the source of truth for schema. This path runs only when
    Settings.AUTO_CREATE_TABLES is True (local bootstrap / legacy). Prefer:
        alembic upgrade head
    """
    from app.models import admin, vehicle  # noqa: F401

    if not settings.AUTO_CREATE_TABLES:
        return

    Base.metadata.create_all(bind=engine)
