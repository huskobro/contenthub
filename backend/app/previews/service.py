"""
Preview service — workspace'ten artifact'leri siniflandirarak donduren servis.

Kontrat:
  - Workspace resolution jobs/router.py ile BIREBIR ayni kurallari kullanir
    (job.workspace_path authoritative, yoksa ws.get_workspace_path(job_id)).
  - Dosya listesi classifier.classify_filename ile etiketlenir.
  - Gizli dosyalar (tmp_*, ., _, .part, .tmp, .swp) liste'ye DAHIL edilmez.
  - Missing workspace / empty workspace honest donus: {"previews": [], ...}.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from app.jobs import workspace as ws
from app.previews.classifier import (
    ClassifiedArtifact,
    classify_filename,
    is_hidden,
)
from app.contracts.enums import ArtifactScope


__all__ = [
    "PreviewEntry",
    "PreviewListing",
    "list_job_artifacts_classified",
    "latest_preview",
]


@dataclass(frozen=True)
class PreviewEntry:
    """Router'a donen tekil kayit."""

    name: str
    path: str                     # relative, ornek: 'artifacts/preview_mini.mp4'
    type: str                     # dosya uzantisi (UI kolayligi icin)
    scope: str                    # 'final' | 'preview'
    kind: str                     # ArtifactKind string degeri
    source_step: Optional[str]
    label: Optional[str]
    size_bytes: Optional[int]
    modified_at_epoch: Optional[float]


@dataclass(frozen=True)
class PreviewListing:
    """list endpoint donus sekli."""

    job_id: str
    total: int
    preview_count: int
    final_count: int
    entries: List[PreviewEntry]


def _resolve_artifacts_dir(job) -> Path:
    """
    jobs/router.py ile bire bir ayni: job.workspace_path > global ws root.
    """
    raw = getattr(job, "workspace_path", None)
    if raw and str(raw).strip():
        return Path(str(raw).strip()) / "artifacts"
    return ws.get_workspace_path(job.id) / "artifacts"


def list_job_artifacts_classified(
    job,
    *,
    scope_filter: Optional[ArtifactScope] = None,
) -> PreviewListing:
    """
    Job workspace'indeki tum dosyalari tarar, siniflandirir, istege bagli olarak
    scope'a gore filtreler.

    Returns:
        PreviewListing — preview + final sayimli, her kayitta metadata.
    """
    artifacts_dir = _resolve_artifacts_dir(job)
    entries: List[PreviewEntry] = []
    preview_count = 0
    final_count = 0

    if artifacts_dir.exists() and artifacts_dir.is_dir():
        for fp in sorted(artifacts_dir.iterdir()):
            if not fp.is_file():
                continue
            if is_hidden(fp.name):
                continue
            c: ClassifiedArtifact = classify_filename(fp.name)
            if scope_filter is not None and c.scope != scope_filter:
                continue
            size: Optional[int] = None
            modified: Optional[float] = None
            try:
                stat = fp.stat()
                size = stat.st_size
                modified = stat.st_mtime
            except OSError:
                pass
            entries.append(
                PreviewEntry(
                    name=c.name,
                    path=f"artifacts/{c.name}",
                    type=(fp.suffix.lstrip(".") or "bin").lower(),
                    scope=c.scope.value,
                    kind=c.kind.value,
                    source_step=c.source_step,
                    label=c.label,
                    size_bytes=size,
                    modified_at_epoch=modified,
                )
            )
            if c.scope == ArtifactScope.PREVIEW:
                preview_count += 1
            else:
                final_count += 1

    return PreviewListing(
        job_id=str(job.id),
        total=len(entries),
        preview_count=preview_count,
        final_count=final_count,
        entries=entries,
    )


def latest_preview(job) -> Optional[PreviewEntry]:
    """
    Job icin en son olusturulan PREVIEW kaydini dondurur (mtime'a gore).
    Hicbiri yoksa None.
    """
    listing = list_job_artifacts_classified(job, scope_filter=ArtifactScope.PREVIEW)
    if not listing.entries:
        return None
    # modified_at_epoch None olabilir — en sondaki (sorted alfabetik) de dusuk
    # oncelikle kabul edilir; mtime'a gore sort reliable.
    ranked = sorted(
        listing.entries,
        key=lambda e: e.modified_at_epoch or 0.0,
        reverse=True,
    )
    return ranked[0]
