from __future__ import annotations

"""
Connection Capability Matrix — Faz 17.

Merkezi capability hesaplama servisi.
Tum moduller (publish, comments, playlists, posts, analytics) bu servisi
kullanarak bir PlatformConnection'in neleri yapabilecegini ogrenir.

Capability durumu:
  - supported    : baglanti aktif ve bu ozellik kullanilabilir
  - unsupported  : platform bu ozelligi desteklemiyor
  - blocked_by_scope  : scope eksik
  - blocked_by_token  : token gecersiz veya suresi dolmus
  - blocked_by_connection : baglanti kopuk veya reauth gerekli
  - unknown      : durum belirlenemedi

Her platform icin hangi scope'larin hangi capability'ye karsilik geldigi
PLATFORM_SCOPE_MAP'te tanimlidir.
"""

import json
import logging
from typing import Optional

from app.db.models import PlatformConnection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Capability keys
# ---------------------------------------------------------------------------

CAPABILITY_KEYS = [
    "can_publish",
    "can_read_comments",
    "can_reply_comments",
    "can_read_playlists",
    "can_write_playlists",
    "can_create_posts",
    "can_read_analytics",
    "can_sync_channel_info",
]

# ---------------------------------------------------------------------------
# Capability status values
# ---------------------------------------------------------------------------

CAPABILITY_SUPPORTED = "supported"
CAPABILITY_UNSUPPORTED = "unsupported"
CAPABILITY_BLOCKED_BY_SCOPE = "blocked_by_scope"
CAPABILITY_BLOCKED_BY_TOKEN = "blocked_by_token"
CAPABILITY_BLOCKED_BY_CONNECTION = "blocked_by_connection"
CAPABILITY_UNKNOWN = "unknown"

# ---------------------------------------------------------------------------
# Platform → capability → required scopes mapping
# ---------------------------------------------------------------------------

PLATFORM_SCOPE_MAP: dict[str, dict[str, list[str]]] = {
    "youtube": {
        "can_publish": ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.upload"],
        "can_read_comments": ["https://www.googleapis.com/auth/youtube.force-ssl", "https://www.googleapis.com/auth/youtube"],
        "can_reply_comments": ["https://www.googleapis.com/auth/youtube.force-ssl", "https://www.googleapis.com/auth/youtube"],
        "can_read_playlists": ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.readonly"],
        "can_write_playlists": ["https://www.googleapis.com/auth/youtube"],
        "can_create_posts": [],  # YouTube community posts API not publicly available
        "can_read_analytics": ["https://www.googleapis.com/auth/yt-analytics.readonly", "https://www.googleapis.com/auth/youtube"],
        "can_sync_channel_info": ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube"],
    },
}

# Capabilities that don't exist for a platform at all
PLATFORM_UNSUPPORTED: dict[str, set[str]] = {
    "youtube": {"can_create_posts"},  # Community posts API not open
}


def _parse_scopes(scopes_raw: Optional[str]) -> set[str]:
    """
    Parse scopes from either JSON list format or OAuth space-separated format.

    - Admin UI / manual entry   -> JSON list: '["scope1","scope2"]'
    - Google OAuth response     -> space-separated string: 'scope1 scope2'
    """
    if not scopes_raw:
        return set()
    stripped = scopes_raw.strip()
    if stripped.startswith("["):
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                return {str(s) for s in parsed}
        except (json.JSONDecodeError, TypeError):
            pass
    # Fallback: treat as space-separated (OAuth standard)
    return {s for s in stripped.split() if s}


def _check_scope_for_capability(
    platform: str,
    capability: str,
    granted_scopes: set[str],
) -> bool:
    """Check if granted scopes satisfy the requirement for a capability."""
    scope_map = PLATFORM_SCOPE_MAP.get(platform, {})
    required_options = scope_map.get(capability, [])
    if not required_options:
        # No scope requirement defined → assume OK if connection is healthy
        return True
    # Any one of the listed scopes is sufficient (OR logic)
    return bool(granted_scopes & set(required_options))


def compute_capability_matrix(conn: PlatformConnection) -> dict[str, str]:
    """
    Compute the full capability matrix for a single PlatformConnection.

    Returns a dict of capability_key → status string.
    """
    platform = conn.platform or "unknown"
    unsupported = PLATFORM_UNSUPPORTED.get(platform, set())
    granted = _parse_scopes(conn.scopes_granted)

    result: dict[str, str] = {}

    for cap in CAPABILITY_KEYS:
        # 1. Platform doesn't support this at all
        if cap in unsupported:
            result[cap] = CAPABILITY_UNSUPPORTED
            continue

        # 2. Connection not healthy
        if conn.connection_status != "connected" or conn.requires_reauth:
            result[cap] = CAPABILITY_BLOCKED_BY_CONNECTION
            continue

        # 3. Token not valid
        if conn.token_state != "valid":
            result[cap] = CAPABILITY_BLOCKED_BY_TOKEN
            continue

        # 4. Scope check
        if not _check_scope_for_capability(platform, cap, granted):
            result[cap] = CAPABILITY_BLOCKED_BY_SCOPE
            continue

        # 5. All clear
        result[cap] = CAPABILITY_SUPPORTED

    return result


def compute_health_summary(conn: PlatformConnection) -> dict:
    """
    Compute a derived health summary for a single PlatformConnection.

    Returns a dict with health-related fields that can be serialized.
    """
    matrix = compute_capability_matrix(conn)

    # Count capabilities by status
    supported_count = sum(1 for v in matrix.values() if v == CAPABILITY_SUPPORTED)
    blocked_count = sum(1 for v in matrix.values() if v.startswith("blocked_"))
    unsupported_count = sum(1 for v in matrix.values() if v == CAPABILITY_UNSUPPORTED)
    total_applicable = len(CAPABILITY_KEYS) - unsupported_count

    # Determine overall health level
    if conn.connection_status != "connected":
        health_level = "disconnected"
    elif conn.requires_reauth:
        health_level = "reauth_required"
    elif conn.token_state != "valid":
        health_level = "token_issue"
    elif blocked_count > 0:
        health_level = "partial"
    elif supported_count == total_applicable and total_applicable > 0:
        health_level = "healthy"
    else:
        health_level = "unknown"

    # Build issues list
    issues: list[str] = []
    if conn.requires_reauth:
        issues.append("Yeniden yetkilendirme gerekli")
    if conn.token_state == "expired":
        issues.append("Token suresi dolmus")
    elif conn.token_state == "revoked":
        issues.append("Token iptal edilmis")
    elif conn.token_state == "invalid":
        issues.append("Token gecersiz")
    if conn.scope_status == "insufficient":
        issues.append("Yetersiz izinler (scope)")
    if conn.last_error:
        issues.append(f"Son hata: {conn.last_error[:120]}")

    return {
        "health_level": health_level,
        "supported_count": supported_count,
        "blocked_count": blocked_count,
        "total_applicable": total_applicable,
        "issues": issues,
        "capability_matrix": matrix,
    }
