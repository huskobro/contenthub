from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    app: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    from app.core.config import settings

    return HealthResponse(status="ok", app=settings.app_name)
