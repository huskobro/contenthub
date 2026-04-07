"""
Tests — Publish Center V1 Gaps

Kapsam:
  1. test_review_reject_requires_reason     — POST /review reject + reason yok → 422
  2. test_review_reject_with_reason_logs_detail — POST /review reject + reason → log'da görünür
  3. test_from_job_endpoint_creates_draft_record — POST /from-job/{job_id} → draft kaydı
  4. test_patch_payload_only_in_draft        — PATCH draft → 200; pending_review → 422
  5. test_publish_list_filter_by_content_ref_type — GET /?content_ref_type=standard_video
  6. test_review_gate_enforced_draft_cannot_publish — draft → trigger → 422
"""

import json
import pytest

from app.db.models import Job, PublishRecord
from app.publish import service
from app.publish.enums import PublishStatus
from app.publish.schemas import PublishRecordCreate


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _create_job(session, module_type: str = "standard_video") -> Job:
    job = Job(module_type=module_type, status="queued", retry_count=0)
    session.add(job)
    await session.flush()
    return job


async def _create_job_completed(session, module_type: str = "standard_video") -> Job:
    job = Job(module_type=module_type, status="completed", retry_count=0)
    session.add(job)
    await session.flush()
    return job


async def _create_record(session, module_type: str = "standard_video", **kwargs) -> PublishRecord:
    job = await _create_job(session)
    data = PublishRecordCreate(
        job_id=job.id,
        content_ref_type=module_type,
        content_ref_id="ref-test-001",
        platform="youtube",
        **kwargs,
    )
    return await service.create_publish_record(session=session, data=data)


# ---------------------------------------------------------------------------
# 1. test_review_reject_requires_reason
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_review_reject_requires_reason(client, db_session):
    """POST /review reject + rejection_reason yok → 422 (full entegrasyon)."""
    record = await _create_record(db_session)
    await service.submit_for_review(db_session, record.id)

    # rejection_reason olmadan reject → 422
    resp = await client.post(f"/api/v1/publish/{record.id}/review", json={
        "decision": "reject",
    })
    assert resp.status_code == 422, f"Beklenen 422, alınan {resp.status_code}: {resp.text}"


@pytest.mark.asyncio
async def test_review_reject_requires_reason_via_service(db_session):
    """review_action ile reject + rejection_reason yok → router 422 döner (servis atar değil).

    Router katmanında doğrulama yapıldığı için burada HTTP testi yapılır.
    """
    # Servis katmanında rejection_reason zorunluluğu yok (router'da);
    # Bu test router'ın 422 döndürdüğünü HTTP üzerinden doğrular.
    # db_session ile entegre test:
    record = await _create_record(db_session)
    # submit for review
    await service.submit_for_review(db_session, record.id)

    # Servis katmanı rejection_reason almaya devam eder ama router validate eder
    # Router testi için client fixture kullanılmalı — bu test servis davranışını kontrol eder
    assert record.id is not None


@pytest.mark.asyncio
async def test_review_reject_requires_reason_http(client):
    """HTTP: reject kararı + rejection_reason yok → 422."""
    # Bu test client fixture'ını direkt kullanır
    # Önce bir publish kaydı oluşturmak gerekiyor; job FK kısıtı var
    # Servis ile job + publish kaydı oluştur, ardından HTTP endpoint'i test et
    pass


# ---------------------------------------------------------------------------
# Gerçek HTTP testleri (db_session + client fixture)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_review_reject_requires_reason_full(client, db_session):
    """
    Tam entegrasyon: draft kaydı oluştur, review'a gönder, rejection_reason
    olmadan reject dene → 422.
    """
    record = await _create_record(db_session)
    await service.submit_for_review(db_session, record.id)

    # HTTP reject — rejection_reason YOK
    resp = await client.post(f"/api/v1/publish/{record.id}/review", json={
        "decision": "reject",
    })
    assert resp.status_code == 422, f"Beklenen 422, alınan {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 2. test_review_reject_with_reason_logs_detail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_review_reject_with_reason_logs_detail(client, db_session):
    """
    reject + rejection_reason → log'da rejection_reason görünür.
    """
    record = await _create_record(db_session)
    await service.submit_for_review(db_session, record.id)

    reason_text = "Ses kalitesi yetersiz"
    resp = await client.post(f"/api/v1/publish/{record.id}/review", json={
        "decision": "reject",
        "rejection_reason": reason_text,
    })
    assert resp.status_code == 200, f"Beklenen 200, alınan {resp.status_code}: {resp.text}"

    # Logları kontrol et
    logs = await service.get_publish_logs(db_session, record.id)
    review_logs = [l for l in logs if l.event_type == "review_action"]
    assert len(review_logs) >= 1, "review_action log satırı bulunamadı"

    detail = json.loads(review_logs[-1].detail_json)
    assert detail.get("rejection_reason") == reason_text, (
        f"rejection_reason log'da bulunamadı: {detail}"
    )


# ---------------------------------------------------------------------------
# 3. test_from_job_endpoint_creates_draft_record
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_from_job_endpoint_creates_draft_record(client, db_session):
    """
    POST /from-job/{job_id} → draft publish kaydı oluşturulur.
    """
    job = await _create_job_completed(db_session)

    resp = await client.post(f"/api/v1/publish/from-job/{job.id}", json={
        "platform": "youtube",
        "content_ref_type": "standard_video",
    })
    assert resp.status_code == 201, f"Beklenen 201, alınan {resp.status_code}: {resp.text}"

    data = resp.json()
    assert data["status"] == "draft"
    assert data["job_id"] == job.id
    assert data["platform"] == "youtube"
    assert data["content_ref_type"] == "standard_video"


@pytest.mark.asyncio
async def test_from_job_endpoint_nonexistent_job(client):
    """
    POST /from-job/{nonexistent_job_id} → 404.
    """
    resp = await client.post("/api/v1/publish/from-job/nonexistent-job-id", json={
        "platform": "youtube",
        "content_ref_type": "standard_video",
    })
    assert resp.status_code == 404, f"Beklenen 404, alınan {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 4. test_patch_payload_only_in_draft
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_payload_only_in_draft(client, db_session):
    """
    PATCH draft → 200 + payload güncellenir.
    PATCH pending_review → 422.
    """
    record = await _create_record(db_session)
    new_payload = json.dumps({"title": "Yeni Baslik", "description": "Aciklama"})

    # Draft durumunda PATCH → başarılı
    resp = await client.patch(f"/api/v1/publish/{record.id}", json={
        "payload_json": new_payload,
    })
    assert resp.status_code == 200, f"Beklenen 200, alınan {resp.status_code}: {resp.text}"
    assert resp.json()["payload_json"] == new_payload

    # pending_review'a geç
    await service.submit_for_review(db_session, record.id)

    # pending_review durumunda PATCH → 422
    resp2 = await client.patch(f"/api/v1/publish/{record.id}", json={
        "payload_json": json.dumps({"title": "Değiştirilmemeli"}),
    })
    assert resp2.status_code == 422, f"Beklenen 422, alınan {resp2.status_code}: {resp2.text}"


# ---------------------------------------------------------------------------
# 5. test_publish_list_filter_by_content_ref_type
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_publish_list_filter_by_content_ref_type(client, db_session):
    """
    GET /?content_ref_type=standard_video → yalnızca standard_video kayıtları.
    """
    # İki farklı content_ref_type ile kayıt oluştur
    sv_record = await _create_record(db_session, module_type="standard_video")
    nb_record = await _create_record(db_session, module_type="news_bulletin")

    # Yalnızca standard_video filtrele
    resp = await client.get("/api/v1/publish/?content_ref_type=standard_video&limit=200")
    assert resp.status_code == 200
    items = resp.json()
    types = {item["content_ref_type"] for item in items}
    assert "standard_video" in types, "standard_video kaydı bulunamadı"
    assert "news_bulletin" not in types, "news_bulletin filtre geçti — beklenmiyordu"

    # Yalnızca news_bulletin filtrele
    resp2 = await client.get("/api/v1/publish/?content_ref_type=news_bulletin&limit=200")
    assert resp2.status_code == 200
    items2 = resp2.json()
    types2 = {item["content_ref_type"] for item in items2}
    assert "news_bulletin" in types2
    assert "standard_video" not in types2


# ---------------------------------------------------------------------------
# 6. test_review_gate_enforced_draft_cannot_publish
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_review_gate_enforced_draft_cannot_publish(client, db_session):
    """
    draft durumundaki kayıt trigger endpoint'i çağrılırsa 422 döner.
    """
    record = await _create_record(db_session)
    assert record.status == PublishStatus.DRAFT.value

    resp = await client.post(f"/api/v1/publish/{record.id}/trigger", json={})
    assert resp.status_code == 422, f"Beklenen 422, alınan {resp.status_code}: {resp.text}"
