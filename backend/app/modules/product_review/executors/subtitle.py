"""
ProductReviewSubtitleStepExecutor — Faz F.

standard_video.SubtitleStepExecutor'i yeniden kullanir. Upstream tts adimi
bridge script.json'i zaten yazdi; subtitle executor'u hem script.json hem
audio_manifest.json okuyor — ikisi de artik doluyor.

Input contract: TTS ile ayni — module_id parametresi SubtitleStepExecutor'a
bilinmeli degil (raw_input'tan okunmaz; StepExecutionContext'te metadata).
"""

from __future__ import annotations

import logging

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.modules.standard_video.executors.subtitle import SubtitleStepExecutor
from app.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


class ProductReviewSubtitleStepExecutor(StepExecutor):
    """
    step_key = "subtitle"

    standard_video SubtitleStepExecutor'i delegate eder. Whisper registry'de
    varsa kelime-duzeyi zamanlama; yoksa cursor-tabanlisi.
    """

    def __init__(self, registry: ProviderRegistry | None = None) -> None:
        self._delegate = SubtitleStepExecutor(registry=registry)

    def step_key(self) -> str:
        return "subtitle"

    async def execute(self, job: Job, step: JobStep) -> dict:
        result = await self._delegate.execute(job, step)
        if isinstance(result, dict):
            result.setdefault("module", "product_review")
        return result
