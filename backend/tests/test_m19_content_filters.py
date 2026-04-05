"""
M19-C — Content Library Backend Filters + Pagination testleri.

Standard video ve news bulletin list endpoint'lerinde
search, status, limit, offset filtrelerini dogrular.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


# ---------------------------------------------------------------------------
# Standard Video — filtre + pagination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_list_returns_200():
    """Standard video listesi 200 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/modules/standard-video")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_sv_list_pagination():
    """Standard video listesi limit/offset kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/standard-video",
            params={"limit": 2, "offset": 0},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) <= 2


@pytest.mark.asyncio
async def test_sv_list_search():
    """Standard video listesi search filtresi kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/standard-video",
            params={"search": "nonexistent_search_term_xyz"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_sv_list_status_filter():
    """Standard video listesi status filtresi kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/standard-video",
            params={"status": "draft"},
        )
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert item["status"] == "draft"


@pytest.mark.asyncio
async def test_sv_list_combined_filters():
    """Standard video listesi birden fazla filtre kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/standard-video",
            params={"status": "draft", "search": "test", "limit": 5, "offset": 0},
        )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# News Bulletin — filtre + pagination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nb_list_returns_200():
    """News bulletin listesi 200 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/modules/news-bulletin")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_nb_list_pagination():
    """News bulletin listesi limit/offset kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/news-bulletin",
            params={"limit": 2, "offset": 0},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) <= 2


@pytest.mark.asyncio
async def test_nb_list_search():
    """News bulletin listesi search filtresi kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/news-bulletin",
            params={"search": "nonexistent_search_term_xyz"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_nb_list_status_filter():
    """News bulletin listesi status filtresi kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/news-bulletin",
            params={"status": "draft"},
        )
    assert resp.status_code == 200
    data = resp.json()
    for item in data:
        assert item["status"] == "draft"


@pytest.mark.asyncio
async def test_nb_list_combined_filters():
    """News bulletin listesi birden fazla filtre kabul eder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/modules/news-bulletin",
            params={"status": "draft", "search": "test", "limit": 5, "offset": 0},
        )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
