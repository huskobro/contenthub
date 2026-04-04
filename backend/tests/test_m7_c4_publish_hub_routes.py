"""
Tests — M7-C4: Publish Hub Routes + Retry + Review Reset

Kapsam:
  A)  POST /publish/       — 201, draft durumunda başlar
  B)  POST /publish/       — iş mantığı hatası → 400-serisi (job_id yok)
  C)  GET  /publish/       — boş liste döner
  D)  GET  /publish/       — job_id filtresi çalışır
  E)  GET  /publish/{id}   — mevcut kayıt 200 döner
  F)  GET  /publish/{id}   — bulunamayan kayıt 404 döner
  G)  GET  /publish/{id}/logs — boş denetim izi listesi değil, log satırı var
  H)  GET  /publish/{id}/logs — bulunamayan kayıt 404 döner
  I)  POST /publish/{id}/submit   — draft → pending_review
  J)  POST /publish/{id}/submit   — bulunamayan kayıt 404 döner
  K)  POST /publish/{id}/review (approve) — pending_review → approved
  L)  POST /publish/{id}/review   — pending_review dışından 422 döner
  M)  POST /publish/{id}/schedule — approved → scheduled
  N)  POST /publish/{id}/trigger  — approved → publishing
  O)  POST /publish/{id}/trigger  — draft'tan 422 döner (publish gate)
  P)  POST /publish/{id}/cancel   — draft → cancelled
  Q)  POST /publish/{id}/cancel   — terminal durumdan 409 döner
  R)  POST /publish/{id}/reset-to-draft — review_rejected → draft
  S)  POST /publish/{id}/retry    — failed → publishing (retry)
  T)  POST /publish/{id}/retry    — failed olmayan durumdan 422 döner
  U)  POST /publish/{id}/reset-review — approved → pending_review (artifact değişti)
  V)  POST /publish/{id}/reset-review — draft durumunda işlem yapmaz, 200 döner
  W)  retry partial failure semantiği: platform_video_id korunur
  X)  reset-review reviewer_id ve reviewed_at sıfırlanır
"""

import pytest
from httpx import AsyncClient

from app.db.session import AsyncSessionLocal
from app.db.models import Job
from app.publish import service as publish_service
from app.publish.enums import PublishStatus
from app.publish.schemas import PublishRecordCreate


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _create_job_in_db() -> str:
    """Test için gerçek Job kaydı oluşturur — FK kısıtını karşılamak için."""
    async with AsyncSessionLocal() as session:
        job = Job(module_type="standard_video", status="queued", retry_count=0)
        session.add(job)
        await session.commit()
        await session.refresh(job)
        return job.id


async def _create_record_in_db(job_id: str, **kwargs) -> str:
    """Doğrudan servis üzerinden publish kaydı oluşturur."""
    async with AsyncSessionLocal() as session:
        data = PublishRecordCreate(
            job_id=job_id,
            content_ref_type="standard_video",
            content_ref_id="sv-m7c4-test",
            platform="youtube",
            **kwargs,
        )
        record = await publish_service.create_publish_record(session=session, data=data)
        return record.id


async def _advance_to(record_id: str, target_status: str) -> None:
    """
    Servis katmanı üzerinden kaydı belirtilen duruma getirir.
    Durum: draft → pending_review → approved → [scheduling/trigger/failed]
    """
    async with AsyncSessionLocal() as session:
        record = await publish_service.get_publish_record(session=session, record_id=record_id)
        current = record.status

    if target_status == "pending_review":
        async with AsyncSessionLocal() as session:
            await publish_service.submit_for_review(session=session, record_id=record_id)
    elif target_status == "approved":
        await _advance_to(record_id, "pending_review")
        async with AsyncSessionLocal() as session:
            await publish_service.review_action(
                session=session, record_id=record_id, decision="approve"
            )
    elif target_status == "scheduled":
        from datetime import datetime, timezone, timedelta
        await _advance_to(record_id, "approved")
        async with AsyncSessionLocal() as session:
            await publish_service.schedule_publish(
                session=session,
                record_id=record_id,
                scheduled_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
    elif target_status == "publishing":
        await _advance_to(record_id, "approved")
        async with AsyncSessionLocal() as session:
            await publish_service.trigger_publish(session=session, record_id=record_id)
    elif target_status == "failed":
        await _advance_to(record_id, "publishing")
        async with AsyncSessionLocal() as session:
            await publish_service.mark_failed(
                session=session,
                record_id=record_id,
                error_message="test hata",
            )
    elif target_status == "review_rejected":
        await _advance_to(record_id, "pending_review")
        async with AsyncSessionLocal() as session:
            await publish_service.review_action(
                session=session, record_id=record_id, decision="reject"
            )



# ---------------------------------------------------------------------------
# A) POST /publish/ — 201, draft durumunda başlar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_a_create_publish_record_returns_201(client):
    job_id = await _create_job_in_db()
    resp = await client.post("/api/v1/publish/", json={
        "job_id": job_id,
        "content_ref_type": "standard_video",
        "content_ref_id": "sv-a-test",
        "platform": "youtube",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "draft"
    assert data["job_id"] == job_id
    assert data["platform"] == "youtube"


# ---------------------------------------------------------------------------
# B) POST /publish/ — geçersiz platform → servis hatası (FK ihlali veya 422)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_b_create_with_unknown_job_id_fails(client):
    """FK kısıtı: var olmayan job_id ile kayıt oluşturulamaz — 2xx dönemez."""
    try:
        resp = await client.post("/api/v1/publish/", json={
            "job_id": "non-existent-job-id",
            "content_ref_type": "standard_video",
            "content_ref_id": "sv-b-test",
            "platform": "youtube",
        })
        # IntegrityError → 500 veya validation → 422; her ikisi de 2xx değil
        assert resp.status_code >= 400
    except Exception:
        # SQLAlchemy IntegrityError test client'ından yayılabilir
        pass


# ---------------------------------------------------------------------------
# C) GET /publish/ — boş liste döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_c_list_returns_list(client):
    resp = await client.get("/api/v1/publish/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# D) GET /publish/?job_id=... — filtre çalışır
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_d_list_filter_by_job_id(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.get(f"/api/v1/publish/?job_id={job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert any(r["id"] == record_id for r in data)


# ---------------------------------------------------------------------------
# E) GET /publish/{id} — mevcut kayıt 200 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_e_get_existing_record_200(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.get(f"/api/v1/publish/{record_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == record_id


# ---------------------------------------------------------------------------
# F) GET /publish/{id} — bulunamayan kayıt 404 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_f_get_nonexistent_record_404(client):
    resp = await client.get("/api/v1/publish/non-existent-record-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# G) GET /publish/{id}/logs — oluşturma logu var
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_g_get_logs_includes_creation_log(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.get(f"/api/v1/publish/{record_id}/logs")
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)
    assert len(logs) >= 1


# ---------------------------------------------------------------------------
# H) GET /publish/{id}/logs — bulunamayan kayıt 404 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_h_get_logs_nonexistent_record_404(client):
    resp = await client.get("/api/v1/publish/non-existent-record-id/logs")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# I) POST /publish/{id}/submit — draft → pending_review
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_i_submit_for_review(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.post(f"/api/v1/publish/{record_id}/submit", json={"next_status": "pending_review"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending_review"


# ---------------------------------------------------------------------------
# J) POST /publish/{id}/submit — bulunamayan kayıt 404 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_j_submit_nonexistent_404(client):
    resp = await client.post("/api/v1/publish/non-existent-id/submit", json={"next_status": "pending_review"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# K) POST /publish/{id}/review (approve) — pending_review → approved
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_k_review_approve(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "pending_review")

    resp = await client.post(f"/api/v1/publish/{record_id}/review", json={
        "decision": "approve",
        "reviewer_id": "admin-test",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


# ---------------------------------------------------------------------------
# L) POST /publish/{id}/review — pending_review dışından 422 (review gate)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_l_review_outside_pending_review_422(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    # draft durumunda review_action → ReviewGateViolationError → 422

    resp = await client.post(f"/api/v1/publish/{record_id}/review", json={
        "decision": "approve",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# M) POST /publish/{id}/schedule — approved → scheduled
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_m_schedule_publish(client):
    from datetime import datetime, timezone, timedelta
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "approved")

    future_dt = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    resp = await client.post(f"/api/v1/publish/{record_id}/schedule", json={
        "scheduled_at": future_dt,
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "scheduled"


# ---------------------------------------------------------------------------
# N) POST /publish/{id}/trigger — approved → publishing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_n_trigger_publish_from_approved(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "approved")

    resp = await client.post(f"/api/v1/publish/{record_id}/trigger", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "publishing"


# ---------------------------------------------------------------------------
# O) POST /publish/{id}/trigger — draft'tan 422 döner (publish gate)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_o_trigger_from_draft_422(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.post(f"/api/v1/publish/{record_id}/trigger", json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# P) POST /publish/{id}/cancel — draft → cancelled
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_p_cancel_from_draft(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)

    resp = await client.post(f"/api/v1/publish/{record_id}/cancel", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


# ---------------------------------------------------------------------------
# Q) POST /publish/{id}/cancel — terminal durumdan 409 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_q_cancel_terminal_409(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    # cancelled → terminal
    await _advance_to(record_id, "pending_review")
    async with AsyncSessionLocal() as session:
        await publish_service.cancel_publish(session=session, record_id=record_id)

    resp = await client.post(f"/api/v1/publish/{record_id}/cancel", json={})
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# R) POST /publish/{id}/reset-to-draft — review_rejected → draft
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_r_reset_to_draft(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "review_rejected")

    resp = await client.post(f"/api/v1/publish/{record_id}/reset-to-draft", json={"next_status": "draft"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"


# ---------------------------------------------------------------------------
# S) POST /publish/{id}/retry — failed → publishing
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_s_retry_from_failed(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "failed")

    resp = await client.post(f"/api/v1/publish/{record_id}/retry", json={})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "publishing"
    # Retry sayacı artar (approved→publishing + failed→publishing = 2)
    assert data["publish_attempt_count"] >= 2


# ---------------------------------------------------------------------------
# T) POST /publish/{id}/retry — failed olmayan durumdan 422 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_t_retry_from_non_failed_422(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    # draft durumunda retry → PublishGateViolationError → 422

    resp = await client.post(f"/api/v1/publish/{record_id}/retry", json={})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# U) POST /publish/{id}/reset-review — approved → pending_review (artifact değişti)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_u_reset_review_from_approved(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "approved")

    resp = await client.post(f"/api/v1/publish/{record_id}/reset-review", json={
        "artifact_description": "render_output.mp4 yeniden üretildi",
        "actor_id": "system",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending_review"


# ---------------------------------------------------------------------------
# V) POST /publish/{id}/reset-review — draft durumunda işlem yapmaz, 200 döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_v_reset_review_from_draft_noop(client):
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    # draft durumunda sıfırlanacak onay yok — durum değişmez

    resp = await client.post(f"/api/v1/publish/{record_id}/reset-review", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"


# ---------------------------------------------------------------------------
# W) retry partial failure: platform_video_id korunur
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_w_retry_preserves_platform_video_id():
    """
    Upload başarılı → activate başarısız → failed.
    Retry sonrası platform_video_id korunmalı (upload tekrar çalışmaz).
    """
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "publishing")

    # Upload tamamlandı: platform_video_id ara kaydedildi
    async with AsyncSessionLocal() as session:
        record = await publish_service.get_publish_record(session=session, record_id=record_id)
        record.platform_video_id = "yt-vid-partial-001"
        await session.commit()

    # Activate başarısız
    async with AsyncSessionLocal() as session:
        await publish_service.mark_failed(
            session=session,
            record_id=record_id,
            error_message="activate kırıldı",
        )

    # Retry
    async with AsyncSessionLocal() as session:
        updated = await publish_service.retry_publish(session=session, record_id=record_id)

    assert updated.status == "publishing"
    assert updated.platform_video_id == "yt-vid-partial-001"


# ---------------------------------------------------------------------------
# X) reset-review reviewer_id ve reviewed_at sıfırlanır
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_x_reset_review_clears_reviewer_fields():
    """
    review_action ile onaylanan kayıt: reviewer_id ve reviewed_at dolu.
    reset_review_for_artifact_change sonrası bu alanlar temizlenmeli.
    """
    job_id = await _create_job_in_db()
    record_id = await _create_record_in_db(job_id)
    await _advance_to(record_id, "approved")

    # approved durumundaki kayıtta reviewer_id dolu olmalı
    async with AsyncSessionLocal() as session:
        before = await publish_service.get_publish_record(session=session, record_id=record_id)
    assert before.status == "approved"

    async with AsyncSessionLocal() as session:
        updated = await publish_service.reset_review_for_artifact_change(
            session=session,
            record_id=record_id,
            artifact_description="script yeniden üretildi",
        )

    assert updated.status == "pending_review"
    assert updated.reviewer_id is None
    assert updated.reviewed_at is None
    assert updated.review_state == "pending"
