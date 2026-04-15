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
from app.tts.controls import (
    TTSFineControls,
    plan_scene_tts,
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

        # DubVoice-spesifik model (Faz 1+2)
        dubvoice_model_id = None
        allowed_fallback_list: list[str] = []

        # Faz 4: Tum TTS fine controls settings'ten cozulur
        fine_controls = await self._resolve_fine_controls()
        default_scene_energy = await self._resolve_default_scene_energy()
        ssml_pauses_enabled = await self._resolve_ssml_pauses_enabled()

        if active_provider_id == "dubvoice":
            async with AsyncSessionLocal() as s_db:
                dubvoice_model_id = await resolve_setting(
                    "tts.dubvoice.default_model_id", s_db
                ) or "eleven_multilingual_v2"
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
        # Faz 4: per-sahne TTS plan audit icin biriktirilir
        controls_audit: list[dict] = []

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

            # Faz 4: per-sahne scene_energy (input'tan override, yoksa default)
            scene_energy_override = (
                scene.get("scene_energy")
                if isinstance(scene.get("scene_energy"), str)
                else None
            )
            scene_energy = scene_energy_override or default_scene_energy

            # Faz 4: glossary + pronunciation + controls'u uygula
            plan = plan_scene_tts(
                script_narration=narration,
                base_controls=fine_controls,
                scene_energy=scene_energy,
                provider_id=active_provider_id or "dubvoice",
                apply_ssml_pauses=ssml_pauses_enabled,
            )
            controls_audit.append(plan.as_audit_entry(scene_number=i))

            # Faz 1+2: DubVoice icin voice_id + voice_settings, Edge TTS icin voice
            tts_input: dict = {
                "text": plan.tts_text,
                "output_path": str(audio_path),
                "language": ctx.language.value,
            }
            if active_provider_id == "dubvoice":
                tts_input["voice_id"] = voice
                if dubvoice_model_id:
                    tts_input["model_id"] = dubvoice_model_id
                # Faz 4: plan.voice_settings provider-native payload
                if plan.voice_settings:
                    tts_input["voice_settings"] = plan.voice_settings
            else:
                # Edge TTS / System TTS voice kodu bekler + rate/pitch
                tts_input["voice"] = voice
                if plan.voice_settings:
                    # Edge TTS {'rate': '+10%', 'pitch': '+0Hz'}
                    # System TTS {'speed': 1.0}
                    for k, v in plan.voice_settings.items():
                        tts_input.setdefault(k, v)

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
            # Faz 4: narration canonicality ispati
            "narration_source": "script_canonical",
            "controls_default_scene_energy": default_scene_energy,
            "controls_ssml_pauses_enabled": ssml_pauses_enabled,
        }

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="audio_manifest.json",
            data=manifest_data,
        )

        # Faz 4: tts_controls_audit.json — per-sahne TTS plan audit
        controls_audit_path = None
        if controls_audit:
            controls_audit_path = _write_artifact(
                workspace_root=workspace_root,
                job_id=job.id,
                filename="tts_controls_audit.json",
                data={
                    "version": "1",
                    "rule": "script_canonical_narration_glossary_only_for_tts",
                    "scenes": controls_audit,
                    "totals": {
                        "scenes": len(controls_audit),
                        "total_replacements": sum(
                            sum(r.get("count", 1) for r in a.get("replacements", []))
                            for a in controls_audit
                        ),
                    },
                },
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
            "controls_audit_path": controls_audit_path,
            "language": ctx.language.value,
            "voice": voice,
            "scene_count": len(scenes),
            "narration_source": "script_canonical",
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
                "default_scene_energy": default_scene_energy,
                "ssml_pauses_enabled": ssml_pauses_enabled,
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

    # -----------------------------------------------------------------
    # Faz 4: Fine controls settings resolution
    # -----------------------------------------------------------------

    async def _resolve_fine_controls(self) -> TTSFineControls:
        """
        Settings Registry'den tum TTS fine controls'u cek ve TTSFineControls
        nesnesine yerlestir.
        """
        from app.db.session import AsyncSessionLocal
        from app.settings.settings_resolver import resolve as resolve_setting

        async with AsyncSessionLocal() as s_db:
            stability = await resolve_setting("tts.voice_settings.stability", s_db)
            similarity = await resolve_setting(
                "tts.voice_settings.similarity_boost", s_db
            )
            speed = await resolve_setting("tts.voice_settings.speed", s_db)
            pitch = await resolve_setting("tts.voice_settings.pitch", s_db)
            emphasis = await resolve_setting("tts.voice_settings.emphasis", s_db)
            speaker_boost = await resolve_setting(
                "tts.voice_settings.use_speaker_boost", s_db
            )
            sentence_break = await resolve_setting("tts.pauses.sentence_break_ms", s_db)
            paragraph_break = await resolve_setting("tts.pauses.paragraph_break_ms", s_db)
            scene_break = await resolve_setting("tts.pauses.scene_break_ms", s_db)
            brand_raw = await resolve_setting("tts.glossary.brand", s_db)
            product_raw = await resolve_setting("tts.glossary.product", s_db)
            pron_raw = await resolve_setting("tts.pronunciation.overrides", s_db)

        def _as_dict(value) -> dict:
            if isinstance(value, dict):
                return value
            if isinstance(value, str) and value.strip():
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    return {}
            return {}

        return TTSFineControls(
            speed=float(speed) if speed is not None else 1.0,
            pitch=float(pitch) if pitch is not None else 0.0,
            emphasis=float(emphasis) if emphasis is not None else 0.5,
            use_speaker_boost=bool(speaker_boost) if speaker_boost is not None else True,
            stability=float(stability) if stability is not None else 0.5,
            similarity_boost=float(similarity) if similarity is not None else 0.75,
            sentence_break_ms=int(sentence_break) if sentence_break is not None else 0,
            paragraph_break_ms=int(paragraph_break) if paragraph_break is not None else 0,
            scene_break_ms=int(scene_break) if scene_break is not None else 0,
            glossary_brand=_as_dict(brand_raw),
            glossary_product=_as_dict(product_raw),
            pronunciation_overrides=_as_dict(pron_raw),
        ).clamped()

    async def _resolve_default_scene_energy(self) -> str | None:
        from app.db.session import AsyncSessionLocal
        from app.settings.settings_resolver import resolve as resolve_setting

        async with AsyncSessionLocal() as s_db:
            val = await resolve_setting("tts.controls.default_scene_energy", s_db)
        if not val or not isinstance(val, str):
            return None
        val = val.strip().lower()
        if val in {"calm", "neutral", "energetic"}:
            return val
        return None

    async def _resolve_ssml_pauses_enabled(self) -> bool:
        from app.db.session import AsyncSessionLocal
        from app.settings.settings_resolver import resolve as resolve_setting

        async with AsyncSessionLocal() as s_db:
            val = await resolve_setting("tts.controls.ssml_pauses_enabled", s_db)
        return bool(val) if val is not None else False
