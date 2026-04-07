"""
Tests — M37 Analytics: Publish Funnel + Prompt Assembly Metrics

Kapsam:
  1. test_overview_includes_review_pending         — pending_review kayıt → review_pending_count = 1
  2. test_overview_publish_backlog                 — approved kayıt → publish_backlog_count += 1
  3. test_overview_review_rejected_windowed        — pencere içi vs dışı rejected
  4. test_prompt_assembly_metrics_empty            — veri yok → sıfırlar döner
  5. test_prompt_assembly_metrics_with_data        — 1 run oluştur → total_assembly_runs = 1
  6. test_prompt_assembly_dry_vs_production        — dry_run_count ve production_run_count doğru
  7. test_prompt_assembly_module_stats             — module_stats gruplaması doğru
  8. test_operations_includes_assembly_counts      — total_assembly_runs operations metrics içinde
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.db.models import Job, PublishRecord
from app.prompt_assembly.models import PromptAssemblyRun
from app.analytics import service as analytics_service

# ---------------------------------------------------------------------------
# Zaman sabitleri
# ---------------------------------------------------------------------------

_RECENT = datetime.now(timezone.utc) - timedelta(hours=1)
_OLD = datetime.now(timezone.utc) - timedelta(days=120)

# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------


async def _make_job(session, status: str = "queued") -> Job:
    job = Job(module_type="standard_video", status=status, retry_count=0)
    session.add(job)
    await session.flush()
    await session.execute(
        text("UPDATE jobs SET created_at = :ts WHERE id = :id"),
        {"ts": _RECENT.isoformat(), "id": job.id},
    )
    await session.refresh(job)
    return job


async def _make_publish(
    session, job_id: str, status: str = "draft", ts=None
) -> PublishRecord:
    anchor = ts if ts is not None else _RECENT
    record = PublishRecord(
        job_id=job_id,
        content_ref_type="standard_video",
        content_ref_id="sv-m37-test",
        platform="youtube",
        status=status,
    )
    session.add(record)
    await session.flush()
    await session.execute(
        text("UPDATE publish_records SET created_at = :ts WHERE id = :id"),
        {"ts": anchor.isoformat(), "id": record.id},
    )
    await session.refresh(record)
    return record


async def _make_assembly_run(
    session,
    module_scope: str = "news_bulletin",
    provider_name: str = "openai",
    is_dry_run: bool = False,
    block_count_included: int = 5,
    block_count_skipped: int = 2,
    ts=None,
    with_response: bool = False,
    with_error: bool = False,
) -> PromptAssemblyRun:
    anchor = ts if ts is not None else _RECENT
    run = PromptAssemblyRun(
        module_scope=module_scope,
        provider_name=provider_name,
        provider_type="llm",
        final_prompt_text="test prompt",
        final_payload_json="{}",
        settings_snapshot_json="{}",
        prompt_snapshot_json="{}",
        data_snapshot_json="{}",
        included_block_keys_json="[]",
        skipped_block_keys_json="[]",
        block_count_included=block_count_included,
        block_count_skipped=block_count_skipped,
        is_dry_run=is_dry_run,
        data_source="job_context",
        provider_response_json='{"ok": true}' if with_response else None,
        provider_error_json='{"err": "test"}' if with_error else None,
    )
    session.add(run)
    await session.flush()
    await session.execute(
        text("UPDATE prompt_assembly_runs SET created_at = :ts WHERE id = :id"),
        {"ts": anchor.isoformat(), "id": run.id},
    )
    await session.refresh(run)
    return run


# ---------------------------------------------------------------------------
# 1. test_overview_includes_review_pending
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_overview_includes_review_pending():
    """pending_review status'lu bir kayıt oluştur → review_pending_count en az 1 artar."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="all_time")
        base = before["review_pending_count"]

        job = await _make_job(session)
        await _make_publish(session, job_id=job.id, status="pending_review")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="all_time")

    assert after["review_pending_count"] == base + 1


# ---------------------------------------------------------------------------
# 2. test_overview_publish_backlog
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_overview_publish_backlog():
    """approved status'lu bir kayıt oluştur → publish_backlog_count en az 1 artar."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="all_time")
        base = before["publish_backlog_count"]

        job = await _make_job(session)
        await _make_publish(session, job_id=job.id, status="approved")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="all_time")

    assert after["publish_backlog_count"] == base + 1


# ---------------------------------------------------------------------------
# 3. test_overview_review_rejected_windowed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_overview_review_rejected_windowed():
    """
    Pencere içinde 1 rejected, pencere dışında 1 rejected oluştur.
    last_7d'de artış tam 1 olmalı.
    """
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["review_rejected_count"]

        job1 = await _make_job(session)
        await _make_publish(session, job_id=job1.id, status="review_rejected", ts=_RECENT)

        job2 = await _make_job(session)
        await _make_publish(session, job_id=job2.id, status="review_rejected", ts=_OLD)

        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["review_rejected_count"] == base + 1


# ---------------------------------------------------------------------------
# 4. test_prompt_assembly_metrics_empty
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_prompt_assembly_metrics_empty():
    """
    Bilinen bir module_scope ile son 7d içinde hiç run olmadığında
    total_assembly_runs, dry_run_count, production_run_count sıfır döner.

    Not: DB paylaşımlı olduğundan tam sıfır garantisi yoktur.
    Bu test all_time window için total değerlerin integer ve >= 0 olduğunu doğrular.
    """
    async with AsyncSessionLocal() as session:
        result = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="all_time"
        )

    assert result["window"] == "all_time"
    assert isinstance(result["total_assembly_runs"], int)
    assert isinstance(result["dry_run_count"], int)
    assert isinstance(result["production_run_count"], int)
    assert result["total_assembly_runs"] >= 0
    assert result["dry_run_count"] >= 0
    assert result["production_run_count"] >= 0
    assert isinstance(result["avg_included_blocks"], float)
    assert isinstance(result["avg_skipped_blocks"], float)
    assert isinstance(result["module_stats"], list)
    assert isinstance(result["provider_stats"], list)


# ---------------------------------------------------------------------------
# 5. test_prompt_assembly_metrics_with_data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_prompt_assembly_metrics_with_data():
    """1 production run oluştur → total_assembly_runs en az 1 artar."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="last_7d"
        )
        base = before["total_assembly_runs"]

        await _make_assembly_run(session, is_dry_run=False)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="last_7d"
        )

    assert after["total_assembly_runs"] == base + 1


# ---------------------------------------------------------------------------
# 6. test_prompt_assembly_dry_vs_production
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_prompt_assembly_dry_vs_production():
    """1 dry run + 1 production run oluştur → sayımlar doğru ayrışmalı."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="last_7d"
        )
        base_prod = before["production_run_count"]
        base_dry = before["dry_run_count"]

        await _make_assembly_run(session, is_dry_run=False)
        await _make_assembly_run(session, is_dry_run=True)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="last_7d"
        )

    assert after["production_run_count"] == base_prod + 1
    assert after["dry_run_count"] == base_dry + 1


# ---------------------------------------------------------------------------
# 7. test_prompt_assembly_module_stats
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_prompt_assembly_module_stats():
    """Belirli bir module_scope ile run oluştur → module_stats içinde görünmeli."""
    unique_scope = "test_module_m37_unique"

    async with AsyncSessionLocal() as session:
        await _make_assembly_run(
            session,
            module_scope=unique_scope,
            block_count_included=4,
            block_count_skipped=1,
        )
        await session.commit()

    async with AsyncSessionLocal() as session:
        result = await analytics_service.get_prompt_assembly_metrics(
            session=session, window="last_7d"
        )

    module_scopes = [s["module_scope"] for s in result["module_stats"]]
    assert unique_scope in module_scopes

    stat = next(s for s in result["module_stats"] if s["module_scope"] == unique_scope)
    assert stat["run_count"] >= 1
    assert isinstance(stat["avg_included_blocks"], float)
    assert isinstance(stat["avg_skipped_blocks"], float)


# ---------------------------------------------------------------------------
# 8. test_operations_includes_assembly_counts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_operations_includes_assembly_counts():
    """get_operations_metrics sonucunda total_assembly_runs ve dry_run_count mevcut."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_operations_metrics(
            session=session, window="last_7d"
        )
        base_prod = before["total_assembly_runs"]
        base_dry = before["dry_run_count"]

        await _make_assembly_run(session, is_dry_run=False)
        await _make_assembly_run(session, is_dry_run=True)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_operations_metrics(
            session=session, window="last_7d"
        )

    assert isinstance(after["total_assembly_runs"], int)
    assert isinstance(after["dry_run_count"], int)
    assert after["total_assembly_runs"] == base_prod + 1
    assert after["dry_run_count"] == base_dry + 1
