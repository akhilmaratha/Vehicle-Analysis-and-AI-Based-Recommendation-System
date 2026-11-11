from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
