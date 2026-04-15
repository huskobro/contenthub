"""
Product Review — kalan STUB executor'lar.

Faz B'de Script / Metadata / Visuals / Composition / ProductScrape gercek
implementasyona tasindi. Bu dosyada hala stub olan executor'lar kalir:

  Faz C  — PreviewFrame, PreviewMini
  Faz F  — Publish
  TTS / Subtitle / Render — standard_video executor'lari yeniden kullanilacak
            (Faz C/D baglaninda adaptor eklenir).

Her stub StepExecutor'dan turer, `step_key()` dondurur ve `execute()`
cagrildiginda StepExecutionError firlatir.
"""

from __future__ import annotations

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError


class _ProductReviewStubBase(StepExecutor):
    """Tum product_review stub executor'larinin ortak govdesi."""

    _step_key: str = ""
    _phase: str = "Faz B"

    def step_key(self) -> str:
        return self._step_key

    async def execute(self, job: Job, step: JobStep) -> dict:
        raise StepExecutionError(
            self._step_key,
            (
                f"product_review.{self._step_key} executor henuz implement "
                f"edilmedi (skeleton — {self._phase}'de doldurulacak)."
            ),
            retryable=False,
        )


# ---------------------------------------------------------------------------
# Hala stub olanlar — Faz C/F'te gercek olacak.
# NOT: ProductScrapeStepExecutor → product_scrape.py
#      ProductReviewScriptStepExecutor → script.py
#      ProductReviewMetadataStepExecutor → metadata.py
#      ProductReviewVisualsStepExecutor → visuals.py
#      ProductReviewCompositionStepExecutor → composition.py
# ---------------------------------------------------------------------------


class ProductReviewTTSStepExecutor(_ProductReviewStubBase):
    _step_key = "tts"
    _phase = "Faz C (standard_video TTSStepExecutor adaptor)"


class ProductReviewSubtitleStepExecutor(_ProductReviewStubBase):
    _step_key = "subtitle"
    _phase = "Faz C (standard_video SubtitleStepExecutor adaptor)"


class ProductReviewRenderStepExecutor(_ProductReviewStubBase):
    _step_key = "render"
    _phase = "Faz C (standard_video RenderStepExecutor adaptor)"


class ProductReviewPreviewFrameExecutor(_ProductReviewStubBase):
    _step_key = "preview_frame"
    _phase = "Faz C (Level 1 — renderStill)"


class ProductReviewPreviewMiniExecutor(_ProductReviewStubBase):
    _step_key = "preview_mini"
    _phase = "Faz C (Level 2 — mini MP4)"


class ProductReviewPublishStepExecutor(_ProductReviewStubBase):
    _step_key = "publish"
    _phase = "Faz F (PublishStepExecutor reuse)"
