from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import check_db_connection

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """Liveness/readiness probe. Reports database connectivity without secrets."""
    settings = get_settings()
    db_status = "ok"
    db_message = "connected"
    try:
        check_db_connection()
    except Exception:
        db_status = "error"
        db_message = "unavailable"

    payload = {
        "status": "ok" if db_status == "ok" else "degraded",
        "message": "Vehicle Recommendation API is running",
        "version": settings.APP_VERSION,
        "database": {"status": db_status, "message": db_message},
    }
    status_code = 200 if db_status == "ok" else 503
    return JSONResponse(status_code=status_code, content=payload)
