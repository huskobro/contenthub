"""
TTS preview router — Faz 5.

Endpoints:
  POST /api/tts/preview/voice-sample       (L1)
  POST /api/tts/preview/scene              (L2)
  POST /api/tts/preview/draft-script       (L3)
  GET  /api/tts/preview/{preview_id}       (manifest lookup)
  GET  /api/tts/preview/{preview_id}/audio/{filename}  (mp3 stream)

Tum endpoint'ler admin veya user authentication'i (route'un mount'unda) bekler.
Faz 2 SABIT'i gecerlidir: preview de resolve_tts_strict kullanir, auto-fallback
yok. Hata olursa HTTP 502 + detay donulur.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.jobs.workspace import get_workspace_root
from app.providers.registry import provider_registry
from app.tts.preview_service import (
    generate_draft_script_preview,
    generate_scene_preview,
    generate_voice_sample,
    load_preview_manifest,
    resolve_preview_root,
)
from app.tts.strict_resolution import (
    TTSFallbackNotAllowedError,
    TTSPrimaryFailedError,
    TTSProviderNotFoundError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts/preview", tags=["tts-preview"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class VoiceSampleRequest(BaseModel):
    voice_id: Optional[str] = Field(
        default=None, description="Provider-ozel voice id; None ise default"
    )
    provider_id: Optional[str] = Field(
        default=None, description="Preview icin provider override (None → primary)"
    )
    language: str = Field(default="tr")
    scene_energy: Optional[str] = Field(
        default=None, description="calm | neutral | energetic"
    )
    custom_text: Optional[str] = Field(
        default=None,
        description="Override — settings'teki voice_sample_text yerine kullan",
    )


class ScenePreviewRequest(BaseModel):
    narration: str = Field(..., min_length=1)
    scene_number: int = Field(default=1, ge=1)
    voice_id: Optional[str] = None
    provider_id: Optional[str] = None
    language: str = Field(default="tr")
    scene_energy: Optional[str] = Field(default=None)


class DraftSceneInput(BaseModel):
    scene_number: int = Field(..., ge=1)
    narration: str = Field(..., min_length=1)
    scene_energy: Optional[str] = Field(default=None)


class DraftScriptRequest(BaseModel):
    scenes: list[DraftSceneInput] = Field(..., min_length=1)
    voice_id: Optional[str] = None
    provider_id: Optional[str] = None
    language: str = Field(default="tr")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _workspace_root() -> Path:
    return Path(get_workspace_root())


def _safe_child(parent: Path, candidate: Path) -> bool:
    """candidate parent dizini icinde mi? (symlink/traversal koruma)."""
    try:
        parent_resolved = parent.resolve()
        candidate_resolved = candidate.resolve()
        return parent_resolved == candidate_resolved or parent_resolved in candidate_resolved.parents
    except OSError:
        return False


async def _handle_tts_errors(coro):
    """
    Resolve_tts_strict hatalarini HTTP hatalarina cevir. SABIT: auto-fallback
    yok — operator Faz 2 akisinda hatayi panelden gorur; preview UI'si de ayni
    mesajlari yansitir.
    """
    try:
        return await coro
    except TTSFallbackNotAllowedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except TTSProviderNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except TTSPrimaryFailedError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "TTS primary preview basarisiz (auto-fallback yok).",
                "provider": exc.primary_provider_id,
                "original_error": str(exc.original_error),
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/voice-sample")
async def post_voice_sample(
    payload: VoiceSampleRequest,
    db: AsyncSession = Depends(get_db),
):
    """L1 — kisa voice sample."""
    manifest = await _handle_tts_errors(
        generate_voice_sample(
            registry=provider_registry,
            workspace_root=_workspace_root(),
            db=db,
            voice_id=payload.voice_id,
            provider_id=payload.provider_id,
            language=payload.language,
            scene_energy=payload.scene_energy,
            custom_text=payload.custom_text,
        )
    )
    return manifest.as_dict()


@router.post("/scene")
async def post_scene_preview(
    payload: ScenePreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """L2 — tek sahne preview."""
    manifest = await _handle_tts_errors(
        generate_scene_preview(
            registry=provider_registry,
            workspace_root=_workspace_root(),
            db=db,
            narration=payload.narration,
            scene_number=payload.scene_number,
            voice_id=payload.voice_id,
            provider_id=payload.provider_id,
            language=payload.language,
            scene_energy=payload.scene_energy,
        )
    )
    return manifest.as_dict()


@router.post("/draft-script")
async def post_draft_script_preview(
    payload: DraftScriptRequest,
    db: AsyncSession = Depends(get_db),
):
    """L3 — tum script'in draft preview'i."""
    manifest = await _handle_tts_errors(
        generate_draft_script_preview(
            registry=provider_registry,
            workspace_root=_workspace_root(),
            db=db,
            scenes=[scene.model_dump() for scene in payload.scenes],
            voice_id=payload.voice_id,
            provider_id=payload.provider_id,
            language=payload.language,
        )
    )
    return manifest.as_dict()


@router.get("/{preview_id}")
async def get_preview_manifest(
    preview_id: str,
    db: AsyncSession = Depends(get_db),
):
    manifest = await load_preview_manifest(
        workspace_root=_workspace_root(),
        preview_id=preview_id,
        db=db,
    )
    if manifest is None:
        raise HTTPException(status_code=404, detail="preview bulunamadi")
    return manifest


@router.get("/{preview_id}/audio/{filename}")
async def get_preview_audio(
    preview_id: str,
    filename: str,
    db: AsyncSession = Depends(get_db),
):
    """Preview mp3 dosyasini stream et. Path traversal korumasi zorunlu."""
    # Filename guvenligi — sadece [\w\-\.]+ ve .mp3 uzantisi
    if "/" in filename or ".." in filename or not filename.endswith(".mp3"):
        raise HTTPException(status_code=400, detail="gecersiz filename")

    preview_dir_name = "_tts_previews"
    # Settings'ten aynisini okumak gerekir ama minimal yeterli — default ayni
    workspace_root = _workspace_root()
    preview_root = resolve_preview_root(workspace_root, preview_dir_name)
    preview_dir = preview_root / preview_id
    audio_path = preview_dir / filename

    if not _safe_child(preview_root, audio_path):
        raise HTTPException(status_code=400, detail="path traversal reddedildi")
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="audio bulunamadi")

    return FileResponse(
        path=str(audio_path),
        media_type="audio/mpeg",
        filename=filename,
    )
