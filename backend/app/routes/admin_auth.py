from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.dependencies.auth import require_admin
from app.models.admin import Admin
from app.schemas.admin import AdminAuthResponse, AdminLoginRequest, AdminMessageResponse, AdminResponse

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


def _set_admin_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    max_age = settings.JWT_EXPIRE_MINUTES * 60
    # Use max_age only. Do not pass a relative seconds value as expires —
    # and keep SameSite=lax for same-site localhost:3000 → localhost:8000.
    response.set_cookie(
        key=settings.ADMIN_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite=settings.ADMIN_COOKIE_SAMESITE,
        path="/",
    )


@router.post("/login", response_model=AdminAuthResponse)
async def login_admin(
    payload: AdminLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AdminAuthResponse:
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if not admin or not admin.is_active or not verify_password(
        payload.password, admin.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    settings = get_settings()
    token = create_access_token(
        str(admin.id), timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    _set_admin_cookie(response, token)
    return AdminAuthResponse(
        admin=admin,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=AdminMessageResponse)
async def logout_admin(response: Response) -> AdminMessageResponse:
    response.delete_cookie(
        key=get_settings().ADMIN_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=get_settings().ADMIN_COOKIE_SECURE,
        samesite=get_settings().ADMIN_COOKIE_SAMESITE,
    )
    return AdminMessageResponse(message="Logged out")


@router.get("/me", response_model=AdminResponse)
async def get_admin_me(admin: Admin = Depends(require_admin)) -> Admin:
    return admin
