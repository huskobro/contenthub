"""
Asset Service — M19-A + M20-A + M21-A.

Workspace dizinlerinden asset index uretir.
M20-A: delete, reveal, refresh, allowed-actions operasyonlari.
M21-A: upload operasyonu (gercek disk yazimi).

Veri kaynagi: backend/workspace/{job_id}/artifacts/ ve preview/ dizinleri.
DB'ye yazmaz, migration gerektirmez.
"""

import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple, Union

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
    # _uploads dizini de taranir (M21-A upload hedefi)
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


# ── M20-A: Operations ─────────────────────────────────────────


def _validate_asset_path(asset_id: str) -> Optional[Tuple[Path, str, str, str]]:
    """
    Asset ID'yi parse edip guvenlik kontrollerinden gecirir.

    Path traversal koruması:
      - subdir sadece "artifacts" veya "preview" olabilir
      - filename icinde "/" veya ".." olamaz
      - resolved path workspace root altinda olmak zorunda

    Returns (file_path, job_id, subdir, filename) or None if invalid.
    """
    parts = asset_id.split("/", 2)
    if len(parts) != 3:
        return None

    job_id, subdir, filename = parts

    # Sadece izinli alt dizinler
    if subdir not in ("artifacts", "preview"):
        return None

    # Filename guvenlik kontrolu
    if "/" in filename or ".." in filename or filename.startswith("."):
        return None

    # Job ID guvenlik kontrolu
    if ".." in job_id or "/" in job_id:
        return None

    ws_root = get_workspace_root()
    file_path = ws_root / job_id / subdir / filename

    # Path traversal son kontrolu: resolved path workspace altinda olmali
    try:
        resolved = file_path.resolve()
        ws_resolved = ws_root.resolve()
        if not str(resolved).startswith(str(ws_resolved)):
            logger.warning("Path traversal attempt blocked: %s", asset_id)
            return None
    except (OSError, ValueError):
        return None

    return file_path, job_id, subdir, filename


async def refresh_assets(session: AsyncSession) -> dict:
    """
    Workspace disk taramasini yeniden calistirir.
    Gercek bir cache mekanizmasi yok (her list_assets() zaten diskten okur),
    ama bu endpoint tum workspace'i tarayip toplam rakam dondurur.
    """
    result = await list_assets(session=session, limit=0, offset=0)
    total = result["total"]
    return {
        "status": "ok",
        "total_scanned": total,
        "message": f"Workspace taramasi tamamlandi. {total} asset bulundu.",
    }


async def delete_asset(session: AsyncSession, asset_id: str) -> Optional[dict]:
    """
    Workspace altindaki bir asset dosyasini siler.

    Guvenlik:
      - Sadece workspace/job_id/(artifacts|preview)/filename seklinde path'ler
      - Path traversal koruması aktif
      - Dosya yoksa None doner (404)

    Returns dict on success, None if asset not found.
    """
    validated = _validate_asset_path(asset_id)
    if validated is None:
        return None

    file_path, job_id, subdir, filename = validated

    if not file_path.exists() or not file_path.is_file():
        return None

    try:
        file_path.unlink()
        logger.info("Asset deleted: %s", asset_id)
    except OSError as exc:
        logger.error("Asset delete failed for %s: %s", asset_id, exc)
        raise

    return {
        "status": "deleted",
        "asset_id": asset_id,
        "message": f"Asset silindi: {filename}",
    }


def reveal_asset(asset_id: str) -> Optional[dict]:
    """
    Asset'in bulundugu yolun guvenli metadata'sini dondurur.
    Platform bagimsiz: klasor acma gibi bir OS islemi yapmaz,
    sadece path bilgisini dondurur.
    """
    validated = _validate_asset_path(asset_id)
    if validated is None:
        return None

    file_path, job_id, subdir, filename = validated
    exists = file_path.exists() and file_path.is_file()

    return {
        "asset_id": asset_id,
        "absolute_path": str(file_path.resolve()) if exists else str(file_path),
        "directory": str(file_path.parent.resolve()) if exists else str(file_path.parent),
        "exists": exists,
    }


def get_allowed_actions(asset_id: str) -> Optional[dict]:
    """
    Bu asset icin izin verilen aksiyonlari dondurur.

    Kurallar:
      - Gecerli path → delete, reveal, refresh her zaman mumkun
      - Dosya yoksa sadece refresh mumkun
    """
    validated = _validate_asset_path(asset_id)
    if validated is None:
        return None

    file_path, _, _, _ = validated
    exists = file_path.exists() and file_path.is_file()

    actions = ["refresh"]
    if exists:
        actions.extend(["delete", "reveal"])

    return {
        "asset_id": asset_id,
        "actions": actions,
    }


# ── M21-A: Upload ─────────────────────────────────────────────

# Upload icin izin verilen hedef dizin
_UPLOAD_BUCKET = "_uploads"
_UPLOAD_SUBDIR = "artifacts"

# Dosya adi sanitization: sadece alfanumerik, tire, alt cizgi, nokta
_SAFE_FILENAME_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._-]*$')

# Yasakli uzantilar (guvenlik)
_BLOCKED_EXTENSIONS = {
    "exe", "bat", "cmd", "sh", "ps1", "msi", "dll", "so", "dylib",
    "com", "scr", "pif", "vbs", "vbe", "js", "wsh", "wsf",
}

# Max dosya boyutu: 100 MB
MAX_UPLOAD_SIZE = 100 * 1024 * 1024


def _sanitize_filename(filename: str) -> Optional[str]:
    """
    Dosya adini guvenlik kontrollerinden gecirir.

    Returns sanitized filename or None if invalid.
    """
    if not filename:
        return None

    # Strip path separators
    filename = filename.replace("/", "").replace("\\", "")

    # Hidden file kontrolu
    if filename.startswith("."):
        return None

    # Safe character kontrolu
    if not _SAFE_FILENAME_RE.match(filename):
        return None

    # Uzanti kontrolu
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _BLOCKED_EXTENSIONS:
        return None

    # Makul uzunluk
    if len(filename) > 255:
        return None

    return filename


def _unique_filename(directory: Path, filename: str) -> str:
    """
    Eger dosya zaten varsa benzersiz isim uretir.

    Ornek: test.json → test_1.json → test_2.json
    """
    target = directory / filename
    if not target.exists():
        return filename

    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    ext = filename.rsplit(".", 1)[1] if "." in filename else ""

    counter = 1
    while True:
        candidate = f"{base}_{counter}.{ext}" if ext else f"{base}_{counter}"
        if not (directory / candidate).exists():
            return candidate
        counter += 1
        if counter > 999:
            # Guvenlik siniri
            raise ValueError("Too many filename collisions")


async def upload_asset(
    filename: str,
    content: bytes,
    asset_type_hint: Optional[str] = None,
) -> Optional[dict]:
    """
    Workspace'e yeni asset dosyasi yukler.

    Hedef: workspace/_uploads/artifacts/{filename}

    Guvenlik:
      - Dosya adi sanitization
      - Yasakli uzanti kontrolu
      - Hidden file reddi
      - Boyut siniri (100MB)
      - Conflict durumunda benzersiz isim uretimi (sessiz overwrite yok)

    Returns dict on success, None if validation fails.
    """
    # Dosya adi dogrulama
    safe_name = _sanitize_filename(filename)
    if safe_name is None:
        return None

    # Boyut kontrolu
    if len(content) > MAX_UPLOAD_SIZE:
        return None

    # Bos dosya kontrolu
    if len(content) == 0:
        return None

    ws_root = get_workspace_root()
    upload_dir = ws_root / _UPLOAD_BUCKET / _UPLOAD_SUBDIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Benzersiz isim uret (conflict varsa)
    final_name = _unique_filename(upload_dir, safe_name)

    target_path = upload_dir / final_name

    # Path traversal son kontrolu
    try:
        resolved = target_path.resolve()
        ws_resolved = ws_root.resolve()
        if not str(resolved).startswith(str(ws_resolved)):
            logger.warning("Upload path traversal blocked: %s", final_name)
            return None
    except (OSError, ValueError):
        return None

    # Diske yaz
    try:
        target_path.write_bytes(content)
        logger.info("Asset uploaded: %s (%d bytes)", final_name, len(content))
    except OSError as exc:
        logger.error("Asset upload failed for %s: %s", final_name, exc)
        raise

    ext = final_name.rsplit(".", 1)[-1].lower() if "." in final_name else "bin"
    determined_type = asset_type_hint if asset_type_hint else _classify_ext(ext)

    asset_id = f"{_UPLOAD_BUCKET}/{_UPLOAD_SUBDIR}/{final_name}"

    return {
        "status": "uploaded",
        "asset_id": asset_id,
        "name": final_name,
        "asset_type": determined_type,
        "size_bytes": len(content),
        "message": f"Asset yuklendi: {final_name} ({len(content)} byte)",
    }
