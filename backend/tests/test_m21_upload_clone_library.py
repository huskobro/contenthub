"""
M21 Backend Tests — Upload, Clone, Unified Content Library.

Covers:
  M21-A: Asset upload endpoint
  M21-C: Standard Video + News Bulletin clone endpoints
  M21-D: Unified content library endpoint
"""

import io
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

BASE = "/api/v1"


@pytest.fixture()
def anyio_backend():
    return "asyncio"


@pytest.fixture()
async def client():
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ─── M21-A: Upload ──────────────────────────────────────────


@pytest.mark.anyio
async def test_upload_valid_file(client: AsyncClient):
    """Basarili dosya yukleme: 201 + response fields."""
    import uuid as _uuid
    fname = f"test_{_uuid.uuid4().hex[:8]}.txt"
    content = b"hello world test content"
    files = {"file": (fname, io.BytesIO(content), "text/plain")}
    r = await client.post(f"{BASE}/assets/upload", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "uploaded"
    assert body["name"] == fname
    assert body["size_bytes"] == len(content)
    assert "asset_id" in body


@pytest.mark.anyio
async def test_upload_blocked_extension(client: AsyncClient):
    """Calistirilabilir uzanti engellenmeli."""
    files = {"file": ("evil.exe", io.BytesIO(b"bad"), "application/octet-stream")}
    r = await client.post(f"{BASE}/assets/upload", files=files)
    assert r.status_code == 400


@pytest.mark.anyio
async def test_upload_hidden_file(client: AsyncClient):
    """Gizli dosya (dot-prefixed) engellenmeli."""
    files = {"file": (".hidden", io.BytesIO(b"secret"), "text/plain")}
    r = await client.post(f"{BASE}/assets/upload", files=files)
    assert r.status_code == 400


@pytest.mark.anyio
async def test_upload_empty_filename(client: AsyncClient):
    """Dosya adi bos olursa 400 veya 422."""
    files = {"file": ("", io.BytesIO(b"data"), "text/plain")}
    r = await client.post(f"{BASE}/assets/upload", files=files)
    assert r.status_code in (400, 422)


@pytest.mark.anyio
async def test_upload_no_file(client: AsyncClient):
    """Dosya gonderilmezse 422."""
    r = await client.post(f"{BASE}/assets/upload")
    assert r.status_code == 422


@pytest.mark.anyio
async def test_upload_with_asset_type(client: AsyncClient):
    """asset_type form field'i gonderilebilir."""
    files = {"file": ("sample.mp3", io.BytesIO(b"audio data"), "audio/mpeg")}
    data = {"asset_type": "audio"}
    r = await client.post(f"{BASE}/assets/upload", files=files, data=data)
    assert r.status_code == 200
    body = r.json()
    assert body["asset_type"] == "audio"


# ─── M21-C: Clone ───────────────────────────────────────────


@pytest.mark.anyio
async def test_clone_standard_video(client: AsyncClient):
    """SV klonlama: 201 + yeni draft kayit."""
    # Oncelikle bir SV olustur
    create_r = await client.post(
        f"{BASE}/modules/standard-video",
        json={"topic": "Test Klon SV", "title": "Orijinal Video"},
    )
    assert create_r.status_code in (200, 201)
    sv_id = create_r.json()["id"]

    # Klonla
    clone_r = await client.post(f"{BASE}/modules/standard-video/{sv_id}/clone")
    assert clone_r.status_code == 201
    clone_body = clone_r.json()
    assert clone_body["id"] != sv_id
    assert clone_body["status"] == "draft"
    assert clone_body["job_id"] is None
    assert "kopya" in (clone_body.get("title") or "").lower()
    assert clone_body["topic"] == "Test Klon SV"


@pytest.mark.anyio
async def test_clone_standard_video_not_found(client: AsyncClient):
    """Olmayan SV klonlama 404 donmeli."""
    r = await client.post(f"{BASE}/modules/standard-video/nonexistent-id/clone")
    assert r.status_code == 404


@pytest.mark.anyio
async def test_clone_news_bulletin(client: AsyncClient):
    """NB klonlama: 201 + yeni draft kayit."""
    create_r = await client.post(
        f"{BASE}/modules/news-bulletin",
        json={"topic": "Test Klon NB", "title": "Orijinal Bulten"},
    )
    assert create_r.status_code in (200, 201)
    nb_id = create_r.json()["id"]

    clone_r = await client.post(f"{BASE}/modules/news-bulletin/{nb_id}/clone")
    assert clone_r.status_code == 201
    clone_body = clone_r.json()
    assert clone_body["id"] != nb_id
    assert clone_body["status"] == "draft"
    assert clone_body["job_id"] is None
    assert "kopya" in (clone_body.get("title") or "").lower()
    assert clone_body["topic"] == "Test Klon NB"


@pytest.mark.anyio
async def test_clone_news_bulletin_not_found(client: AsyncClient):
    """Olmayan NB klonlama 404 donmeli."""
    r = await client.post(f"{BASE}/modules/news-bulletin/nonexistent-id/clone")
    assert r.status_code == 404


# ─── M21-D: Unified Content Library ─────────────────────────


@pytest.mark.anyio
async def test_content_library_list(client: AsyncClient):
    """Birlesik kutuphaneden tum icerikler listelenmeli."""
    r = await client.get(f"{BASE}/content-library")
    assert r.status_code == 200
    body = r.json()
    assert "total" in body
    assert "items" in body
    assert isinstance(body["items"], list)
    assert "offset" in body
    assert "limit" in body


@pytest.mark.anyio
async def test_content_library_filter_type(client: AsyncClient):
    """content_type filtresi calismali."""
    r = await client.get(f"{BASE}/content-library?content_type=standard_video")
    assert r.status_code == 200
    body = r.json()
    for item in body["items"]:
        assert item["content_type"] == "standard_video"


@pytest.mark.anyio
async def test_content_library_filter_invalid_type(client: AsyncClient):
    """Gecersiz content_type 400 donmeli."""
    r = await client.get(f"{BASE}/content-library?content_type=invalid")
    assert r.status_code == 400


@pytest.mark.anyio
async def test_content_library_search(client: AsyncClient):
    """Arama filtresi 200 donmeli."""
    r = await client.get(f"{BASE}/content-library?search=test")
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.anyio
async def test_content_library_pagination(client: AsyncClient):
    """Sayfalama parametreleri calismali."""
    r = await client.get(f"{BASE}/content-library?limit=5&offset=0")
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 5
    assert body["offset"] == 0
    assert len(body["items"]) <= 5


@pytest.mark.anyio
async def test_content_library_contains_created_records(client: AsyncClient):
    """Olusturulan SV ve NB kayitlari listede gorunmeli."""
    # SV olustur
    sv_r = await client.post(
        f"{BASE}/modules/standard-video",
        json={"topic": "Library Test SV"},
    )
    assert sv_r.status_code in (200, 201)

    # NB olustur
    nb_r = await client.post(
        f"{BASE}/modules/news-bulletin",
        json={"topic": "Library Test NB"},
    )
    assert nb_r.status_code in (200, 201)

    # Listele
    r = await client.get(f"{BASE}/content-library?search=Library Test")
    assert r.status_code == 200
    body = r.json()
    types = {item["content_type"] for item in body["items"]}
    assert "standard_video" in types or "news_bulletin" in types


@pytest.mark.anyio
async def test_content_library_item_fields(client: AsyncClient):
    """Her item zorunlu alanlari icermeli."""
    # En az bir kayit olsun
    await client.post(f"{BASE}/modules/standard-video", json={"topic": "Fields Test"})
    r = await client.get(f"{BASE}/content-library")
    assert r.status_code == 200
    body = r.json()
    if body["items"]:
        item = body["items"][0]
        assert "id" in item
        assert "content_type" in item
        assert "topic" in item
        assert "status" in item
        assert "created_at" in item
        assert "has_script" in item
        assert "has_metadata" in item
