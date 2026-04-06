"""
Test konfigürasyon ve ortak fixture'lar.

M2-C6 notu: POST /jobs artık InputNormalizer ile modül doğrulaması yapıyor.
Bu nedenle test client'ı başlatılmadan önce global module_registry'e
standard_video modülü kaydedilmeli.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.modules.registry import module_registry
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.modules.news_bulletin.definition import NEWS_BULLETIN_MODULE


# Test ortamında global registry'e modülleri kaydet
# Lifespan bu testlerde çalışmaz; bu kayıt lifespan'ın eşdeğeri
module_registry.register(STANDARD_VIDEO_MODULE)
module_registry.register(NEWS_BULLETIN_MODULE)


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
