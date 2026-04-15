"""
TTS explicit fallback service — Faz 2.

Admin/user panelden "TTS primary basarisiz, Edge TTS ile devam et" aksiyonu
burada isleniyor. Audit trail ZORUNLU — her secim tts_fallback_audit.json'a
yazilir.

Akis:
  1. Operator, /api/tts/jobs/{id}/explicit-fallback endpoint'ine provider_id
     gonderir.
  2. select_explicit_tts_fallback servisi:
     - tts.fallback_providers listesinde mi kontrol eder.
     - Job.input_data_json icine "_tts_fallback_selection" kaydi koyar.
     - tts_fallback_audit.json artifact'ini yazar (append-mode).
     - Job status'unu "queued" yapar (retry icin hazir).
  3. Job queue yeniden isler; executor bu seferki cagriyi
     resolve_tts_strict(explicit_provider_id=...) ile yapar.

Bu modulde YOK:
  - Route/HTTP katmani (Faz 6 — /tts/router.py)
  - Frontend UI (Faz 6)
  - Retry mekanigi (core job engine)

Dosya formati (audit):
  {
    "entries": [
      {
        "provider_id": "edge_tts",
        "selected_by": "admin@contenthub.local",
        "selected_at": "2026-04-15T21:00:00Z",
        "reason": "primary timeout",
        "primary_failure": "DubVoice POST /tts timeout: ..."
      },
      ...
    ]
  }
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
from app.settings.settings_resolver import resolve as resolve_setting
from app.tts.strict_resolution import TTSFallbackNotAllowedError, TTSFallbackSelection

logger = logging.getLogger(__name__)

_AUDIT_FILENAME = "tts_fallback_audit.json"
_SELECTION_KEY = "_tts_fallback_selection"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def _artifact_dir(workspace_root: str, job_id: str) -> Path:
    """
    Job artifact dizini — TTS audit bu dizinin altina yazilir.

    workspace_root pattern olarak M2-C4 ile uyumlu.
    """
    base = Path(workspace_root) if workspace_root else Path.cwd()
    # Tipik yapı: workspace_path zaten job-specific
    if job_id and job_id not in str(base):
        base = base / job_id
    artifact_dir = base / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    return artifact_dir


def read_fallback_audit(workspace_root: str, job_id: str) -> dict:
    """tts_fallback_audit.json dosyasini oku; yoksa bos iskelet dondur."""
    path = _artifact_dir(workspace_root, job_id) / _AUDIT_FILENAME
    if not path.exists():
        return {"entries": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("TTS fallback audit okunamadi (%s): %s", path, exc)
        return {"entries": []}


def append_fallback_audit_entry(
    workspace_root: str,
    job_id: str,
    *,
    selection: TTSFallbackSelection,
    primary_failure: Optional[str] = None,
) -> Path:
    """
    tts_fallback_audit.json dosyasina yeni entry ekler (append-mode).

    Idempotent degil — ayni provider_id + selected_by icin bir daha cagrilirsa
    yeni entry eklenir (operator iki kez basarsa audit'te iki kayit olur, bu
    kasitli).
    """
    audit = read_fallback_audit(workspace_root, job_id)
    entries = audit.get("entries", [])
    entry = selection.as_dict()
    if primary_failure:
        entry["primary_failure"] = primary_failure
    entries.append(entry)
    audit["entries"] = entries

    path = _artifact_dir(workspace_root, job_id) / _AUDIT_FILENAME
    path.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(
        "TTS fallback audit: job=%s provider=%s selected_by=%s yazildi=%s",
        job_id,
        selection.provider_id,
        selection.selected_by,
        path,
    )
    return path


def get_job_fallback_selection(job: Job) -> Optional[TTSFallbackSelection]:
    """
    Job.input_data_json icindeki _tts_fallback_selection kaydini dondur.

    None ise → operator henuz explicit fallback secmedi → primary kullan.
    """
    raw = getattr(job, "input_data_json", None) or "{}"
    try:
        data = json.loads(raw)
    except Exception:
        return None
    entry = data.get(_SELECTION_KEY)
    if not isinstance(entry, dict):
        return None
    if not entry.get("provider_id"):
        return None
    return TTSFallbackSelection(
        provider_id=entry["provider_id"],
        selected_by=entry.get("selected_by", "unknown"),
        selected_at=entry.get("selected_at", _utc_now_iso()),
        reason=entry.get("reason"),
    )


def clear_job_fallback_selection(job: Job) -> None:
    """Job.input_data_json'dan secimi kaldir (mutasyon — commit cagran yapmali)."""
    raw = getattr(job, "input_data_json", None) or "{}"
    try:
        data = json.loads(raw)
    except Exception:
        data = {}
    if _SELECTION_KEY in data:
        data.pop(_SELECTION_KEY)
    job.input_data_json = json.dumps(data, ensure_ascii=False)


async def select_explicit_tts_fallback(
    db: AsyncSession,
    job: Job,
    *,
    provider_id: str,
    selected_by: str,
    reason: Optional[str] = None,
    primary_failure: Optional[str] = None,
) -> TTSFallbackSelection:
    """
    Operator explicit fallback secimi — validasyon + job mutate + audit yazimi.

    Args:
        db: Async SQLAlchemy session. Commit CALLER sorumlulugu (router
            transaction yonetir).
        job: Job ORM nesnesi (detached olmamali).
        provider_id: Operator tarafindan secilen TTS provider_id.
        selected_by: Operator kimligi (e-mail, kullanici adi, vb.).
        reason: Aciklama (opsiyonel).
        primary_failure: Primary'nin son hatasi (audit icin, opsiyonel).

    Returns:
        TTSFallbackSelection — kaydedilen secim.

    Raises:
        TTSFallbackNotAllowedError: provider_id izin verilen listede degil.
    """
    allowed_raw = await resolve_setting("tts.fallback_providers", db)
    allowed: list[str] = []
    if isinstance(allowed_raw, list):
        allowed = [str(p) for p in allowed_raw if p]
    elif isinstance(allowed_raw, str) and allowed_raw.strip():
        # JSON string fallback
        try:
            parsed = json.loads(allowed_raw)
            if isinstance(parsed, list):
                allowed = [str(p) for p in parsed if p]
        except Exception:
            allowed = []

    if provider_id not in allowed:
        raise TTSFallbackNotAllowedError(
            f"Provider '{provider_id}' tts.fallback_providers listesinde degil. "
            f"Izinli: {allowed}"
        )

    selection = TTSFallbackSelection(
        provider_id=provider_id,
        selected_by=selected_by,
        selected_at=_utc_now_iso(),
        reason=reason,
    )

    # Job.input_data_json'a kaydet
    raw = getattr(job, "input_data_json", None) or "{}"
    try:
        data = json.loads(raw)
    except Exception:
        data = {}
    data[_SELECTION_KEY] = selection.as_dict()
    job.input_data_json = json.dumps(data, ensure_ascii=False)

    # Audit artifact yaz
    workspace_root = getattr(job, "workspace_path", None) or ""
    append_fallback_audit_entry(
        workspace_root=workspace_root,
        job_id=job.id,
        selection=selection,
        primary_failure=primary_failure,
    )

    return selection
