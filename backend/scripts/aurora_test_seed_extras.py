#!/usr/bin/env python3
"""
Aurora Test Seed Extras — kanal, proje, baglanti, yorum, playlist, post,
otomasyon ve bildirim seed'leri (Aurora user sayfalarini canlandirmak icin).

Tum kayitlar metadata_json icinde {"aurora_test_seed": true} markeri tasir.
--purge bayragi tum bu kayitlari geri siler. boxingbox kullanicisi hedeftir.

Kullanim:
  python scripts/aurora_test_seed_extras.py            # ekle
  python scripts/aurora_test_seed_extras.py --reseed   # temizle + ekle
  python scripts/aurora_test_seed_extras.py --purge    # sadece sil
"""
import argparse
import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

AURORA_MARKER_KEY = "aurora_test_seed"
AURORA_MARKER_VALUE = True
TARGET_USER_EMAILS = ["boxingboxyt@gmail.com", "admin@contenthub.local"]


def _aurora_meta(extra: Optional[dict] = None) -> str:
    payload = {AURORA_MARKER_KEY: AURORA_MARKER_VALUE}
    if extra:
        payload.update(extra)
    return json.dumps(payload, ensure_ascii=False)


def _is_aurora(meta_json: Optional[str]) -> bool:
    if not meta_json:
        return False
    try:
        return json.loads(meta_json).get(AURORA_MARKER_KEY) is AURORA_MARKER_VALUE
    except (ValueError, TypeError):
        return False


async def get_target_user_ids() -> list[str]:
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.db.models import User
    ids = []
    async with AsyncSessionLocal() as db:
        for em in TARGET_USER_EMAILS:
            u = (await db.execute(select(User).where(User.email == em))).scalar_one_or_none()
            if u:
                ids.append(u.id)
    if not ids:
        raise RuntimeError("Hicbir hedef kullanici bulunamadi")
    return ids


async def purge() -> dict:
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.db.models import (
        ChannelProfile, ContentProject, PlatformConnection,
        SyncedComment, SyncedPlaylist, PlatformPost, AutomationPolicy,
        NotificationItem,
    )
    counts = {}
    async with AsyncSessionLocal() as db:
        for model, key in [
            (NotificationItem, "metadata_json"),
            (SyncedComment, None),
            (SyncedPlaylist, None),
            (PlatformPost, None),
            (AutomationPolicy, None),
            (PlatformConnection, None),
            (ContentProject, None),
            (ChannelProfile, "metadata_json"),
        ]:
            rows = (await db.execute(select(model))).scalars().all()
            n = 0
            for r in rows:
                meta = getattr(r, key, None) if key else getattr(r, "metadata_json", None)
                # cok yerde metadata_json yok — type bazli check
                if hasattr(r, "metadata_json"):
                    if _is_aurora(getattr(r, "metadata_json", None)):
                        await db.delete(r)
                        n += 1
                        continue
                # comments/playlists/posts/automations/connections icin
                # external_*_id veya body marker'i kullaniyoruz
                if hasattr(r, "external_comment_id") and (r.external_comment_id or "").startswith("AUR-"):
                    await db.delete(r); n += 1; continue
                if hasattr(r, "external_playlist_id") and (r.external_playlist_id or "").startswith("AUR-"):
                    await db.delete(r); n += 1; continue
                if hasattr(r, "external_post_id") and (r.external_post_id or "").startswith("AUR-"):
                    await db.delete(r); n += 1; continue
                if hasattr(r, "external_account_id") and (r.external_account_id or "").startswith("AUR-"):
                    await db.delete(r); n += 1; continue
                # AutomationPolicy: name'e marker
                if model.__name__ == "AutomationPolicy" and (getattr(r, "name", "") or "").startswith("[AURORA]"):
                    await db.delete(r); n += 1; continue
                # NotificationItem: action_url'de marker
                if hasattr(r, "action_url") and (r.action_url or "").startswith("aurora-test://"):
                    await db.delete(r); n += 1; continue
            counts[model.__name__] = n
        await db.commit()
    return counts


async def seed() -> dict:
    from app.db.session import AsyncSessionLocal
    from app.db.models import (
        ChannelProfile, ContentProject, PlatformConnection,
        SyncedComment, SyncedPlaylist, PlatformPost, AutomationPolicy,
        NotificationItem,
    )
    from app.db.models import User
    from sqlalchemy import select

    user_ids = await get_target_user_ids()
    now = datetime.now(timezone.utc)
    counts = {"channels": 0, "projects": 0, "connections": 0, "comments": 0,
              "playlists": 0, "posts": 0, "automations": 0, "notifications": 0}

    async with AsyncSessionLocal() as db:
      for u_idx, user_id in enumerate(user_ids):
        # --- Channels ---
        channel_specs = [
            (f"Tarih Anlatilari{' (admin)' if u_idx else ''}", f"tarih-anlatilari-{u_idx}", f"@tarihanlatilari{u_idx}", "Tarih Anlatıları"),
            (f"Teknoloji Bulteni{' (admin)' if u_idx else ''}", f"teknoloji-bulteni-{u_idx}", f"@teknobulten{u_idx}", "Teknoloji Bülteni"),
            (f"Urun Inceleme TR{' (admin)' if u_idx else ''}", f"urun-inceleme-tr-{u_idx}", f"@uruninceleme{u_idx}", "Ürün İnceleme TR"),
        ]
        channel_ids = []
        for i, (name, slug, handle, title) in enumerate(channel_specs):
            cp = ChannelProfile(
                user_id=user_id,
                profile_name=name,
                channel_slug=slug,
                handle=handle,
                title=title,
                platform="youtube",
                source_url=f"https://www.youtube.com/{handle}",
                normalized_url=f"https://youtube.com/{handle.lstrip('@')}",
                external_channel_id=f"AUR-CH-{u_idx}-{i:03d}",
                avatar_url=None,
                status="active",
                import_status="completed",
                last_import_at=now - timedelta(days=i + 1),
                metadata_json=_aurora_meta({"display_index": i}),
                notes=f"Aurora test kanalı #{i + 1}",
                default_language="tr",
            )
            db.add(cp)
            await db.flush()  # id al
            channel_ids.append(cp.id)
            counts["channels"] += 1

            # PlatformConnection (her kanal icin 1)
            pc = PlatformConnection(
                channel_profile_id=cp.id,
                platform="youtube",
                external_account_id=f"AUR-ACC-{u_idx}-{i:03d}",
                external_account_name=title,
                auth_state="connected" if i < 2 else "pending",
                token_state="valid" if i < 2 else "invalid",
                connection_status="connected" if i < 2 else "disconnected",
                requires_reauth=(i == 2),
                sync_status="synced" if i < 2 else "never",
                last_sync_at=now - timedelta(hours=i * 6) if i < 2 else None,
                last_success_at=now - timedelta(hours=i * 6) if i < 2 else None,
                is_primary=(i == 0),
                subscriber_count=12_400 + i * 8_500,
                scope_status="sufficient" if i < 2 else "insufficient",
                features_available=json.dumps(["upload", "comments", "playlists"]) if i < 2 else None,
            )
            db.add(pc)
            await db.flush()
            counts["connections"] += 1

            # ContentProject (her kanal icin 2-3)
            for j in range(2 + (i % 2)):
                proj = ContentProject(
                    user_id=user_id,
                    channel_profile_id=cp.id,
                    module_type=["standard_video", "news_bulletin", "product_review"][j % 3],
                    title=f"{name} — Proje {j + 1}",
                    description=f"Aurora test projesi (kanal: {name}, idx: {j})",
                    content_status=["draft", "in_progress", "ready", "published"][j % 4],
                    publish_status=["unpublished", "scheduled", "published"][j % 3],
                    review_status="not_required",
                    primary_platform="youtube",
                    priority=["normal", "high", "low"][j % 3],
                    deadline_at=now + timedelta(days=2 + j) if j % 2 == 0 else None,
                )
                db.add(proj)
                counts["projects"] += 1

            # SyncedPlaylist (her kanal icin 2)
            for k in range(2):
                pl = SyncedPlaylist(
                    platform="youtube",
                    platform_connection_id=pc.id,
                    channel_profile_id=cp.id,
                    external_playlist_id=f"AUR-PL-{u_idx}-{i}-{k}",
                    title=f"{name} — Çalma listesi {k + 1}",
                    description="Aurora test çalma listesi",
                    privacy_status=["public", "unlisted"][k % 2],
                    item_count=12 + k * 5,
                    sync_status="synced",
                    last_synced_at=now - timedelta(hours=k + 1),
                )
                db.add(pl)
                counts["playlists"] += 1

            # SyncedComment (her kanal icin 4)
            for c in range(4):
                cm = SyncedComment(
                    platform="youtube",
                    platform_connection_id=pc.id,
                    channel_profile_id=cp.id,
                    external_comment_id=f"AUR-CM-{u_idx}-{i}-{c:02d}",
                    external_video_id=f"AUR-VID-{u_idx}-{i}-{c}",
                    author_name=f"İzleyici {c + 1}",
                    text=f"Bu içerik harika! Aurora test yorumu #{c + 1}",
                    published_at=now - timedelta(hours=c * 3),
                    like_count=c * 4,
                    reply_count=c % 2,
                    is_reply=False,
                    reply_status=["none", "pending", "replied"][c % 3],
                    sync_status="synced",
                    last_synced_at=now - timedelta(minutes=c * 15),
                )
                db.add(cm)
                counts["comments"] += 1

            # PlatformPost (her kanal icin 2)
            for p in range(2):
                pp = PlatformPost(
                    platform="youtube",
                    platform_connection_id=pc.id,
                    channel_profile_id=cp.id,
                    external_post_id=f"AUR-POST-{u_idx}-{i}-{p}",
                    post_type="community_post",
                    title=f"{name} — Topluluk gönderisi {p + 1}",
                    body=f"Yeni video çıktı! İzlemeyi unutmayın 🎬 (Aurora test #{p + 1})",
                    status=["draft", "queued", "posted"][p % 3],
                    delivery_status=["pending", "delivered"][p % 2],
                    posted_at=now - timedelta(days=p) if p > 0 else None,
                )
                db.add(pp)
                counts["posts"] += 1

            # AutomationPolicy (her kanal icin 1)
            ap = AutomationPolicy(
                owner_user_id=user_id,
                channel_profile_id=cp.id,
                name=f"[AURORA] {name} otomasyon",
                is_enabled=(i < 2),
                source_scan_mode="automatic" if i == 0 else "manual_review" if i == 1 else "disabled",
                draft_generation_mode="manual_review" if i == 0 else "automatic" if i == 1 else "disabled",
                render_mode="manual_review" if i == 0 else "automatic" if i == 1 else "disabled",
                publish_mode="manual_review",
                post_publish_mode="disabled",
                max_daily_posts=10,
            )
            db.add(ap)
            counts["automations"] += 1

        # --- Notifications (Aurora marker, her user icin) ---
        notif_specs = [
            ("info", "notif", "Yeni video yayında", "Tarih Anlatıları kanalında 'Bizans' yayında.", "/user/projects"),
            ("success", "publish", "Yayın tamamlandı", "Teknoloji Bülteni 14 #042 başarıyla yayında.", "/user/publish"),
            ("warning", "auth", "Token yenileme gerekli", "Ürün İnceleme TR kanalı yeniden bağlanmalı.", "/user/connections"),
            ("error", "render", "Render başarısız", "REV-AUR-015 render zaman aşımı.", "/user/jobs"),
            ("info", "comment", "3 yeni yorum", "Tarih Anlatıları'nda yanıtlanmamış 3 yorum.", "/user/comments"),
        ]
        for k, (sev, ntype, title, body, link) in enumerate(notif_specs):
            n = NotificationItem(
                owner_user_id=user_id,
                scope_type="user",
                title=title,
                body=body,
                severity=sev,
                notification_type=ntype,
                status="unread" if k < 3 else "read",
                action_url=f"aurora-test://{link}",
                created_at=now - timedelta(minutes=k * 12),
            )
            db.add(n)
            counts["notifications"] += 1

        await db.commit()
    return counts


async def main(do_purge: bool, do_reseed: bool) -> None:
    if do_purge or do_reseed:
        c = await purge()
        print(f"[purge] silinen: {c}")
    if do_purge and not do_reseed:
        return
    c = await seed()
    print(f"[seed] eklenen: {c}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--purge", action="store_true")
    p.add_argument("--reseed", action="store_true")
    args = p.parse_args()
    asyncio.run(main(args.purge, args.reseed))
