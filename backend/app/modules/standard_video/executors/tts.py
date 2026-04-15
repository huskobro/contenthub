"""
Ses üretimi (TTS) adımı executor'ı (TTSStepExecutor).

Faz 2 guncellemesi (SABIT):
  - Artik resolve_and_invoke YERINE resolve_tts_strict kullanilir.
  - Primary TTS basarisizligi → AUTO-FALLBACK YAPILMAZ.
  - Job.input_data_json._tts_fallback_selection varsa o explicit provider
    ile cagrilir (operator secimi, audit trail'e yazilidir).
  - Primary fail + operator secimi yok → StepExecutionError(retryable=False)
    ile step FAIL. Operator panelden explicit fallback secer ve retry eder.

Her sahne için narration metni → resolve_tts_strict(TTS) → ses dosyası üretir.
artifact_check idempotency tipi: audio_manifest.json varsa adımı atlar.

Ses süresi: TTS provider sonucu → post-TTS mutagen doğrulaması → heuristic fallback.
Narration cleanup: TTS'e gönderilmeden önce markdown/URL temizliği yapılır.
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

from app.providers.trace_helper import build_provider_trace
from app.modules.shared_helpers import (
    measure_audio_duration,
    validate_audio_duration,
    clean_narration_for_tts,
)
from app.tts.fallback_service import (
    get_job_fallback_selection,
)
from app.tts.strict_resolution import (
    TTSFallbackNotAllowedError,
    TTSPrimaryFailedError,
    TTSProviderNotFoundError,
    resolve_tts_strict,
)
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
        from app.db.session import AsyncSessionLocal
        from app.settings.settings_resolver import resolve as resolve_setting

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

        # Faz 1+2: Primary provider'i belirle (explicit fallback secimi varsa kullan)
        fallback_selection = get_job_fallback_selection(job)
        explicit_provider_id = (
            fallback_selection.provider_id if fallback_selection else None
        )

        # Aktif provider id'yi belirlemek icin registry'den primary'i al.
        # Registry mock'lanmis olabilir (test ortaminda) — koruyucu kod:
        active_provider_id = explicit_provider_id
        if not active_provider_id:
            try:
                active_provider = self._registry.get_primary(ProviderCapability.TTS)
                candidate = active_provider.provider_id()
                active_provider_id = candidate if isinstance(candidate, str) else "dubvoice"
            except Exception:
                active_provider_id = "dubvoice"

        # Voice resolution: edge_tts icin bolgesel voice kodu, dubvoice icin voice_id
        voice = get_voice(ctx.language, active_provider_id)

        # Template voice_style override (M14) — sadece Edge TTS icin anlamli
        if voice_style_override and isinstance(voice_style_override, str):
            logger.info(
                "TTSStepExecutor: voice_style_override from template context: %s → %s, job=%s",
                voice, voice_style_override, job.id,
            )
            voice = voice_style_override

        # DubVoice-spesifik model ve voice_settings (Faz 1+2)
        dubvoice_model_id = None
        dubvoice_voice_settings: dict = {}
        allowed_fallback_list: list[str] = []
        if active_provider_id == "dubvoice":
            async with AsyncSessionLocal() as s_db:
                dubvoice_model_id = await resolve_setting(
                    "tts.dubvoice.default_model_id", s_db
                ) or "eleven_multilingual_v2"
                stability = await resolve_setting("tts.voice_settings.stability", s_db)
                similarity = await resolve_setting(
                    "tts.voice_settings.similarity_boost", s_db
                )
                speed = await resolve_setting("tts.voice_settings.speed", s_db)
                style = await resolve_setting("tts.voice_settings.style", s_db)
                speaker_boost = await resolve_setting(
                    "tts.voice_settings.use_speaker_boost", s_db
                )
                dubvoice_voice_settings = {
                    "stability": float(stability) if stability is not None else 0.5,
                    "similarity_boost": float(similarity) if similarity is not None else 0.75,
                    "speed": float(speed) if speed is not None else 1.0,
                    "style": float(style) if style is not None else 0.0,
                    "use_speaker_boost": bool(speaker_boost) if speaker_boost is not None else True,
                }
                fb_raw = await resolve_setting("tts.fallback_providers", s_db)
                if isinstance(fb_raw, list):
                    allowed_fallback_list = [str(p) for p in fb_raw if p]
                elif isinstance(fb_raw, str) and fb_raw.strip():
                    try:
                        parsed = json.loads(fb_raw)
                        if isinstance(parsed, list):
                            allowed_fallback_list = [str(p) for p in parsed if p]
                    except Exception:
                        allowed_fallback_list = ["edge_tts", "system_tts"]
        # explicit_provider_id set ise allowed list'i her durumda resolve et
        if explicit_provider_id and not allowed_fallback_list:
            async with AsyncSessionLocal() as s_db:
                fb_raw = await resolve_setting("tts.fallback_providers", s_db)
            if isinstance(fb_raw, list):
                allowed_fallback_list = [str(p) for p in fb_raw if p]

        audio_dir = _resolve_artifact_path(workspace_root, job.id, "audio").parent / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        total_chars = 0
        total_duration = 0.0
        start_time = time.monotonic()

        for i, scene in enumerate(scenes, start=1):
            raw_narration: str = scene.get("narration", "").strip()
            if not raw_narration:
                manifest_scenes.append({
                    "scene_number": i,
                    "audio_path": None,
                    "narration": "",
                    "duration_seconds": 0.0,
                })
                continue

            # TTS öncesi narration temizliği — markdown, URL, özel karakter kaldır
            narration = clean_narration_for_tts(raw_narration)
            if not narration:
                logger.warning(
                    "TTSStepExecutor: sahne %d narration temizlik sonrası boş kaldı. "
                    "raw=%s job=%s", i, raw_narration[:100], job.id,
                )
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

            # Faz 1+2: DubVoice icin voice_id + voice_settings, Edge TTS icin voice
            tts_input: dict = {
                "text": narration,
                "output_path": str(audio_path),
                "language": ctx.language.value,
            }
            if active_provider_id == "dubvoice":
                tts_input["voice_id"] = voice
                if dubvoice_model_id:
                    tts_input["model_id"] = dubvoice_model_id
                if dubvoice_voice_settings:
                    tts_input["voice_settings"] = dubvoice_voice_settings
            else:
                # Edge TTS / System TTS voice kodu bekler
                tts_input["voice"] = voice

            try:
                output = await resolve_tts_strict(
                    self._registry,
                    tts_input,
                    explicit_provider_id=explicit_provider_id,
                    allowed_fallback_provider_ids=allowed_fallback_list,
                )
            except TTSPrimaryFailedError as err:
                # Primary (veya secilen explicit) basarisiz — AUTO-FALLBACK YOK.
                # Operator panelden explicit fallback secebilir.
                raise StepExecutionError(
                    self.step_key(),
                    f"TTS primary '{err.primary_provider_id}' basarisiz "
                    f"(sahne {i}, auto-fallback KAPALI): {err.original_error}. "
                    f"Operator panelden Explicit Fallback aksiyonu alabilir.",
                    retryable=False,
                )
            except TTSFallbackNotAllowedError as err:
                raise StepExecutionError(
                    self.step_key(),
                    f"TTS explicit fallback reddedildi (sahne {i}): {err}",
                    retryable=False,
                )
            except TTSProviderNotFoundError as err:
                raise StepExecutionError(
                    self.step_key(),
                    f"TTS provider bulunamadi (sahne {i}): {err}",
                    retryable=False,
                )
            except Exception as err:
                # NonRetryableProviderError (ConfigurationError, InputValidation)
                # ve baska beklenmeyen hatalar.
                raise StepExecutionError(
                    self.step_key(),
                    f"Sahne {i} için TTS başarısız: {err}",
                    retryable=False,
                )

            # Provider'ın döndürdüğü süre (varsa)
            provider_duration = output.result.get("duration_seconds")
            heuristic_estimate = round(len(narration) / 15.0, 2)

            # Post-TTS: gerçek dosya süresini ölç (provider-agnostic doğrulama)
            measured = measure_audio_duration(str(audio_path))
            duration = validate_audio_duration(
                measured=measured,
                estimated=provider_duration if provider_duration else heuristic_estimate,
                file_path=str(audio_path),
                job_id=job.id,
            )

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
            # Faz 2: hangi provider uretti, explicit fallback mi?
            "provider_id": active_provider_id,
            "explicit_fallback_used": bool(explicit_provider_id),
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
            provider_name=active_provider_id,
            provider_kind="tts",
            step_key=self.step_key(),
            success=True,
            latency_ms=latency_ms,
            extra={
                "voice": voice,
                "total_chars": total_chars,
                "scene_count": len(scenes),
                "explicit_fallback_used": bool(explicit_provider_id),
                "auto_fallback_allowed": False,
            },
        )

        result = {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "voice": voice,
            "scene_count": len(scenes),
            "provider": {
                "provider_id": active_provider_id,
                "voice": voice,
                "language": ctx.language.value,
                "scene_count": len(scenes),
                "total_chars": total_chars,
                "estimated_duration_seconds": round(total_duration, 2),
                "latency_ms": latency_ms,
                "explicit_fallback_used": bool(explicit_provider_id),
                "auto_fallback_allowed": False,
            },
            "provider_trace": trace_info,
            "step": self.step_key(),
        }
        if fallback_selection:
            result["explicit_fallback_selection"] = fallback_selection.as_dict()
        if template_info:
            result["template_info"] = template_info
            result["voice_style_override_applied"] = voice_style_override is not None
        return result
