"""
Ses üretimi (TTS) adımı executor'ı (TTSStepExecutor).

Her sahne için narration metni → resolve_and_invoke(TTS) → ses dosyası üretir.
artifact_check idempotency tipi: audio_manifest.json varsa adımı atlar.

Ses süresi: karakter sayısı / 15 yaklaşımı (gerçek ölçüm M4'te Whisper ile).

M3-C2: tts_provider → registry alıyor.
       resolve_and_invoke üzerinden fallback zinciri tam aktif.
       EdgeTTS başarısız → SystemTTSProvider (noop stub) fallback olarak devreye girer.
       NOT: SystemTTSProvider üretim için değildir; test/zincir doğrulama amaçlıdır.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.providers.resolution import resolve_and_invoke

from app.providers.trace_helper import build_provider_trace
from ._helpers import _resolve_artifact_path, _write_artifact, _read_artifact

logger = logging.getLogger(__name__)


class TTSStepExecutor(StepExecutor):
    """
    Ses üretimi (TTS) adımı executor'ı (M2-C4 / M3-C2).

    Her sahne için narration metni → resolve_and_invoke(TTS) → ses dosyası üretir.
    artifact_check idempotency tipi: audio_manifest.json varsa adımı atlar.

    Ses süresi: karakter sayısı / 15 yaklaşımı (gerçek ölçüm M4'te Whisper ile).
    resolve_and_invoke üzerinden primary TTS çağrılır; başarısızsa fallback zinciri denenir.
    """

    def __init__(self, registry: ProviderRegistry) -> None:
        """
        Args:
            registry: Provider kayıt defteri — resolve_and_invoke bu registry ile çağrılır.
        """
        self._registry = registry

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "tts"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        TTS adımını çalıştırır.

        Adımlar:
          1. artifact_check — audio_manifest.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur, dili çöz.
          3. script.json artifact'ını oku.
          4. Her sahne için narration metni → EdgeTTS → scene_N.mp3 yaz.
          5. audio_manifest.json artifact'ını yaz.
          6. Provider trace ile sonuç dön.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, voice, scene_count, provider trace.

        Raises:
            StepExecutionError: Script artifact eksikse veya TTS hatası oluştuğunda.
        """
        from app.modules.step_context import StepExecutionContext
        from app.providers.tts.voice_map import get_voice

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        try:
            ctx = StepExecutionContext.from_job_input(
                job_id=job.id,
                module_id="standard_video",
                raw_input=raw_input,
            )
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"StepExecutionContext oluşturulamadı: {err}",
            )

        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if getattr(job, "workspace_path", None) else ""
        )

        # Template/Style Blueprint context (M14)
        template_ctx = getattr(job, '_template_context', None)
        template_info = None
        voice_style_override = None
        if isinstance(template_ctx, dict):
            template_info = {
                "template_id": template_ctx.get("template_id"),
                "template_name": template_ctx.get("template_name"),
                "template_version": template_ctx.get("template_version"),
                "link_role": template_ctx.get("link_role"),
            }
            bp = template_ctx.get("style_blueprint")
            if isinstance(bp, dict):
                motion_rules = bp.get("motion_rules")
                if isinstance(motion_rules, dict):
                    voice_style_override = motion_rules.get("voice_style")

        # artifact_check: manifest zaten varsa adımı atla
        manifest_path = _resolve_artifact_path(workspace_root, job.id, "audio_manifest.json")
        if manifest_path.exists():
            logger.info(
                "TTSStepExecutor: audio_manifest.json mevcut, adım atlanıyor. job=%s", job.id
            )
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(manifest_path),
                "language": existing.get("language"),
                "voice": existing.get("voice"),
                "scene_count": len(existing.get("scenes", [])),
                "skipped": True,
                "step": self.step_key(),
            }

        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"Script artifact bulunamadı: job={job.id}. Script adımı önce tamamlanmış olmalı.",
            )

        scenes: list[dict] = script_data.get("scenes", [])
        if not scenes:
            raise StepExecutionError(
                self.step_key(),
                "Script artifact'ında sahne bulunamadı.",
            )

        voice = get_voice(ctx.language)

        # Template voice_style override (M14)
        if voice_style_override and isinstance(voice_style_override, str):
            logger.info(
                "TTSStepExecutor: voice_style_override from template context: %s → %s, job=%s",
                voice, voice_style_override, job.id,
            )
            voice = voice_style_override

        audio_dir = _resolve_artifact_path(workspace_root, job.id, "audio").parent / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        total_chars = 0
        total_duration = 0.0
        start_time = time.monotonic()

        for i, scene in enumerate(scenes, start=1):
            narration: str = scene.get("narration", "").strip()
            if not narration:
                manifest_scenes.append({
                    "scene_number": i,
                    "audio_path": None,
                    "narration": "",
                    "duration_seconds": 0.0,
                })
                continue

            audio_filename = f"scene_{i}.mp3"
            audio_path = audio_dir / audio_filename
            relative_path = f"artifacts/audio/{audio_filename}"

            try:
                output = await resolve_and_invoke(
                    self._registry,
                    ProviderCapability.TTS,
                    {
                        "text": narration,
                        "voice": voice,
                        "output_path": str(audio_path),
                    },
                )
            except Exception as err:
                raise StepExecutionError(
                    self.step_key(),
                    f"Sahne {i} için TTS başarısız: {err}",
                )

            duration = output.result.get("duration_seconds", round(len(narration) / 15.0, 2))
            total_chars += len(narration)
            total_duration += duration

            manifest_scenes.append({
                "scene_number": i,
                "audio_path": relative_path,
                "narration": narration,
                "duration_seconds": duration,
            })

        latency_ms = int((time.monotonic() - start_time) * 1000)

        manifest_data = {
            "scenes": manifest_scenes,
            "total_duration_seconds": round(total_duration, 2),
            "voice": voice,
            "language": ctx.language.value,
        }

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="audio_manifest.json",
            data=manifest_data,
        )

        logger.info(
            "TTSStepExecutor: job=%s dil=%s ses=%s sahne=%d toplam_sure=%.1fs artifact=%s",
            job.id,
            ctx.language.value,
            voice,
            len(scenes),
            total_duration,
            artifact_path,
        )

        trace_info = build_provider_trace(
            provider_name="edge_tts",
            provider_kind="tts",
            step_key=self.step_key(),
            success=True,
            latency_ms=latency_ms,
            extra={"voice": voice, "total_chars": total_chars, "scene_count": len(scenes)},
        )

        result = {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "voice": voice,
            "scene_count": len(scenes),
            "provider": {
                "provider_id": "edge_tts",
                "voice": voice,
                "language": ctx.language.value,
                "scene_count": len(scenes),
                "total_chars": total_chars,
                "estimated_duration_seconds": round(total_duration, 2),
                "latency_ms": latency_ms,
            },
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
        if template_info:
            result["template_info"] = template_info
            result["voice_style_override_applied"] = voice_style_override is not None
        return result
