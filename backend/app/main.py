import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import get_settings
from app.core.database import init_db
from app.routes import health, recommendations, vehicles

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Schema source of truth is Alembic (`alembic upgrade head`).
    # init_db() only calls create_all when AUTO_CREATE_TABLES=True.
    try:
        init_db()
        if settings.AUTO_CREATE_TABLES:
            logger.info("Database tables initialized via create_all (AUTO_CREATE_TABLES=True)")
        else:
            logger.info("Skipped create_all; use Alembic migrations for schema")
    except Exception as exc:
        # Allow API to start for health checks even if DB is unavailable
        logger.warning("Database initialization skipped: %s", exc)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(vehicles.router)
app.include_router(recommendations.router)


def _json_safe_errors(errors: list) -> list:
    """Make Pydantic/FastAPI error dicts JSON-serializable (ctx may hold exceptions)."""
    safe: list = []
    for err in errors:
        item = dict(err)
        ctx = item.get("ctx")
        if isinstance(ctx, dict):
            item["ctx"] = {
                key: (str(value) if isinstance(value, BaseException) else value)
                for key, value in ctx.items()
            }
        safe.append(item)
    return safe


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": _json_safe_errors(exc.errors()),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(_: Request, exc: IntegrityError):
    logger.error("Integrity error: %s", exc)
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "message": "Database integrity error",
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_: Request, exc: SQLAlchemyError):
    logger.error("Database error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Database error occurred",
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception):
    logger.exception("Unexpected error: %s", exc)
    detail = str(exc) if settings.DEBUG else "An unexpected error occurred"
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": detail,
        },
    )
