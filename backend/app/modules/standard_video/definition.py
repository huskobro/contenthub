"""
Standard Video Modül Tanımı (M2-C1, güncellendi M7-C3)

standard_video içerik modülünü tanımlar.
Global module_registry'e kaydı main.py lifespan handler'ında yapılır.

Pipeline adımları (sırasıyla):
  1. script      — Konu → Yapılandırılmış senaryo (LLM)
  2. metadata    — Senaryo → Başlık, açıklama, etiketler (LLM)
  3. tts         — Anlatım → Ses dosyaları (TTS provider)
  4. visuals     — Görsel ipuçları → Medya indirme (görsel provider)
  5. subtitle    — Ses → SRT / kelime hizalaması (Whisper)
  6. composition — Tüm varlıklar → Video render (Remotion)
  7. publish     — Render çıktısı → Platform yayını (YouTube, operator_confirm)

operator_confirm semantiği (M7-C3):
  publish step'i operator_confirm tipindedir.
  PublishRecord'un trigger_publish() ile 'publishing' durumuna geçirilmesi
  ve publish_record_id'nin step payload'ına yazılması operatör aksiyonudur.
  Executor bu kontrolü yapar: PublishRecord zaten 'published' ise adım atlanır.
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
from app.publish.executor import PublishStepExecutor

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
        StepDefinition(
            step_key="publish",
            step_order=7,
            idempotency_type="operator_confirm",
            executor_class=PublishStepExecutor,
            display_name="Yayın",
            description=(
                "Render çıktısını platforma yükler (upload + activate). "
                "Operatör, PublishRecord'u 'publishing' durumuna geçirip "
                "publish_record_id'yi step payload'ına yazarak bu adımı başlatır. "
                "Zaten 'published' ise adım atlanır (idempotent)."
            ),
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
