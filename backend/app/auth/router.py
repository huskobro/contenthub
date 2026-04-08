"""
Auth endpoints — Faz 3.

Provides login, register, refresh, and /me endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.password import hash_password, verify_password
from app.auth.dependencies import get_current_user
from app.users.slugify import slugify, make_unique_slug
from jose import JWTError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    display_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_token_response(user: User) -> TokenResponse:
    """Build a token response for a given user."""
    token_data = {"sub": user.id, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user_id=user.id,
        role=user.role,
        display_name=user.display_name,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT tokens."""
    stmt = select(User).where(User.email == body.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz e-posta veya sifre",
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz e-posta veya sifre",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap aktif degil",
        )

    logger.info("User logged in: id=%s email=%s", user.id, user.email)
    return _build_token_response(user)


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user and return JWT tokens."""
    # Check if email already exists
    stmt = select(User).where(User.email == body.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi zaten kayitli",
        )

    # Generate unique slug (same pattern as users service)
    base_slug = slugify(body.display_name)
    existing_slugs = set(
        row[0]
        for row in (await db.execute(select(User.slug))).all()
        if row[0] is not None
    )
    slug = make_unique_slug(base_slug, existing_slugs)

    user = User(
        email=body.email,
        display_name=body.display_name,
        slug=slug,
        role="user",
        status="active",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("User registered: id=%s slug=%s email=%s", user.id, user.slug, user.email)
    return _build_token_response(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz veya suresi dolmus refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz token tipi",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token icinde kullanici bilgisi yok",
        )

    user = await db.get(User, user_id)
    if not user or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanici bulunamadi veya aktif degil",
        )

    logger.info("Token refreshed for user: id=%s", user.id)
    return _build_token_response(user)


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "status": user.status,
    }
