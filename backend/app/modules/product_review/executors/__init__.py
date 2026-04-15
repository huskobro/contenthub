"""
Product Review modulu executor'lari.

Faz A   — iskelet (sadece ProductScrape).
Faz B   — Script / Metadata / Visuals / Composition gercek.
Faz C   — PreviewFrame + PreviewMini.
Faz D   — 3 template (single / comparison / alternatives) script branch.
Faz E   — data_confidence + gate_decision.
Faz F   — TTS / Subtitle / Render / Publish adapter executor'lari
          (standard_video + publish zincirini yeniden kullanir).

Executor classlari (step_key -> class):
  product_scrape   -> ProductScrapeStepExecutor
  script           -> ProductReviewScriptStepExecutor
  metadata         -> ProductReviewMetadataStepExecutor
  visuals          -> ProductReviewVisualsStepExecutor
  tts              -> ProductReviewTTSStepExecutor    (Faz F adapter)
  subtitle         -> ProductReviewSubtitleStepExecutor (Faz F adapter)
  preview_frame    -> ProductReviewPreviewFrameExecutor
  preview_mini     -> ProductReviewPreviewMiniExecutor
  composition      -> ProductReviewCompositionStepExecutor
  render           -> ProductReviewRenderStepExecutor (Faz F adapter)
  publish          -> ProductReviewPublishStepExecutor (Faz F adapter)
"""

from app.modules.product_review.executors.product_scrape import (
    ProductScrapeStepExecutor,
)
from app.modules.product_review.executors.script import (
    ProductReviewScriptStepExecutor,
)
from app.modules.product_review.executors.metadata import (
    ProductReviewMetadataStepExecutor,
)
from app.modules.product_review.executors.visuals import (
    ProductReviewVisualsStepExecutor,
)
from app.modules.product_review.executors.composition import (
    ProductReviewCompositionStepExecutor,
)
from app.modules.product_review.executors.preview_frame import (
    ProductReviewPreviewFrameExecutor,
)
from app.modules.product_review.executors.preview_mini import (
    ProductReviewPreviewMiniExecutor,
)
from app.modules.product_review.executors.tts import (
    ProductReviewTTSStepExecutor,
)
from app.modules.product_review.executors.subtitle import (
    ProductReviewSubtitleStepExecutor,
)
from app.modules.product_review.executors.render import (
    ProductReviewRenderStepExecutor,
)
from app.modules.product_review.executors.publish import (
    ProductReviewPublishStepExecutor,
)

__all__ = [
    "ProductScrapeStepExecutor",
    "ProductReviewScriptStepExecutor",
    "ProductReviewMetadataStepExecutor",
    "ProductReviewTTSStepExecutor",
    "ProductReviewVisualsStepExecutor",
    "ProductReviewSubtitleStepExecutor",
    "ProductReviewCompositionStepExecutor",
    "ProductReviewRenderStepExecutor",
    "ProductReviewPreviewFrameExecutor",
    "ProductReviewPreviewMiniExecutor",
    "ProductReviewPublishStepExecutor",
]
