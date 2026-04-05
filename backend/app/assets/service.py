"""
Asset Service — M19-A.

Workspace dizinlerinden salt-okunur asset index uretir.
Veri kaynagi: backend/workspace/{job_id}/artifacts/ ve preview/ dizinleri.
DB'ye yazmaz, migration gerektirmez.

Her dosya icin:
  - id: job_id + "/" + relative_path (deterministic, tekrarlanabilir)
  - name: dosya adi
  - asset_type: uzantiya gore siniflandirma
  - source_kind: "job_artifact" veya "job_preview"
  - file_path: workspace kok dizinine gore relative path
  - size_bytes: dosya boyutu
  - mime_ext: dosya uzantisi
  - job_id: sahip job
  - module_type: job'un module_type'i (DB'den)
  - discovered_at: dosyanin modification zamani (ISO)
"""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
from app.jobs.workspace import get_workspace_root

logger = logging.getLogger(__name__)

# Uzanti → asset_type esleme
_EXT_TYPE_MAP: dict[str, str] = {
    "json": "data",
    "txt": "text",
    "md": "text",
    "mp3": "audio",
    "wav": "audio",
    "ogg": "audio",
    "mp4": "video",
    "webm": "video",
    "mov": "video",
    "avi": "video",
    "png": "image",
    "jpg": "image",
    "jpeg": "image",
    "gif": "image",
    "webp": "image",
    "svg": "image",
    "srt": "subtitle",
    "vtt": "subtitle",
    "ass": "subtitle",
    "pdf": "document",
}


def _classify_ext(ext: str) -> str:
    """Uzantiya gore asset_type dondurur."""
    return _EXT_TYPE_MAP.get(ext.lower(), "other")


def _scan_directory(job_id: str, subdir: str, source_kind: str) -> list[dict]:
    """Belirtilen alt dizindeki dosyalari tarar."""
    ws_root = get_workspace_root()
    target = ws_root / job_id / subdir

    if not target.exists() or not target.is_dir():
        return []

    items = []
    for file_path in sorted(target.iterdir()):
        if not file_path.is_file():
            continue
        # Skip hidden files and zero-byte files
        if file_path.name.startswith("."):
            continue

        ext = file_path.suffix.lstrip(".") or "bin"
        stat = file_path.stat()

        relative_path = f"{job_id}/{subdir}/{file_path.name}"
        asset_id = relative_path  # deterministic ID

        mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

        items.append({
            "id": asset_id,
            "name": file_path.name,
            "asset_type": _classify_ext(ext),
            "source_kind": source_kind,
            "file_path": relative_path,
            "size_bytes": stat.st_size,
            "mime_ext": ext,
            "job_id": job_id,
            "module_type": None,  # enriched later
            "discovered_at": mtime.isoformat(),
        })

    return items


async def list_assets(
    session: AsyncSession,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    job_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Workspace'ten asset listesi uretir.

    Parametreler:
      asset_type : "audio", "video", "image", "data", "text", "subtitle", "other"
      search     : dosya adinda arama (case-insensitive)
      job_id     : belirli bir job'a ait asset'ler
      limit      : sayfalama limiti (1-500)
      offset     : sayfalama offset'i
    """
    ws_root = get_workspace_root()

    if not ws_root.exists():
        return {"total": 0, "offset": offset, "limit": limit, "items": []}

    # Hangi job dizinlerini tariyoruz?
    if job_id:
        job_dirs = [job_id] if (ws_root / job_id).is_dir() else []
    else:
        try:
            job_dirs = sorted([
                d.name for d in ws_root.iterdir()
                if d.is_dir() and not d.name.startswith(".")
            ])
        except OSError:
            job_dirs = []

    # Tum asset'leri topla
    all_items: list[dict] = []
    for jid in job_dirs:
        all_items.extend(_scan_directory(jid, "artifacts", "job_artifact"))
        all_items.extend(_scan_directory(jid, "preview", "job_preview"))

    # Job module_type bilgisini bulk olarak cek
    if all_items:
        unique_job_ids = list(set(item["job_id"] for item in all_items if item["job_id"]))
        if unique_job_ids:
            q = select(Job.id, Job.module_type).where(Job.id.in_(unique_job_ids))
            rows = (await session.execute(q)).all()
            module_map = {row.id: row.module_type for row in rows}
            for item in all_items:
                item["module_type"] = module_map.get(item["job_id"])

    # Filtrele
    if asset_type:
        all_items = [i for i in all_items if i["asset_type"] == asset_type]

    if search:
        search_lower = search.lower()
        all_items = [i for i in all_items if search_lower in i["name"].lower()]

    # Tarih sirasina gore sirala (en yeni once)
    all_items.sort(key=lambda x: x.get("discovered_at", ""), reverse=True)

    total = len(all_items)

    # Sayfalama
    paginated = all_items[offset:offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": paginated,
    }


async def get_asset_by_id(
    session: AsyncSession,
    asset_id: str,
) -> Optional[dict]:
    """
    Belirli bir asset'i ID ile getirir.

    asset_id formati: {job_id}/{subdir}/{filename}
    """
    parts = asset_id.split("/", 2)
    if len(parts) != 3:
        return None

    job_id, subdir, filename = parts

    if subdir not in ("artifacts", "preview"):
        return None

    ws_root = get_workspace_root()
    file_path = ws_root / job_id / subdir / filename

    if not file_path.exists() or not file_path.is_file():
        return None

    ext = file_path.suffix.lstrip(".") or "bin"
    stat = file_path.stat()
    mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

    source_kind = "job_artifact" if subdir == "artifacts" else "job_preview"

    # Job module_type
    q = select(Job.module_type).where(Job.id == job_id)
    module_type = (await session.execute(q)).scalar()

    return {
        "id": asset_id,
        "name": filename,
        "asset_type": _classify_ext(ext),
        "source_kind": source_kind,
        "file_path": asset_id,
        "size_bytes": stat.st_size,
        "mime_ext": ext,
        "job_id": job_id,
        "module_type": module_type,
        "discovered_at": mtime.isoformat(),
    }
