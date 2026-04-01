from fastapi import FastAPI
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.router import api_router


def create_app() -> FastAPI:
    setup_logging(debug=settings.debug)

    app = FastAPI(
        title=settings.app_name,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()
