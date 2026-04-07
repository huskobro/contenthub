import sys
import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.db.session import AsyncSessionLocal

router = APIRouter()
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str  # "ok" | "degraded" | "error"
    app: str
    python_version: str
    venv_active: bool
    db_connected: bool
    db_wal_mode: bool
    db_error: Optional[str] = None


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    from app.core.config import settings
    from sqlalchemy import text

    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    venv_active = sys.prefix != sys.base_prefix

    db_connected = False
    db_wal_mode = False
    db_error = None

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT 1"))
            result.scalar()
            db_connected = True

            wal_result = await db.execute(text("PRAGMA journal_mode"))
            wal_mode = wal_result.scalar()
            db_wal_mode = (wal_mode == "wal")
    except Exception as exc:
        db_error = str(exc)[:200]
        logger.warning("Health check DB error: %s", db_error)

    if db_connected:
        status = "ok"
    else:
        status = "error"

    return HealthResponse(
        status=status,
        app=settings.app_name,
        python_version=python_version,
        venv_active=venv_active,
        db_connected=db_connected,
        db_wal_mode=db_wal_mode,
        db_error=db_error,
    )
