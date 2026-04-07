"""
M14-C: YouTube Analytics Hardening tests.

Covers:
  1. VideoStatsSnapshot model instantiation
  2. VideoStatsTrendResponse / VideoStatsTrendItem schema shape
  3. Trend endpoint returns empty list for unknown video
  4. Trend endpoint returns snapshots in chronological order
  5. Snapshot recording verification (model-level)
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

YT_BASE = "/api/v1/publish/youtube"


# ---------------------------------------------------------------------------
# 1. VideoStatsSnapshot model creation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_video_stats_snapshot_model_creation():
    """VideoStatsSnapshot can be persisted and read back with expected values."""
    from app.db.session import AsyncSessionLocal
    from app.db.models import VideoStatsSnapshot

    async with AsyncSessionLocal() as session:
        snap = VideoStatsSnapshot(
            platform_video_id="model_test_abc",
            view_count=100,
            like_count=10,
            comment_count=5,
        )
        session.add(snap)
        await session.flush()

        assert snap.platform_video_id == "model_test_abc"
        assert snap.view_count == 100
        assert snap.like_count == 10
        assert snap.comment_count == 5
        assert snap.id is not None
        assert len(snap.id) == 36
        assert snap.snapshot_at is not None

        await session.rollback()


@pytest.mark.asyncio
async def test_video_stats_snapshot_defaults():
    """VideoStatsSnapshot numeric fields default to 0 after flush."""
    from app.db.session import AsyncSessionLocal
    from app.db.models import VideoStatsSnapshot

    async with AsyncSessionLocal() as session:
        snap = VideoStatsSnapshot(platform_video_id="defaults_xyz")
        session.add(snap)
        await session.flush()

        assert snap.view_count == 0
        assert snap.like_count == 0
        assert snap.comment_count == 0

        await session.rollback()


# ---------------------------------------------------------------------------
# 2. VideoStatsTrendResponse schema shape
# ---------------------------------------------------------------------------

def test_trend_response_schema():
    """VideoStatsTrendResponse and VideoStatsTrendItem schemas serialize correctly."""
    from app.publish.youtube.router import VideoStatsTrendResponse, VideoStatsTrendItem

    item = VideoStatsTrendItem(
        snapshot_at="2026-01-01T10:00:00+00:00",
        view_count=500,
        like_count=50,
        comment_count=25,
    )
    response = VideoStatsTrendResponse(
        video_id="vid123",
        title="Test Video",
        snapshots=[item],
    )
    data = response.model_dump()
    assert data["video_id"] == "vid123"
    assert data["title"] == "Test Video"
    assert len(data["snapshots"]) == 1
    assert data["snapshots"][0]["view_count"] == 500
    assert data["snapshots"][0]["snapshot_at"] == "2026-01-01T10:00:00+00:00"


def test_trend_response_empty_snapshots():
    """VideoStatsTrendResponse with no snapshots should serialize correctly."""
    from app.publish.youtube.router import VideoStatsTrendResponse

    response = VideoStatsTrendResponse(
        video_id="empty",
        title="No Data",
        snapshots=[],
    )
    data = response.model_dump()
    assert data["snapshots"] == []
    assert data["video_id"] == "empty"


# ---------------------------------------------------------------------------
# 3. Trend endpoint returns empty list for unknown video
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_trend_endpoint_unknown_video(client: AsyncClient):
    """Trend endpoint returns empty snapshots and default title for unknown video ID."""
    resp = await client.get(f"{YT_BASE}/video-stats/nonexistent_video/trend")
    assert resp.status_code == 200
    body = resp.json()
    assert body["video_id"] == "nonexistent_video"
    assert body["snapshots"] == []
    assert body["title"] == "Bilinmeyen Video"


# ---------------------------------------------------------------------------
# 4. Trend endpoint returns snapshots in chronological order (DB integration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_trend_endpoint_returns_chronological_snapshots(client: AsyncClient, db_session):
    """
    Insert snapshots out of order, verify trend endpoint returns them
    sorted by snapshot_at ascending.
    """
    from app.db.models import VideoStatsSnapshot

    test_video_id = f"chrono_test_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    # Insert in reverse order using the test DB session (same DB as client uses)
    for i in [3, 1, 2]:
        db_session.add(VideoStatsSnapshot(
            platform_video_id=test_video_id,
            view_count=i * 100,
            like_count=i * 10,
            comment_count=i,
            snapshot_at=now + timedelta(hours=i),
        ))
    await db_session.commit()

    resp = await client.get(f"{YT_BASE}/video-stats/{test_video_id}/trend")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["snapshots"]) == 3

    # Verify chronological order (view_count 100, 200, 300)
    view_counts = [s["view_count"] for s in body["snapshots"]]
    assert view_counts == [100, 200, 300]


# ---------------------------------------------------------------------------
# 5. VideoStatsTrendItem field validation
# ---------------------------------------------------------------------------

def test_trend_item_requires_all_fields():
    """VideoStatsTrendItem should require all fields."""
    from app.publish.youtube.router import VideoStatsTrendItem
    from pydantic import ValidationError

    # Should work with all fields
    item = VideoStatsTrendItem(
        snapshot_at="2026-01-01T00:00:00Z",
        view_count=0,
        like_count=0,
        comment_count=0,
    )
    assert item.view_count == 0

    # Should fail without required fields
    with pytest.raises(ValidationError):
        VideoStatsTrendItem(snapshot_at="2026-01-01T00:00:00Z")
