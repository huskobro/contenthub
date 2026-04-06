"""
News Bulletin Modül Tanımı — M28.

news_bulletin içerik modülünü tanımlar.
Global module_registry'e kaydı main.py lifespan handler'ında yapılır.

Pipeline adımları (sırasıyla):
  1. script      — Seçilmiş haberler → Spiker narration metinleri (LLM)
  2. metadata    — Script → Başlık, açıklama, etiketler (LLM)
  3. tts         — Narration → Ses dosyaları (TTS provider, reuse)
  4. subtitle    — Ses → SRT / kelime hizalaması (Whisper, reuse)
  5. composition — Tüm artifact'lar → composition_props.json (render yapmaz)
  6. render      — composition_props.json → video.mp4 (Remotion CLI, reuse)
  7. publish     — Render çıktısı → Platform yayını (operator_confirm, reuse)

Reuse edilen executor'lar:
  TTSStepExecutor, SubtitleStepExecutor, RenderStepExecutor, PublishStepExecutor
  Bu executor'lar standard_video modülünden aynen kullanılır.
  module_id bazlı composition_id çözümleme composition_map.py üzerinden çalışır.

operator_confirm semantiği:
  publish step'i operator_confirm tipindedir (standard_video ile aynı).
"""

from app.modules.base import ModuleDefinition, StepDefinition
from app.modules.news_bulletin.executors import (
    BulletinScriptExecutor,
    BulletinMetadataExecutor,
    BulletinCompositionExecutor,
)
from app.modules.standard_video.executors import (
    TTSStepExecutor,
    SubtitleStepExecutor,
    RenderStepExecutor,
)
from app.publish.executor import PublishStepExecutor

# News Bulletin modülünün tam tanımı
NEWS_BULLETIN_MODULE = ModuleDefinition(
    module_id="news_bulletin",
    display_name="Haber Bülteni",
    steps=[
        StepDefinition(
            step_key="script",
            step_order=1,
            idempotency_type="re_executable",
            executor_class=BulletinScriptExecutor,
            display_name="Bülten Senaryo",
            description="Seçilmiş haberlerden spiker tarzında narration metinleri üretir.",
        ),
        StepDefinition(
            step_key="metadata",
            step_order=2,
            idempotency_type="re_executable",
            executor_class=BulletinMetadataExecutor,
            display_name="Metadata",
            description="Bülten script'inden başlık, açıklama ve etiketler üretir.",
        ),
        StepDefinition(
            step_key="tts",
            step_order=3,
            idempotency_type="artifact_check",
            executor_class=TTSStepExecutor,
            display_name="Ses Üretimi",
            description="Narration metinlerini ses dosyalarına dönüştürür.",
        ),
        StepDefinition(
            step_key="subtitle",
            step_order=4,
            idempotency_type="re_executable",
            executor_class=SubtitleStepExecutor,
            display_name="Altyazı",
            description="Ses dosyalarından SRT ve kelime düzeyinde hizalama üretir.",
        ),
        StepDefinition(
            step_key="composition",
            step_order=5,
            idempotency_type="artifact_check",
            executor_class=BulletinCompositionExecutor,
            display_name="Kompozisyon",
            description="Tüm artifact'ları birleştirerek render-ready props üretir.",
        ),
        StepDefinition(
            step_key="render",
            step_order=6,
            idempotency_type="artifact_check",
            executor_class=RenderStepExecutor,
            display_name="Render",
            description="composition_props.json'dan Remotion CLI ile video render eder.",
        ),
        StepDefinition(
            step_key="publish",
            step_order=7,
            idempotency_type="operator_confirm",
            executor_class=PublishStepExecutor,
            display_name="Yayın",
            description=(
                "Render çıktısını platforma yükler. "
                "Operatör PublishRecord'u tetikleyerek bu adımı başlatır."
            ),
        ),
    ],
    input_schema={
        "type": "object",
        "required": ["bulletin_id"],
        "properties": {
            "bulletin_id": {
                "type": "string",
                "description": "Haber bülteni entity ID — pipeline'ın ana girdisi.",
            },
            "language": {
                "type": "string",
                "default": "tr",
                "description": "Bülten dili (ISO 639-1 kodu).",
            },
            "tone": {
                "type": "string",
                "default": "formal",
                "description": "Narration tonu.",
            },
            "target_duration_seconds": {
                "type": "integer",
                "minimum": 30,
                "maximum": 600,
                "default": 120,
                "description": "Hedef bülten süresi (saniye).",
            },
            "topic": {
                "type": "string",
                "description": "Bülten konusu — StepExecutionContext uyumluluğu için.",
            },
        },
    },
    gate_defaults={
        "script_review": False,
        "metadata_review": False,
    },
    template_compat=["news_bulletin_v1"],
)
