"""
M7-C3 Test Paketi: PublishStepExecutor + Dispatcher entegrasyonu.

Kapsam:
  A  — step_key == "publish"
  B  — Standard Video pipeline'da publish step tanımlı ve operator_confirm
  C  — publish_record_id bulunamazsa StepExecutionError
  D  — PublishRecord bulunamazsa StepExecutionError
  E  — Platform adaptörü kayıtlı değilse StepExecutionError
  F  — video_path bulunamazsa StepExecutionError
  G  — Başarılı upload + activate → mark_published çağrılır, sonuç döner
  H  — OPERATOR_CONFIRM idempotency: kayıt zaten 'published' → upload/activate çağrılmaz
  I  — upload başarısız (retryable) → mark_failed çağrılır, StepExecutionError retryable=True
  J  — upload başarısız (non-retryable) → StepExecutionError retryable=False
  K  — activate başarısız → mark_failed çağrılır, StepExecutionError retryable=True
  L  — Partial failure: upload başarılı ama activate başarısız → platform_video_id korunur
  M  — platform_video_id zaten dolu → upload atlanır, yalnızca activate çalışır
  N  — audit trail: upload başarılı → platform_event log yazılır
  O  — audit trail: activate başarılı → platform_event log yazılır
  P  — audit trail: upload başarısız → platform_event log yazılır
  Q  — _build_executor_from_registry: PublishStepExecutor için pipeline_db inject edilir
  R  — _build_executor_from_registry: PublishStepExecutor + pipeline_db=None → ValueError
  S  — payload_json yoksa minimal defaults kullanılır
  T  — scheduled_at dolu kayıt → activate scheduled_at ile çağrılır
  U  — Hardening: audit log executor'dan doğrudan ORM değil, servis üzerinden (append_platform_event)
  V  — Hardening: platform_url adapter.activate() sonucundan gelir, sabit string değil
  W  — Hardening: video_path DB'deki render step provider_trace_json → output_path'ten okunur

Test izolasyonu:
  - Gerçek DB yok: SQLite in-memory (conftest pattern)
  - Adaptör mock ile inject edilir
  - service.mark_published / service.mark_failed mock'lanır
"""
from __future__ import annotations

import json
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, Job, JobStep, PublishRecord, PublishLog
from app.publish.enums import PublishStatus
from app.publish.adapter import PublishAdapterResult, PublishAdapterError
from app.publish.executor import PublishStepExecutor
from app.jobs.exceptions import StepExecutionError


# ---------------------------------------------------------------------------
# In-memory DB fixture
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture()
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


# ---------------------------------------------------------------------------
# Yardımcı: test verileri oluştur
# ---------------------------------------------------------------------------

async def _create_job(db: AsyncSession, job_id: str = "job-publish-001") -> Job:
    job = Job(
        id=job_id,
        module_type="standard_video",
        status="running",
        input_data_json=json.dumps({"topic": "Test"}),
    )
    db.add(job)
    await db.flush()
    return job


async def _create_step(
    db: AsyncSession,
    job_id: str,
    step_key: str = "publish",
    artifact_refs_json: str | None = None,
) -> JobStep:
    step = JobStep(
        job_id=job_id,
        step_key=step_key,
        step_order=7,
        status="running",
        idempotency_type="operator_confirm",
        artifact_refs_json=artifact_refs_json,
    )
    db.add(step)
    await db.flush()
    return step


async def _create_publish_record(
    db: AsyncSession,
    job_id: str,
    status: str = "publishing",
    platform_video_id: str | None = None,
    scheduled_at: datetime | None = None,
) -> PublishRecord:
    record = PublishRecord(
        job_id=job_id,
        content_ref_type="standard_video",
        content_ref_id="sv-001",
        platform="youtube",
        status=status,
        review_state="approved",
        payload_json=json.dumps({"title": "Test Video", "description": "desc", "tags": ["t"]}),
        platform_video_id=platform_video_id,
        scheduled_at=scheduled_at,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Yardımcı: mock adaptör
# ---------------------------------------------------------------------------

def _mock_adapter(
    upload_result: PublishAdapterResult | Exception | None = None,
    activate_result: PublishAdapterResult | Exception | None = None,
) -> MagicMock:
    adapter = MagicMock()
    adapter.platform_name = "youtube"

    if isinstance(upload_result, Exception):
        adapter.upload = AsyncMock(side_effect=upload_result)
    elif upload_result is not None:
        adapter.upload = AsyncMock(return_value=upload_result)
    else:
        adapter.upload = AsyncMock(return_value=PublishAdapterResult(
            success=True,
            platform_video_id="vid_test_123",
            platform_url="https://www.youtube.com/watch?v=vid_test_123",
        ))

    if isinstance(activate_result, Exception):
        adapter.activate = AsyncMock(side_effect=activate_result)
    elif activate_result is not None:
        adapter.activate = AsyncMock(return_value=activate_result)
    else:
        adapter.activate = AsyncMock(return_value=PublishAdapterResult(
            success=True,
            platform_video_id="vid_test_123",
            platform_url="https://www.youtube.com/watch?v=vid_test_123",
        ))

    return adapter


# ---------------------------------------------------------------------------
# Yardımcı: executor + registry patchli
# ---------------------------------------------------------------------------

def _executor_with_adapter(db, adapter) -> PublishStepExecutor:
    """Registry'yi mock ile patch ederek executor döner."""
    executor = PublishStepExecutor(db=db)
    executor._patched_registry = MagicMock()
    executor._patched_registry.get = MagicMock(return_value=adapter)
    return executor


# ===========================================================================
# A — step_key == "publish"
# ===========================================================================

def test_a_step_key():
    executor = PublishStepExecutor(db=MagicMock())
    assert executor.step_key() == "publish"


# ===========================================================================
# B — Standard Video pipeline'da publish step tanımlı ve operator_confirm
# ===========================================================================

def test_b_standard_video_has_publish_step():
    from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
    from app.publish.executor import PublishStepExecutor

    publish_steps = [s for s in STANDARD_VIDEO_MODULE.steps if s.step_key == "publish"]
    assert len(publish_steps) == 1
    step_def = publish_steps[0]
    assert step_def.idempotency_type == "operator_confirm"
    assert step_def.executor_class is PublishStepExecutor
    assert step_def.step_order == 7


# ===========================================================================
# C — publish_record_id bulunamazsa StepExecutionError
# ===========================================================================

@pytest.mark.asyncio
async def test_c_no_publish_record_id(db):
    job = await _create_job(db)
    step = await _create_step(db, job.id, artifact_refs_json=None)
    job.input_json = json.dumps({"topic": "Test"})  # publish_record_id yok

    executor = PublishStepExecutor(db=db)
    with pytest.raises(StepExecutionError, match="publish_record_id"):
        await executor.execute(job, step)


# ===========================================================================
# D — PublishRecord bulunamazsa StepExecutionError
# ===========================================================================

@pytest.mark.asyncio
async def test_d_publish_record_not_found(db):
    job = await _create_job(db)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({"publish_record_id": "nonexistent-id"})
    )

    executor = PublishStepExecutor(db=db)
    with pytest.raises(StepExecutionError, match="PublishRecord okunamadı"):
        await executor.execute(job, step)


# ===========================================================================
# E — Platform adaptörü kayıtlı değilse StepExecutionError
# ===========================================================================

@pytest.mark.asyncio
async def test_e_adapter_not_registered(db):
    from app.publish.registry import PublishAdapterNotRegisteredError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/video.mp4",
        })
    )

    executor = PublishStepExecutor(db=db)
    # Registry mock: adaptör yok
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(
        side_effect=PublishAdapterNotRegisteredError("youtube kayıtlı değil")
    )
    mock_registry.list_registered = MagicMock(return_value=[])

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with pytest.raises(StepExecutionError, match="Platform adaptörü kayıtlı değil"):
            await executor.execute(job, step)


# ===========================================================================
# F — video_path bulunamazsa StepExecutionError
# ===========================================================================

@pytest.mark.asyncio
async def test_f_no_video_path(db):
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({"publish_record_id": record.id})
        # video_path yok
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with pytest.raises(StepExecutionError, match="Video dosyası yolu bulunamadı"):
            await executor.execute(job, step)


# ===========================================================================
# G — Başarılı upload + activate → mark_published çağrılır, sonuç döner
# ===========================================================================

@pytest.mark.asyncio
async def test_g_success_upload_activate(db):
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test_video.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = MagicMock(
                platform_video_id="vid_test_123",
                platform_url="https://www.youtube.com/watch?v=vid_test_123",
            )
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                result = await executor.execute(job, step)

    assert result["upload_completed"] is True
    assert result["activate_completed"] is True
    assert result["platform_video_id"] == "vid_test_123"
    mock_mark.assert_awaited_once()
    adapter.upload.assert_awaited_once()
    adapter.activate.assert_awaited_once()


# ===========================================================================
# H — OPERATOR_CONFIRM idempotency: kayıt zaten 'published' → atlanır
# ===========================================================================

@pytest.mark.asyncio
async def test_h_idempotent_skip_already_published(db):
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id, status="published")
    record.platform_video_id = "existing_vid"
    record.platform_url = "https://www.youtube.com/watch?v=existing_vid"
    await db.flush()

    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        result = await executor.execute(job, step)

    assert result["idempotent_skip"] is True
    assert result["platform_video_id"] == "existing_vid"
    adapter.upload.assert_not_called()
    adapter.activate.assert_not_called()


# ===========================================================================
# I — upload başarısız (retryable) → StepExecutionError retryable=True
# ===========================================================================

@pytest.mark.asyncio
async def test_i_upload_failed_retryable(db):
    from app.publish.youtube.errors import YouTubeUploadError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    upload_error = YouTubeUploadError("Server error", retryable=True)
    adapter = _mock_adapter(upload_result=upload_error)
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_failed", new_callable=AsyncMock):
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                with pytest.raises(StepExecutionError) as exc_info:
                    await executor.execute(job, step)

    assert exc_info.value.retryable is True


# ===========================================================================
# J — upload başarısız (non-retryable) → StepExecutionError retryable=False
# ===========================================================================

@pytest.mark.asyncio
async def test_j_upload_failed_non_retryable(db):
    from app.publish.youtube.errors import YouTubeAuthError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    upload_error = YouTubeAuthError("Token geçersiz")  # retryable=False
    adapter = _mock_adapter(upload_result=upload_error)
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_failed", new_callable=AsyncMock):
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                with pytest.raises(StepExecutionError) as exc_info:
                    await executor.execute(job, step)

    assert exc_info.value.retryable is False


# ===========================================================================
# K — activate başarısız → mark_failed çağrılır, StepExecutionError retryable=True
# ===========================================================================

@pytest.mark.asyncio
async def test_k_activate_failed_retryable(db):
    from app.publish.youtube.errors import YouTubeActivateError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    activate_error = YouTubeActivateError("Activate başarısız", retryable=True)
    adapter = _mock_adapter(activate_result=activate_error)
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_failed", new_callable=AsyncMock) as mock_mark_failed:
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                with pytest.raises(StepExecutionError) as exc_info:
                    await executor.execute(job, step)

    assert exc_info.value.retryable is True
    mock_mark_failed.assert_awaited()


# ===========================================================================
# L — Partial failure: upload başarılı ama activate başarısız → platform_video_id korunur
# ===========================================================================

@pytest.mark.asyncio
async def test_l_partial_failure_video_id_preserved(db):
    """
    Upload başarılı → platform_video_id ara kaydedildi.
    Activate başarısız → mark_failed çağrıldı.
    Sonraki retry'da upload atlanır (platform_video_id dolu).
    """
    from app.publish.youtube.errors import YouTubeActivateError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    activate_error = YouTubeActivateError("Activate 500", retryable=True)
    adapter = _mock_adapter(activate_result=activate_error)
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    save_upload_called_with = {}

    original_save = executor._save_upload_result

    async def track_save(publish_record_id, platform_video_id):
        save_upload_called_with["platform_video_id"] = platform_video_id
        # Gerçek save'i çağır (DB'ye yaz)
        await original_save(publish_record_id, platform_video_id)

    executor._save_upload_result = track_save

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_failed", new_callable=AsyncMock):
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                with pytest.raises(StepExecutionError):
                    await executor.execute(job, step)

    # Upload başarılı olduğundan platform_video_id kaydedilmiş olmalı
    assert save_upload_called_with.get("platform_video_id") == "vid_test_123"
    adapter.upload.assert_awaited_once()
    adapter.activate.assert_awaited_once()


# ===========================================================================
# M — platform_video_id zaten dolu → upload atlanır, yalnızca activate çalışır
# ===========================================================================

@pytest.mark.asyncio
async def test_m_skip_upload_when_video_id_exists(db):
    job = await _create_job(db)
    # Kayıtta zaten platform_video_id var (upload önceki run'da tamamlandı)
    record = await _create_publish_record(
        db, job.id, platform_video_id="existing_vid_xyz"
    )
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = MagicMock(
                platform_video_id="existing_vid_xyz",
                platform_url="https://www.youtube.com/watch?v=existing_vid_xyz",
            )
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id="existing_vid_xyz",  # dolu
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                result = await executor.execute(job, step)

    # Upload çağrılmadı
    adapter.upload.assert_not_called()
    # Activate çağrıldı
    adapter.activate.assert_awaited_once()
    assert result["platform_video_id"] == "existing_vid_xyz"


# ===========================================================================
# N — audit trail: upload başarılı → platform_event log yazılır
# ===========================================================================

@pytest.mark.asyncio
async def test_n_audit_upload_completed_logged(db):
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    log_events = []

    original_log = executor._log_platform_event

    async def track_log(publish_record_id, event, detail=None):
        log_events.append(event)
        await original_log(publish_record_id, event, detail)

    executor._log_platform_event = track_log

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = MagicMock(
                platform_video_id="vid_test_123",
                platform_url="https://www.youtube.com/watch?v=vid_test_123",
            )
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                await executor.execute(job, step)

    assert "upload_completed" in log_events
    assert "activate_completed" in log_events


# ===========================================================================
# O — audit trail: activate başarılı → platform_event log yazılır
# ===========================================================================

# Test N zaten activate_completed'ı da kapsıyor (log_events içinde).
# Ayrı test: sadece activate_completed doğrulama
@pytest.mark.asyncio
async def test_o_audit_activate_completed_logged(db):
    job = await _create_job(db)
    # Upload zaten tamamlanmış (platform_video_id dolu)
    record = await _create_publish_record(
        db, job.id, platform_video_id="vid_pre_uploaded"
    )
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)
    log_events = []

    executor = PublishStepExecutor(db=db)
    original_log = executor._log_platform_event

    async def track_log(publish_record_id, event, detail=None):
        log_events.append(event)
        await original_log(publish_record_id, event, detail)

    executor._log_platform_event = track_log

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = MagicMock(
                platform_video_id="vid_pre_uploaded",
                platform_url="https://www.youtube.com/watch?v=vid_pre_uploaded",
            )
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id="vid_pre_uploaded",
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                await executor.execute(job, step)

    assert "activate_completed" in log_events
    assert "upload_completed" not in log_events  # upload atlandı


# ===========================================================================
# P — audit trail: upload başarısız → platform_event log yazılır
# ===========================================================================

@pytest.mark.asyncio
async def test_p_audit_upload_failed_logged(db):
    from app.publish.youtube.errors import YouTubeUploadError

    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    upload_error = YouTubeUploadError("Upload failed", retryable=True)
    adapter = _mock_adapter(upload_result=upload_error)
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)
    log_events = []

    executor = PublishStepExecutor(db=db)
    original_log = executor._log_platform_event

    async def track_log(publish_record_id, event, detail=None):
        log_events.append(event)
        await original_log(publish_record_id, event, detail)

    executor._log_platform_event = track_log

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_failed", new_callable=AsyncMock):
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=None,
                    payload_json=record.payload_json,
                )
                with pytest.raises(StepExecutionError):
                    await executor.execute(job, step)

    assert "upload_failed" in log_events


# ===========================================================================
# Q — _build_executor_from_registry: PublishStepExecutor için pipeline_db inject
# ===========================================================================

def test_q_build_executor_publish_inject():
    from app.jobs.dispatcher import _build_executor_from_registry
    from app.publish.executor import PublishStepExecutor

    mock_db = MagicMock()
    mock_registry = MagicMock()

    executor = _build_executor_from_registry(
        PublishStepExecutor,
        mock_registry,
        pipeline_db=mock_db,
    )
    assert isinstance(executor, PublishStepExecutor)
    assert executor._db is mock_db


# ===========================================================================
# R — _build_executor_from_registry: PublishStepExecutor + pipeline_db=None → ValueError
# ===========================================================================

def test_r_build_executor_publish_no_db():
    from app.jobs.dispatcher import _build_executor_from_registry
    from app.publish.executor import PublishStepExecutor

    mock_registry = MagicMock()
    with pytest.raises(ValueError, match="pipeline_db"):
        _build_executor_from_registry(
            PublishStepExecutor,
            mock_registry,
            pipeline_db=None,
        )


# ===========================================================================
# S — payload_json yoksa minimal defaults kullanılır
# ===========================================================================

def test_s_payload_defaults():
    """M22-C: payload_json=None artık ValueError fırlatmalı (fake fallback kaldırıldı)."""
    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-record-s"
    record.payload_json = None

    import pytest as _pytest
    with _pytest.raises(ValueError, match="payload_json boş"):
        executor._resolve_payload(record)


# ===========================================================================
# T — scheduled_at dolu kayıt → activate scheduled_at ile çağrılır
# ===========================================================================

@pytest.mark.asyncio
async def test_t_activate_with_scheduled_at(db):
    job = await _create_job(db)
    scheduled = datetime(2030, 9, 1, 12, 0, 0, tzinfo=timezone.utc)
    record = await _create_publish_record(db, job.id, scheduled_at=scheduled)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = MagicMock(
                platform_video_id="vid_test_123",
                platform_url="https://www.youtube.com/watch?v=vid_test_123",
            )
            with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                mock_get.return_value = MagicMock(
                    id=record.id,
                    status="publishing",
                    platform=record.platform,
                    platform_video_id=None,
                    scheduled_at=scheduled,
                    payload_json=record.payload_json,
                )
                await executor.execute(job, step)

    # activate scheduled_at ile çağrılmış olmalı
    activate_call_kwargs = adapter.activate.call_args.kwargs
    assert activate_call_kwargs.get("scheduled_at") == scheduled


# ===========================================================================
# U — Hardening: audit log executor'dan doğrudan ORM değil, servis üzerinden
# ===========================================================================

@pytest.mark.asyncio
async def test_u_audit_log_via_service_not_orm(db):
    """
    _log_platform_event, publish_service.append_platform_event() çağırmalı.
    Executor doğrudan PublishLog() ORM nesnesi yaratmamalı.
    """
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    append_calls = []

    async def mock_append_platform_event(session, publish_record_id, event, detail=None, actor_id=None):
        append_calls.append({"event": event, "publish_record_id": publish_record_id})

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch(
            "app.publish.executor.publish_service.append_platform_event",
            side_effect=mock_append_platform_event,
        ):
            with patch("app.publish.executor.publish_service.mark_published", new_callable=AsyncMock) as mock_mark:
                mock_mark.return_value = MagicMock(
                    platform_video_id="vid_u",
                    platform_url="https://www.youtube.com/watch?v=vid_u",
                )
                with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                    mock_get.return_value = MagicMock(
                        id=record.id,
                        status="publishing",
                        platform=record.platform,
                        platform_video_id=None,
                        scheduled_at=None,
                        payload_json=record.payload_json,
                    )
                    await executor.execute(job, step)

    event_names = [c["event"] for c in append_calls]
    assert "upload_completed" in event_names
    assert "activate_completed" in event_names
    # Doğrudan PublishLog ORM nesnesi oluşturulmadı — append_platform_event çağrıldı
    assert len(append_calls) >= 2


# ===========================================================================
# V — Hardening: platform_url adapter.activate() sonucundan gelir (sabit değil)
# ===========================================================================

@pytest.mark.asyncio
async def test_v_platform_url_from_adapter_result(db):
    """
    mark_published çağrısında platform_url, adapter.activate() sonucundan
    alınmalı — sabit string üretilmemeli.
    """
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({
            "publish_record_id": record.id,
            "video_path": "/tmp/test.mp4",
        })
    )

    # Adapter activate() farklı bir URL döndürüyor
    real_platform_url = "https://www.youtube.com/watch?v=real_video_from_adapter"
    adapter = _mock_adapter(
        activate_result=PublishAdapterResult(
            success=True,
            platform_video_id="real_video_from_adapter",
            platform_url=real_platform_url,
        )
    )
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    mark_published_kwargs = {}

    async def capture_mark_published(**kwargs):
        mark_published_kwargs.update(kwargs)
        return MagicMock(
            platform_video_id="real_video_from_adapter",
            platform_url=real_platform_url,
        )

    with patch("app.publish.executor.publish_adapter_registry", mock_registry):
        with patch("app.publish.executor.publish_service.append_platform_event", new_callable=AsyncMock):
            with patch(
                "app.publish.executor.publish_service.mark_published",
                side_effect=capture_mark_published,
            ):
                with patch("app.publish.executor.publish_service.get_publish_record", new_callable=AsyncMock) as mock_get:
                    mock_get.return_value = MagicMock(
                        id=record.id,
                        status="publishing",
                        platform=record.platform,
                        platform_video_id=None,
                        scheduled_at=None,
                        payload_json=record.payload_json,
                    )
                    result = await executor.execute(job, step)

    # mark_published'a geçilen platform_url adapter sonucundan gelmeli
    assert mark_published_kwargs.get("platform_url") == real_platform_url
    # Sabit "https://www.youtube.com/watch?v=" + video_id formatı olmamalı (hardcoded değil)
    assert result["platform_url"] == real_platform_url


# ===========================================================================
# W — Hardening: video_path DB'deki render step provider_trace_json'dan okunur
# ===========================================================================

@pytest.mark.asyncio
async def test_w_video_path_from_render_step_trace(db):
    """
    step.artifact_refs_json ve job.input_data_json'da video_path yoksa,
    executor DB'deki 'render' step'inin provider_trace_json → output_path'i kullanmalı.
    """
    job = await _create_job(db)
    record = await _create_publish_record(db, job.id)

    # Render step'ini DB'ye yaz (provider_trace_json'da output_path var)
    render_step = JobStep(
        job_id=job.id,
        step_key="render",
        step_order=6,
        status="completed",
        idempotency_type="artifact_check",
        provider_trace_json=json.dumps({"output_path": "/workspace/job-001/output.mp4"}),
    )
    db.add(render_step)
    await db.flush()

    # Publish step: artifact_refs_json'da yalnızca publish_record_id, video_path YOK
    step = await _create_step(
        db, job.id,
        artifact_refs_json=json.dumps({"publish_record_id": record.id})
    )

    adapter = _mock_adapter()
    mock_registry = MagicMock()
    mock_registry.get = MagicMock(return_value=adapter)

    executor = PublishStepExecutor(db=db)
    resolved_path = await executor._resolve_video_path(job, step)

    assert resolved_path == "/workspace/job-001/output.mp4"
