"""
Preview-first TTS servisi — Faz 5.

Uretim oncesi operator'a gorsel/isitsel karar destegi saglar. Hedef: full-render
kotasini harcamadan, operator'un ses/ton/ayar tercihlerini DINLEYEREK onaylamasi.

Preview katmanlari:

    L1 — Voice sample
        Settings Registry'deki "tts.preview.voice_sample_text" kisa cumlesi
        secilen voice + fine-control kombinasyonu ile uretilir. Amac: "bu
        ses kanalima yakisir mi?" karari.

    L2 — Scene preview
        Tek bir sahne narration'i preview modda seslendirilir. Amac: "bu
        sahne bu tonla iyi mi cikiyor?" karari.

    L3 — Draft script preview
        Birden fazla sahne uc uca seslendirilir — ancak toplam karakter
        siniri (tts.preview.max_characters_draft) asilmaz. Sinir asilirsa
        metin kisaltilir. Amac: "tum script'in ritmini duy." Full render
        KOTASI HARCANMAZ; preview dosyalari workspace/_tts_previews/ altinda.

    L4 — Final (executor)
        TTSStepExecutor.execute() — bu katman preview degil, kesin uretim.

SABIT'ler:
  - Her preview manifest'ine is_preview=True yazilir; final artifact'larla
    karistirilamaz.
  - Preview klasoru final workspace'ten ayridir (tts.preview.workspace_dir).
  - Faz 3 kurali korunur: narration subtitle icin SCRIPT CANONICAL. Preview
    uretiminde transkripsiyon YOK.
  - Faz 4 fine controls aynen uygulanir (plan_scene_tts).
  - Resolve path Faz 2 kurallarina uyar: resolve_tts_strict; auto-fallback
    yok. Preview calismasa da primary provider secimi ayni disiplindir.

Bu modulde YOK:
  - Route/HTTP katmani — app/tts/preview_router.py
  - Job engine entegrasyonu — preview kalici is parcasi olusturmaz.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.registry import ProviderRegistry
from app.settings.settings_resolver import resolve as resolve_setting
from app.tts.controls import TTSFineControls, plan_scene_tts
from app.tts.strict_resolution import resolve_tts_strict

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class PreviewSceneResult:
    """Preview sahnesi icin manifest entry."""

    scene_number: int
    output_path: str
    duration_seconds: float
    tts_text_char_count: int
    replacements_count: int
    scene_energy: Optional[str] = None
    voice_settings: dict = field(default_factory=dict)


@dataclass
class TTSPreviewManifest:
    """workspace/_tts_previews/<preview_id>/preview_manifest.json icerigi."""

    preview_id: str
    level: str  # "voice_sample" | "scene" | "draft_script"
    provider_id: str
    voice_id: Optional[str]
    language: str
    created_at: str
    is_preview: bool = True
    scenes: list[PreviewSceneResult] = field(default_factory=list)
    controls_snapshot: dict = field(default_factory=dict)
    notes: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "preview_id": self.preview_id,
            "level": self.level,
            "provider_id": self.provider_id,
            "voice_id": self.voice_id,
            "language": self.language,
            "created_at": self.created_at,
            "is_preview": self.is_preview,
            "scenes": [
                {
                    "scene_number": s.scene_number,
                    "output_path": s.output_path,
                    "duration_seconds": s.duration_seconds,
                    "tts_text_char_count": s.tts_text_char_count,
                    "replacements_count": s.replacements_count,
                    "scene_energy": s.scene_energy,
                    "voice_settings": dict(s.voice_settings),
                }
                for s in self.scenes
            ],
            "controls_snapshot": dict(self.controls_snapshot),
            "notes": self.notes,
        }


# ---------------------------------------------------------------------------
# Workspace helpers
# ---------------------------------------------------------------------------


def resolve_preview_root(workspace_root: Path, preview_dir_name: str = "_tts_previews") -> Path:
    """Preview artifact klasorunun absolute path'ini dondurur."""
    return (workspace_root / preview_dir_name).resolve()


def _new_preview_id() -> str:
    return f"prev_{uuid.uuid4().hex[:12]}"


def _write_manifest(manifest_dir: Path, manifest: TTSPreviewManifest) -> Path:
    manifest_dir.mkdir(parents=True, exist_ok=True)
    path = manifest_dir / "preview_manifest.json"
    path.write_text(
        json.dumps(manifest.as_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def _truncate_script_to_limit(
    scenes: list[dict],
    *,
    max_total_chars: int,
) -> tuple[list[dict], bool]:
    """
    Draft preview icin toplam karakter sinirini koru.

    Returns:
        (kept_scenes, truncated_flag)
    """
    if max_total_chars <= 0:
        return list(scenes), False

    total = 0
    kept: list[dict] = []
    truncated = False
    for scene in scenes:
        narration = scene.get("narration") or ""
        if not narration:
            kept.append(scene)
            continue
        remaining = max_total_chars - total
        if remaining <= 0:
            truncated = True
            break
        if len(narration) <= remaining:
            kept.append(scene)
            total += len(narration)
            continue
        # Parca alinir — son kelime sinirinda kes
        clip = narration[:remaining]
        last_space = clip.rfind(" ")
        if last_space > 0:
            clip = clip[:last_space]
        clip = clip.rstrip(" .,;!?") + "…"
        new_scene = dict(scene)
        new_scene["narration"] = clip
        kept.append(new_scene)
        truncated = True
        break
    return kept, truncated


# ---------------------------------------------------------------------------
# Settings resolver helpers
# ---------------------------------------------------------------------------


async def _resolve_fine_controls(db: AsyncSession) -> TTSFineControls:
    """Settings Registry'den Faz 4 fine controls'u cozer."""
    return TTSFineControls(
        speed=float(await resolve_setting("tts.voice_settings.speed", db) or 1.0),
        pitch=float(await resolve_setting("tts.voice_settings.pitch", db) or 0.0),
        emphasis=float(await resolve_setting("tts.voice_settings.emphasis", db) or 0.5),
        use_speaker_boost=bool(
            await resolve_setting("tts.voice_settings.use_speaker_boost", db)
            if await resolve_setting("tts.voice_settings.use_speaker_boost", db) is not None
            else True
        ),
        stability=float(await resolve_setting("tts.voice_settings.stability", db) or 0.5),
        similarity_boost=float(
            await resolve_setting("tts.voice_settings.similarity_boost", db) or 0.75
        ),
        sentence_break_ms=int(
            await resolve_setting("tts.pauses.sentence_break_ms", db) or 0
        ),
        paragraph_break_ms=int(
            await resolve_setting("tts.pauses.paragraph_break_ms", db) or 0
        ),
        scene_break_ms=int(
            await resolve_setting("tts.pauses.scene_break_ms", db) or 0
        ),
        glossary_brand=dict(
            await resolve_setting("tts.glossary.brand", db) or {}
        ),
        glossary_product=dict(
            await resolve_setting("tts.glossary.product", db) or {}
        ),
        pronunciation_overrides=dict(
            await resolve_setting("tts.pronunciation.overrides", db) or {}
        ),
    ).clamped()


async def _resolve_default_scene_energy(db: AsyncSession) -> Optional[str]:
    val = await resolve_setting("tts.controls.default_scene_energy", db)
    if not val:
        return None
    val = str(val).strip().lower()
    if val in {"calm", "neutral", "energetic"}:
        return val
    return None


async def _resolve_ssml_pauses_enabled(db: AsyncSession) -> bool:
    val = await resolve_setting("tts.controls.ssml_pauses_enabled", db)
    return bool(val) if val is not None else False


async def _resolve_voice_sample_text(db: AsyncSession) -> str:
    val = await resolve_setting("tts.preview.voice_sample_text", db)
    return str(val) if val else "Merhaba, bu bir ses ornegidir."


async def _resolve_draft_max_chars(db: AsyncSession) -> int:
    val = await resolve_setting("tts.preview.max_characters_draft", db)
    try:
        return max(0, int(val)) if val is not None else 1500
    except (TypeError, ValueError):
        return 1500


async def _resolve_preview_dir_name(db: AsyncSession) -> str:
    val = await resolve_setting("tts.preview.workspace_dir", db)
    return str(val) if val else "_tts_previews"


# ---------------------------------------------------------------------------
# Core invocation
# ---------------------------------------------------------------------------


async def _invoke_preview_scene(
    *,
    registry: ProviderRegistry,
    scene_number: int,
    narration: str,
    language: str,
    voice_id: Optional[str],
    provider_id: Optional[str],
    base_controls: TTSFineControls,
    scene_energy: Optional[str],
    apply_ssml_pauses: bool,
    output_path: Path,
) -> PreviewSceneResult:
    """Tek preview sahnesi uret. Faz 2 strict resolution kurali gecerli."""
    resolved_provider_id = provider_id or "dubvoice"

    plan = plan_scene_tts(
        script_narration=narration,
        base_controls=base_controls,
        scene_energy=scene_energy,
        provider_id=resolved_provider_id,
        apply_ssml_pauses=apply_ssml_pauses,
    )

    tts_input: dict = {
        "text": plan.tts_text,
        "output_path": str(output_path),
        "language": language,
        "preview_mode": True,  # contract flag — provider isterse kullanir
    }
    if voice_id:
        if resolved_provider_id == "dubvoice":
            tts_input["voice_id"] = voice_id
        else:
            tts_input["voice"] = voice_id
    if plan.voice_settings:
        if resolved_provider_id == "dubvoice":
            tts_input["voice_settings"] = plan.voice_settings
        else:
            for k, v in plan.voice_settings.items():
                tts_input.setdefault(k, v)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    output = await resolve_tts_strict(registry, tts_input)

    duration_seconds = 0.0
    result = output.result if output and hasattr(output, "result") else {}
    if isinstance(result, dict):
        try:
            duration_seconds = float(result.get("duration_seconds") or 0.0)
        except (TypeError, ValueError):
            duration_seconds = 0.0
    if duration_seconds <= 0.0:
        # Heuristic fallback — karakter/15
        duration_seconds = max(0.5, len(narration) / 15.0)

    return PreviewSceneResult(
        scene_number=scene_number,
        output_path=str(output_path),
        duration_seconds=round(duration_seconds, 3),
        tts_text_char_count=len(plan.tts_text),
        replacements_count=len(plan.replacements),
        scene_energy=plan.scene_energy,
        voice_settings=plan.voice_settings,
    )


# ---------------------------------------------------------------------------
# Public API — three levels
# ---------------------------------------------------------------------------


async def generate_voice_sample(
    *,
    registry: ProviderRegistry,
    workspace_root: Path,
    db: AsyncSession,
    voice_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    language: str = "tr",
    scene_energy: Optional[str] = None,
    custom_text: Optional[str] = None,
) -> TTSPreviewManifest:
    """L1 — voice sample preview.

    Args:
        voice_id: Provider ozel voice id (None → provider default voice).
        custom_text: Override. None → settings'ten kisa cumle okunur.
    """
    preview_dir_name = await _resolve_preview_dir_name(db)
    preview_root = resolve_preview_root(workspace_root, preview_dir_name)
    preview_id = _new_preview_id()
    preview_dir = preview_root / preview_id

    fine_controls = await _resolve_fine_controls(db)
    default_energy = await _resolve_default_scene_energy(db)
    ssml = await _resolve_ssml_pauses_enabled(db)

    text = (custom_text or await _resolve_voice_sample_text(db)).strip()
    if not text:
        raise ValueError("voice_sample_text bos olamaz")

    output_path = preview_dir / "voice_sample.mp3"

    scene_result = await _invoke_preview_scene(
        registry=registry,
        scene_number=1,
        narration=text,
        language=language,
        voice_id=voice_id,
        provider_id=provider_id,
        base_controls=fine_controls,
        scene_energy=scene_energy or default_energy,
        apply_ssml_pauses=ssml,
        output_path=output_path,
    )

    manifest = TTSPreviewManifest(
        preview_id=preview_id,
        level="voice_sample",
        provider_id=provider_id or "dubvoice",
        voice_id=voice_id,
        language=language,
        created_at=_utc_now_isoformat(),
        scenes=[scene_result],
        controls_snapshot={
            "speed": fine_controls.speed,
            "pitch": fine_controls.pitch,
            "emphasis": fine_controls.emphasis,
            "stability": fine_controls.stability,
            "similarity_boost": fine_controls.similarity_boost,
            "use_speaker_boost": fine_controls.use_speaker_boost,
            "scene_energy": scene_energy or default_energy,
            "ssml_pauses_enabled": ssml,
        },
    )
    _write_manifest(preview_dir, manifest)
    return manifest


async def generate_scene_preview(
    *,
    registry: ProviderRegistry,
    workspace_root: Path,
    db: AsyncSession,
    narration: str,
    scene_number: int = 1,
    voice_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    language: str = "tr",
    scene_energy: Optional[str] = None,
) -> TTSPreviewManifest:
    """L2 — scene preview."""
    if not narration or not narration.strip():
        raise ValueError("scene narration bos olamaz")

    preview_dir_name = await _resolve_preview_dir_name(db)
    preview_root = resolve_preview_root(workspace_root, preview_dir_name)
    preview_id = _new_preview_id()
    preview_dir = preview_root / preview_id

    fine_controls = await _resolve_fine_controls(db)
    default_energy = await _resolve_default_scene_energy(db)
    ssml = await _resolve_ssml_pauses_enabled(db)

    output_path = preview_dir / f"scene_{int(scene_number):03d}.mp3"

    scene_result = await _invoke_preview_scene(
        registry=registry,
        scene_number=int(scene_number),
        narration=narration.strip(),
        language=language,
        voice_id=voice_id,
        provider_id=provider_id,
        base_controls=fine_controls,
        scene_energy=scene_energy or default_energy,
        apply_ssml_pauses=ssml,
        output_path=output_path,
    )

    manifest = TTSPreviewManifest(
        preview_id=preview_id,
        level="scene",
        provider_id=provider_id or "dubvoice",
        voice_id=voice_id,
        language=language,
        created_at=_utc_now_isoformat(),
        scenes=[scene_result],
        controls_snapshot={
            "speed": fine_controls.speed,
            "pitch": fine_controls.pitch,
            "emphasis": fine_controls.emphasis,
            "stability": fine_controls.stability,
            "similarity_boost": fine_controls.similarity_boost,
            "use_speaker_boost": fine_controls.use_speaker_boost,
            "scene_energy": scene_energy or default_energy,
            "ssml_pauses_enabled": ssml,
        },
    )
    _write_manifest(preview_dir, manifest)
    return manifest


async def generate_draft_script_preview(
    *,
    registry: ProviderRegistry,
    workspace_root: Path,
    db: AsyncSession,
    scenes: list[dict],
    voice_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    language: str = "tr",
) -> TTSPreviewManifest:
    """L3 — tum script'i kisaltilmis halde preview et.

    scenes: [{scene_number, narration, scene_energy?}, ...]
    """
    if not scenes:
        raise ValueError("scenes bos olamaz")

    preview_dir_name = await _resolve_preview_dir_name(db)
    preview_root = resolve_preview_root(workspace_root, preview_dir_name)
    preview_id = _new_preview_id()
    preview_dir = preview_root / preview_id

    max_chars = await _resolve_draft_max_chars(db)
    kept_scenes, truncated = _truncate_script_to_limit(
        scenes, max_total_chars=max_chars
    )

    fine_controls = await _resolve_fine_controls(db)
    default_energy = await _resolve_default_scene_energy(db)
    ssml = await _resolve_ssml_pauses_enabled(db)

    scene_results: list[PreviewSceneResult] = []
    for idx, scene in enumerate(kept_scenes, start=1):
        scene_number = int(scene.get("scene_number") or idx)
        narration = (scene.get("narration") or "").strip()
        if not narration:
            continue
        scene_energy_override = (
            scene.get("scene_energy")
            if isinstance(scene.get("scene_energy"), str)
            else None
        )
        output_path = preview_dir / f"scene_{scene_number:03d}.mp3"
        scene_result = await _invoke_preview_scene(
            registry=registry,
            scene_number=scene_number,
            narration=narration,
            language=language,
            voice_id=voice_id,
            provider_id=provider_id,
            base_controls=fine_controls,
            scene_energy=scene_energy_override or default_energy,
            apply_ssml_pauses=ssml,
            output_path=output_path,
        )
        scene_results.append(scene_result)

    manifest = TTSPreviewManifest(
        preview_id=preview_id,
        level="draft_script",
        provider_id=provider_id or "dubvoice",
        voice_id=voice_id,
        language=language,
        created_at=_utc_now_isoformat(),
        scenes=scene_results,
        controls_snapshot={
            "speed": fine_controls.speed,
            "pitch": fine_controls.pitch,
            "emphasis": fine_controls.emphasis,
            "stability": fine_controls.stability,
            "similarity_boost": fine_controls.similarity_boost,
            "use_speaker_boost": fine_controls.use_speaker_boost,
            "default_scene_energy": default_energy,
            "ssml_pauses_enabled": ssml,
            "max_characters_draft": max_chars,
            "truncated": truncated,
        },
        notes="draft preview — toplam karakter kisitina gore bazi sahneler kirpilmis olabilir."
              if truncated else None,
    )
    _write_manifest(preview_dir, manifest)
    return manifest


# ---------------------------------------------------------------------------
# Reader helper — manifest/audio path lookup
# ---------------------------------------------------------------------------


async def load_preview_manifest(
    *,
    workspace_root: Path,
    preview_id: str,
    db: AsyncSession,
) -> Optional[dict]:
    """Bir preview_id icin manifest'i oku. Yoksa None."""
    preview_dir_name = await _resolve_preview_dir_name(db)
    preview_root = resolve_preview_root(workspace_root, preview_dir_name)
    manifest_path = preview_root / preview_id / "preview_manifest.json"
    if not manifest_path.exists():
        return None
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("load_preview_manifest okumasi basarisiz: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def _utc_now_isoformat() -> str:
    """Test-mock'a uygun, basit UTC ISO timestamp."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds")
