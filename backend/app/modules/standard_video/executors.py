"""
Standard Video Stub Executor'ları (M2-C1)

Bu dosya standard_video modülünün 6 pipeline adımı için stub (iskelet)
executor sınıflarını tanımlar.

ÖNEMLI: Bu executor'lar M2-C2 ve sonrasında gerçek mantıkla doldurulacaktır.
Şu an yalnızca:
  - StepExecutor ABC'yi extend ederler
  - step_key() metodunu doğru değerle implement ederler
  - execute() metodu {"status": "stub", "step": <step_key>} döndürür
  - Gerçek API çağrısı YAPMAZLAR

Çalışma sırası: script → metadata → tts → visuals → subtitle → composition
"""

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor


class ScriptStepExecutor(StepExecutor):
    """
    Senaryo adımı stub executor'ı.

    Gerçek davranış (M2-C2): Konu → LLM provider aracılığıyla yapılandırılmış
    senaryo (sahneler, anlatım, görsel ipuçları, süre tahmini).
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek içerik üretmez.
        M2-C2'de LLM provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class MetadataStepExecutor(StepExecutor):
    """
    Metadata adımı stub executor'ı.

    Gerçek davranış (M2-C2): Senaryo → LLM aracılığıyla başlık, açıklama,
    etiketler ve hashtag'ler.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "metadata"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek metadata üretmez.
        M2-C2'de LLM provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class TTSStepExecutor(StepExecutor):
    """
    Ses üretimi (TTS) adımı stub executor'ı.

    Gerçek davranış (M2-C3): Anlatım segmentleri → TTS provider aracılığıyla
    ses dosyaları. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "tts"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek ses üretmez.
        M2-C3'te TTS provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class VisualsStepExecutor(StepExecutor):
    """
    Görsel toplama adımı stub executor'ı.

    Gerçek davranış (M2-C3): Görsel ipuçları → görsel provider aracılığıyla
    medya indirme. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "visuals"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek görsel indirme yapmaz.
        M2-C3'te görsel provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class SubtitleStepExecutor(StepExecutor):
    """
    Altyazı adımı stub executor'ı.

    Gerçek davranış (M2-C4): Ses dosyası → Whisper aracılığıyla
    SRT / kelime düzeyinde hizalama verisi.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "subtitle"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek altyazı üretmez.
        M2-C4'te Whisper entegrasyonuyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class CompositionStepExecutor(StepExecutor):
    """
    Kompozisyon (render) adımı stub executor'ı.

    Gerçek davranış (M2-C5): Tüm üretilen varlıklar → Remotion üzerinden
    video render. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek video render etmez.
        M2-C5'te Remotion entegrasyonuyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}
