"""
Product Review modulu executor'lari (Faz A — iskelet).

Faz A'da executor'lar STUB olarak tanimlanir; gercek implementasyon
Faz B (vertical slice), Faz C (creative pack), Faz D (3 template) asamalarinda
gelecek. Bu dosya ModuleDefinition'in kayit olabilmesi icin var.

executor classlari:
  - ProductScrapeStepExecutor         (Faz B — ingestion + parser_chain)
  - ProductReviewScriptStepExecutor   (Faz B — single template icin LLM)
  - ProductReviewMetadataStepExecutor (Faz B — metadata + disclosure)
  - ProductReviewTTSStepExecutor      (Faz B — standard_video TTSStepExecutor reuse)
  - ProductReviewVisualsStepExecutor  (Faz B — urun gorseli + stoklar)
  - ProductReviewSubtitleStepExecutor (Faz B — SubtitleStepExecutor reuse)
  - ProductReviewCompositionStepExecutor (Faz B — Remotion props)
  - ProductReviewRenderStepExecutor   (Faz B — RenderStepExecutor reuse)
  - ProductReviewPreviewFrameExecutor (Faz C — Level 1 preview)
  - ProductReviewPreviewMiniExecutor  (Faz C — Level 2 preview)
  - ProductReviewPublishStepExecutor  (Faz F — PublishStepExecutor reuse)

Tum stub'lar StepExecutionError firlatir — modul tanimi yuklenirken
patlamaz ama tetiklenirse acik hata verir.
"""

# Gercek implementasyonlar (Faz B+) — stub yerine bunlar kullanilir.
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

# Henuz stub olan executor'lar — Faz F'te gercek olacak.
from app.modules.product_review.executors.stubs import (
    ProductReviewTTSStepExecutor,
    ProductReviewSubtitleStepExecutor,
    ProductReviewRenderStepExecutor,
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
