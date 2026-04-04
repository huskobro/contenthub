"""
Standard Video Modül Tanımı (M2-C1)

standard_video içerik modülünü tanımlar.
Global module_registry'e kaydı main.py lifespan handler'ında yapılır.

Pipeline adımları (sırasıyla):
  1. script      — Konu → Yapılandırılmış senaryo (LLM)
  2. metadata    — Senaryo → Başlık, açıklama, etiketler (LLM)
  3. tts         — Anlatım → Ses dosyaları (TTS provider)
  4. visuals     — Görsel ipuçları → Medya indirme (görsel provider)
  5. subtitle    — Ses → SRT / kelime hizalaması (Whisper)
  6. composition — Tüm varlıklar → Video render (Remotion)

Executor sınıfları şu an stub (M2-C2+ ile gerçek içerikle doldurulacak).
"""

from app.modules.base import ModuleDefinition, StepDefinition
from app.modules.standard_video.executors import (
    ScriptStepExecutor,
    MetadataStepExecutor,
    TTSStepExecutor,
    VisualsStepExecutor,
    SubtitleStepExecutor,
    CompositionStepExecutor,
)

# Standard Video modülünün tam tanımı
STANDARD_VIDEO_MODULE = ModuleDefinition(
    module_id="standard_video",
    display_name="Standart Video",
    steps=[
        StepDefinition(
            step_key="script",
            step_order=1,
            idempotency_type="re_executable",
            executor_class=ScriptStepExecutor,
            display_name="Senaryo",
            description="Konu girdisinden yapılandırılmış video senaryosu üretir.",
        ),
        StepDefinition(
            step_key="metadata",
            step_order=2,
            idempotency_type="re_executable",
            executor_class=MetadataStepExecutor,
            display_name="Metadata",
            description="Senaryo içeriğinden başlık, açıklama ve etiketler üretir.",
        ),
        StepDefinition(
            step_key="tts",
            step_order=3,
            idempotency_type="artifact_check",
            executor_class=TTSStepExecutor,
            display_name="Ses Üretimi",
            description="Senaryo anlatımını ses dosyasına dönüştürür.",
        ),
        StepDefinition(
            step_key="visuals",
            step_order=4,
            idempotency_type="artifact_check",
            executor_class=VisualsStepExecutor,
            display_name="Görsel Toplama",
            description="Sahne görsel ipuçlarına göre medya varlıklarını indirir.",
        ),
        StepDefinition(
            step_key="subtitle",
            step_order=5,
            idempotency_type="re_executable",
            executor_class=SubtitleStepExecutor,
            display_name="Altyazı",
            description="Ses dosyasından SRT ve kelime düzeyinde hizalama verisi üretir.",
        ),
        StepDefinition(
            step_key="composition",
            step_order=6,
            idempotency_type="artifact_check",
            executor_class=CompositionStepExecutor,
            display_name="Kompozisyon",
            description="Tüm varlıkları birleştirerek final video dosyasını render eder.",
        ),
    ],
    input_schema={
        "type": "object",
        "required": ["topic"],
        "properties": {
            "topic": {
                "type": "string",
                "minLength": 3,
                "maxLength": 500,
                "description": "Video konusu — senaryo üretiminin ana girdisi.",
            },
            "language": {
                "type": "string",
                "default": "tr",
                "description": "Senaryo ve metadata dili (ISO 639-1 kodu).",
            },
            "duration_seconds": {
                "type": "integer",
                "minimum": 30,
                "maximum": 600,
                "default": 60,
                "description": "Hedef video süresi (saniye). Senaryo buna göre planlanır.",
            },
        },
    },
    gate_defaults={
        "script_review": False,
        "metadata_review": False,
    },
    template_compat=["standard_video_v1"],
)
