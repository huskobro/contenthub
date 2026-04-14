"""
Publish token pre-flight — Gate 4 (Publish Closure).

Lightweight, NON-AGGRESSIVE checks that can be performed against a
PlatformConnection / PlatformCredential row WITHOUT calling the platform
API. The goal is to:

  * Surface "token will expire soon" warnings in the admin UI early,
    BEFORE a scheduled publish attempt fails at the worst time.
  * Tell the publish scheduler whether a due record is safe to fire.

Intentional non-goals:

  * No automatic reauth nudge to users — only inform.
  * No platform API calls. Refresh-token availability is treated as
    "self-healing" and pre-flight will allow the publish to proceed.
  * No state mutation on the connection rows.

The publish service uses `assert_publish_token_ready` to gate
`scheduler.poll_scheduled_publishes`. The admin UI uses
`token_expiry_remaining` to render the TokenExpiryBadge.

Design rule (Gate 4): "token pre-flight gereksiz reauth istemesin" —
if a refresh_token is present, the credential is considered self-healing
even when the access token is past expiry. Pre-flight only blocks when
the connection itself signals that reauth is required.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PlatformConnection, PlatformCredential


# Default warning thresholds. Operators can override per-call; defaults
# match the UI badge ("yarın", "bu hafta") so backend + frontend agree.
DEFAULT_WARN_THRESHOLD = timedelta(days=7)
DEFAULT_CRITICAL_THRESHOLD = timedelta(hours=24)


@dataclass(frozen=True)
class TokenExpiryStatus:
    """
    Operator-readable summary of a connection's token health.

    severity:
      'ok'       — no action needed.
      'warn'     — expires within `warn_threshold` (default 7d).
      'critical' — expires within `critical_threshold` (default 24h).
      'expired'  — past expiry; refresh token may still recover it.
      'reauth'   — connection.requires_reauth is True; user must reauth.
      'unknown'  — no credential row or no expiry recorded.

    seconds_remaining: positive if not yet expired, negative if expired,
    None if unknown.
    """
    severity: str
    seconds_remaining: Optional[int]
    expires_at: Optional[datetime]
    requires_reauth: bool
    has_refresh_token: bool

    @property
    def is_blocking(self) -> bool:
        """True if a publish attempt should NOT proceed without reauth."""
        return self.severity == "reauth"


def _normalize_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def classify_token_expiry(
    expires_at: Optional[datetime],
    *,
    requires_reauth: bool,
    has_refresh_token: bool,
    now: Optional[datetime] = None,
    warn_threshold: timedelta = DEFAULT_WARN_THRESHOLD,
    critical_threshold: timedelta = DEFAULT_CRITICAL_THRESHOLD,
) -> TokenExpiryStatus:
    """
    Pure classifier. Same logic the frontend badge uses, kept in one
    place so backend pre-flight + UI agree on thresholds.
    """
    now = _normalize_utc(now) or datetime.now(timezone.utc)
    expires_at = _normalize_utc(expires_at)

    if requires_reauth:
        seconds_remaining = (
            int((expires_at - now).total_seconds()) if expires_at else None
        )
        return TokenExpiryStatus(
            severity="reauth",
            seconds_remaining=seconds_remaining,
            expires_at=expires_at,
            requires_reauth=True,
            has_refresh_token=has_refresh_token,
        )

    if expires_at is None:
        return TokenExpiryStatus(
            severity="unknown",
            seconds_remaining=None,
            expires_at=None,
            requires_reauth=False,
            has_refresh_token=has_refresh_token,
        )

    delta = expires_at - now
    seconds_remaining = int(delta.total_seconds())

    if delta.total_seconds() <= 0:
        # Past expiry — but if refresh_token exists, the next API call will
        # transparently refresh; pre-flight should NOT request reauth.
        return TokenExpiryStatus(
            severity="expired",
            seconds_remaining=seconds_remaining,
            expires_at=expires_at,
            requires_reauth=False,
            has_refresh_token=has_refresh_token,
        )

    if delta <= critical_threshold:
        severity = "critical"
    elif delta <= warn_threshold:
        severity = "warn"
    else:
        severity = "ok"

    return TokenExpiryStatus(
        severity=severity,
        seconds_remaining=seconds_remaining,
        expires_at=expires_at,
        requires_reauth=False,
        has_refresh_token=has_refresh_token,
    )


_SEVERITY_ACTIONS = {
    "ok": "Token sağlıklı; eylem gerekmiyor.",
    "warn": "Token bu hafta içinde sona eriyor; uygun bir zaman planlayın.",
    "critical": "Token 24 saat içinde sona eriyor; en kısa sürede reauth yapın.",
    "expired": (
        "Token süresi geçmiş; refresh_token mevcutsa otomatik yenilenir, "
        "değilse reauth gerekiyor."
    ),
    "reauth": (
        "Bağlantı reauth gerektiriyor; yayın bu reauth tamamlanana kadar "
        "atlanır. Lütfen bağlantı sayfasından yeniden bağlanın."
    ),
    "unknown": "Token bilgisi bulunamadı; bağlantıyı kontrol edin.",
}


def suggested_action_for_severity(severity: str) -> str:
    """Operatör için kısa yönlendirme metni — UI badge tooltip'i için."""
    return _SEVERITY_ACTIONS.get(severity, _SEVERITY_ACTIONS["unknown"])


async def get_connection_token_status(
    session: AsyncSession,
    connection_id: str,
    *,
    now: Optional[datetime] = None,
) -> TokenExpiryStatus:
    """
    Load PlatformConnection + PlatformCredential and classify token health.

    Returns severity='unknown' if either row is missing — caller decides
    whether to treat that as blocking.
    """
    conn_row = (
        await session.execute(
            select(PlatformConnection).where(PlatformConnection.id == connection_id)
        )
    ).scalar_one_or_none()
    if conn_row is None:
        return TokenExpiryStatus(
            severity="unknown",
            seconds_remaining=None,
            expires_at=None,
            requires_reauth=False,
            has_refresh_token=False,
        )

    cred_row = (
        await session.execute(
            select(PlatformCredential).where(
                PlatformCredential.platform_connection_id == connection_id
            )
        )
    ).scalar_one_or_none()

    return classify_token_expiry(
        cred_row.token_expiry if cred_row else None,
        requires_reauth=bool(conn_row.requires_reauth),
        has_refresh_token=bool(cred_row and cred_row.refresh_token),
        now=now,
    )


async def assert_publish_token_ready(
    session: AsyncSession,
    connection_id: Optional[str],
    *,
    now: Optional[datetime] = None,
) -> TokenExpiryStatus:
    """
    Pre-flight check used by the publish scheduler before triggering a
    scheduled publish. Returns the token status.

    The caller decides what to do — this function does NOT raise, so the
    scheduler can record the skip as audit + UI signal rather than a fatal
    error. Callers should treat `status.is_blocking == True` as "do not
    proceed with the publish; surface the connection for reauth instead."
    """
    if not connection_id:
        return TokenExpiryStatus(
            severity="unknown",
            seconds_remaining=None,
            expires_at=None,
            requires_reauth=False,
            has_refresh_token=False,
        )
    return await get_connection_token_status(session, connection_id, now=now)
