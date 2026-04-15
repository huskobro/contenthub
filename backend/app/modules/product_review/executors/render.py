"""
ProductReviewRenderStepExecutor — Faz F.

standard_video.RenderStepExecutor'i yeniden kullanir.
product_review CompositionStep `product_review_composition.json` yazar;
standard_video RenderStepExecutor `composition_props.json` bekler. Bu
executor bridge artifact olusturur (ayni JSON icerigi; ek olarak
`render_status: "props_ready"` alanini ekler) ve delege eder.

Ayrica price disclaimer overlay ve watermark gibi creative pack'in
blueprint alanlari composition artifact icinde zaten yazili (Faz C/D).
Render adaptor sadece icerigi props_ready flag'i + dogru dosya adiyla
bridge etmek zorunda.
"""

from __future__ import annotations

import json
import logging

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.executors.render import RenderStepExecutor

from ._helpers import _artifact_dir, _read_artifact

logger = logging.getLogger(__name__)

_COMPOSITION_SOURCE = "product_review_composition.json"
_COMPOSITION_BRIDGE = "composition_props.json"


def _bridge_composition_artifact(workspace_root: str, job_id: str) -> dict:
    """
    product_review_composition.json -> composition_props.json bridge.

    - scenes icinde audio_path eksikse audio_manifest.json'dan enjekte et.
    - render_status="props_ready" ekle (standard_video kontrat geregi).
    - subtitlesSrt yolu: subtitles.srt varsa `artifacts/subtitles.srt`
      relative path olarak ekle.
    """
    d = _artifact_dir(workspace_root, job_id)
    source = d / _COMPOSITION_SOURCE
    if not source.exists():
        raise StepExecutionError(
            "render",
            f"product_review: {source.name} artifact'i bulunamadi. "
            "composition adimi tamamlanmadan render calismaz.",
            retryable=False,
        )

    composition = json.loads(source.read_text(encoding="utf-8"))
    props = composition.get("props", {}) or {}

    # audio_manifest.json → scenes[i].audio_path / duration_seconds enjekte et
    audio_manifest = _read_artifact(workspace_root, job_id, "audio_manifest.json") or {}
    audio_scenes = audio_manifest.get("scenes", []) or []
    scenes = list(props.get("scenes") or [])
    for i, scene in enumerate(scenes):
        if i < len(audio_scenes):
            a = audio_scenes[i] or {}
            if a.get("audio_path") and not scene.get("audio_path"):
                scene["audio_path"] = a["audio_path"]
            if a.get("duration_seconds") and not scene.get("duration_seconds"):
                scene["duration_seconds"] = float(a["duration_seconds"])
    props["scenes"] = scenes

    # subtitles.srt relative path
    srt_path = d / "subtitles.srt"
    if srt_path.exists():
        props.setdefault("subtitlesSrt", "artifacts/subtitles.srt")

    # total_duration_seconds — composition'dan zaten geliyor, ama fallback olarak
    # audio_manifest.total_duration_seconds kullanabiliriz.
    if not props.get("total_duration_seconds"):
        total = audio_manifest.get("total_duration_seconds")
        if total:
            props["total_duration_seconds"] = float(total)

    # word_timing_path — subtitle word_timing.json uretti ise relative ekle
    wt_path = d / "word_timing.json"
    if wt_path.exists():
        props.setdefault("wordTimingPath", str(wt_path))

    bridged = {
        "composition_id": composition.get("composition_id"),
        "render_status": "props_ready",
        "width": composition.get("width"),
        "height": composition.get("height"),
        "fps": composition.get("fps"),
        "duration_frames": composition.get("duration_frames"),
        "props": props,
    }

    bridge_path = d / _COMPOSITION_BRIDGE
    bridge_path.write_text(
        json.dumps(bridged, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return bridged


class ProductReviewRenderStepExecutor(StepExecutor):
    """
    step_key = "render"

    standard_video RenderStepExecutor'i delegate eder. Bridge olarak
    product_review_composition.json -> composition_props.json yazar ve
    props_ready flag'i ekler.
    """

    def __init__(self) -> None:
        self._delegate = RenderStepExecutor()

    def step_key(self) -> str:
        return "render"

    async def execute(self, job: Job, step: JobStep) -> dict:
        workspace_root = getattr(job, "workspace_path", None) or ""
        _bridge_composition_artifact(workspace_root, job.id)
        result = await self._delegate.execute(job, step)
        if isinstance(result, dict):
            result.setdefault("module", "product_review")
        return result
