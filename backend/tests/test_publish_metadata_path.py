"""
Publish Core Hardening Pack — Gate 2: metadata path unified.

create_publish_record_from_job must read metadata.json from BOTH:
  * {workspace}/artifacts/metadata.json (primary — where modules write)
  * {workspace}/metadata.json           (legacy fallback — pre-hardening)

And correctly populate payload_json + publish_intent_json.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import pytest

from app.db.models import Base, Job
from app.publish.service import create_publish_record_from_job
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker


@pytest.fixture
async def in_memory_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


async def _make_job_with_workspace(session: AsyncSession, workspace: Path, *, input_topic: str = "Test Topic") -> Job:
    job = Job(
        id="job-" + os.urandom(4).hex(),
        module_type="standard_video",
        status="completed",
        workspace_path=str(workspace),
        input_data_json=json.dumps({"topic": input_topic}),
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


@pytest.mark.asyncio
async def test_reads_artifacts_subdir_first(in_memory_session: AsyncSession):
    """PRIMARY path — {workspace}/artifacts/metadata.json."""
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp)
        (ws / "artifacts").mkdir()
        meta = {
            "title": "Artifact Title",
            "description": "from artifacts/",
            "tags": ["a", "b"],
            "category": "tech",
            "language": "tr",
        }
        (ws / "artifacts" / "metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8",
        )

        job = await _make_job_with_workspace(in_memory_session, ws)
        record = await create_publish_record_from_job(
            session=in_memory_session,
            job_id=job.id,
            platform="youtube",
            content_ref_type="standard_video",
        )
        payload = json.loads(record.payload_json)
        assert payload["title"] == "Artifact Title"
        assert payload["description"] == "from artifacts/"
        assert payload["tags"] == ["a", "b"]
        assert payload["category"] == "tech"
        assert payload["language"] == "tr"
        intent = json.loads(record.publish_intent_json)
        assert intent["title"] == "Artifact Title"
        assert intent["description"] == "from artifacts/"
        assert intent["tags"] == ["a", "b"]


@pytest.mark.asyncio
async def test_falls_back_to_root_metadata_when_no_artifacts_subdir(in_memory_session: AsyncSession):
    """LEGACY fallback — {workspace}/metadata.json without artifacts/ subdir."""
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp)
        meta = {"title": "Legacy Title", "description": "root-level", "tags": ["x"]}
        (ws / "metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8",
        )

        job = await _make_job_with_workspace(in_memory_session, ws)
        record = await create_publish_record_from_job(
            session=in_memory_session,
            job_id=job.id,
            platform="youtube",
            content_ref_type="standard_video",
        )
        payload = json.loads(record.payload_json)
        assert payload["title"] == "Legacy Title"
        assert payload["description"] == "root-level"
        assert payload["tags"] == ["x"]


@pytest.mark.asyncio
async def test_artifacts_takes_precedence_over_root(in_memory_session: AsyncSession):
    """If BOTH exist (rare, transitional), artifacts/ wins."""
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp)
        (ws / "artifacts").mkdir()
        (ws / "artifacts" / "metadata.json").write_text(
            json.dumps({"title": "NEW", "description": "new"}, ensure_ascii=False),
            encoding="utf-8",
        )
        (ws / "metadata.json").write_text(
            json.dumps({"title": "OLD", "description": "old"}, ensure_ascii=False),
            encoding="utf-8",
        )

        job = await _make_job_with_workspace(in_memory_session, ws)
        record = await create_publish_record_from_job(
            session=in_memory_session,
            job_id=job.id,
            platform="youtube",
            content_ref_type="standard_video",
        )
        payload = json.loads(record.payload_json)
        assert payload["title"] == "NEW"
        assert payload["description"] == "new"


@pytest.mark.asyncio
async def test_missing_metadata_uses_input_data_topic_fallback(in_memory_session: AsyncSession):
    """No metadata.json anywhere — title falls back to input_data.topic."""
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp)
        job = await _make_job_with_workspace(
            in_memory_session, ws, input_topic="Fallback Topic",
        )
        record = await create_publish_record_from_job(
            session=in_memory_session,
            job_id=job.id,
            platform="youtube",
            content_ref_type="standard_video",
        )
        payload = json.loads(record.payload_json) if record.payload_json else {}
        # The topic fallback path sets title but nothing else.
        assert payload.get("title") == "Fallback Topic"
        assert "description" not in payload
        assert "tags" not in payload


@pytest.mark.asyncio
async def test_corrupt_metadata_does_not_raise(in_memory_session: AsyncSession):
    """Malformed JSON is logged and skipped; fallback to input_data topic."""
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp)
        (ws / "artifacts").mkdir()
        (ws / "artifacts" / "metadata.json").write_text("{not valid json", encoding="utf-8")

        job = await _make_job_with_workspace(in_memory_session, ws, input_topic="T")
        record = await create_publish_record_from_job(
            session=in_memory_session,
            job_id=job.id,
            platform="youtube",
            content_ref_type="standard_video",
        )
        payload = json.loads(record.payload_json) if record.payload_json else {}
        # Topic fallback still works
        assert payload.get("title") == "T"
