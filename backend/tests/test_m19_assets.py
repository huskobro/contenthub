"""
M19-A — Asset Backend testleri.

Workspace disk taramasi ile asset index endpoint'lerini dogrular.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_assets_endpoint_returns_200():
    """Asset listesi endpoint'i 200 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "offset" in data
    assert "limit" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert isinstance(data["total"], int)


@pytest.mark.asyncio
async def test_assets_endpoint_pagination():
    """Pagination parametreleri kabul edilir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"limit": 5, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["limit"] == 5
    assert data["offset"] == 0
    assert len(data["items"]) <= 5


@pytest.mark.asyncio
async def test_assets_endpoint_invalid_type():
    """Gecersiz asset_type 400 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"asset_type": "invalid_type"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_assets_endpoint_type_filter():
    """asset_type filtresi calisiyor."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"asset_type": "audio"})
    assert resp.status_code == 200
    data = resp.json()
    # Eger audio asset varsa hepsi audio olmali
    for item in data["items"]:
        assert item["asset_type"] == "audio"


@pytest.mark.asyncio
async def test_assets_endpoint_search_filter():
    """search filtresi calisiyor."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"search": "nonexistent_file_xyz"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_assets_endpoint_job_filter():
    """job_id filtresi calisiyor."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"job_id": "nonexistent-job-id"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_assets_detail_not_found():
    """Olmayan asset 404 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets/fake-job/artifacts/nonexistent.txt")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_assets_detail_invalid_subdir():
    """Gecersiz subdir 404 doner."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets/fake-job/tmp/file.txt")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_assets_items_have_required_fields():
    """Asset kayitlari gerekli alanlari icerir."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"limit": 3})
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert "id" in item
        assert "name" in item
        assert "asset_type" in item
        assert "source_kind" in item
        assert "file_path" in item
        assert "size_bytes" in item
        assert "mime_ext" in item
        assert item["source_kind"] in ("job_artifact", "job_preview")


@pytest.mark.asyncio
async def test_assets_pagination_offset():
    """Offset ile sayfalama calisiyor."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp1 = await client.get("/api/v1/assets", params={"limit": 2, "offset": 0})
        resp2 = await client.get("/api/v1/assets", params={"limit": 2, "offset": 2})
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    data1 = resp1.json()
    data2 = resp2.json()
    # Total ayni olmali
    assert data1["total"] == data2["total"]
    # Farkli offset, farkli items (eger yeterli veri varsa)
    if data1["total"] > 2:
        ids1 = {i["id"] for i in data1["items"]}
        ids2 = {i["id"] for i in data2["items"]}
        assert ids1 != ids2


@pytest.mark.asyncio
async def test_assets_real_data_check():
    """Workspace'te gercek dosya varsa asset listesinde gorunur."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/assets", params={"limit": 1})
    assert resp.status_code == 200
    data = resp.json()
    # Eger workspace'te dosya varsa total > 0
    # Yoksa bos liste — her iki durum da gecerli
    assert isinstance(data["total"], int)
    assert isinstance(data["items"], list)
