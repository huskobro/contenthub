"""
PHASE Z-C — Workspace / artifact hardening tests.

Kapsam:
  A) workspace_path authoritative: job kaydındaki workspace_path artifact
     dizin çözümünde kullanılıyor mu?
  B) Orphan job (owner_id=NULL) — non-admin 403, admin erişebiliyor.
  C) Cross-user artifact erişimi — user B, user A'nın job'ının artifact'ine
     GET atınca 403 almalı.
  D) Path-traversal guard — `../../etc/passwd` tarzı path 404.
  E) Missing artifact dosyası — 404, exception sızdırmıyor.
  F) Artifact list stabil: job.workspace_path boşsa global fallback'e düşüyor.

Testler PHASE X ownership davranışını doğrular ve workspace isolation
contract'ını hardening düzeyinde ölçer — prod davranış değişmez.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job, User


async def _make_user(
    db: AsyncSession, *, slug: str, role: str = "user"
) -> User:
    u = User(
        email=f"{slug}@test.local",
        display_name=slug.replace("-", " ").title(),
        slug=slug,
        role=role,
        status="active",
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def _make_job(
    db: AsyncSession, *, owner_id, workspace_path: str | None = None
) -> Job:
    j = Job(
        module_type="standard_video",
        status="succeeded",
        owner_id=owner_id,
        workspace_path=workspace_path,
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return j


def _make_token(user: User) -> str:
    from app.auth.jwt import create_access_token
    return create_access_token({"sub": user.id})


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {_make_token(user)}"}


# ===========================================================================
# A) workspace_path authoritative
# ===========================================================================


@pytest.mark.asyncio
async def test_artifact_list_uses_workspace_path_from_db(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    """Job.workspace_path DB'de setse artifact listeleme oradan okumali."""
    user = await _make_user(db_session, slug="z-ws-1-a")
    # user-scoped tarzda bir workspace kur
    ws = tmp_path / "users" / user.slug / "jobs" / "job-z-ws-1"
    (ws / "artifacts").mkdir(parents=True)
    (ws / "artifacts" / "final.mp4").write_bytes(b"FAKE-VIDEO")
    (ws / "artifacts" / "script.json").write_text('{"ok":true}')

    job = await _make_job(db_session, owner_id=user.id, workspace_path=str(ws))

    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts", headers=_headers(user)
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    names = [a["name"] for a in data["artifacts"]]
    assert "final.mp4" in names
    assert "script.json" in names


# ===========================================================================
# B) Orphan job (owner_id=NULL)
# ===========================================================================


@pytest.mark.asyncio
async def test_orphan_job_artifact_blocked_for_user(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    user = await _make_user(db_session, slug="z-ws-2-u")
    ws = tmp_path / "orphan-ws"
    (ws / "artifacts").mkdir(parents=True)
    (ws / "artifacts" / "out.txt").write_text("x")

    job = await _make_job(db_session, owner_id=None, workspace_path=str(ws))

    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts", headers=_headers(user)
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_orphan_job_artifact_allowed_for_admin(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    admin = await _make_user(db_session, slug="z-ws-2-a", role="admin")
    ws = tmp_path / "orphan-ws-admin"
    (ws / "artifacts").mkdir(parents=True)
    (ws / "artifacts" / "out.txt").write_text("x")

    job = await _make_job(db_session, owner_id=None, workspace_path=str(ws))

    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts", headers=_headers(admin)
    )
    assert resp.status_code == 200


# ===========================================================================
# C) Cross-user artifact serve blocked
# ===========================================================================


@pytest.mark.asyncio
async def test_cross_user_artifact_serve_blocked(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    """User B, user A'nin job'unun artifact dosyasini asla cekememeli."""
    user_a = await _make_user(db_session, slug="z-ws-3-a")
    user_b = await _make_user(db_session, slug="z-ws-3-b")

    ws = tmp_path / "users" / user_a.slug / "jobs" / "job-z-ws-3"
    (ws / "artifacts").mkdir(parents=True)
    (ws / "artifacts" / "secret.json").write_text('{"secret":"A-only"}')

    job_a = await _make_job(
        db_session, owner_id=user_a.id, workspace_path=str(ws)
    )

    # user B asli sahip degil
    resp = await raw_client.get(
        f"/api/v1/jobs/{job_a.id}/artifacts/secret.json",
        headers=_headers(user_b),
    )
    assert resp.status_code == 403

    # user A sahip — 200
    resp_a = await raw_client.get(
        f"/api/v1/jobs/{job_a.id}/artifacts/secret.json",
        headers=_headers(user_a),
    )
    assert resp_a.status_code == 200
    assert resp_a.text == '{"secret":"A-only"}'


# ===========================================================================
# D) Path-traversal guard
# ===========================================================================


@pytest.mark.asyncio
async def test_path_traversal_blocked(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    """'..' ile workspace disarisina erisim 404 ile red."""
    user = await _make_user(db_session, slug="z-ws-4")
    ws = tmp_path / "users" / user.slug / "jobs" / "job-z-ws-4"
    (ws / "artifacts").mkdir(parents=True)
    (ws / "artifacts" / "ok.txt").write_text("ok")

    # workspace disarisinda baska bir secret dosya
    (tmp_path / "secret.txt").write_text("SECRET")

    job = await _make_job(db_session, owner_id=user.id, workspace_path=str(ws))

    # /../secret.txt — relative_to basarisiz olmali
    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts/../../secret.txt",
        headers=_headers(user),
    )
    assert resp.status_code == 404

    # Absolute path denemesi — FastAPI {file_path:path} rel olarak alir,
    # yine de resolve sonrasi workspace_dir disi → 404
    resp2 = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts/..%2F..%2Fsecret.txt",
        headers=_headers(user),
    )
    assert resp2.status_code == 404


# ===========================================================================
# E) Missing artifact file
# ===========================================================================


@pytest.mark.asyncio
async def test_missing_artifact_returns_404(
    raw_client: AsyncClient, db_session: AsyncSession, tmp_path: Path
):
    user = await _make_user(db_session, slug="z-ws-5")
    ws = tmp_path / "users" / user.slug / "jobs" / "job-z-ws-5"
    (ws / "artifacts").mkdir(parents=True)
    job = await _make_job(db_session, owner_id=user.id, workspace_path=str(ws))

    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts/nonexistent.json",
        headers=_headers(user),
    )
    assert resp.status_code == 404


# ===========================================================================
# F) workspace_path yoksa global fallback
# ===========================================================================


@pytest.mark.asyncio
async def test_artifact_list_falls_back_to_global_workspace(
    raw_client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
):
    """job.workspace_path bos → ws.get_workspace_path(job_id) fallback."""
    from app.jobs import workspace as ws_mod

    # Global root'u test tmp'a yonlendir
    monkeypatch.setattr(ws_mod, "_workspace_root", tmp_path)

    user = await _make_user(db_session, slug="z-ws-6")
    job = await _make_job(db_session, owner_id=user.id, workspace_path=None)
    # Global layout: tmp_path/<job_id>/artifacts/
    art_dir = tmp_path / job.id / "artifacts"
    art_dir.mkdir(parents=True)
    (art_dir / "legacy.json").write_text("{}")

    resp = await raw_client.get(
        f"/api/v1/jobs/{job.id}/artifacts", headers=_headers(user)
    )
    assert resp.status_code == 200, resp.text
    names = [a["name"] for a in resp.json()["artifacts"]]
    assert "legacy.json" in names
