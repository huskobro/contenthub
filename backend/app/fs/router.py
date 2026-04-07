"""
Filesystem Browser Router

Admin panelin local klasör seçimi için güvenli filesystem browsing endpoint'i.
Yalnızca dizinleri listeler — dosya içeriği okumaz.

Güvenlik kısıtlamaları:
  - Home directory ve altı gezginlenebilir
  - Symlink'ler takip edilmez
  - Gizli (. ile başlayan) dizinler listelenmez (opsiyonel)
"""

import os
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/fs", tags=["filesystem"])

# Gezinmeye izin verilen kök dizinler (güvenlik sınırı)
_ALLOWED_ROOTS = [
    Path.home(),
    Path("/Volumes"),  # macOS external drives
    Path("/tmp"),
]


def _is_allowed_path(p: Path) -> bool:
    """Verilen path izin verilen köklerden birinin altında mı?"""
    p_resolved = p.resolve()
    for root in _ALLOWED_ROOTS:
        try:
            p_resolved.relative_to(root.resolve())
            return True
        except ValueError:
            continue
    return False


class DirEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    readable: bool


class BrowseResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    entries: List[DirEntry]


@router.get("/browse", response_model=BrowseResponse)
async def browse_directory(
    path: Optional[str] = Query(None, description="Gezilecek dizin yolu. Boş ise home directory."),
):
    """
    Verilen dizinin içindeki alt dizinleri listeler.
    Admin panelde output klasörü seçimi için kullanılır.
    """
    if path:
        target = Path(path).expanduser()
    else:
        target = Path.home()

    target = target.resolve()

    if not _is_allowed_path(target):
        raise HTTPException(status_code=403, detail=f"Bu dizine erişim izni yok: {target}")

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Dizin bulunamadı: {target}")

    if not target.is_dir():
        raise HTTPException(status_code=400, detail=f"Bu bir dizin değil: {target}")

    parent = str(target.parent) if target != target.parent else None

    entries: List[DirEntry] = []
    try:
        for entry in sorted(target.iterdir(), key=lambda e: e.name.lower()):
            # Sadece dizinler, gizli klasörler hariç
            if entry.name.startswith("."):
                continue
            if entry.is_symlink():
                continue
            if not entry.is_dir():
                continue
            readable = os.access(entry, os.R_OK)
            entries.append(DirEntry(
                name=entry.name,
                path=str(entry),
                is_dir=True,
                readable=readable,
            ))
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Dizin okunamadı: {target}")

    return BrowseResponse(
        current_path=str(target),
        parent_path=parent,
        entries=entries,
    )


@router.get("/validate", response_model=dict)
async def validate_path(
    path: str = Query(..., description="Doğrulanacak dizin yolu"),
):
    """
    Verilen path'in geçerli, yazılabilir bir dizin olup olmadığını kontrol eder.
    """
    try:
        target = Path(path).expanduser().resolve()
    except Exception:
        return {"valid": False, "reason": "Geçersiz path formatı"}

    if not _is_allowed_path(target):
        return {"valid": False, "reason": "Bu konuma erişim izni yok"}

    if not target.exists():
        # Oluşturulabilir mi?
        try:
            target.mkdir(parents=True, exist_ok=True)
            return {"valid": True, "path": str(target), "created": True}
        except Exception as e:
            return {"valid": False, "reason": f"Dizin oluşturulamadı: {e}"}

    if not target.is_dir():
        return {"valid": False, "reason": "Bu bir dosya, dizin değil"}

    if not os.access(target, os.W_OK):
        return {"valid": False, "reason": "Dizine yazma izni yok"}

    return {"valid": True, "path": str(target), "created": False}
