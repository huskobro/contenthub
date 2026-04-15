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

from app.modules.product_review.executors.stubs import (
    ProductScrapeStepExecutor,
    ProductReviewScriptStepExecutor,
    ProductReviewMetadataStepExecutor,
    ProductReviewTTSStepExecutor,
    ProductReviewVisualsStepExecutor,
    ProductReviewSubtitleStepExecutor,
    ProductReviewCompositionStepExecutor,
    ProductReviewRenderStepExecutor,
    ProductReviewPreviewFrameExecutor,
    ProductReviewPreviewMiniExecutor,
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
