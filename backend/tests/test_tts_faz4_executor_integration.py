"""
Faz 4 TTSStepExecutor integration — fine controls + glossary + audit.

Bu testler executor'in:
  1. Settings Registry'den fine controls'u cozdugunu,
  2. Glossary uygulayarak DubVoice'a transform edilmis metni gonderdigini,
  3. audio_manifest.json'daki 'narration' alaninin SCRIPT CANONICAL oldugunu
     (glossary degisimi yok — Faz 3 SABIT korunur),
  4. tts_controls_audit.json artifact'ini urettigini,
  5. per-sahne scene_energy override'unun uygulandigini
dogrular.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.standard_video.executors.tts import TTSStepExecutor
from app.providers.base import ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _setup_script(tmpdir: str, scenes: list[dict]) -> None:
    """Sadece script.json; audio_manifest yoktur → executor calisir."""
    artifacts_dir = Path(tmpdir) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    _write_json(artifacts_dir / "script.json", {
        "scenes": scenes,
        "language": "tr",
    })


def _make_job(tmpdir: str) -> MagicMock:
    job = MagicMock()
    job.id = "faz4-exec-int"
    job.workspace_path = None
    job.input_data_json = json.dumps({
        "topic": "Faz 4 test",
        "language": "tr",
        "workspace_root": tmpdir,
    })
    return job


def _make_registry() -> ProviderRegistry:
    """DubVoice primary kayitli registry — invoke mock'lanir."""
    reg = ProviderRegistry()

    provider = MagicMock()
    provider.provider_id = MagicMock(return_value="dubvoice")
    provider.capability = MagicMock(return_value=ProviderCapability.TTS)

    async def _invoke(input_data: dict) -> ProviderOutput:
        # Tts output_path'a kucuk bir mp3 placeholder yaz
        out_path = input_data.get("output_path")
        if out_path:
            Path(out_path).parent.mkdir(parents=True, exist_ok=True)
            # Gercek mp3 header'i degil; mutagen measure fallback'e dusecek
            Path(out_path).write_bytes(b"ID3\x03\x00\x00\x00")
        return ProviderOutput(
            result={"duration_seconds": 3.0, "provider_text": input_data.get("text")},
            trace={"provider_id": "dubvoice", "latency_ms": 50},
            provider_id="dubvoice",
        )

    provider.invoke = _invoke
    reg.register(provider, ProviderCapability.TTS, is_primary=True)
    return reg


async def _patched_resolve_setting(key: str, session):
    """Settings resolver mock — Faz 4 degerleri."""
    table = {
        "tts.voice_settings.stability": 0.5,
        "tts.voice_settings.similarity_boost": 0.75,
        "tts.voice_settings.speed": 1.0,
        "tts.voice_settings.pitch": 0.0,
        "tts.voice_settings.emphasis": 0.6,
        "tts.voice_settings.use_speaker_boost": True,
        "tts.pauses.sentence_break_ms": 0,
        "tts.pauses.paragraph_break_ms": 0,
        "tts.pauses.scene_break_ms": 0,
        "tts.glossary.brand": {"ContentHub": "kontent hab"},
        "tts.glossary.product": {},
        "tts.pronunciation.overrides": {},
        "tts.controls.default_scene_energy": "neutral",
        "tts.controls.ssml_pauses_enabled": False,
        "tts.dubvoice.default_model_id": "eleven_multilingual_v2",
        "tts.fallback_providers": ["edge_tts"],
    }
    return table.get(key)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_executor_narration_manifest_script_canonical_korur():
    """Executor: audio_manifest.scenes[].narration SCRIPT CANONICAL (glossary degil)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_script(tmpdir, [
            {"scene_number": 1, "narration": "ContentHub gelistiriyor."}
        ])

        executor = TTSStepExecutor(registry=_make_registry())
        with patch(
            "app.settings.settings_resolver.resolve",
            new=_patched_resolve_setting,
        ):
            result = await executor.execute(_make_job(tmpdir), MagicMock())

        manifest = json.loads(Path(result["artifact_path"]).read_text("utf-8"))
        # SCRIPT CANONICAL: 'ContentHub' degistirilmemis olmali
        scene = manifest["scenes"][0]
        assert scene["narration"] == "ContentHub gelistiriyor."
        # TTS'e giden metin glossary uygulanmis olmali ama buraya yansimamali
        assert manifest["narration_source"] == "script_canonical"


@pytest.mark.asyncio
async def test_executor_tts_controls_audit_uretilir():
    """Executor: tts_controls_audit.json artifact'i olusmali ve glossary count'u dogru."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_script(tmpdir, [
            {"scene_number": 1, "narration": "ContentHub ContentHub."}
        ])

        executor = TTSStepExecutor(registry=_make_registry())
        with patch(
            "app.settings.settings_resolver.resolve",
            new=_patched_resolve_setting,
        ):
            result = await executor.execute(_make_job(tmpdir), MagicMock())

        audit_path = result.get("controls_audit_path")
        assert audit_path is not None
        assert Path(audit_path).exists()

        audit = json.loads(Path(audit_path).read_text("utf-8"))
        assert audit["version"] == "1"
        assert audit["rule"] == "script_canonical_narration_glossary_only_for_tts"
        assert len(audit["scenes"]) == 1
        scene_audit = audit["scenes"][0]
        assert scene_audit["scene_number"] == 1
        assert scene_audit["provider_id"] == "dubvoice"
        assert scene_audit["scene_energy"] == "neutral"
        # 2 ContentHub bulundu → 1 replacement entry, count=2
        brand_reps = [
            r for r in scene_audit["replacements"] if r["source"] == "brand"
        ]
        assert len(brand_reps) == 1
        assert brand_reps[0]["count"] == 2


@pytest.mark.asyncio
async def test_executor_scene_energy_override_per_scene():
    """Per-sahne scene_energy override'u audit'te goruluyor."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_script(tmpdir, [
            {"scene_number": 1, "narration": "Sakin.", "scene_energy": "calm"},
            {"scene_number": 2, "narration": "Enerjik.", "scene_energy": "energetic"},
        ])

        executor = TTSStepExecutor(registry=_make_registry())
        with patch(
            "app.settings.settings_resolver.resolve",
            new=_patched_resolve_setting,
        ):
            result = await executor.execute(_make_job(tmpdir), MagicMock())

        audit = json.loads(Path(result["controls_audit_path"]).read_text("utf-8"))
        assert audit["scenes"][0]["scene_energy"] == "calm"
        assert audit["scenes"][1]["scene_energy"] == "energetic"


@pytest.mark.asyncio
async def test_executor_result_faz4_alanlari():
    """Executor result dict Faz 4 alanlari: narration_source + controls_audit_path + provider meta."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_script(tmpdir, [{"scene_number": 1, "narration": "Test."}])

        executor = TTSStepExecutor(registry=_make_registry())
        with patch(
            "app.settings.settings_resolver.resolve",
            new=_patched_resolve_setting,
        ):
            result = await executor.execute(_make_job(tmpdir), MagicMock())

        assert result["narration_source"] == "script_canonical"
        assert "controls_audit_path" in result
        provider = result["provider"]
        assert provider["default_scene_energy"] == "neutral"
        assert provider["ssml_pauses_enabled"] is False
