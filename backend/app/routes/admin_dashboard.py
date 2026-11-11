from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.admin import Admin
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import get_dashboard_stats

router = APIRouter(prefix="/api/admin/dashboard", tags=["admin-dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def dashboard_stats(
    _: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    return get_dashboard_stats(db)
