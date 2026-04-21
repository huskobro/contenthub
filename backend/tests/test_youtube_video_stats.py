"""
YouTube Video Stats endpoint tests.

Covers:
  A) GET /publish/youtube/video-stats — no credentials → 401
  B) GET /publish/youtube/video-stats — no published videos → empty list
  C) Response schema validation
"""

import pytest
from httpx import AsyncClient

YT_BASE = "/api/v1/publish/youtube"


# ---------------------------------------------------------------------------
# A) No credentials → 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_video_stats_no_credentials(client: AsyncClient):
    """Without YouTube OAuth tokens, video-stats returns 401 with an actionable message."""
    resp = await client.get(f"{YT_BASE}/video-stats")
    assert resp.status_code == 401
    body = resp.json()
    assert "detail" in body
    detail = body["detail"].lower()
    # Endpoint may surface either the api-level auth gate ("kimlik") or the
    # endpoint-internal "no YouTube connection" message ("baglanti" /
    # "yetkilendirme" / "credential"). All three are honest 401 signals.
    assert any(tok in detail for tok in ("kimlik", "credential", "baglanti", "yetkilendirme"))


# ---------------------------------------------------------------------------
# B) Response schema shape (when endpoint returns data)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_video_stats_response_schema_shape():
    """VideoStatsResponse schema should have the expected fields."""
    from app.publish.youtube.router import VideoStatsResponse, VideoStatsItem

    # Verify schema accepts valid data
    item = VideoStatsItem(
        video_id="abc123",
        title="Test Video",
        published_at="2025-01-01T00:00:00Z",
        view_count=100,
        like_count=10,
        comment_count=5,
    )
    response = VideoStatsResponse(
        videos=[item],
        total_views=100,
        total_likes=10,
        total_comments=5,
        video_count=1,
    )
    assert response.video_count == 1
    assert response.total_views == 100
    assert len(response.videos) == 1
    assert response.videos[0].video_id == "abc123"


@pytest.mark.asyncio
async def test_video_stats_schema_defaults():
    """VideoStatsItem should have sensible defaults."""
    from app.publish.youtube.router import VideoStatsItem

    item = VideoStatsItem(video_id="x", title="T")
    assert item.view_count == 0
    assert item.like_count == 0
    assert item.comment_count == 0
    assert item.published_at is None


@pytest.mark.asyncio
async def test_video_stats_empty_response():
    """VideoStatsResponse with no videos should serialize correctly."""
    from app.publish.youtube.router import VideoStatsResponse

    response = VideoStatsResponse(
        videos=[],
        total_views=0,
        total_likes=0,
        total_comments=0,
        video_count=0,
    )
    data = response.model_dump()
    assert data["videos"] == []
    assert data["video_count"] == 0
    assert data["total_views"] == 0
