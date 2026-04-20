"""
Auth endpoints — Faz 3.

Provides login, register, refresh, /me, forgot-password, and reset-password
endpoints.

Password reset token storage: in-memory (MVP, localhost-first). Tokens are
process-local and expire after 30 minutes. Restart clears outstanding tokens;
users must re-initiate "forgot password" after backend restart. This is an
explicit design choice to avoid a DB migration for a single-instance MVP —
when the product graduates to multi-instance or persistent state, migrate
to a `password_reset_tokens` table.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.password import hash_password, verify_password
from app.auth.dependencies import get_current_user
from app.users.slugify import slugify, make_unique_slug
from app.core.config import settings
from jose import JWTError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# Password reset token store (in-memory, process-local, 30-min TTL)
# ---------------------------------------------------------------------------
# Map: token -> (user_id, expires_at_utc)
_RESET_TOKENS: Dict[str, Tuple[str, datetime]] = {}
_RESET_TOKEN_TTL = timedelta(minutes=30)


def _prune_expired_tokens() -> None:
    """Drop expired tokens from the in-memory store."""
    now = datetime.now(timezone.utc)
    dead = [t for t, (_uid, exp) in _RESET_TOKENS.items() if exp <= now]
    for t in dead:
        _RESET_TOKENS.pop(t, None)


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


# ---------------------------------------------------------------------------
# Password reset — forgot & reset
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class ForgotPasswordResponse(BaseModel):
    """Always 200 OK to avoid leaking whether the email exists.

    In dev/localhost mode we include the reset token so the operator can
    test the full flow without SMTP. In production this field must be
    removed and the token delivered via email.
    """

    message: str
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """Initiate password reset.

    Always returns 200 to avoid exposing whether the email is registered.
    Generates a 32-byte urlsafe token, stores it in-memory with a 30-min
    TTL, and (in localhost/dev mode) returns the token in the response
    body so the operator can use it without an email transport configured.

    Localhost MVP constraint: reset tokens live in process memory only.
    After a backend restart, outstanding tokens are invalidated and users
    must request reset again. This is acceptable for single-machine dev
    and is documented in the module docstring.
    """

    _prune_expired_tokens()

    stmt = select(User).where(User.email == body.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or user.status != "active":
        # Uniform 200 — do not leak existence or status
        logger.info(
            "Password reset requested for unknown/inactive email: %s",
            body.email,
        )
        return ForgotPasswordResponse(
            message="Eğer bu e-posta ile bir hesap eşleşiyorsa sıfırlama bağlantısı gönderildi.",
            reset_token=None,
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + _RESET_TOKEN_TTL
    _RESET_TOKENS[token] = (user.id, expires_at)

    # Token is logged at DEBUG so it's retrievable in dev but not leaked
    # in production log aggregators that strip DEBUG.
    logger.info(
        "Password reset token issued: user_id=%s email=%s expires_at=%s",
        user.id,
        user.email,
        expires_at.isoformat(),
    )
    logger.debug(
        "Password reset token value (DEBUG only — do not surface in prod): token=%s",
        token,
    )

    # Return the token in the response ONLY when debug mode is active.
    # In production (debug=False) the response omits the token; delivery
    # must happen via email transport (out of scope for localhost MVP v1).
    return ForgotPasswordResponse(
        message="Sıfırlama bağlantısı hazırlandı. 30 dakika geçerlidir.",
        reset_token=token if settings.debug else None,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResponse:
    """Complete password reset with a valid token."""

    _prune_expired_tokens()

    entry = _RESET_TOKENS.get(body.token)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz veya süresi dolmuş sıfırlama bağlantısı.",
        )

    user_id, expires_at = entry
    if expires_at <= datetime.now(timezone.utc):
        _RESET_TOKENS.pop(body.token, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sıfırlama bağlantısının süresi dolmuş. Yeniden talep edin.",
        )

    user = await db.get(User, user_id)
    if not user or user.status != "active":
        _RESET_TOKENS.pop(body.token, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kullanıcı bulunamadı ya da aktif değil.",
        )

    user.password_hash = hash_password(body.new_password)
    await db.commit()

    # One-shot: invalidate the used token
    _RESET_TOKENS.pop(body.token, None)

    logger.info("Password reset completed for user_id=%s email=%s", user.id, user.email)
    return ResetPasswordResponse(message="Şifre başarıyla güncellendi.")
