"""
M22 Backend Tests — Visibility, Settings, Publish, Content Library hardening.

M22-A: Visibility delete, bulk status
M22-B: Settings delete, bulk update
M22-C: Publish executor payload validation
M22-D: Content library SQL UNION ALL
"""

import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

def _uid() -> str:
    return uuid.uuid4().hex[:8]

BASE = "/api/v1"


@pytest.fixture()
def anyio_backend():
    return "asyncio"


@pytest.fixture()
async def client():
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ─── M22-A: Visibility Delete & Bulk ────────────────────────


@pytest.mark.anyio
async def test_visibility_delete_rule(client: AsyncClient):
    """Visibility kuralı soft-delete edilebilmeli."""
    # Kural oluştur
    create_r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": "test:m22-delete",
        "visible": True,
        "read_only": False,
    })
    assert create_r.status_code == 201
    rule_id = create_r.json()["id"]

    # Sil (soft-delete)
    del_r = await client.delete(f"{BASE}/visibility-rules/{rule_id}")
    assert del_r.status_code == 200
    body = del_r.json()
    assert body["status"] == "inactive"
    assert body["id"] == rule_id


@pytest.mark.anyio
async def test_visibility_delete_already_inactive(client: AsyncClient):
    """Zaten inactive kuralı tekrar silmek 409 dönmeli."""
    create_r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": "test:m22-double-delete",
        "visible": True,
        "status": "inactive",
    })
    assert create_r.status_code == 201
    rule_id = create_r.json()["id"]

    del_r = await client.delete(f"{BASE}/visibility-rules/{rule_id}")
    assert del_r.status_code == 409


@pytest.mark.anyio
async def test_visibility_delete_not_found(client: AsyncClient):
    """Olmayan kural silme 404 dönmeli."""
    del_r = await client.delete(f"{BASE}/visibility-rules/nonexistent")
    assert del_r.status_code == 404


@pytest.mark.anyio
async def test_visibility_bulk_status(client: AsyncClient):
    """Toplu status güncellemesi çalışmalı."""
    # İki kural oluştur
    r1 = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page", "target_key": "test:m22-bulk-1", "visible": True,
    })
    r2 = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page", "target_key": "test:m22-bulk-2", "visible": True,
    })
    id1 = r1.json()["id"]
    id2 = r2.json()["id"]

    # Toplu inactive yap
    bulk_r = await client.post(f"{BASE}/visibility-rules/bulk-status", json={
        "rule_ids": [id1, id2],
        "status": "inactive",
    })
    assert bulk_r.status_code == 200
    body = bulk_r.json()
    assert len(body) == 2
    assert all(item["status"] == "inactive" for item in body)


@pytest.mark.anyio
async def test_visibility_resolve_after_delete(client: AsyncClient):
    """Soft-delete sonrası resolve varsayılan dönmeli (kural artık aktif değil)."""
    # Aktif kural oluştur (visible=false)
    create_r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": "test:m22-resolve-delete",
        "visible": False,
        "priority": 100,
    })
    rule_id = create_r.json()["id"]

    # Resolve — visible=false olmalı
    res1 = await client.get(f"{BASE}/visibility-rules/resolve?target_key=test:m22-resolve-delete")
    assert res1.json()["visible"] is False

    # Soft-delete
    await client.delete(f"{BASE}/visibility-rules/{rule_id}")

    # Resolve — artık varsayılan (visible=true) olmalı
    res2 = await client.get(f"{BASE}/visibility-rules/resolve?target_key=test:m22-resolve-delete")
    assert res2.json()["visible"] is True


# ─── M22-B: Settings Delete & Bulk ──────────────────────────


@pytest.mark.anyio
async def test_settings_delete(client: AsyncClient):
    """Settings soft-delete çalışmalı."""
    # Ayar oluştur
    create_r = await client.post(f"{BASE}/settings", json={
        "key": f"test.m22.delete_{_uid()}",
        "group_name": "test",
        "type": "string",
    })
    assert create_r.status_code == 201
    setting_id = create_r.json()["id"]

    # Sil
    del_r = await client.delete(f"{BASE}/settings/{setting_id}")
    assert del_r.status_code == 200
    assert del_r.json()["status"] == "deleted"


@pytest.mark.anyio
async def test_settings_delete_already_deleted(client: AsyncClient):
    """Zaten deleted ayarı tekrar silmek 409 dönmeli."""
    create_r = await client.post(f"{BASE}/settings", json={
        "key": f"test.m22.double_delete_{_uid()}",
        "group_name": "test",
        "type": "string",
    })
    setting_id = create_r.json()["id"]
    await client.delete(f"{BASE}/settings/{setting_id}")

    del_r2 = await client.delete(f"{BASE}/settings/{setting_id}")
    assert del_r2.status_code == 409


@pytest.mark.anyio
async def test_settings_bulk_update(client: AsyncClient):
    """Toplu admin_value güncelleme çalışmalı."""
    uid = _uid()
    key1 = f"test.m22.bulk1_{uid}"
    key2 = f"test.m22.bulk2_{uid}"
    # İki ayar oluştur
    await client.post(f"{BASE}/settings", json={
        "key": key1, "group_name": "test", "type": "string",
    })
    await client.post(f"{BASE}/settings", json={
        "key": key2, "group_name": "test", "type": "integer",
    })

    # Toplu güncelle
    bulk_r = await client.post(f"{BASE}/settings/bulk-update", json={
        "updates": [
            {"key": key1, "value": "new_value"},
            {"key": key2, "value": 42},
        ],
    })
    assert bulk_r.status_code == 200
    body = bulk_r.json()
    assert len(body) >= 2


# ─── M22-C: Publish Executor Payload Validation ─────────────


@pytest.mark.anyio
async def test_publish_executor_rejects_empty_payload():
    """Publish executor boş payload ile ValueError fırlatmalı."""
    from app.publish.executor import PublishStepExecutor
    from unittest.mock import MagicMock

    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-record"
    record.payload_json = None

    with pytest.raises(ValueError, match="payload_json boş"):
        executor._resolve_payload(record)


@pytest.mark.anyio
async def test_publish_executor_rejects_invalid_json():
    """Publish executor bozuk JSON ile ValueError fırlatmalı."""
    from app.publish.executor import PublishStepExecutor
    from unittest.mock import MagicMock

    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-record"
    record.payload_json = "not-valid-json{{"

    with pytest.raises(ValueError, match="parse edilemedi"):
        executor._resolve_payload(record)


@pytest.mark.anyio
async def test_publish_executor_rejects_missing_title():
    """Publish executor title'sız payload ile ValueError fırlatmalı."""
    from app.publish.executor import PublishStepExecutor
    from unittest.mock import MagicMock

    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-record"
    record.payload_json = json.dumps({"description": "desc", "tags": []})

    with pytest.raises(ValueError, match="title.*eksik"):
        executor._resolve_payload(record)


@pytest.mark.anyio
async def test_publish_executor_accepts_valid_payload():
    """Publish executor geçerli payload ile dict dönmeli."""
    from app.publish.executor import PublishStepExecutor
    from unittest.mock import MagicMock

    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-record"
    record.payload_json = json.dumps({"title": "Test Video", "description": "desc", "tags": ["a"]})

    result = executor._resolve_payload(record)
    assert result["title"] == "Test Video"
    assert result["description"] == "desc"


# ─── M22-D: Content Library SQL UNION ALL ────────────────────


@pytest.mark.anyio
async def test_content_library_sql_union(client: AsyncClient):
    """Content library SQL UNION ALL ile birleşik döndürülmeli."""
    # Birer kayıt oluştur
    await client.post(f"{BASE}/modules/standard-video", json={"topic": "M22 SQL Test SV"})
    await client.post(f"{BASE}/modules/news-bulletin", json={"topic": "M22 SQL Test NB"})

    r = await client.get(f"{BASE}/content-library?search=M22 SQL Test")
    assert r.status_code == 200
    body = r.json()
    types = {item["content_type"] for item in body["items"]}
    assert "standard_video" in types or "news_bulletin" in types


@pytest.mark.anyio
async def test_content_library_has_script_metadata_fields(client: AsyncClient):
    """has_script ve has_metadata alanları doğru dönmeli."""
    r = await client.get(f"{BASE}/content-library?limit=5")
    assert r.status_code == 200
    body = r.json()
    for item in body["items"]:
        assert isinstance(item["has_script"], bool)
        assert isinstance(item["has_metadata"], bool)


@pytest.mark.anyio
async def test_content_library_sorting_consistency(client: AsyncClient):
    """Sonuçlar created_at DESC sıralı olmalı."""
    r = await client.get(f"{BASE}/content-library?limit=50")
    assert r.status_code == 200
    items = r.json()["items"]
    if len(items) > 1:
        dates = [item["created_at"] for item in items if item["created_at"]]
        assert dates == sorted(dates, reverse=True)


@pytest.mark.anyio
async def test_content_library_pagination_sql(client: AsyncClient):
    """SQL-level pagination doğru çalışmalı."""
    # Toplam al
    r_all = await client.get(f"{BASE}/content-library?limit=100")
    total = r_all.json()["total"]

    if total >= 2:
        r_p1 = await client.get(f"{BASE}/content-library?limit=1&offset=0")
        r_p2 = await client.get(f"{BASE}/content-library?limit=1&offset=1")
        p1_items = r_p1.json()["items"]
        p2_items = r_p2.json()["items"]
        assert len(p1_items) == 1
        assert len(p2_items) == 1
        assert p1_items[0]["id"] != p2_items[0]["id"]


# ─── M22-E: Upload 201 Status Code ──────────────────────────


@pytest.mark.anyio
async def test_upload_returns_201(client: AsyncClient):
    """Upload endpoint artık 201 dönmeli."""
    import uuid as _uuid
    fname = f"m22_{_uuid.uuid4().hex[:8]}.txt"
    import io
    files = {"file": (fname, io.BytesIO(b"m22 test data"), "text/plain")}
    r = await client.post(f"{BASE}/assets/upload", files=files)
    assert r.status_code == 201
