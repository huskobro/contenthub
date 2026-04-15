"""
Faz 3 SubtitleStepExecutor integration tests — script-canonical SABIT.

Bu testler executor'in:
  1. SRT metninin her zaman SCRIPT narration'dan geldigini,
  2. Whisper transkripti (halusinasyon / Turkce bozulma / marka kirilma icerse bile)
     altyaziya yansimadigini,
  3. subtitle_alignment_audit.json artifact'inin uretildigini ve dogru yapida
     oldugunu,
  4. timing_mode='script_canonical_whisper' (Whisper var) veya 'cursor' (Whisper yok)
     olarak isaretlendigini
dogrular.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.modules.standard_video.executors.subtitle import SubtitleStepExecutor


class _FakeWhisperProvider(BaseProvider):
    """Test Whisper provider — caller, sahne-isolated timing uretir."""

    def __init__(self, segments: list[dict]) -> None:
        self._segments = segments

    def provider_id(self) -> str:
        return "fake_whisper"

    def capability(self) -> ProviderCapability:
        return ProviderCapability.WHISPER

    async def invoke(self, input_data: dict) -> ProviderOutput:
        return ProviderOutput(
            result={
                "segments": self._segments,
                "language": "tr",
                "duration_seconds": 4.0,
            },
            trace={"provider_id": "fake_whisper", "latency_ms": 10},
            provider_id="fake_whisper",
        )


def _make_registry_with_whisper(segments: list[dict]) -> ProviderRegistry:
    reg = ProviderRegistry()
    reg.register(
        _FakeWhisperProvider(segments), ProviderCapability.WHISPER, is_primary=True
    )
    return reg


def _make_job(tmpdir: str) -> MagicMock:
    job = MagicMock()
    job.id = "faz3-exec-int"
    job.workspace_path = None
    job.input_data_json = json.dumps({
        "topic": "Faz 3 SABIT integration",
        "language": "tr",
        "workspace_root": tmpdir,
    })
    return job


def _setup_artifacts(
    tmpdir: str, script_narration: str, with_audio: bool = True
) -> None:
    artifacts_dir = Path(tmpdir) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    (artifacts_dir / "audio_manifest.json").write_text(
        json.dumps({
            "scenes": [{
                "scene_number": 1,
                "narration": script_narration,
                "duration_seconds": 4.0,
                "audio_path": "artifacts/audio/scene_1.mp3",
            }],
            "total_duration_seconds": 4.0,
            "language": "tr",
        }, ensure_ascii=False),
        encoding="utf-8",
    )
    (artifacts_dir / "script.json").write_text(
        json.dumps({
            "scenes": [{
                "scene_number": 1,
                "narration": script_narration,
            }],
            "language": "tr",
        }, ensure_ascii=False),
        encoding="utf-8",
    )
    if with_audio:
        (artifacts_dir / "audio").mkdir(exist_ok=True)
        (artifacts_dir / "audio" / "scene_1.mp3").write_bytes(b"fake_audio")


# ---------------------------------------------------------------------------
# SABIT: Whisper hallucination altyaziya sizmaz
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_whisper_hallucination_never_reaches_subtitle_srt():
    """Whisper 'ContentHab' yanlis transkribe ederse bile SRT 'ContentHub' icerir."""
    script_text = "ContentHub kullaniyoruz."
    whisper_hallucinated = [{
        "id": 0,
        "start": 0.0,
        "end": 4.0,
        "text": "ContentHab kullaniyoruz.",  # YANLIS
        "words": [
            {"word": "ContentHab", "start": 0.0, "end": 1.5, "probability": 0.8},
            {"word": "kullaniyoruz", "start": 1.5, "end": 4.0, "probability": 0.9},
        ],
    }]

    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, script_narration=script_text, with_audio=True)
        registry = _make_registry_with_whisper(whisper_hallucinated)
        executor = SubtitleStepExecutor(registry=registry)

        result = await executor.execute(_make_job(tmpdir), MagicMock())

        srt_body = Path(result["artifact_path"]).read_text(encoding="utf-8")
        # SCRIPT CANONICAL: marka ismi dogru yazilmis olmali
        assert "ContentHub" in srt_body
        # Whisper'in yanlisi SRT'ye sizmamali
        assert "ContentHab" not in srt_body


@pytest.mark.asyncio
async def test_whisper_turkce_karakter_bozulmasi_altyaziya_sizmaz():
    """Whisper 'Calisiyoruz' (i-sapkasiz) derse bile SRT 'Çalışıyoruz' gosterir."""
    script_text = "Çalışıyoruz."
    whisper_broken = [{
        "id": 0,
        "start": 0.0,
        "end": 4.0,
        "text": "Calisiyoruz.",  # Turkce karakter bozuk
        "words": [
            {"word": "Calisiyoruz", "start": 0.0, "end": 4.0, "probability": 0.6},
        ],
    }]

    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, script_narration=script_text, with_audio=True)
        registry = _make_registry_with_whisper(whisper_broken)
        executor = SubtitleStepExecutor(registry=registry)

        result = await executor.execute(_make_job(tmpdir), MagicMock())

        srt_body = Path(result["artifact_path"]).read_text(encoding="utf-8")
        assert "Çalışıyoruz" in srt_body
        assert "Calisiyoruz" not in srt_body


# ---------------------------------------------------------------------------
# Artifact: subtitle_alignment_audit.json
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_subtitle_alignment_audit_json_uretilir_whisper_ile():
    """Whisper varken subtitle_alignment_audit.json uretilmeli."""
    script_text = "Merhaba dünya."
    whisper_segs = [{
        "id": 0,
        "start": 0.0,
        "end": 4.0,
        "text": "Merhaba dünya.",
        "words": [
            {"word": "Merhaba", "start": 0.0, "end": 1.0, "probability": 0.99},
            {"word": "dünya", "start": 1.0, "end": 4.0, "probability": 0.98},
        ],
    }]

    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, script_narration=script_text, with_audio=True)
        registry = _make_registry_with_whisper(whisper_segs)
        executor = SubtitleStepExecutor(registry=registry)

        result = await executor.execute(_make_job(tmpdir), MagicMock())

        audit_path = result.get("alignment_audit_path")
        assert audit_path is not None
        assert Path(audit_path).exists()

        audit = json.loads(Path(audit_path).read_text(encoding="utf-8"))
        assert audit["version"] == "1"
        assert audit["timing_mode"] == "script_canonical_whisper"
        assert audit["rule"] == "script_canonical_subtitle_text"
        assert len(audit["scenes"]) == 1

        scene_audit = audit["scenes"][0]
        assert scene_audit["whisper_invoked"] is True
        assert scene_audit["audio_found"] is True
        assert scene_audit["script_token_count"] > 0
        assert scene_audit["matched_by_whisper"] > 0
        assert scene_audit["whisper_error"] is None


@pytest.mark.asyncio
async def test_subtitle_alignment_audit_json_uretilir_whisper_yoksa():
    """Whisper yoksa da subtitle_alignment_audit.json uretilmeli (cursor fallback)."""
    script_text = "Whisper olmadan da metin canonical."

    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, script_narration=script_text, with_audio=False)
        registry = ProviderRegistry()  # Whisper yok
        executor = SubtitleStepExecutor(registry=registry)

        result = await executor.execute(_make_job(tmpdir), MagicMock())

        assert result["timing_mode"] == "cursor"
        assert result["text_source"] == "script_canonical"

        audit_path = result.get("alignment_audit_path")
        assert audit_path is not None
        audit = json.loads(Path(audit_path).read_text(encoding="utf-8"))
        assert audit["timing_mode"] == "cursor"
        assert len(audit["scenes"]) == 1
        assert audit["scenes"][0]["whisper_invoked"] is False

        srt_body = Path(result["artifact_path"]).read_text(encoding="utf-8")
        assert "Whisper" in srt_body
        assert "canonical" in srt_body


# ---------------------------------------------------------------------------
# Result dict alan beklentisi
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_executor_result_dict_faz3_alanlari():
    """Executor result dict Faz 3 text_source + alignment_audit_path icerir."""
    script_text = "Test."
    whisper_segs = [{
        "id": 0, "start": 0.0, "end": 4.0, "text": "Test.",
        "words": [{"word": "Test", "start": 0.0, "end": 4.0, "probability": 0.99}],
    }]

    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, script_narration=script_text, with_audio=True)
        registry = _make_registry_with_whisper(whisper_segs)
        executor = SubtitleStepExecutor(registry=registry)

        result = await executor.execute(_make_job(tmpdir), MagicMock())

        assert result["text_source"] == "script_canonical"
        assert result["timing_mode"] == "script_canonical_whisper"
        assert "alignment_audit_path" in result
        assert result["alignment_audit_path"] is not None
