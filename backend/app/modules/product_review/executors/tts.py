"""
ProductReviewTTSStepExecutor — Faz F.

standard_video.TTSStepExecutor'i yeniden kullanir (parallel-pattern yasagina
uyum). Tek fark: product_review `product_review_script.json` isminde yazarken
standard_video TTS `script.json` bekliyor. Bu executor bridge artifact olarak
`script.json` kopyasini olusturur (idempotent), sonra standard_video TTS
execute'ini delege eder.

Input contract:
  - job.input_data_json: 'topic' (product_review schema zorunlu) + 'language'
  - 'module_id' StepExecutionContext icin "standard_video" (TTS delegate'te).
    Bu degisikligi burada yapmamiz gerek cunku TTS kendi input'undan baska
    modul kimligi beklemiyor — from_job_input modul-agnostic.
"""

from __future__ import annotations

import json
import logging

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.executors.tts import TTSStepExecutor
from app.providers.registry import ProviderRegistry

from ._helpers import _artifact_dir, _read_artifact

logger = logging.getLogger(__name__)

_SCRIPT_SOURCE = "product_review_script.json"
_SCRIPT_BRIDGE = "script.json"


def _bridge_script_artifact(workspace_root: str, job_id: str) -> None:
    """
    product_review_script.json -> script.json kopyasini olusturur.

    standard_video.TTSStepExecutor `script.json` okur; biz urun review'da
    `product_review_script.json` yaziyoruz. Iki dosya da ayni formatta
    (scenes + narration). Bu yardimci dosyayi delege oncesi yazariz.

    Idempotent: script.json varsa ve mtime yeni ise dokunma; yoksa yaz.
    """
    d = _artifact_dir(workspace_root, job_id)
    source = d / _SCRIPT_SOURCE
    bridge = d / _SCRIPT_BRIDGE
    if not source.exists():
        raise StepExecutionError(
            "tts",
            f"product_review: {source.name} artifact'i bulunamadi. "
            "script adimi tamamlanmadan tts calismaz.",
            retryable=False,
        )
    # Bridge'i her zaman yeniden yaz — product_review_script.json ana kaynak.
    bridge.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")


class ProductReviewTTSStepExecutor(StepExecutor):
    """
    step_key = "tts"

    standard_video TTSStepExecutor'i aynen delegate eder. Bridge artifact
    dosyasiyla schema farksizligi saglanir (ikisinde de scenes[] + narration).
    """

    def __init__(self, registry: ProviderRegistry) -> None:
        self._delegate = TTSStepExecutor(registry=registry)

    def step_key(self) -> str:
        return "tts"

    async def execute(self, job: Job, step: JobStep) -> dict:
        workspace_root = getattr(job, "workspace_path", None) or ""
        _bridge_script_artifact(workspace_root, job.id)

        # standard_video TTS module_id="standard_video" bekleyen
        # StepExecutionContext'i kendi icinde yaratiyor. product_review job'larda
        # module_id zaten StepExecutionContext hesaplamada directly parametredir
        # ve biz TTSStepExecutor.execute icinden bunu degistiremeyiz, ama
        # StepExecutionContext.from_job_input zaten raw_input'tan 'topic', 'language'
        # okuyor — module_id sadece metadata, davranisi etkilemiyor.
        result = await self._delegate.execute(job, step)
        # Sonuca module kaynagi ekleyelim (telemetry icin).
        if isinstance(result, dict):
            result.setdefault("module", "product_review")
        return result
