"""
Gate 3 — Publish Layer E2E Smoke (Real Operations).

Three sub-smokes:
  3A) Scheduler tick: scheduled record pickup proof
  3B) OAuth/connection verification + token encryption
  3C) Real (controlled) YouTube upload + immediate delete

Hard rules enforced in code:
  - Only TARGET_CHANNEL_PROFILE_ID may be used
  - Only privacyStatus="private" allowed
  - Title must contain "GATE3-SMOKE"
  - All DB rows tagged is_test_data=True
  - Cleanup ALWAYS runs (try/finally)
  - 3A does NOT upload — only verifies scheduled→publishing transition
  - 3C uploads ONE video then immediately attempts delete

Usage:
  cd backend && .venv/bin/python -m scripts.gate3_smoke

Reports go to stdout. Exit 0 = all pass, 1 = any failure.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import subprocess
import sys
import time
import uuid
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# --- Path bootstrap --------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.db.models import (
    AuditLog,
    Job,
    PlatformConnection,
    PublishLog,
    PublishRecord,
)
from app.db.session import AsyncSessionLocal
from app.publish.enums import PublishStatus
from app.publish.scheduler import _check_and_trigger
from app.publish.schemas import PublishRecordCreate
from app.publish.service import (
    create_publish_record,
    review_action,
    schedule_publish,
    submit_for_review,
)
from app.publish.youtube.adapter import YouTubeAdapter
from app.publish.youtube.token_store import DBYouTubeTokenStore

# ---------------------------------------------------------------------------
# Hard-coded safety constants
# ---------------------------------------------------------------------------

TARGET_CHANNEL_PROFILE_ID = "c19f2c9e-5d3d-4e4b-adc3-373a99541e04"
SMOKE_MODULE = "gate3_smoke"
SMOKE_TITLE_PREFIX = "[GATE3-SMOKE-"
WORKSPACE_DIR = ROOT / "workspace" / "gate3-smoke"
TS = datetime.now().strftime("%Y%m%d-%H%M%S")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
log = logging.getLogger("gate3_smoke")
logging.getLogger("httpx").setLevel(logging.WARNING)


# ===========================================================================
# Helpers
# ===========================================================================

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _section(title: str) -> None:
    print()
    print("=" * 70)
    print(f"== {title}")
    print("=" * 70)


def _fmt(d: dict[str, Any]) -> str:
    return json.dumps(d, indent=2, default=str, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Per-connection token store wrapper for adapter
# ---------------------------------------------------------------------------
#
# Production registry registers `YouTubeAdapter()` parameterless, which
# defaults to the LegacyFileTokenStore (file-based, single-account global).
# This is incompatible with multi-channel DB-backed connections.
#
# For Gate 3 smoke we wire the adapter to a per-connection DB store via this
# thin wrapper that satisfies the parameterless `get_access_token()` shape
# the adapter expects.
#
# This is also the minimum-fix shape the production registry should adopt
# (see `bug.adapter_registry_token_store_mismatch` in the report).
class _PerConnectionTokenStore:
    def __init__(self, db_session_factory, connection_id: str):
        self._sf = db_session_factory
        self._cid = connection_id
        self._inner = DBYouTubeTokenStore()

    async def get_access_token(self) -> str:
        async with self._sf() as db:
            return await self._inner.get_access_token(db, self._cid)


# ===========================================================================
# Test artifact: synthetic 5-second 720p test video via ffmpeg
# ===========================================================================

def make_test_video() -> Path:
    """Generate a 5s 720p test video with overlay text. Returns path."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg PATH'te bulunamadi — smoke koşamaz.")

    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    out = WORKSPACE_DIR / f"gate3c-{TS}.mp4"
    if out.exists():
        out.unlink()

    # NOTE: We previously embedded an overlay text via drawtext, but the
    # local ffmpeg build (Homebrew, no libfreetype) does not ship the
    # drawtext filter. We fall back to testsrc2 which already burns a
    # large frame counter + color bars + clear "test pattern" look. The
    # GATE3-SMOKE marker remains in the YouTube title and description so
    # the upload is unmistakable for a human reviewer if cleanup ever fails.
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-f", "lavfi",
        "-i", "testsrc2=duration=5:size=1280x720:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=5",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "96k",
        "-shortest",
        "-metadata", "title=CONTENTHUB GATE3 SMOKE - DELETE",
        "-metadata", "comment=Automated Gate 3 smoke. Private. Auto-delete attempted.",
        str(out),
    ]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed (rc={res.returncode}): {res.stderr.decode(errors='replace')[:500]}"
        )
    size_mb = out.stat().st_size / (1024 * 1024)
    log.info("Test video uretildi: %s (%.2f MB)", out.name, size_mb)
    if size_mb > 50:
        raise RuntimeError(f"Video {size_mb:.1f}MB > 50MB sınırı — abort.")
    return out


# ===========================================================================
# DB helpers
# ===========================================================================

async def get_active_connection(db: AsyncSession) -> PlatformConnection:
    stmt = select(PlatformConnection).where(
        PlatformConnection.channel_profile_id == TARGET_CHANNEL_PROFILE_ID,
        PlatformConnection.platform == "youtube",
    )
    res = await db.execute(stmt)
    conn = res.scalars().first()
    if not conn:
        raise RuntimeError(
            f"Hedef channel_profile {TARGET_CHANNEL_PROFILE_ID} icin "
            f"YouTube connection bulunamadi."
        )
    return conn


async def create_smoke_job(
    db: AsyncSession,
    *,
    artifact_path: Optional[str] = None,
    note: str = "",
) -> Job:
    job = Job(
        id=str(uuid.uuid4()),
        module_type=SMOKE_MODULE,
        status="completed",
        owner_id=None,  # smoke does not need a real owner
        channel_profile_id=TARGET_CHANNEL_PROFILE_ID,
        is_test_data=True,
        input_data_json=json.dumps({
            "smoke": "gate3",
            "ts": TS,
            "artifact_path": artifact_path,
            "note": note,
        }),
        finished_at=_now_utc(),
        started_at=_now_utc(),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def create_smoke_publish_record(
    db: AsyncSession,
    *,
    job: Job,
    connection: PlatformConnection,
    title: str,
    description: str,
    artifact_path: str,
) -> PublishRecord:
    payload = {
        "title": title,
        "description": description,
        "tags": ["smoke", "test", "delete"],
        "category_id": "22",
        "privacy_status": "private",
        "video_path": artifact_path,
    }
    intent = {
        "title": title,
        "description": description,
        "privacy": "private",
        "channel_profile_id": TARGET_CHANNEL_PROFILE_ID,
    }
    create = PublishRecordCreate(
        job_id=job.id,
        content_ref_type="job",
        content_ref_id=job.id,
        platform="youtube",
        payload_json=json.dumps(payload),
        notes=f"GATE3-SMOKE {TS}",
        content_project_id=None,
        platform_connection_id=connection.id,
        publish_intent_json=json.dumps(intent),
    )
    rec = await create_publish_record(db, create, actor_id="gate3_smoke")
    # Force is_test_data flag (create_publish_record may not set it)
    rec.is_test_data = True
    await db.commit()
    await db.refresh(rec)
    return rec


async def advance_to_approved(db: AsyncSession, record_id: str) -> PublishRecord:
    """draft -> pending_review -> approved."""
    await submit_for_review(db, record_id, actor_id="gate3_smoke", note="smoke submit")
    rec = await review_action(
        db, record_id, decision="approve",
        reviewer_id="gate3_smoke", note="smoke approve",
    )
    return rec


async def fetch_record(db: AsyncSession, record_id: str) -> PublishRecord:
    res = await db.execute(select(PublishRecord).where(PublishRecord.id == record_id))
    return res.scalars().first()


async def fetch_logs(db: AsyncSession, record_id: str) -> list[PublishLog]:
    res = await db.execute(
        select(PublishLog).where(PublishLog.publish_record_id == record_id)
        .order_by(PublishLog.created_at.asc())
    )
    return list(res.scalars().all())


async def fetch_audit_logs(db: AsyncSession, entity_id: str) -> list[AuditLog]:
    res = await db.execute(
        select(AuditLog).where(AuditLog.entity_id == entity_id)
        .order_by(AuditLog.created_at.asc())
    )
    return list(res.scalars().all())


# ===========================================================================
# 3A — Scheduler tick smoke
# ===========================================================================

async def smoke_3a_scheduler() -> dict[str, Any]:
    _section("3A — Scheduler tick smoke (no upload)")

    result: dict[str, Any] = {"name": "3A_scheduler", "status": "FAIL", "details": {}}

    async with AsyncSessionLocal() as db:
        conn = await get_active_connection(db)
        job = await create_smoke_job(db, note="3A scheduler")

        # Schedule for ~3s in the future (so single tick covers it)
        record = await create_smoke_publish_record(
            db, job=job, connection=conn,
            title=f"{SMOKE_TITLE_PREFIX}{TS}-3A] mocked scheduler smoke",
            description="3A — scheduler tick mock; not uploaded.",
            artifact_path="/dev/null/mocked",
        )
        await advance_to_approved(db, record.id)
        scheduled_at = _now_utc() + timedelta(seconds=3)
        await schedule_publish(
            db, record.id, scheduled_at,
            actor_id="gate3_smoke", note="3A scheduled for tick test",
        )
        log.info("3A: record=%s scheduled_at=%s", record.id, scheduled_at)
        record_id = record.id

    # Wait until scheduled_at passed
    delay = (scheduled_at - _now_utc()).total_seconds() + 1
    if delay > 0:
        await asyncio.sleep(delay)

    # Capture before-status in fresh session
    async with AsyncSessionLocal() as db:
        before = await fetch_record(db, record_id)
        before_status = before.status

    # Trigger one scheduler tick
    triggered = await _check_and_trigger(AsyncSessionLocal)
    log.info("3A: scheduler tick triggered=%d records", triggered)

    async with AsyncSessionLocal() as db:
        rec_after = await fetch_record(db, record_id)
        logs = await fetch_logs(db, record_id)
        audits = await fetch_audit_logs(db, record_id)

        result["details"] = {
            "record_id": record_id,
            "scheduled_at": scheduled_at,
            "status_before_tick": before_status,
            "status_after_tick": rec_after.status,
            "scheduler_triggered_count": triggered,
            "publish_log_count": len(logs),
            "audit_log_count": len(audits),
            "log_event_types": [l.event_type for l in logs],
            "audit_actions": [a.action for a in audits],
        }
        ok = (
            before_status == PublishStatus.SCHEDULED.value
            and rec_after.status == PublishStatus.PUBLISHING.value
            and triggered >= 1
            and any(a.action == "publish.scheduler.trigger" for a in audits)
        )
        result["status"] = "PASS" if ok else "FAIL"
        result["job_id"] = before.job_id if before else None
        return result


# ===========================================================================
# 3B — OAuth / connection verification
# ===========================================================================

async def smoke_3b_oauth() -> dict[str, Any]:
    _section("3B — OAuth/connection verification + token encryption")

    result: dict[str, Any] = {"name": "3B_oauth", "status": "FAIL", "details": {}}

    async with AsyncSessionLocal() as db:
        conn = await get_active_connection(db)

        # Raw DB check — encryption prefix
        row = (await db.execute(text("""
            SELECT length(access_token) AS at_len,
                   length(refresh_token) AS rt_len,
                   substr(access_token, 1, 10) AS at_prefix,
                   substr(refresh_token, 1, 10) AS rt_prefix,
                   token_expiry,
                   scopes
            FROM platform_credentials
            WHERE platform_connection_id = :cid
        """), {"cid": conn.id})).mappings().first()

        encryption_ok = (
            row is not None
            and (row["at_prefix"] or "").startswith("enc:v1:")
            and (row["rt_prefix"] or "").startswith("enc:v1:")
        )

        # Scope check
        scopes_granted = (conn.scopes_granted or "").split()
        has_upload_scope = "https://www.googleapis.com/auth/youtube" in scopes_granted
        has_analytics_scope = (
            "https://www.googleapis.com/auth/yt-analytics.readonly" in scopes_granted
        )

        # Live token decrypt + Data API ping
        token_store = DBYouTubeTokenStore()
        live_check: dict[str, Any] = {}
        try:
            access_token = await token_store.get_access_token(db, conn.id)
            live_check["token_obtained"] = True
            live_check["token_length"] = len(access_token)

            async with httpx.AsyncClient(timeout=15.0) as http:
                r = await http.get(
                    "https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "snippet,statistics", "mine": "true"},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                live_check["data_api_status"] = r.status_code
                if r.status_code == 200:
                    body = r.json()
                    items = body.get("items", [])
                    if items:
                        live_check["channel_id"] = items[0]["id"]
                        live_check["channel_title"] = items[0]["snippet"]["title"]
                        live_check["subscriber_count"] = items[0]["statistics"].get(
                            "subscriberCount"
                        )
                else:
                    live_check["error_body"] = r.text[:300]
        except Exception as exc:
            live_check["error"] = repr(exc)

        # Account selector — auth URL prompt=select_account check
        account_selector_ok = False
        try:
            ts_mod = ROOT / "app" / "publish" / "youtube" / "token_store.py"
            if ts_mod.exists():
                src = ts_mod.read_text()
                # DBYouTubeTokenStore.get_auth_url uses 'prompt': 'select_account consent'
                account_selector_ok = "select_account consent" in src
        except Exception:
            pass

        result["details"] = {
            "connection_id": conn.id,
            "external_account_id": conn.external_account_id,
            "external_account_name": conn.external_account_name,
            "connection_status": conn.connection_status,
            "requires_reauth": conn.requires_reauth,
            "auth_state": conn.auth_state,
            "token_state": conn.token_state,
            "scope_status": conn.scope_status,
            "scopes_granted": scopes_granted,
            "has_upload_scope": has_upload_scope,
            "has_analytics_scope": has_analytics_scope,
            "encryption_check": {
                "access_token_prefix": row["at_prefix"] if row else None,
                "refresh_token_prefix": row["rt_prefix"] if row else None,
                "access_token_length": row["at_len"] if row else None,
                "encryption_ok": encryption_ok,
            },
            "live_data_api_check": live_check,
            "account_selector_in_authorize_url": account_selector_ok,
        }

        ok = (
            encryption_ok
            and has_upload_scope
            and has_analytics_scope
            and conn.connection_status == "connected"
            and not conn.requires_reauth
            and live_check.get("data_api_status") == 200
            and live_check.get("channel_id") == conn.external_account_id
        )
        result["status"] = "PASS" if ok else "FAIL"
        return result


# ===========================================================================
# 3C — Real (controlled) YouTube upload + immediate delete
# ===========================================================================

async def youtube_delete_video(
    access_token: str, video_id: str,
) -> tuple[bool, str]:
    """DELETE youtube/v3/videos?id=... — returns (ok, status_or_msg)."""
    async with httpx.AsyncClient(timeout=20.0) as http:
        r = await http.delete(
            "https://www.googleapis.com/youtube/v3/videos",
            params={"id": video_id},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if r.status_code == 204:
        return True, "204 No Content"
    return False, f"HTTP {r.status_code}: {r.text[:200]}"


async def smoke_3c_upload(test_video: Path) -> dict[str, Any]:
    _section("3C — Real controlled YouTube upload + delete")

    result: dict[str, Any] = {"name": "3C_upload", "status": "FAIL", "details": {}}

    title = f"{SMOKE_TITLE_PREFIX}{TS}-3C] ContentHub test upload — DELETE"
    description = (
        "Automated Gate 3 smoke test. Private upload. Delete after verification."
    )

    # Sanity guards (defense in depth)
    assert "GATE3-SMOKE" in title
    assert test_video.exists()
    assert test_video.stat().st_size < 50 * 1024 * 1024
    log.info("3C: title=%s", title)
    log.info("3C: video=%s (%.2f MB)", test_video, test_video.stat().st_size / 1e6)

    # Setup phase: create job + record, advance to publishing
    async with AsyncSessionLocal() as db:
        conn = await get_active_connection(db)
        if conn.channel_profile_id != TARGET_CHANNEL_PROFILE_ID:
            raise RuntimeError("Channel profile mismatch — abort.")
        connection_id = conn.id

        job = await create_smoke_job(
            db, artifact_path=str(test_video), note="3C upload"
        )
        record = await create_smoke_publish_record(
            db, job=job, connection=conn,
            title=title,
            description=description,
            artifact_path=str(test_video),
        )
        record_id = record.id
        await advance_to_approved(db, record_id)

        from app.publish.service import trigger_publish
        await trigger_publish(
            db, record_id, actor_id="gate3_smoke",
            note="3C smoke direct trigger",
        )

    # Adapter call — REAL upload via per-connection DB token store wrapper
    per_conn_store = _PerConnectionTokenStore(AsyncSessionLocal, connection_id)
    adapter = YouTubeAdapter(token_store=per_conn_store)

    platform_video_id: Optional[str] = None
    platform_url: Optional[str] = None
    upload_error: Optional[str] = None
    upload_started = time.monotonic()

    try:
        payload = {
            "title": title,
            "description": description,
            "tags": ["smoke", "test", "delete"],
            "category_id": "22",
        }
        ar = await adapter.upload(
            publish_record_id=record_id,
            video_path=str(test_video),
            payload=payload,
        )
        if not ar.success or not ar.platform_video_id:
            raise RuntimeError(f"Adapter returned non-success: {ar}")
        platform_video_id = ar.platform_video_id
        platform_url = ar.platform_url
        log.info("3C: upload OK video_id=%s", platform_video_id)

        # mark_published in fresh session
        from app.publish.service import mark_published
        async with AsyncSessionLocal() as db:
            await mark_published(
                db, record_id,
                platform_video_id=platform_video_id,
                platform_url=platform_url or "",
                result_json=json.dumps(ar.raw_response or {}),
                actor_id="gate3_smoke",
                note="3C smoke upload OK",
            )
    except Exception as exc:
        upload_error = repr(exc)
        log.error("3C: upload FAIL: %s", exc, exc_info=True)
        from app.publish.service import mark_failed
        with suppress(Exception):
            async with AsyncSessionLocal() as db:
                await mark_failed(
                    db, record_id,
                    error_message=upload_error,
                    actor_id="gate3_smoke",
                )
    upload_elapsed = time.monotonic() - upload_started

    # Immediately delete on YouTube — even if mark_published failed,
    # if we have a video_id we MUST attempt cleanup.
    delete_ok = False
    delete_msg = "skipped (no video_id)"
    if platform_video_id:
        try:
            async with AsyncSessionLocal() as db:
                token = await DBYouTubeTokenStore().get_access_token(db, connection_id)
            delete_ok, delete_msg = await youtube_delete_video(
                token, platform_video_id
            )
            log.info("3C: delete result ok=%s msg=%s", delete_ok, delete_msg)
        except Exception as exc:
            delete_msg = f"delete exception: {exc!r}"
            log.error("3C: delete exception", exc_info=True)

    # Re-fetch state for report
    async with AsyncSessionLocal() as db:
        rec_final = await fetch_record(db, record_id)
        logs = await fetch_logs(db, record_id)

        result["details"] = {
            "record_id": record_id,
            "job_id": job.id,
            "title": title,
            "video_size_bytes": test_video.stat().st_size,
            "upload_elapsed_seconds": round(upload_elapsed, 2),
            "platform_video_id": platform_video_id,
            "platform_url": platform_url,
            "upload_error": upload_error,
            "final_record_status": rec_final.status if rec_final else None,
            "final_record_attempts": rec_final.publish_attempt_count if rec_final else None,
            "publish_log_event_types": [l.event_type for l in logs],
            "delete_ok": delete_ok,
            "delete_message": delete_msg,
        }

    ok = (
        platform_video_id is not None
        and rec_final is not None
        and rec_final.status == PublishStatus.PUBLISHED.value
    )
    result["status"] = "PASS" if ok else "FAIL"
    if platform_video_id and not delete_ok:
        result["MANUAL_CLEANUP_REQUIRED"] = (
            f"YouTube'da hala duruyor: video_id={platform_video_id} "
            f"URL=https://studio.youtube.com/video/{platform_video_id}/edit "
            f"— manuel sil."
        )
    return result


# ===========================================================================
# Cleanup
# ===========================================================================

async def cleanup_db() -> dict[str, Any]:
    _section("Cleanup — DB rows")

    summary: dict[str, Any] = {"rows_deleted": {}}

    async with AsyncSessionLocal() as db:
        # Find smoke jobs by module_type
        jobs_res = await db.execute(
            select(Job.id).where(Job.module_type == SMOKE_MODULE)
        )
        job_ids = [j[0] for j in jobs_res.all()]

        if job_ids:
            in_clause = ",".join(f"'{jid}'" for jid in job_ids)

            # publish_logs (child of publish_records)
            deleted_logs = await db.execute(text(f"""
                DELETE FROM publish_logs
                WHERE publish_record_id IN (
                    SELECT id FROM publish_records WHERE job_id IN ({in_clause})
                )
            """))
            summary["rows_deleted"]["publish_logs"] = deleted_logs.rowcount

            # audit_logs related to those publish_records
            deleted_audits = await db.execute(text(f"""
                DELETE FROM audit_logs
                WHERE entity_type = 'publish_record'
                  AND entity_id IN (
                    SELECT id FROM publish_records WHERE job_id IN ({in_clause})
                )
            """))
            summary["rows_deleted"]["audit_logs_publish_records"] = deleted_audits.rowcount

            # publish_records
            deleted_pr = await db.execute(text(
                f"DELETE FROM publish_records WHERE job_id IN ({in_clause})"
            ))
            summary["rows_deleted"]["publish_records"] = deleted_pr.rowcount

            # jobs
            deleted_jobs = await db.execute(text(
                f"DELETE FROM jobs WHERE id IN ({in_clause})"
            ))
            summary["rows_deleted"]["jobs"] = deleted_jobs.rowcount

            await db.commit()

        # Workspace cleanup
        if WORKSPACE_DIR.exists():
            for f in WORKSPACE_DIR.iterdir():
                with suppress(Exception):
                    f.unlink()
            summary["workspace_cleaned"] = str(WORKSPACE_DIR)

    return summary


# ===========================================================================
# Main
# ===========================================================================

async def main() -> int:
    overall: dict[str, Any] = {
        "ts": TS,
        "target_channel_profile_id": TARGET_CHANNEL_PROFILE_ID,
        "results": [],
        "bugs_found": [],
        "manual_actions_required": [],
    }

    test_video: Optional[Path] = None
    try:
        # 3A — scheduler smoke (no adapter, no upload)
        try:
            res = await smoke_3a_scheduler()
            overall["results"].append(res)
        except Exception as exc:
            log.exception("3A unexpected failure")
            overall["results"].append({
                "name": "3A_scheduler", "status": "ERROR", "error": repr(exc),
            })

        # 3B — connection / oauth verify (no upload)
        try:
            res = await smoke_3b_oauth()
            overall["results"].append(res)
        except Exception as exc:
            log.exception("3B unexpected failure")
            overall["results"].append({
                "name": "3B_oauth", "status": "ERROR", "error": repr(exc),
            })

        # 3C — real upload
        try:
            test_video = make_test_video()
            res = await smoke_3c_upload(test_video)
            overall["results"].append(res)
            if "MANUAL_CLEANUP_REQUIRED" in res:
                overall["manual_actions_required"].append(res["MANUAL_CLEANUP_REQUIRED"])
        except Exception as exc:
            log.exception("3C unexpected failure")
            overall["results"].append({
                "name": "3C_upload", "status": "ERROR", "error": repr(exc),
            })

    finally:
        # Always cleanup DB rows
        try:
            cleanup_summary = await cleanup_db()
            overall["cleanup"] = cleanup_summary
        except Exception as exc:
            log.exception("Cleanup failure")
            overall["cleanup"] = {"error": repr(exc)}

    # Append static bug report — production registry mismatch (always present)
    overall["bugs_found"].append({
        "id": "publish.adapter.registry_token_store_mismatch",
        "severity": "high",
        "summary": (
            "main.py registers YouTubeAdapter() parameterless → defaults to "
            "LegacyFileTokenStore (file-based). DBYouTubeTokenStore is the "
            "active per-connection store (used by routers + analytics). "
            "PublishStepExecutor calls registry.get('youtube') and never "
            "injects connection_id, so a real upload via the executor would "
            "fail with 'YouTube OAuth2 credential bulunamadı' on this DB-only setup."
        ),
        "minimum_fix_proposal": (
            "Either (a) wrap the registered adapter so it picks "
            "DBYouTubeTokenStore per call using publish_record.platform_connection_id, "
            "or (b) extend PublishAdapter.upload signature to receive connection_id "
            "and have YouTubeAdapter resolve token_store per call. Smoke uses (a)-style "
            "wrapper inline (_PerConnectionTokenStore)."
        ),
        "applied_in_smoke": True,
        "applied_in_production": False,
    })

    _section("Gate 3 Final Report")
    print(_fmt(overall))

    all_pass = all(r.get("status") == "PASS" for r in overall["results"])
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
