import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.core.database import check_db_connection, init_db
from app.routes import (
    admin_auth,
    admin_dashboard,
    admin_vehicles,
    ai,
    health,
    recommendations,
    vehicles,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class LimitRequestBodyMiddleware:
    """Reject oversized request bodies (pure ASGI — avoids BaseHTTPMiddleware pitfalls)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            headers = {
                key.decode("latin-1").lower(): value.decode("latin-1")
                for key, value in scope.get("headers", [])
            }
            content_length = headers.get("content-length")
            if content_length is not None:
                try:
                    length = int(content_length)
                except ValueError:
                    response = JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "message": "Invalid Content-Length header",
                        },
                    )
                    await response(scope, receive, send)
                    return
                if length > settings.MAX_REQUEST_BODY_BYTES:
                    response = JSONResponse(
                        status_code=413,
                        content={
                            "success": False,
                            "message": "Request body too large",
                        },
                    )
                    await response(scope, receive, send)
                    return
        await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Security: refuse to run without a real JWT secret.
    settings.validate_security_settings()

    # Database: never silently ignore connectivity failures in production mode.
    try:
        check_db_connection()
        logger.info("PostgreSQL connection verified")
    except Exception as exc:
        logger.error("PostgreSQL connection failed: %s", exc)
        if settings.REQUIRE_DB_ON_STARTUP:
            raise RuntimeError(
                "Database unavailable. Fix DATABASE_URL / PostgreSQL, "
                "or set REQUIRE_DB_ON_STARTUP=false only for local diagnostics."
            ) from exc
        logger.warning(
            "Continuing without database because REQUIRE_DB_ON_STARTUP=false"
        )

    # Schema source of truth is Alembic (`alembic upgrade head`).
    # init_db() only calls create_all when AUTO_CREATE_TABLES=True.
    try:
        init_db()
        if settings.AUTO_CREATE_TABLES:
            logger.info("Database tables initialized via create_all (AUTO_CREATE_TABLES=True)")
        else:
            logger.info("Skipped create_all; use Alembic migrations for schema")
    except Exception as exc:
        logger.error("Database initialization failed: %s", exc)
        if settings.REQUIRE_DB_ON_STARTUP:
            raise
        logger.warning("Database initialization skipped (REQUIRE_DB_ON_STARTUP=false)")

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.add_middleware(LimitRequestBodyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(health.router)
app.include_router(vehicles.router)
app.include_router(recommendations.router)
app.include_router(ai.router)
app.include_router(admin_auth.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_vehicles.router)


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
    detail = exc.detail
    if not isinstance(detail, str):
        detail = "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": detail,
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
