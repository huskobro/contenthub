"""
Preview API router.

Endpoints (tum'u require_user + visibility gate altinda api_router'da wrap edilir):

  GET /api/v1/jobs/{job_id}/previews
    - Tum preview + final artifact'leri siniflandirilmis liste.
    - Ownership: _enforce_preview_ownership (jobs/router._enforce_job_ownership
      ile birebir ayni kurallar).

  GET /api/v1/jobs/{job_id}/previews?scope=preview
    - Sadece preview kayitlari.

  GET /api/v1/jobs/{job_id}/previews/latest
    - Job icin en son PREVIEW. Yoksa 404 "henuz preview yok".

Dosya serve:
  Preview dosyalarini indirmek icin mevcut /api/v1/jobs/{id}/artifacts/{path}
  endpoint'i kullanilir — ayni ownership + path-traversal guard. Parallel
  serve yolu KURMUYORUZ; path 'artifacts/<name>' ile zaten cozuluyor.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ownership import UserContext, get_current_user_context
from app.contracts.enums import ArtifactScope
from app.db.session import get_db
from app.jobs import service as job_service
from app.previews import service as preview_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["previews"])


def _enforce_preview_ownership(ctx: UserContext, job) -> None:
    """jobs/router._enforce_job_ownership ile birebir ayni kural seti."""
    if ctx.is_admin:
        return
    if job.owner_id is None:
        raise HTTPException(
            status_code=403,
            detail="Bu is orphan (owner'sız); yalnizca admin erisimine acik",
        )
    if str(job.owner_id) != ctx.user_id:
        raise HTTPException(status_code=403, detail="Bu ise erisim yetkiniz yok")


def _entry_to_dict(entry) -> Dict[str, Any]:
    return {
        "name": entry.name,
        "path": entry.path,
        "type": entry.type,
        "scope": entry.scope,
        "kind": entry.kind,
        "source_step": entry.source_step,
        "label": entry.label,
        "size_bytes": entry.size_bytes,
        "modified_at_epoch": entry.modified_at_epoch,
    }


@router.get("/{job_id}/previews")
async def list_job_previews(
    job_id: str,
    scope: Optional[str] = Query(
        default=None,
        description="'preview' veya 'final'. Bos birakilirsa tumu donulur.",
    ),
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Job icin siniflandirilmis artifact listesi.

    Donus:
        {
          "job_id": "...",
          "total": N,
          "preview_count": P,
          "final_count": F,
          "entries": [ {name, path, type, scope, kind, source_step, label,
                        size_bytes, modified_at_epoch}, ... ]
        }
    """
    job = await job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_preview_ownership(ctx, job)

    scope_enum: Optional[ArtifactScope] = None
    if scope is not None:
        scope_norm = scope.strip().lower()
        if scope_norm not in ("preview", "final"):
            raise HTTPException(
                status_code=422,
                detail="scope yalnizca 'preview' veya 'final' olabilir",
            )
        scope_enum = (
            ArtifactScope.PREVIEW if scope_norm == "preview" else ArtifactScope.FINAL
        )

    listing = preview_service.list_job_artifacts_classified(
        job, scope_filter=scope_enum
    )
    return {
        "job_id": listing.job_id,
        "total": listing.total,
        "preview_count": listing.preview_count,
        "final_count": listing.final_count,
        "entries": [_entry_to_dict(e) for e in listing.entries],
    }


@router.get("/{job_id}/previews/latest")
async def get_latest_preview(
    job_id: str,
    ctx: UserContext = Depends(get_current_user_context),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Job icin en son PREVIEW kaydi. Yoksa 404 — "henuz preview yok".

    Preview dosyasini indirmek icin path'i /api/v1/jobs/{id}/artifacts/{path}
    endpoint'ine yonlendirin; ayni ownership + path-traversal guard uygulanir.
    """
    job = await job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı")
    _enforce_preview_ownership(ctx, job)

    latest = preview_service.latest_preview(job)
    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="Bu is icin henuz preview artifact'i yok",
        )
    return _entry_to_dict(latest)
