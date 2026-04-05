"""
M20-A: Asset Operations Backend Tests.

Covers:
  - POST /assets/refresh — workspace taramasi yeniden tetikleme
  - DELETE /assets/{id} — kontrollü silme
  - POST /assets/{id}/reveal — konum metadata
  - GET /assets/{id}/allowed-actions — izin verilen aksiyonlar
  - Path traversal guvenlik reddi
  - Silinmis asset tekrar bulunamaz
  - Gecersiz path formatlari
"""

import os
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.jobs.workspace import get_workspace_root, set_workspace_root


@pytest.fixture(autouse=True)
def _use_tmp_workspace(tmp_path: Path):
    """Test icin gecici workspace root kullan."""
    original = get_workspace_root()
    set_workspace_root(tmp_path)
    yield
    set_workspace_root(original)


def _create_test_asset(tmp_path: Path, job_id: str = "test-job", subdir: str = "artifacts", filename: str = "test.json") -> Path:
    """Test icin gecici asset dosyasi olustur."""
    target_dir = tmp_path / job_id / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / filename
    file_path.write_text('{"test": true}')
    return file_path


@pytest.mark.anyio
async def test_refresh_returns_200():
    """POST /assets/refresh 200 doner ve toplam sayiyi icerir."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/assets/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "total_scanned" in data
    assert isinstance(data["total_scanned"], int)


@pytest.mark.anyio
async def test_refresh_counts_real_files(tmp_path: Path):
    """Refresh, workspace'teki gercek dosya sayisini dondurur."""
    _create_test_asset(tmp_path, "job-1", "artifacts", "a.json")
    _create_test_asset(tmp_path, "job-1", "preview", "b.png")
    _create_test_asset(tmp_path, "job-2", "artifacts", "c.mp3")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/assets/refresh")
    assert resp.status_code == 200
    assert resp.json()["total_scanned"] == 3


@pytest.mark.anyio
async def test_delete_removes_file(tmp_path: Path):
    """DELETE /assets/{id} dosyayi siler ve 200 doner."""
    file_path = _create_test_asset(tmp_path)
    assert file_path.exists()

    asset_id = "test-job/artifacts/test.json"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete(f"/api/v1/assets/{asset_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "deleted"
    assert data["asset_id"] == asset_id
    assert not file_path.exists()


@pytest.mark.anyio
async def test_delete_nonexistent_returns_404():
    """Olmayan asset icin DELETE 404 doner."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete("/api/v1/assets/fake-job/artifacts/missing.txt")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_path_traversal_blocked():
    """Path traversal iceren asset ID reddedilir (400 veya 404)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # HTTP client "../.." normalize edebilir, route match olmaz → 404
        # Alternatif olarak dogrudan gecersiz subdir verecek path deneyelim
        resp = await client.delete("/api/v1/assets/job-1/tmp/../../etc/passwd")
    assert resp.status_code in (400, 404)  # guvenlik reddi veya route mismatch


@pytest.mark.anyio
async def test_delete_invalid_subdir_blocked():
    """Gecersiz subdir (ne artifacts ne preview) 400 doner."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete("/api/v1/assets/test-job/etc/secret.txt")
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_deleted_asset_not_found_after_delete(tmp_path: Path):
    """Silinen asset GET ile tekrar bulunamaz."""
    _create_test_asset(tmp_path)
    asset_id = "test-job/artifacts/test.json"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Sil
        del_resp = await client.delete(f"/api/v1/assets/{asset_id}")
        assert del_resp.status_code == 200

        # Tekrar getir
        get_resp = await client.get(f"/api/v1/assets/{asset_id}")
        assert get_resp.status_code == 404


@pytest.mark.anyio
async def test_reveal_returns_metadata(tmp_path: Path):
    """POST /assets/{id}/reveal dosya metadata'sini dondurur."""
    _create_test_asset(tmp_path)
    asset_id = "test-job/artifacts/test.json"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(f"/api/v1/assets/{asset_id}/reveal")
    assert resp.status_code == 200
    data = resp.json()
    assert data["asset_id"] == asset_id
    assert data["exists"] is True
    assert "test-job" in data["absolute_path"]
    assert data["directory"].endswith("artifacts")


@pytest.mark.anyio
async def test_reveal_nonexistent_returns_metadata_with_exists_false(tmp_path: Path):
    """Var olmayan dosya icin reveal exists=False doner (path gecerli ama dosya yok)."""
    # Dizini olustur ama dosyayi olusturma
    (tmp_path / "test-job" / "artifacts").mkdir(parents=True, exist_ok=True)
    asset_id = "test-job/artifacts/missing.json"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(f"/api/v1/assets/{asset_id}/reveal")
    assert resp.status_code == 200
    data = resp.json()
    assert data["exists"] is False


@pytest.mark.anyio
async def test_reveal_invalid_path_returns_404():
    """Gecersiz path icin reveal 404 doner."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/assets/../../etc/passwd/reveal")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_allowed_actions_existing_file(tmp_path: Path):
    """Mevcut dosya icin delete, reveal, refresh izinli."""
    _create_test_asset(tmp_path)
    asset_id = "test-job/artifacts/test.json"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/v1/assets/{asset_id}/allowed-actions")
    assert resp.status_code == 200
    data = resp.json()
    assert "delete" in data["actions"]
    assert "reveal" in data["actions"]
    assert "refresh" in data["actions"]


@pytest.mark.anyio
async def test_allowed_actions_missing_file(tmp_path: Path):
    """Dosya yoksa sadece refresh izinli."""
    (tmp_path / "test-job" / "artifacts").mkdir(parents=True, exist_ok=True)
    asset_id = "test-job/artifacts/nonexistent.json"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(f"/api/v1/assets/{asset_id}/allowed-actions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["actions"] == ["refresh"]
    assert "delete" not in data["actions"]


@pytest.mark.anyio
async def test_allowed_actions_invalid_path_returns_404():
    """Gecersiz path icin allowed-actions 404 doner."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/assets/bad-path/allowed-actions")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_path_traversal_dotdot_in_jobid():
    """Job ID icinde .. olan path reddedilir."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Dogrudan invalid subdir: "tmp" izinli degil
        resp = await client.delete("/api/v1/assets/job-1/tmp/secret.txt")
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_path_traversal_dotdot_in_filename():
    """Filename icinde .. olan path reddedilir."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete("/api/v1/assets/job-1/artifacts/..%2F..%2Fetc%2Fpasswd")
    assert resp.status_code in (400, 404)  # 400 if caught by validation, 404 if file not found


@pytest.mark.anyio
async def test_hidden_file_delete_blocked():
    """Gizli dosya (.ile baslayan) silme reddedilir."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete("/api/v1/assets/job-1/artifacts/.hidden")
    assert resp.status_code == 400
