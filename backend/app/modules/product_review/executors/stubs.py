"""
Product Review executor STUB'lari (Faz A iskeleti).

Her stub StepExecutor'dan turer, `step_key()` dondurur ve `execute()`
cagrildiginda StepExecutionError firlatir. Bu sayede:
  - ModuleDefinition kayit olurken import hatasi yok.
  - Pipeline tetiklenirse anlik ve acik hata: "Faz B'de doldurulacak".
  - "yarim birakma" kurali ihlal edilmez: iskelet KASITLI, dokumante edilmis.

Gercek implementasyonlar:
  Faz B  — Scrape, Script(single), Metadata, Visuals, Composition
  Faz C  — PreviewFrame, PreviewMini
  Faz D  — Script/Composition template dallari (comparison, alternatives)
  Faz F  — Publish
  TTS + Subtitle + Render — standard_video executor'lari yeniden kullanilacak.
"""

from __future__ import annotations

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError


class _ProductReviewStubBase(StepExecutor):
    """Tum product_review stub executor'larinin ortak gövdesi."""

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


class ProductScrapeStepExecutor(_ProductReviewStubBase):
    _step_key = "product_scrape"
    _phase = "Faz B"


class ProductReviewScriptStepExecutor(_ProductReviewStubBase):
    _step_key = "script"
    _phase = "Faz B"


class ProductReviewMetadataStepExecutor(_ProductReviewStubBase):
    _step_key = "metadata"
    _phase = "Faz B"


class ProductReviewTTSStepExecutor(_ProductReviewStubBase):
    _step_key = "tts"
    _phase = "Faz B (standard_video TTSStepExecutor reuse)"


class ProductReviewVisualsStepExecutor(_ProductReviewStubBase):
    _step_key = "visuals"
    _phase = "Faz B"


class ProductReviewSubtitleStepExecutor(_ProductReviewStubBase):
    _step_key = "subtitle"
    _phase = "Faz B (standard_video SubtitleStepExecutor reuse)"


class ProductReviewCompositionStepExecutor(_ProductReviewStubBase):
    _step_key = "composition"
    _phase = "Faz B"


class ProductReviewRenderStepExecutor(_ProductReviewStubBase):
    _step_key = "render"
    _phase = "Faz B (standard_video RenderStepExecutor reuse)"


class ProductReviewPreviewFrameExecutor(_ProductReviewStubBase):
    _step_key = "preview_frame"
    _phase = "Faz C (Level 1 — renderStill)"


class ProductReviewPreviewMiniExecutor(_ProductReviewStubBase):
    _step_key = "preview_mini"
    _phase = "Faz C (Level 2 — mini MP4)"


class ProductReviewPublishStepExecutor(_ProductReviewStubBase):
    _step_key = "publish"
    _phase = "Faz F (PublishStepExecutor reuse)"
