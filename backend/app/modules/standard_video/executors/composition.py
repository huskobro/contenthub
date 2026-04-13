"""
Kompozisyon adımı executor'ı (CompositionStepExecutor) — M2-C5 implementasyonu.

Tüm artifact'ları toplar ve Remotion'a gönderilecek props yapısını üretir.

ÖNEMLİ: Bu aşamada gerçek Remotion render yapılmaz.
- Remotion frontend tarafında çalışır (React/Node).
- Backend subprocess ile Remotion render'ı tetiklemek için Node ortamı gerekir.
- Bu kurulum M2-C6 (Full Stack Integration) veya M3+ kapsamındadır.
- Şimdilik "render-ready props" üretmek yeterlidir.

Güvenli composition mapping (CLAUDE.md C-07):
- composition_id sabit mapping'den gelir, dinamik üretilmez.
- composition_map.py içindeki COMPOSITION_MAP kullanılır.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.composition_map import get_composition_id
from app.modules.standard_video.subtitle_presets import get_preset_for_composition

from ._helpers import (
    _resolve_artifact_path,
    _write_artifact,
    _read_artifact,
)

logger = logging.getLogger(__name__)


class CompositionStepExecutor(StepExecutor):
    """
    Kompozisyon adımı executor'ı — M2-C5 implementasyonu.

    Tüm artifact'ları toplar (script, audio, visuals, subtitles) ve
    Remotion'a gönderilecek props yapısını hazırlar (composition_props.json).

    artifact_check: composition_props.json varsa adımı atlar (idempotency).

    NOT: Gerçek Remotion render M2-C6 veya M3+ kapsamındadır.
    render_status = "props_ready" olarak işaretlenir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Composition adımını çalıştırır.

        Adımlar:
          1. artifact_check — composition_props.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur.
          3. Tüm artifact'ları oku: script.json, audio_manifest.json,
             visuals_manifest.json, subtitle_metadata.json, metadata.json.
          4. composition_id güvenli mapping'den al (get_composition_id).
          5. Remotion props yapısını oluştur.
          6. artifacts/composition_props.json olarak yaz.
          7. Provider trace ile sonuç dön.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, composition_id, render_status, provider trace.

        Raises:
            StepExecutionError: Zorunlu artifact eksikse veya composition_id bulunamazsa.
        """
        from app.modules.step_context import StepExecutionContext

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

        # artifact_check: composition_props zaten varsa adımı atla
        props_path = _resolve_artifact_path(workspace_root, job.id, "composition_props.json")
        if props_path.exists():
            logger.info(
                "CompositionStepExecutor: composition_props.json mevcut, adım atlanıyor. job=%s",
                job.id,
            )
            existing = json.loads(props_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(props_path),
                "language": existing.get("props", {}).get("language"),
                "composition_id": existing.get("composition_id"),
                "render_status": existing.get("render_status"),
                "skipped": True,
                "step": self.step_key(),
            }

        # Zorunlu artifact'ları oku
        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"script.json bulunamadı: job={job.id}. Script adımı önce tamamlanmış olmalı.",
            )

        audio_manifest = _read_artifact(workspace_root, job.id, "audio_manifest.json")
        if audio_manifest is None:
            raise StepExecutionError(
                self.step_key(),
                f"audio_manifest.json bulunamadı: job={job.id}. "
                "TTS adımı önce tamamlanmış olmalı.",
            )

        # İsteğe bağlı artifact'lar — yoksa boş yapıyla devam et
        visuals_manifest = _read_artifact(workspace_root, job.id, "visuals_manifest.json") or {}
        subtitle_metadata = _read_artifact(workspace_root, job.id, "subtitle_metadata.json") or {}
        metadata_data = _read_artifact(workspace_root, job.id, "metadata.json") or {}

        # Güvenli composition mapping (CLAUDE.md C-07 — AI render kodu üretemez)
        try:
            composition_id = get_composition_id(ctx.module_id)
        except ValueError as err:
            raise StepExecutionError(
                self.step_key(),
                f"Composition ID çözümlenemedi: {err}",
            )

        language = ctx.language.value

        # Sahne verilerini birleştir
        script_scenes: list[dict] = script_data.get("scenes", [])
        audio_scenes: list[dict] = audio_manifest.get("scenes", [])
        visuals_scenes: list[dict] = visuals_manifest.get("scenes", [])

        # Sahne sayısı tutarsızlığını log'a yaz, script'i baz al
        if len(script_scenes) != len(audio_scenes):
            logger.warning(
                "CompositionStepExecutor: script sahne sayısı (%d) audio sahne sayısıyla "
                "(%d) uyuşmuyor. job=%s",
                len(script_scenes),
                len(audio_scenes),
                job.id,
            )

        # Görsel yolu için index → scene_number eşlemesi
        visuals_by_number: dict[int, dict] = {
            v.get("scene_number", i + 1): v
            for i, v in enumerate(visuals_scenes)
        }

        props_scenes: list[dict] = []
        for i, script_scene in enumerate(script_scenes):
            scene_number = i + 1
            audio_scene = audio_scenes[i] if i < len(audio_scenes) else {}
            visual_scene = visuals_by_number.get(scene_number, {})

            props_scenes.append({
                "scene_number": scene_number,
                "narration": script_scene.get("narration", ""),
                "visual_cue": script_scene.get("visual_cue", ""),
                "audio_path": audio_scene.get("audio_path"),
                "image_path": visual_scene.get("image_path"),
                "duration_seconds": audio_scene.get("duration_seconds", 0.0),
            })

        total_duration = sum(s.get("duration_seconds", 0.0) for s in props_scenes)
        subtitles_srt = subtitle_metadata.get("srt_path")
        word_timing_path = subtitle_metadata.get("word_timing_path")
        timing_mode = subtitle_metadata.get("timing_mode", "cursor")

        # M41: karaoke_enabled kapalıysa timing_mode'u cursor'a düşür
        snap = raw_input.get("_settings_snapshot", {})
        karaoke_enabled = snap.get("standard_video.config.karaoke_enabled", True)
        if not karaoke_enabled:
            timing_mode = "cursor"

        # Job input'tan subtitle_style_preset alınır; yoksa varsayılan kullanılır
        subtitle_style_preset_id = raw_input.get("subtitle_style_preset")
        subtitle_style = get_preset_for_composition(subtitle_style_preset_id)

        # M44: Settings override — preset değerlerinin üzerine admin ayarlarını yaz
        _sub_font_family = snap.get("standard_video.config.subtitle_font_family", "")
        _sub_font_size = snap.get("standard_video.config.subtitle_font_size", 0)
        _sub_text_color = snap.get("standard_video.config.subtitle_text_color", "")
        _sub_active_color = snap.get("standard_video.config.subtitle_active_color", "")
        _sub_bg_color = snap.get("standard_video.config.subtitle_bg_color", "")
        _sub_stroke_color = snap.get("standard_video.config.subtitle_stroke_color", "")
        _sub_stroke_width = snap.get("standard_video.config.subtitle_stroke_width", -1)
        if _sub_font_size and _sub_font_size > 0:
            subtitle_style["font_size"] = _sub_font_size
        if _sub_text_color:
            subtitle_style["text_color"] = _sub_text_color
        if _sub_active_color:
            subtitle_style["active_color"] = _sub_active_color
        if _sub_bg_color:
            subtitle_style["background"] = _sub_bg_color
        if _sub_stroke_color:
            subtitle_style["outline_color"] = _sub_stroke_color
        if _sub_stroke_width >= 0:
            subtitle_style["outline_width"] = _sub_stroke_width

        # Template/Style Blueprint context (M11)
        template_ctx = getattr(job, '_template_context', None)
        style_blueprint_data = None
        template_info = None
        if isinstance(template_ctx, dict):
            template_info = {
                "template_id": template_ctx.get("template_id"),
                "template_name": template_ctx.get("template_name"),
                "template_version": template_ctx.get("template_version"),
                "link_role": template_ctx.get("link_role"),
            }
            bp = template_ctx.get("style_blueprint")
            if bp:
                style_blueprint_data = {
                    "blueprint_id": bp.get("id"),
                    "blueprint_name": bp.get("name"),
                    "blueprint_version": bp.get("version"),
                    "visual_rules": bp.get("visual_rules"),
                    "motion_rules": bp.get("motion_rules"),
                    "layout_rules": bp.get("layout_rules"),
                    "subtitle_rules": bp.get("subtitle_rules"),
                    "thumbnail_rules": bp.get("thumbnail_rules"),
                }
                # If blueprint has subtitle_rules, merge into subtitle_style
                bp_sub_rules = bp.get("subtitle_rules")
                if bp_sub_rules and isinstance(bp_sub_rules, dict):
                    for k, v in bp_sub_rules.items():
                        if k in subtitle_style and v is not None:
                            subtitle_style[k] = v
                    logger.info(
                        "CompositionStepExecutor: subtitle style merged from blueprint. "
                        "blueprint=%s, job=%s", bp.get("name"), job.id,
                    )

        start_time = time.monotonic()

        # ── B3: visual_direction preset mapping ──────────────────────────
        # Per-video seçim → varsayılan değerleri belirler.
        # Admin settings (snap) hala en üst otorite — burada sadece base preset.
        _VISUAL_DIRECTION_PRESETS = {
            "clean": {
                "gradientIntensity": 0.5,
                "titleFontSize": 26,
                "watermarkOpacity": 0.15,
                "bgColor": "#0a0a0a",
                "showTitleOverlay": True,
            },
            "cinematic": {
                "gradientIntensity": 0.8,
                "titleFontSize": 34,
                "watermarkOpacity": 0.35,
                "bgColor": "#050508",
                "showTitleOverlay": True,
            },
            "minimal": {
                "gradientIntensity": 0.3,
                "titleFontSize": 22,
                "watermarkOpacity": 0.0,
                "bgColor": "#0a0a0a",
                "showTitleOverlay": False,
            },
        }
        vd = raw_input.get("visual_direction", "").lower().strip()
        vd_preset = _VISUAL_DIRECTION_PRESETS.get(vd, {})

        # ── B4: motion_level preset mapping ──────────────────────────────
        _MOTION_LEVEL_PRESETS = {
            "minimal": {
                "sceneTransitionDuration": 0.3,
                "imageKenBurns": False,
                "imageTransition": "cut",
                "kenBurnsIntensity": 0.0,
                "introDuration": 1.5,
                "outroDuration": 1.5,
            },
            "moderate": {
                "sceneTransitionDuration": 0.5,
                "imageKenBurns": True,
                "imageTransition": "crossfade",
                "kenBurnsIntensity": 0.5,
                "introDuration": 2.5,
                "outroDuration": 2.5,
            },
            "dynamic": {
                "sceneTransitionDuration": 0.8,
                "imageKenBurns": True,
                "imageTransition": "crossfade",
                "kenBurnsIntensity": 1.0,
                "introDuration": 3.0,
                "outroDuration": 3.0,
            },
        }
        ml = raw_input.get("motion_level", "").lower().strip()
        ml_preset = _MOTION_LEVEL_PRESETS.get(ml, {})

        # Merge zinciri: builtin default → visual_direction preset → motion_level preset → admin settings
        # Admin settings (snap.get) her zaman son söz — ama sadece admin açıkça ayarladıysa.
        def _pick(setting_key: str, vd_val, ml_val, builtin_default):
            """Admin setting varsa onu kullan, yoksa vd/ml preset, yoksa builtin."""
            admin_val = snap.get(setting_key)
            if admin_val is not None:
                return admin_val
            if ml_val is not None:
                return ml_val
            if vd_val is not None:
                return vd_val
            return builtin_default

        composition_props: dict = {
            "job_id": job.id,
            "module_id": ctx.module_id,
            "language": language,
            "composition_id": composition_id,
            "props": {
                "title": metadata_data.get("title", script_data.get("topic", "")),
                "scenes": props_scenes,
                "subtitles_srt": subtitles_srt,
                "word_timing_path": word_timing_path,
                "timing_mode": timing_mode,
                "subtitle_style": subtitle_style,
                "total_duration_seconds": round(total_duration, 3),
                "language": language,
                # M41: renderFormat — settings snapshot'tan oku
                "renderFormat": snap.get(
                    "standard_video.config.render_format", "landscape",
                ),
                # M42: karaoke animasyon preset
                "karaokeAnimPreset": snap.get(
                    "standard_video.config.karaoke_anim_preset", "hype",
                ),
                # Visual & overlay parameters — B3/B4 merge zinciri
                "renderFps": snap.get("standard_video.config.render_fps", 30),
                "imageKenBurns": _pick(
                    "standard_video.config.image_ken_burns",
                    None, ml_preset.get("imageKenBurns"), True,
                ),
                "imageTransition": _pick(
                    "standard_video.config.image_transition",
                    None, ml_preset.get("imageTransition"), "crossfade",
                ),
                "sceneTransitionDuration": _pick(
                    "standard_video.config.scene_transition_duration",
                    None, ml_preset.get("sceneTransitionDuration"), 0.5,
                ),
                "bgColor": _pick(
                    "standard_video.config.bg_color",
                    vd_preset.get("bgColor"), None, "#0a0a0a",
                ),
                "showTitleOverlay": _pick(
                    "standard_video.config.show_title_overlay",
                    vd_preset.get("showTitleOverlay"), None, True,
                ),
                "titleFontSize": _pick(
                    "standard_video.config.title_font_size",
                    vd_preset.get("titleFontSize"), None, 30,
                ),
                "titleColor": snap.get("standard_video.config.title_color", "#FFFFFF"),
                "gradientIntensity": _pick(
                    "standard_video.config.gradient_intensity",
                    vd_preset.get("gradientIntensity"), None, 0.65,
                ),
                "watermarkText": snap.get("standard_video.config.watermark_text", ""),
                "watermarkOpacity": _pick(
                    "standard_video.config.watermark_opacity",
                    vd_preset.get("watermarkOpacity"), None, 0.3,
                ),
                "watermarkPosition": snap.get("standard_video.config.watermark_position", "bottom-right"),
                "subtitleFontFamily": _sub_font_family,
                # B4: motion parametreleri — renderer'a geçirilir
                "kenBurnsIntensity": ml_preset.get("kenBurnsIntensity", 0.5),
                "introDuration": ml_preset.get("introDuration", 2.5),
                "outroDuration": ml_preset.get("outroDuration", 2.5),
                # B6: visual_cue overlay kontrolü
                "showVisualCue": snap.get("standard_video.config.show_visual_cue", True),
                "metadata": {
                    "title": metadata_data.get("title", ""),
                    "description": metadata_data.get("description", ""),
                    "tags": metadata_data.get("tags", []),
                    "hashtags": metadata_data.get("hashtags", []),
                },
            },
            "render_status": "props_ready",
            "template": template_info,
            "style_blueprint": style_blueprint_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        latency_ms = int((time.monotonic() - start_time) * 1000)

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="composition_props.json",
            data=composition_props,
        )

        logger.info(
            "CompositionStepExecutor: job=%s dil=%s composition_id=%s sahne=%d "
            "toplam_sure=%.1fs render_status=props_ready artifact=%s",
            job.id,
            language,
            composition_id,
            len(props_scenes),
            total_duration,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": language,
            "composition_id": composition_id,
            "render_status": "props_ready",
            "scenes_included": len(props_scenes),
            "subtitle_style_preset": subtitle_style["preset_id"],
            "timing_mode": timing_mode,
            "provider": {
                "provider_id": "composition_props_builder",
                "language": language,
                "composition_id": composition_id,
                "scenes_included": len(props_scenes),
                "render_status": "props_ready",
                "subtitle_style_preset": subtitle_style["preset_id"],
                "timing_mode": timing_mode,
                "latency_ms": latency_ms,
            },
            "template": template_info,
            "style_blueprint": style_blueprint_data,
            "step": self.step_key(),
        }
