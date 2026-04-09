"""
Faz 11 — Publish Flow V2 + Multi-Platform Readiness tests.

Tests:
1. connections-for-channel endpoint reachable
2. connections-for-channel returns empty for nonexistent channel
3. create publish record with v2 fields (content_project_id, platform_connection_id)
4. publish intent update on draft
5. publish intent rejected on non-draft
6. by-project listing endpoint
7. publish_result_json populated on mark_published
8. create from job with v2 fields
9. list_publish_records_v2 filters by content_project_id
10. v2 schema fields present in read response
"""

import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

PUBLISH_BASE = "/api/v1/publish"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _ensure_job(db_session: AsyncSession, job_id: str = None) -> str:
    """Create a minimal job row and return its id."""
    from app.db.models import Job
    job = Job(module_type="standard_video", status="completed")
    if job_id:
        job.id = job_id
    db_session.add(job)
    await db_session.commit()
    await db_session.refresh(job)
    return job.id


async def _create_draft_via_service(db_session: AsyncSession, **overrides) -> "PublishRecord":
    """Create a draft publish record directly via service."""
    from app.publish.service import create_publish_record
    from app.publish.schemas import PublishRecordCreate

    job_id = overrides.get("job_id") or await _ensure_job(db_session)
    data = PublishRecordCreate(
        job_id=job_id,
        content_ref_type=overrides.get("content_ref_type", "standard_video"),
        content_ref_id=overrides.get("content_ref_id", "ref-faz11"),
        platform=overrides.get("platform", "youtube"),
        content_project_id=overrides.get("content_project_id"),
        platform_connection_id=overrides.get("platform_connection_id"),
        publish_intent_json=overrides.get("publish_intent_json"),
    )
    return await create_publish_record(db_session, data)


# ---------------------------------------------------------------------------
# 1. connections-for-channel endpoint reachable
# ---------------------------------------------------------------------------

async def test_connections_for_channel_reachable(client: AsyncClient):
    """GET /publish/connections-for-channel/{id} should return 200."""
    resp = await client.get(f"{PUBLISH_BASE}/connections-for-channel/nonexistent-channel")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ---------------------------------------------------------------------------
# 2. connections-for-channel returns empty for nonexistent channel
# ---------------------------------------------------------------------------

async def test_connections_for_channel_empty_result(client: AsyncClient):
    """Non-existent channel returns empty list."""
    resp = await client.get(f"{PUBLISH_BASE}/connections-for-channel/no-such-channel-123")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 0


# ---------------------------------------------------------------------------
# 3. create publish record with v2 fields
# ---------------------------------------------------------------------------

async def test_create_with_v2_fields(db_session: AsyncSession):
    """Publish record should accept content_project_id and platform_connection_id."""
    record = await _create_draft_via_service(
        db_session,
        content_project_id="proj-faz11-001",
        platform_connection_id="conn-faz11-001",
    )
    assert record.status == "draft"
    assert record.content_project_id == "proj-faz11-001"
    assert record.platform_connection_id == "conn-faz11-001"


# ---------------------------------------------------------------------------
# 4. publish intent update on draft
# ---------------------------------------------------------------------------

async def test_intent_update_on_draft(db_session: AsyncSession):
    """update_publish_intent should update publish_intent_json on draft."""
    from app.publish.service import update_publish_intent

    record = await _create_draft_via_service(db_session)

    intent_data = {
        "title": "Test Video Basligi",
        "description": "Test aciklama",
        "tags": ["test", "faz11"],
        "privacy_status": "unlisted",
    }
    intent_json = json.dumps(intent_data, ensure_ascii=False)
    updated = await update_publish_intent(db_session, record.id, intent_json)

    assert updated.publish_intent_json is not None
    parsed = json.loads(updated.publish_intent_json)
    assert parsed["title"] == "Test Video Basligi"
    assert parsed["privacy_status"] == "unlisted"
    assert "test" in parsed["tags"]


# ---------------------------------------------------------------------------
# 5. publish intent rejected on non-draft
# ---------------------------------------------------------------------------

async def test_intent_rejected_on_non_draft(db_session: AsyncSession):
    """Intent update should be rejected for non-draft records."""
    from app.publish.service import update_publish_intent, submit_for_review
    from app.publish.exceptions import PublishGateViolationError

    record = await _create_draft_via_service(db_session)
    await submit_for_review(db_session, record.id)

    with pytest.raises(PublishGateViolationError):
        await update_publish_intent(db_session, record.id, '{"title":"nope"}')


# ---------------------------------------------------------------------------
# 6. by-project listing endpoint
# ---------------------------------------------------------------------------

async def test_by_project_listing(db_session: AsyncSession):
    """list_publish_records_v2 should return records filtered by content_project_id."""
    from app.publish.service import list_publish_records_v2

    project_id = "proj-listing-faz11"
    await _create_draft_via_service(db_session, content_project_id=project_id)
    await _create_draft_via_service(db_session, content_project_id=project_id)
    await _create_draft_via_service(db_session, content_project_id="other-project")

    results = await list_publish_records_v2(db_session, content_project_id=project_id)
    assert len(results) >= 2
    for rec in results:
        assert rec.content_project_id == project_id


# ---------------------------------------------------------------------------
# 7. publish_result_json populated on mark_published
# ---------------------------------------------------------------------------

async def test_publish_result_json_populated(db_session: AsyncSession):
    """mark_published should populate publish_result_json."""
    from app.publish.service import (
        submit_for_review,
        review_action,
        trigger_publish,
        mark_published,
    )

    record = await _create_draft_via_service(db_session)
    record = await submit_for_review(db_session, record.id)
    record = await review_action(db_session, record.id, "approve")
    record = await trigger_publish(db_session, record.id)
    record = await mark_published(
        db_session,
        record.id,
        platform_video_id="yt-vid-123",
        platform_url="https://youtube.com/watch?v=yt-vid-123",
    )

    assert record.publish_result_json is not None
    result = json.loads(record.publish_result_json)
    assert result["platform_video_id"] == "yt-vid-123"
    assert result["platform_url"] == "https://youtube.com/watch?v=yt-vid-123"
    assert "published_at" in result
    assert "attempt_count" in result


# ---------------------------------------------------------------------------
# 8. create from job with v2 fields
# ---------------------------------------------------------------------------

async def test_create_from_job_with_v2_fields(db_session: AsyncSession):
    """create_publish_record_from_job should accept content_project_id and platform_connection_id."""
    from app.publish.service import create_publish_record_from_job

    job_id = await _ensure_job(db_session)
    record = await create_publish_record_from_job(
        session=db_session,
        job_id=job_id,
        platform="youtube",
        content_ref_type="standard_video",
        content_project_id="proj-from-job-faz11",
        platform_connection_id="conn-from-job-faz11",
    )

    assert record.content_project_id == "proj-from-job-faz11"
    assert record.platform_connection_id == "conn-from-job-faz11"


# ---------------------------------------------------------------------------
# 9. list_publish_records_v2 filters by content_project_id
# ---------------------------------------------------------------------------

async def test_list_v2_filters(db_session: AsyncSession):
    """list_publish_records_v2 should filter by content_project_id."""
    from app.publish.service import list_publish_records_v2

    proj_a = "proj-v2-filter-a"
    proj_b = "proj-v2-filter-b"

    await _create_draft_via_service(db_session, content_project_id=proj_a)
    await _create_draft_via_service(db_session, content_project_id=proj_a)
    await _create_draft_via_service(db_session, content_project_id=proj_b)

    results_a = await list_publish_records_v2(db_session, content_project_id=proj_a)
    assert len(results_a) >= 2
    for r in results_a:
        assert r.content_project_id == proj_a

    results_b = await list_publish_records_v2(db_session, content_project_id=proj_b)
    assert len(results_b) >= 1
    for r in results_b:
        assert r.content_project_id == proj_b


# ---------------------------------------------------------------------------
# 10. v2 schema fields present in read response
# ---------------------------------------------------------------------------

async def test_v2_fields_in_service_response(db_session: AsyncSession):
    """Service should return v2 fields on records."""
    from app.publish.service import get_publish_record

    record = await _create_draft_via_service(
        db_session,
        content_project_id="proj-schema-test",
        platform_connection_id="conn-schema-test",
        publish_intent_json='{"title":"test"}',
    )

    fetched = await get_publish_record(db_session, record.id)
    assert fetched.content_project_id == "proj-schema-test"
    assert fetched.platform_connection_id == "conn-schema-test"
    assert fetched.publish_intent_json == '{"title":"test"}'
    assert fetched.publish_result_json is None  # null for draft
