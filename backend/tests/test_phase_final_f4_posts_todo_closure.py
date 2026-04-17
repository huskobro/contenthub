"""
Phase Final F4 — posts/service.py TODO closure kontrat testleri.

Amac:
  `submit_post()` fonksiyonunun icindeki eski "TODO: Gercek platform API
  cagrisi burada olacak" yorumu Faz F4'te kapatildi. Bu test dosyasi,
  kapanis sonrasi davranisin kilitli kalmasini garanti eder:

  1. Capability matrisi tum platform/post_type kombinasyonlari icin False
     basladigi surece `delivery_status="not_available"` + status="queued"
     sonucu donmeli — HIC BIR senkron HTTP cagrisi yapilmamali.
  2. Capability True'ya cekilirse (gelecekteki adapter registry'yi simule
     ederek) kod yolu `delivery_status="pending"` + status="queued"
     sonucu vermeli ve burada yine senkron HTTP yapmamali.
  3. EngagementTask her iki yolda da uretilmeli; `executed_at` yalniz
     can_deliver=True yolunda dolu olmali.

Bu testler, "TODO kapali" durumunun muhendislik kontratini sabitler;
gelecekte gercek delivery bir background adapter modulune TASINACAK,
submit_post icinde senkron HTTP cagrisi asla olusturulmayacak.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChannelProfile, EngagementTask, PlatformConnection, User
from app.posts import service as posts_service

pytestmark = pytest.mark.asyncio


async def _mk_channel_with_connection(
    db: AsyncSession, owner_id: str, slug: str
) -> tuple[ChannelProfile, PlatformConnection]:
    ch = ChannelProfile(
        user_id=owner_id,
        channel_slug=slug,
        profile_name=f"F4 Posts {slug}",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)

    conn = PlatformConnection(
        channel_profile_id=ch.id,
        platform="youtube",
        auth_state="connected",
        token_state="valid",
        connection_status="connected",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return ch, conn


async def test_submit_post_not_available_path_has_no_http_call(
    db_session: AsyncSession,
    regular_user: User,
) -> None:
    """Capability False oldugunda: status=queued, delivery_status=not_available, task=pending."""
    channel, connection = await _mk_channel_with_connection(
        db_session, regular_user.id, "f4-channel-a"
    )

    post = await posts_service.create_post(
        db_session,
        platform="youtube",
        body="F4 TODO closure — not_available path",
        post_type="community_post",
        channel_profile_id=channel.id,
        platform_connection_id=connection.id,
    )

    result = await posts_service.submit_post(db_session, post.id, regular_user.id)

    assert result["success"] is True
    assert result["delivery_status"] == "not_available"
    assert result["engagement_task_id"] is not None
    assert result["error"] is not None  # reason aciklamasi dolu

    # Post state
    await db_session.refresh(post)
    assert post.status == "queued"
    assert post.delivery_status == "not_available"
    assert post.delivery_error is not None

    # EngagementTask: pending, executed_at=None
    task = await db_session.get(EngagementTask, result["engagement_task_id"])
    assert task is not None
    assert task.status == "pending"
    assert task.executed_at is None


async def test_submit_post_capability_true_keeps_queued_without_http(
    db_session: AsyncSession,
    regular_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Capability True'ya cekilse bile submit_post senkron HTTP yapmamali.
    Kontrat: state=queued, delivery_status=pending, task=executed.
    Gelecekte background adapter tuketecek.
    """
    monkeypatch.setitem(
        posts_service.PLATFORM_POST_CAPABILITY,
        "youtube",
        {"community_post": True, "share_post": False, "announcement": False},
    )

    channel, connection = await _mk_channel_with_connection(
        db_session, regular_user.id, "f4-channel-b"
    )

    post = await posts_service.create_post(
        db_session,
        platform="youtube",
        body="F4 TODO closure — capability=True path",
        post_type="community_post",
        channel_profile_id=channel.id,
        platform_connection_id=connection.id,
    )

    result = await posts_service.submit_post(db_session, post.id, regular_user.id)

    assert result["success"] is True
    assert result["delivery_status"] == "pending"
    assert result["engagement_task_id"] is not None
    assert result["error"] is None  # can_deliver=True → reason yok

    await db_session.refresh(post)
    assert post.status == "queued"
    assert post.delivery_status == "pending"
    assert post.delivery_error is None

    # EngagementTask: executed (adapter tuketmeden once kuyruk disiplini kurulu)
    task = await db_session.get(EngagementTask, result["engagement_task_id"])
    assert task is not None
    assert task.status == "executed"
    assert task.executed_at is not None


async def test_submit_post_second_submit_is_rejected(
    db_session: AsyncSession,
    regular_user: User,
) -> None:
    """Bir kez queue'ya alinan post tekrar submit edilemez."""
    channel, connection = await _mk_channel_with_connection(
        db_session, regular_user.id, "f4-channel-c"
    )

    post = await posts_service.create_post(
        db_session,
        platform="youtube",
        body="F4 TODO closure — double submit guard",
        post_type="community_post",
        channel_profile_id=channel.id,
        platform_connection_id=connection.id,
    )

    first = await posts_service.submit_post(db_session, post.id, regular_user.id)
    assert first["success"] is True

    second = await posts_service.submit_post(db_session, post.id, regular_user.id)
    assert second["success"] is False
    assert "zaten gonderilmis veya kuyrukta" in (second["error"] or "")
