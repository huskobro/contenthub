"""
Publish error classification — Gate 4 (Publish Closure).

Maps raw error messages / status codes / exception types from publish
adapters to a small, stable set of operator-actionable categories.

The classifier is intentionally simple: substring + status-code lookups
on the raw error string. It must NEVER raise; on any uncertainty it
returns `PublishErrorCategory.UNKNOWN` so the operator can inspect
manually rather than hide the failure behind a wrong label.

Public API:
    categorize_publish_error(message, *, status_code=None) -> PublishErrorCategory
    suggested_action(category) -> str
"""

from __future__ import annotations

from typing import Optional

from app.publish.enums import PublishErrorCategory


# ---------------------------------------------------------------------------
# Substring patterns per category — order matters (first match wins)
# ---------------------------------------------------------------------------

_TOKEN_PATTERNS = (
    "invalid_grant",
    "token has been expired",
    "token expired",
    "expired token",
    "invalid token",
    "unauthorized",
    "401",
    "refresh_token",
    "requires_reauth",
    "auth_state",
    "credentials are missing",
    "invalid_credentials",
)

_QUOTA_PATTERNS = (
    "quotaexceeded",
    "quota exceeded",
    "rate limit",
    "ratelimitexceeded",
    "userratelimit",
    "dailylimitexceeded",
    "too many requests",
    "429",
)

_NETWORK_PATTERNS = (
    "timeout",
    "timed out",
    "connection reset",
    "connection refused",
    "temporarily unavailable",
    "service unavailable",
    "bad gateway",
    "gateway timeout",
    "503",
    "504",
    "502",
    "ssl",
    "remote disconnected",
)

_VALIDATION_PATTERNS = (
    "invalidargument",
    "invalid_argument",
    "invalidvalue",
    "invalid_value",
    "invalid metadata",
    "invalid title",
    "invalid description",
    "invalid tag",
    "title too long",
    "description too long",
    "uploadlimitexceeded",
    "video too long",
    "video too short",
    "unsupported format",
    "categoryinvalid",
    "400",
)

_PERMISSION_PATTERNS = (
    "forbidden",
    "permission denied",
    "insufficient permissions",
    "channel not found",
    "youtubesignuprequired",
    "accountclosed",
    "accountsuspended",
    "403",
)

_ASSET_PATTERNS = (
    "no such file",
    "file not found",
    "missing artifact",
    "missing video",
    "missing thumbnail",
    "render output not found",
    "workspace path",
    "fileNotFoundError",
)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def categorize_publish_error(
    message: Optional[str],
    *,
    status_code: Optional[int] = None,
) -> PublishErrorCategory:
    """
    Map a raw error message (and optional HTTP/RPC status_code) to a
    PublishErrorCategory.

    Never raises. Returns UNKNOWN if no pattern matches.
    """
    if not message and not status_code:
        return PublishErrorCategory.UNKNOWN

    haystack = (message or "").lower()
    if status_code is not None:
        haystack = f"{haystack} {status_code}"

    # Order: token > permission > quota > validation > network > asset
    # Token errors often surface as 401; check before generic 4xx.
    if _matches(haystack, _TOKEN_PATTERNS):
        return PublishErrorCategory.TOKEN_ERROR
    if _matches(haystack, _PERMISSION_PATTERNS):
        return PublishErrorCategory.PERMISSION
    if _matches(haystack, _QUOTA_PATTERNS):
        return PublishErrorCategory.QUOTA_EXCEEDED
    if _matches(haystack, _VALIDATION_PATTERNS):
        return PublishErrorCategory.VALIDATION
    if _matches(haystack, _NETWORK_PATTERNS):
        return PublishErrorCategory.NETWORK
    if _matches(haystack, _ASSET_PATTERNS):
        return PublishErrorCategory.ASSET_MISSING

    return PublishErrorCategory.UNKNOWN


def suggested_action(category: PublishErrorCategory) -> str:
    """Return a short, operator-facing recommended action (Turkish)."""
    return _SUGGESTIONS.get(category, _SUGGESTIONS[PublishErrorCategory.UNKNOWN])


_SUGGESTIONS = {
    PublishErrorCategory.TOKEN_ERROR: (
        "Bağlantıyı yeniden yetkilendirin. Token süresi dolmuş veya scope eksik."
    ),
    PublishErrorCategory.QUOTA_EXCEEDED: (
        "Platform günlük quota'sı aşıldı. Genelde 24 saat sonra retry edilebilir."
    ),
    PublishErrorCategory.NETWORK: (
        "Geçici ağ veya platform sorunu. Birkaç dakika bekleyip retry edin."
    ),
    PublishErrorCategory.VALIDATION: (
        "Platform metadata'yı reddetti. Başlık/etiket/açıklama'yı düzeltip "
        "draft'a döndürerek yeniden gönderin."
    ),
    PublishErrorCategory.PERMISSION: (
        "Hesap veya kanal yetkisi yetersiz. Bağlantı sahibinin platform "
        "izinlerini doğrulayın."
    ),
    PublishErrorCategory.ASSET_MISSING: (
        "Workspace artifact'ı bulunamadı. İşi yeniden render edin, sonra retry."
    ),
    PublishErrorCategory.UNKNOWN: (
        "Hata kategorize edilemedi. Tam mesajı incelemeden retry etmeyin."
    ),
}


def _matches(haystack: str, patterns: tuple) -> bool:
    return any(p in haystack for p in patterns)
