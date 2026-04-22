"""
Channel URL onboarding — signed preview token.

When a user submits a channel URL during onboarding, the system:
  1. Parses + normalizes the URL.
  2. Fetches metadata (best-effort).
  3. Returns a PREVIEW (no DB row yet) + a signed preview_token.
  4. The frontend shows the preview card; if the user confirms, it POSTs
     the same preview_token to /confirm, which reads the signed payload
     and performs the real create.

Why a signed token:
  - We don't want to trust the client to POST back arbitrary
    normalized_url / metadata on /confirm — that would let a user confirm
    a different URL than the one they previewed.
  - We don't want to write a DB row at preview time (wasted rows if the
    user backs out).
  - The signature binds: (user_id, normalized_url, platform) and expires
    in PREVIEW_TOKEN_TTL_SECONDS.

Design:
  - Uses the app's existing JWT secret + jose encoder (no new secret).
  - A distinct "purpose" claim ("channel_preview") isolates preview tokens
    from auth tokens — a preview token cannot be used to authenticate.
  - Expiry: 15 minutes. Long enough for a user to review, short enough
    that a stolen preview token is not useful.

This module is purposefully tiny and has no DB dependency.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.auth.jwt import ALGORITHM, SECRET_KEY

logger = logging.getLogger(__name__)

# 15 minutes — product decision: preview flow must complete within a session.
PREVIEW_TOKEN_TTL_SECONDS = 15 * 60
PREVIEW_PURPOSE = "channel_preview"


class PreviewTokenError(ValueError):
    """Raised when a preview token is missing, expired, tampered or
    mismatched against the confirm payload."""


def issue_preview_token(
    *,
    user_id: str,
    normalized_url: str,
    platform: Optional[str],
) -> str:
    """Mint a short-lived signed preview token.

    The claims are the smallest set we need to verify on confirm.
    """
    now = datetime.now(timezone.utc)
    claims: dict[str, Any] = {
        "purpose": PREVIEW_PURPOSE,
        "sub": user_id,
        "nurl": normalized_url,
        "platform": platform or "",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=PREVIEW_TOKEN_TTL_SECONDS)).timestamp()),
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def verify_preview_token(
    token: str,
    *,
    expected_user_id: str,
) -> dict[str, Any]:
    """Verify signature + purpose + owner, return the decoded claims.

    Raises PreviewTokenError on any failure — caller should convert to
    an HTTP 400/422.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        logger.info("preview token rejected: %s", exc)
        raise PreviewTokenError("Onizleme kodu gecersiz veya suresi dolmus") from exc
    if payload.get("purpose") != PREVIEW_PURPOSE:
        raise PreviewTokenError("Onizleme kodu bu islem icin gecerli degil")
    if payload.get("sub") != expected_user_id:
        # Signed for someone else — refuse, don't leak details.
        raise PreviewTokenError("Onizleme kodu bu kullaniciya ait degil")
    return payload
