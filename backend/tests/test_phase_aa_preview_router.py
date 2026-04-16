"""
PHASE AA — Preview router ownership + surface tests.

Kontrat:
  GET /api/v1/jobs/{job_id}/previews
  GET /api/v1/jobs/{job_id}/previews?scope=preview
  GET /api/v1/jobs/{job_id}/previews?scope=final
  GET /api/v1/jobs/{job_id}/previews/latest

Ownership kurallari jobs/router._enforce_job_ownership ile ayni:
  - admin her job'a erisir
  - user kendi jobna erisir
  - orphan job (owner_id=None) non-admin'e 403
  - baska user'in jobuna erisim 403
"""
from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, User

pytestmark = pytest.mark.asyncio


BASE = "/api/v1/jobs"


async def _make_job_with_workspace(
    db: AsyncSession,
    owner: User | None,
    workspace: Path,
) -> Job:
    job = Job(
        owner_id=owner.id if owner else None,
        module_type="standard_video",
        status="running",
        input_data_json="{}",
        workspace_path=str(workspace),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


def _write_artifacts(workspace: Path, files: dict[str, bytes | int]) -> None:
    art = workspace / "artifacts"
    art.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        if isinstance(content, int):
            (art / name).write_bytes(b"x" * content)
        else:
            (art / name).write_bytes(content)


# ---------------------------------------------------------------------------
# Happy path — admin + user kendi isine erisir
# ---------------------------------------------------------------------------


async def test_list_previews_classifies_preview_and_final(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(
        tmp_path,
        {
            "preview_mini.mp4": 100,
            "preview_frame.jpg": 50,
            "final.mp4": 2000,
            "script.json": 30,
            "tmp_discarded.json": 5,  # hidden — gozukmemeli
        },
    )

    resp = await client.get(f"{BASE}/{job.id}/previews", headers=user_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["job_id"] == job.id
    assert body["total"] == 4
    assert body["preview_count"] == 2
    assert body["final_count"] == 2

    names_by_scope: dict[str, set[str]] = {"preview": set(), "final": set()}
    for e in body["entries"]:
        names_by_scope[e["scope"]].add(e["name"])
    assert names_by_scope["preview"] == {"preview_mini.mp4", "preview_frame.jpg"}
    assert names_by_scope["final"] == {"final.mp4", "script.json"}


async def test_list_previews_scope_filter_preview(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(
        tmp_path,
        {"preview_mini.mp4": 100, "final.mp4": 500},
    )

    resp = await client.get(
        f"{BASE}/{job.id}/previews?scope=preview", headers=user_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["preview_count"] == 1
    assert body["entries"][0]["name"] == "preview_mini.mp4"
    assert body["entries"][0]["scope"] == "preview"


async def test_list_previews_scope_filter_final(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(
        tmp_path,
        {"preview_mini.mp4": 100, "final.mp4": 500, "metadata.json": 20},
    )

    resp = await client.get(
        f"{BASE}/{job.id}/previews?scope=final", headers=user_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert body["final_count"] == 2
    names = {e["name"] for e in body["entries"]}
    assert names == {"final.mp4", "metadata.json"}


async def test_list_previews_empty_job_workspace(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    # hic dosya yok
    resp = await client.get(f"{BASE}/{job.id}/previews", headers=user_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["entries"] == []


async def test_list_previews_invalid_scope_422(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    resp = await client.get(
        f"{BASE}/{job.id}/previews?scope=garbage", headers=user_headers
    )
    assert resp.status_code == 422


async def test_list_previews_unknown_job_404(
    client: AsyncClient,
    user_headers: dict[str, str],
) -> None:
    resp = await client.get(
        f"{BASE}/00000000-0000-0000-0000-000000000000/previews",
        headers=user_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Ownership — cross-user, orphan, admin bypass
# ---------------------------------------------------------------------------


async def test_user_cannot_see_other_users_job_previews(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    """regular_user, admin_user'in jobu'nun preview'larini goremez."""
    job = await _make_job_with_workspace(db_session, admin_user, tmp_path)
    _write_artifacts(tmp_path, {"preview_mini.mp4": 100})

    resp = await client.get(f"{BASE}/{job.id}/previews", headers=user_headers)
    assert resp.status_code == 403


async def test_orphan_job_403_for_non_admin(
    client: AsyncClient,
    db_session: AsyncSession,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    """owner_id=None job sadece admin icin acik."""
    job = await _make_job_with_workspace(db_session, None, tmp_path)
    _write_artifacts(tmp_path, {"preview_mini.mp4": 100})
    resp = await client.get(f"{BASE}/{job.id}/previews", headers=user_headers)
    assert resp.status_code == 403


async def test_admin_can_see_any_job_previews(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(tmp_path, {"preview_mini.mp4": 100})
    resp = await client.get(f"{BASE}/{job.id}/previews", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1


async def test_admin_can_see_orphan_job_previews(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, None, tmp_path)
    _write_artifacts(tmp_path, {"preview_frame.jpg": 100})
    resp = await client.get(f"{BASE}/{job.id}/previews", headers=admin_headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# latest endpoint
# ---------------------------------------------------------------------------


async def test_latest_preview_404_when_no_preview(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(tmp_path, {"final.mp4": 100, "script.json": 20})
    resp = await client.get(
        f"{BASE}/{job.id}/previews/latest", headers=user_headers
    )
    assert resp.status_code == 404


async def test_latest_preview_returns_most_recent(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    import os
    import time

    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(
        tmp_path,
        {"preview_frame.jpg": 100, "preview_mini.mp4": 200, "final.mp4": 500},
    )
    art = tmp_path / "artifacts"
    os.utime(art / "preview_frame.jpg", (time.time() - 120, time.time() - 120))
    os.utime(art / "preview_mini.mp4", (time.time(), time.time()))
    # final.mp4 preview degil — secim rekabetinden hariç kalmali.
    os.utime(art / "final.mp4", (time.time() + 60, time.time() + 60))

    resp = await client.get(
        f"{BASE}/{job.id}/previews/latest", headers=user_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "preview_mini.mp4"
    assert body["scope"] == "preview"


async def test_latest_preview_ownership_enforced(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    """Baska user'in job'unun latest preview'u 403."""
    job = await _make_job_with_workspace(db_session, admin_user, tmp_path)
    _write_artifacts(tmp_path, {"preview_mini.mp4": 100})
    resp = await client.get(
        f"{BASE}/{job.id}/previews/latest", headers=user_headers
    )
    assert resp.status_code == 403


async def test_latest_preview_unknown_job_404(
    client: AsyncClient,
    user_headers: dict[str, str],
) -> None:
    resp = await client.get(
        f"{BASE}/00000000-0000-0000-0000-000000000000/previews/latest",
        headers=user_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Download yolu parallel degil — mevcut artifacts endpoint'i calismali
# ---------------------------------------------------------------------------


async def test_preview_download_uses_existing_artifacts_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict[str, str],
    tmp_path: Path,
) -> None:
    """
    Preview dosyasi indirme ayri bir route KURMUYORUZ — mevcut
    /api/v1/jobs/{id}/artifacts/{path} endpoint'i kullanilir.
    Bu test o contract'in bozulmadigini garanti eder.
    """
    job = await _make_job_with_workspace(db_session, regular_user, tmp_path)
    _write_artifacts(tmp_path, {"preview_mini.mp4": b"VIDEO_BYTES"})

    # Ayni endpoint (artifact serve) preview dosyasini da servis etmeli.
    resp = await client.get(
        f"{BASE}/{job.id}/artifacts/preview_mini.mp4",
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.content == b"VIDEO_BYTES"
