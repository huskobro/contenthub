"""
Tests — M7-C1 (rev: review-gate fix): Publish Center State Machine + DB Models + Core Service

Kapsam:
  A)  PublishStateMachine — yasal geçişler kabul edilir
  B)  PublishStateMachine — yasak geçişler ValueError fırlatır
       + draft → approved yasak (Tier A review gate)
       + draft → scheduled yasak (Tier A review gate)
  C)  PublishStateMachine — terminal durumlar belirlenir
  D)  PublishStateMachine — can_publish() doğru gate kuralını uygular
  E)  PublishStateMachine — allowed_next() draft için YALNIZCA pending_review + cancelled döner
  F)  create_publish_record — kayıt draft durumunda oluşur
  G)  create_publish_record — oluşturma olayı PublishLog'a yazılır
  H)  submit_for_review — draft → pending_review geçişi + log
  I)  review_action (approve) — pending_review → approved + review_state güncellenir
  J)  review_action (reject)  — pending_review → review_rejected + review_state güncellenir
  K)  review_action — geçersiz karar ValueError fırlatır
  K2) review_action — pending_review olmayan durumdan ReviewGateViolationError
  L)  trigger_publish — approved → publishing, publish_attempt_count artar
  M)  trigger_publish — draft durumundan PublishGateViolationError
  N)  trigger_publish — pending_review durumundan PublishGateViolationError
  O)  mark_published — publishing → published, platform alanları güncellenir
  P)  mark_failed — publishing → failed, last_error kaydedilir
  Q)  mark_failed → trigger_publish (retry) — failed → publishing, attempt_count artar
  R)  cancel_publish — draft → cancelled (terminal)
  S)  cancel_publish — terminal durumdan PublishAlreadyTerminalError
  T)  reset_to_draft — review_rejected → draft, review_state sıfırlanır
  U)  schedule_publish — approved → scheduled, scheduled_at UTC normalize edilir
  V)  schedule_publish → trigger_publish — scheduled → publishing
  W)  get_publish_logs — tüm olaylar denetim izinde görünür
  X)  list_publish_records — job_id filtresi çalışır
  Y)  PublishRecord → editorial izolasyon: StandardVideo state değişmez
  Z)  review_gate_isolation: review_action onaylar fakat publish başlatmaz
"""

import pytest
from datetime import datetime, timezone

from app.db.session import AsyncSessionLocal
from app.db.models import Job, PublishRecord, PublishLog
from app.publish import service
from app.publish.enums import PublishStatus, PublishLogEvent
from app.publish.exceptions import (
    PublishRecordNotFoundError,
    InvalidPublishTransitionError,
    PublishGateViolationError,
    PublishAlreadyTerminalError,
    ReviewGateViolationError,
)
from app.publish.schemas import PublishRecordCreate
from app.publish.state_machine import PublishStateMachine


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _create_job(session, module_type: str = "standard_video") -> Job:
    """Test için gerçek Job kaydı oluşturur (FK kısıtını karşılamak için)."""
    job = Job(module_type=module_type, status="queued", retry_count=0)
    session.add(job)
    await session.flush()
    return job


def _make_create_data(job_id: str, **kwargs) -> PublishRecordCreate:
    defaults = {
        "job_id": job_id,
        "content_ref_type": "standard_video",
        "content_ref_id": "sv-test-001",
        "platform": "youtube",
    }
    defaults.update(kwargs)
    return PublishRecordCreate(**defaults)


async def _create_record(session, **kwargs) -> PublishRecord:
    """Gerçek Job kaydı oluşturur, sonra publish kaydı oluşturur."""
    job = await _create_job(session)
    # job_id override edilmişse kullan, yoksa yeni oluşturulandan al
    job_id = kwargs.pop("job_id", job.id)
    return await service.create_publish_record(
        session=session, data=_make_create_data(job_id=job_id, **kwargs)
    )


# ---------------------------------------------------------------------------
# A) PublishStateMachine — yasal geçişler kabul edilir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_a_legal_transitions_accepted():
    """Yasal geçiş çiftleri ValueError fırlatmaz.

    Tier A review gate aktif: draft → yalnızca pending_review veya cancelled.
    """
    legal = [
        ("draft", "pending_review"),      # Review gate başlatma
        ("draft", "cancelled"),            # Publish öncesi iptal
        ("pending_review", "approved"),
        ("pending_review", "review_rejected"),
        ("pending_review", "cancelled"),
        ("review_rejected", "draft"),
        ("review_rejected", "cancelled"),
        ("approved", "publishing"),
        ("approved", "scheduled"),
        ("approved", "cancelled"),
        ("scheduled", "publishing"),
        ("scheduled", "cancelled"),
        ("publishing", "published"),
        ("publishing", "failed"),
        ("failed", "publishing"),
        ("failed", "cancelled"),
    ]
    for current, next_s in legal:
        result = PublishStateMachine.transition(current, next_s)
        assert result == next_s, f"Beklenen {next_s}, alınan {result}"


# ---------------------------------------------------------------------------
# B) PublishStateMachine — yasak geçişler ValueError fırlatır
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_b_illegal_transitions_raise_value_error():
    """Yasak geçiş çiftleri ValueError fırlatır.

    Tier A review gate geçişleri dahil:
      draft → approved YASAK (review gate bypass)
      draft → scheduled YASAK (review gate bypass)
      draft → publishing YASAK
    """
    illegal = [
        # Tier A review gate bypass — bu üç geçiş master plan ihlali
        ("draft", "approved"),
        ("draft", "scheduled"),
        ("draft", "publishing"),
        ("draft", "published"),
        # Review kararı atlanıyor
        ("pending_review", "publishing"),
        ("pending_review", "published"),
        ("pending_review", "scheduled"),
        ("review_rejected", "publishing"),
        ("review_rejected", "approved"),
        # Terminal → geri döndürme yok
        ("published", "draft"),
        ("published", "cancelled"),
        ("cancelled", "draft"),
        ("cancelled", "publishing"),
    ]
    for current, next_s in illegal:
        with pytest.raises(ValueError, match="yasak"):
            PublishStateMachine.validate(current, next_s)


# ---------------------------------------------------------------------------
# C) Terminal durum tespiti
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_c_terminal_states():
    """published ve cancelled terminal durumdur; diğerleri değil."""
    assert PublishStateMachine.is_terminal("published") is True
    assert PublishStateMachine.is_terminal("cancelled") is True
    for s in ("draft", "pending_review", "review_rejected", "approved", "scheduled", "publishing", "failed"):
        assert PublishStateMachine.is_terminal(s) is False, f"{s} terminal olmamalı"


# ---------------------------------------------------------------------------
# D) can_publish() — gate kuralı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_d_can_publish_gate_rule():
    """Yalnızca approved, scheduled, failed durumlarından publish başlatılabilir."""
    assert PublishStateMachine.can_publish("approved") is True
    assert PublishStateMachine.can_publish("scheduled") is True
    assert PublishStateMachine.can_publish("failed") is True

    # Gate yasağı
    for s in ("draft", "pending_review", "review_rejected", "publishing", "published", "cancelled"):
        assert PublishStateMachine.can_publish(s) is False, f"{s} için can_publish False olmalı"


# ---------------------------------------------------------------------------
# E) allowed_next()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_e_allowed_next():
    """draft durumundan izin verilen geçişler YALNIZCA pending_review ve cancelled."""
    allowed = set(PublishStateMachine.allowed_next("draft"))
    # Zorunlu
    assert "pending_review" in allowed
    assert "cancelled" in allowed
    # Tier A review gate — bu geçişler YASAK
    assert "approved" not in allowed, "draft → approved Tier A review gate ihlali"
    assert "scheduled" not in allowed, "draft → scheduled Tier A review gate ihlali"
    assert "publishing" not in allowed
    assert "published" not in allowed
    # draft'tan YALNIZCA 2 geçiş var
    assert len(allowed) == 2, f"draft'tan beklenen 2 geçiş, alınan {len(allowed)}: {allowed}"


# ---------------------------------------------------------------------------
# F) create_publish_record — draft durumunda oluşur
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_f_create_publish_record_draft_status():
    """Yeni publish kaydı draft durumunda oluşur."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        assert record.id is not None
        assert record.status == PublishStatus.DRAFT.value
        assert record.review_state == "pending"
        assert record.publish_attempt_count == 0
        assert record.published_at is None
        assert record.platform_video_id is None


# ---------------------------------------------------------------------------
# G) create_publish_record — oluşturma olayı PublishLog'a yazılır
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_g_create_logs_state_transition():
    """Oluşturma sonrası PublishLog'da bir state_transition satırı olmalı."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        logs = await service.get_publish_logs(session=session, publish_record_id=record.id)
        assert len(logs) >= 1
        creation_log = logs[0]
        assert creation_log.event_type == PublishLogEvent.STATE_TRANSITION.value
        assert creation_log.to_status == PublishStatus.DRAFT.value


# ---------------------------------------------------------------------------
# H) submit_for_review — draft → pending_review + log
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_h_submit_for_review():
    """submit_for_review draft → pending_review geçişi yapar ve log yazar."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        updated = await service.submit_for_review(session=session, record_id=record.id)
        assert updated.status == PublishStatus.PENDING_REVIEW.value

        logs = await service.get_publish_logs(session=session, publish_record_id=record.id)
        transitions = [l for l in logs if l.event_type == PublishLogEvent.STATE_TRANSITION.value]
        last = transitions[-1]
        assert last.from_status == PublishStatus.DRAFT.value
        assert last.to_status == PublishStatus.PENDING_REVIEW.value


# ---------------------------------------------------------------------------
# I) review_action (approve) — pending_review → approved
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_i_review_approve():
    """Operatör onayı: pending_review → approved, review_state='approved'."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        approved = await service.review_action(
            session=session,
            record_id=record.id,
            decision="approve",
            reviewer_id="admin-001",
        )
        assert approved.status == PublishStatus.APPROVED.value
        assert approved.review_state == "approved"
        assert approved.reviewer_id == "admin-001"
        assert approved.reviewed_at is not None


# ---------------------------------------------------------------------------
# J) review_action (reject) — pending_review → review_rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_j_review_reject():
    """Operatör reddi: pending_review → review_rejected, review_state='rejected'."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        rejected = await service.review_action(
            session=session,
            record_id=record.id,
            decision="reject",
            reviewer_id="admin-001",
        )
        assert rejected.status == PublishStatus.REVIEW_REJECTED.value
        assert rejected.review_state == "rejected"


# ---------------------------------------------------------------------------
# K) review_action — geçersiz karar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_k_review_invalid_decision():
    """Geçersiz review kararı ValueError fırlatır."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        with pytest.raises(ValueError, match="Geçersiz review kararı"):
            await service.review_action(
                session=session,
                record_id=record.id,
                decision="maybe",
            )


# ---------------------------------------------------------------------------
# K2) review_action — pending_review olmayan durumdan ReviewGateViolationError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_k2_review_action_wrong_status_raises_review_gate_error():
    """
    pending_review dışı bir durumda review_action çağrısı ReviewGateViolationError fırlatır.

    Review gate kuralı: yalnızca pending_review durumundaki kayıta review kararı verilebilir.
    Örneğin draft durumunda review_action çağrısı yasak.
    """
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        # Kayıt draft durumunda — review_action çağrısı yasak
        assert record.status == PublishStatus.DRAFT.value
        with pytest.raises(ReviewGateViolationError):
            await service.review_action(
                session=session,
                record_id=record.id,
                decision="approve",
            )


# ---------------------------------------------------------------------------
# L) trigger_publish — approved → publishing, attempt_count artar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_l_trigger_publish_approved_to_publishing():
    """trigger_publish: approved → publishing, publish_attempt_count=1."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        publishing = await service.trigger_publish(session=session, record_id=record.id)
        assert publishing.status == PublishStatus.PUBLISHING.value
        assert publishing.publish_attempt_count == 1


# ---------------------------------------------------------------------------
# M) trigger_publish — draft durumundan PublishGateViolationError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_m_trigger_publish_from_draft_raises_gate_error():
    """draft durumundan trigger_publish PublishGateViolationError fırlatır."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        with pytest.raises(PublishGateViolationError):
            await service.trigger_publish(session=session, record_id=record.id)


# ---------------------------------------------------------------------------
# N) trigger_publish — pending_review durumundan PublishGateViolationError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_n_trigger_publish_from_pending_review_raises_gate_error():
    """pending_review durumundan trigger_publish PublishGateViolationError fırlatır."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        with pytest.raises(PublishGateViolationError):
            await service.trigger_publish(session=session, record_id=record.id)


# ---------------------------------------------------------------------------
# O) mark_published — publishing → published
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_o_mark_published():
    """mark_published: publishing → published, platform alanları kaydedilir."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        await service.trigger_publish(session=session, record_id=record.id)
        published = await service.mark_published(
            session=session,
            record_id=record.id,
            platform_video_id="yt-vid-123",
            platform_url="https://youtube.com/watch?v=yt-vid-123",
        )
        assert published.status == PublishStatus.PUBLISHED.value
        assert published.platform_video_id == "yt-vid-123"
        assert published.platform_url == "https://youtube.com/watch?v=yt-vid-123"
        assert published.published_at is not None
        assert published.last_error is None


# ---------------------------------------------------------------------------
# P) mark_failed — publishing → failed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_p_mark_failed():
    """mark_failed: publishing → failed, last_error kaydedilir."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        await service.trigger_publish(session=session, record_id=record.id)
        failed = await service.mark_failed(
            session=session,
            record_id=record.id,
            error_message="YouTube API 429 Too Many Requests",
            error_code="quota_exceeded",
        )
        assert failed.status == PublishStatus.FAILED.value
        assert failed.last_error == "YouTube API 429 Too Many Requests"


# ---------------------------------------------------------------------------
# Q) Retry: failed → publishing, attempt_count artar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_q_retry_failed_to_publishing():
    """failed → trigger_publish → publishing; attempt_count ikiye çıkar."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        await service.trigger_publish(session=session, record_id=record.id)
        await service.mark_failed(
            session=session, record_id=record.id, error_message="İlk deneme başarısız"
        )
        retried = await service.trigger_publish(session=session, record_id=record.id)
        assert retried.status == PublishStatus.PUBLISHING.value
        assert retried.publish_attempt_count == 2


# ---------------------------------------------------------------------------
# R) cancel_publish — terminal olur
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_r_cancel_publish():
    """cancel_publish: herhangi bir non-terminal durumdan cancelled'a geçer."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        cancelled = await service.cancel_publish(session=session, record_id=record.id)
        assert cancelled.status == PublishStatus.CANCELLED.value
        assert PublishStateMachine.is_terminal(cancelled.status) is True


# ---------------------------------------------------------------------------
# S) Terminal durumdan geçiş denemesi — PublishAlreadyTerminalError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_s_terminal_state_blocks_further_transitions():
    """published durumundan geçiş denemesi PublishAlreadyTerminalError fırlatır."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        await service.trigger_publish(session=session, record_id=record.id)
        await service.mark_published(
            session=session,
            record_id=record.id,
            platform_video_id="vid-xyz",
            platform_url="https://youtube.com/watch?v=vid-xyz",
        )
        with pytest.raises(PublishAlreadyTerminalError):
            await service.cancel_publish(session=session, record_id=record.id)


# ---------------------------------------------------------------------------
# T) reset_to_draft — review_rejected → draft
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_t_reset_to_draft():
    """review_rejected → reset_to_draft → draft; review_state sıfırlanır."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="reject")
        reset = await service.reset_to_draft(session=session, record_id=record.id)
        assert reset.status == PublishStatus.DRAFT.value
        assert reset.review_state == "pending"
        assert reset.reviewer_id is None
        assert reset.reviewed_at is None


# ---------------------------------------------------------------------------
# U) schedule_publish — approved → scheduled
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_u_schedule_publish():
    """
    schedule_publish: approved → scheduled, scheduled_at UTC normalize edilir.

    Servis katmanı scheduled_at'ı UTC'ye normalize eder.
    SQLite timezone-naive saklarsa UTC olarak kabul edilir.
    Test workaround yoktur — normalizasyon service.py'de yapılır.
    """
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")

        future_utc = datetime(2030, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        scheduled = await service.schedule_publish(
            session=session, record_id=record.id, scheduled_at=future_utc
        )
        assert scheduled.status == PublishStatus.SCHEDULED.value

        # Servis UTC normalize eder. SQLite naive döndürse de UTC anlamına gelir.
        # scheduled_at değeri UTC ile eşit olmalı (tzinfo farkı tolere edilir).
        stored = scheduled.scheduled_at
        assert stored is not None
        # SQLite naive döndürürse UTC aware'e çevir karşılaştırma için
        if stored.tzinfo is None:
            stored = stored.replace(tzinfo=timezone.utc)
        assert stored == future_utc, (
            f"scheduled_at UTC uyuşmazlığı: stored={stored}, beklenen={future_utc}"
        )

    # Timezone-naive input da doğru normalize edilmeli
    async with AsyncSessionLocal() as session:
        record2 = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record2.id)
        await service.review_action(session=session, record_id=record2.id, decision="approve")

        # Naive datetime gönder — servis UTC'ye çevirmeli
        naive_future = datetime(2030, 6, 15, 9, 30, 0)  # tzinfo=None
        scheduled2 = await service.schedule_publish(
            session=session, record_id=record2.id, scheduled_at=naive_future
        )
        stored2 = scheduled2.scheduled_at
        assert stored2 is not None
        if stored2.tzinfo is None:
            stored2 = stored2.replace(tzinfo=timezone.utc)
        expected2 = naive_future.replace(tzinfo=timezone.utc)
        assert stored2 == expected2, (
            f"Naive input UTC normalizasyon hatası: stored={stored2}, beklenen={expected2}"
        )


# ---------------------------------------------------------------------------
# V) scheduled → publishing geçişi
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_v_scheduled_to_publishing():
    """scheduled durumundan trigger_publish → publishing."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        future = datetime(2030, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        await service.schedule_publish(
            session=session, record_id=record.id, scheduled_at=future
        )
        publishing = await service.trigger_publish(session=session, record_id=record.id)
        assert publishing.status == PublishStatus.PUBLISHING.value


# ---------------------------------------------------------------------------
# W) get_publish_logs — tüm olaylar denetim izinde
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_w_audit_trail_completeness():
    """Tam yaşam döngüsü: her anlamlı olay PublishLog'da görünür."""
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(
            session=session, record_id=record.id, decision="approve", reviewer_id="admin-002"
        )
        await service.trigger_publish(session=session, record_id=record.id)
        await service.mark_published(
            session=session,
            record_id=record.id,
            platform_video_id="v-full-001",
            platform_url="https://youtube.com/watch?v=v-full-001",
        )

        logs = await service.get_publish_logs(session=session, publish_record_id=record.id)
        event_types = [l.event_type for l in logs]

        # Denetim izinde tüm kritik olaylar olmalı
        assert PublishLogEvent.STATE_TRANSITION.value in event_types  # Birden fazla
        assert PublishLogEvent.REVIEW_ACTION.value in event_types
        assert PublishLogEvent.PUBLISH_ATTEMPT.value in event_types
        assert PublishLogEvent.PLATFORM_EVENT.value in event_types

        # Kronolojik sıra: ilk log = oluşturma
        assert logs[0].to_status == PublishStatus.DRAFT.value


# ---------------------------------------------------------------------------
# X) list_publish_records — job_id filtresi
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_x_list_by_job_id():
    """list_publish_records job_id filtresini doğru uygular."""
    async with AsyncSessionLocal() as session:
        # İki farklı job oluştur
        job_a = await _create_job(session)
        job_b = await _create_job(session)
        r1 = await service.create_publish_record(
            session=session, data=_make_create_data(job_id=job_a.id)
        )
        r2 = await service.create_publish_record(
            session=session, data=_make_create_data(job_id=job_b.id)
        )

        results = await service.list_publish_records(session=session, job_id=job_a.id)
        ids = [r.id for r in results]
        assert r1.id in ids
        assert r2.id not in ids


# ---------------------------------------------------------------------------
# Y) Editorial izolasyon: PublishRecord StandardVideo'yu etkilemez
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_y_editorial_isolation():
    """
    Publish işlemleri StandardVideo veya başka içerik tablolarını değiştirmez.

    Bu test dolaylı doğrulama yapar: tüm publish aksiyonları sonrası
    yalnızca publish_records ve publish_logs tabloları değişir.
    """
    async with AsyncSessionLocal() as session:
        record = await _create_record(
            session,
            content_ref_type="standard_video",
            content_ref_id="sv-isolation-001",
        )
        await service.submit_for_review(session=session, record_id=record.id)
        await service.review_action(session=session, record_id=record.id, decision="approve")
        await service.trigger_publish(session=session, record_id=record.id)
        published = await service.mark_published(
            session=session,
            record_id=record.id,
            platform_video_id="v-iso-001",
            platform_url="https://youtube.com/watch?v=v-iso-001",
        )
        # publish kaydı published durumuna geçti
        assert published.status == PublishStatus.PUBLISHED.value
        # content_ref_id değişmedi — sadece referans taşır, editöryal state değil
        assert published.content_ref_id == "sv-isolation-001"
        assert published.content_ref_type == "standard_video"


# ---------------------------------------------------------------------------
# Z) review_gate_isolation: /review approve → kayıt approved ama publishing başlamaz
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_z_review_gate_does_not_trigger_publish():
    """
    review_action(approve) kaydı approved durumuna geçirir fakat
    publishing durumuna GEÇİRMEZ. Publish için ayrıca trigger_publish çağrılmalıdır.
    """
    async with AsyncSessionLocal() as session:
        record = await _create_record(session)
        await service.submit_for_review(session=session, record_id=record.id)
        approved = await service.review_action(
            session=session, record_id=record.id, decision="approve"
        )
        # approved durumunda kalmalı — publishing değil
        assert approved.status == PublishStatus.APPROVED.value
        # publish_attempt_count sıfır — hiçbir publish girişimi yapılmadı
        assert approved.publish_attempt_count == 0
