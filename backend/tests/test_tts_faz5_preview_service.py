"""
Faz 5 — Preview-first TTS (voice sample / scene / draft script) testleri.

Kapsam:
  - L1 voice sample: uretilen kisa mp3, manifest dosyasi, is_preview=True.
  - L2 scene preview: verilen narration seslendirilir, manifest'te scene
    sayisi 1.
  - L3 draft script: max_characters_draft sinirina uyulur, asilirsa
    truncated=True + notes dolu.
  - SABIT: manifest "is_preview": True, preview klasoru _tts_previews/.
  - Faz 4 entegrasyonu: glossary TTS metnine uygulanmasina ragmen manifest
    scene narration bilgisi script_char_count formatinda sadece sayidir
    (metnin orijinal cagri argumani degismez).
  - Faz 2 entegrasyonu: resolve_tts_strict kullanilir, auto-fallback yok.
  - Settings mock ile calisir; DB bagimli degil.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.providers.base import ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.registry import ProviderRegistry
from app.tts.preview_service import (
    _truncate_script_to_limit,
    generate_draft_script_preview,
    generate_scene_preview,
    generate_voice_sample,
    load_preview_manifest,
    resolve_preview_root,
)


# ---------------------------------------------------------------------------
# Settings mock + registry helpers
# ---------------------------------------------------------------------------


async def _patched_resolve_setting(key: str, session, user_id=None):
    table = {
        "tts.voice_settings.stability": 0.5,
        "tts.voice_settings.similarity_boost": 0.75,
        "tts.voice_settings.speed": 1.0,
        "tts.voice_settings.pitch": 0.0,
        "tts.voice_settings.emphasis": 0.5,
        "tts.voice_settings.use_speaker_boost": True,
        "tts.pauses.sentence_break_ms": 0,
        "tts.pauses.paragraph_break_ms": 0,
        "tts.pauses.scene_break_ms": 0,
        "tts.glossary.brand": {"ContentHub": "kontent hab"},
        "tts.glossary.product": {},
        "tts.pronunciation.overrides": {},
        "tts.controls.default_scene_energy": "neutral",
        "tts.controls.ssml_pauses_enabled": False,
        "tts.preview.voice_sample_text": "Merhaba, bu ses ornegidir.",
        "tts.preview.max_characters_draft": 120,  # tests icin kucuk
        "tts.preview.workspace_dir": "_tts_previews",
    }
    return table.get(key)


def _make_registry(captured_inputs: list) -> ProviderRegistry:
    """captured_inputs listesine her invoke cagrisinda input_data eklenir."""
    reg = ProviderRegistry()

    provider = MagicMock()
    provider.provider_id = MagicMock(return_value="dubvoice")
    provider.capability = MagicMock(return_value=ProviderCapability.TTS)

    async def _invoke(input_data: dict) -> ProviderOutput:
        captured_inputs.append(dict(input_data))
        out_path = input_data.get("output_path")
        if out_path:
            Path(out_path).parent.mkdir(parents=True, exist_ok=True)
            Path(out_path).write_bytes(b"ID3\x03\x00\x00\x00")
        return ProviderOutput(
            result={"duration_seconds": 2.5, "provider_text": input_data.get("text")},
            trace={"provider_id": "dubvoice", "latency_ms": 40},
            provider_id="dubvoice",
        )

    provider.invoke = _invoke
    reg.register(provider, ProviderCapability.TTS, is_primary=True)
    return reg


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def test_truncate_script_sinir_altinda_tum_sahneler_kalir():
    scenes = [
        {"scene_number": 1, "narration": "Kisa 1."},
        {"scene_number": 2, "narration": "Kisa 2."},
    ]
    kept, trunc = _truncate_script_to_limit(scenes, max_total_chars=1000)
    assert kept == scenes
    assert trunc is False


def test_truncate_script_sinir_asilir_son_sahne_kirpilir():
    scenes = [
        {"scene_number": 1, "narration": "A" * 80},
        {"scene_number": 2, "narration": "B" * 80},
    ]
    kept, trunc = _truncate_script_to_limit(scenes, max_total_chars=100)
    assert trunc is True
    # Ilk sahne tamamen alinmis
    assert kept[0]["narration"] == "A" * 80
    # Ikinci sahne kirpilmis + ... son eki
    assert kept[1]["narration"].endswith("…")
    assert len(kept[1]["narration"]) <= 21  # 20 char + …


def test_truncate_script_max_zero_no_op():
    scenes = [{"scene_number": 1, "narration": "X" * 500}]
    kept, trunc = _truncate_script_to_limit(scenes, max_total_chars=0)
    assert kept == scenes
    assert trunc is False


def test_resolve_preview_root_sonuc_doğru():
    base = Path("/tmp/workspace")
    root = resolve_preview_root(base, "_tts_previews")
    assert root == base.resolve() / "_tts_previews"


# ---------------------------------------------------------------------------
# L1 voice sample
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_voice_sample_manifest_ve_audio_uretilir():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_voice_sample(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                voice_id="voice_abc",
                language="tr",
            )

        assert manifest.level == "voice_sample"
        assert manifest.is_preview is True
        assert manifest.voice_id == "voice_abc"
        assert len(manifest.scenes) == 1
        audio_path = Path(manifest.scenes[0].output_path)
        assert audio_path.exists()
        assert audio_path.name == "voice_sample.mp3"
        # Preview klasoru altindayiz
        assert "_tts_previews" in str(audio_path)
        # Manifest dosyasi yazilmis
        manifest_path = audio_path.parent / "preview_manifest.json"
        assert manifest_path.exists()
        loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert loaded["is_preview"] is True
        assert loaded["level"] == "voice_sample"


@pytest.mark.asyncio
async def test_voice_sample_custom_text_override_edilir():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            await generate_voice_sample(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                custom_text="Ozel sample metni.",
                language="tr",
            )

        assert captured, "provider invoke edilmedi"
        assert captured[0]["text"] == "Ozel sample metni."


@pytest.mark.asyncio
async def test_voice_sample_glossary_tts_metnine_uygulanir():
    """SABIT: glossary sadece TTS metnini etkiler."""
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_voice_sample(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                custom_text="ContentHub ornegi.",
                language="tr",
            )

        # TTS metni glossary uygulanmis
        assert "kontent hab" in captured[0]["text"]
        assert "ContentHub" not in captured[0]["text"]
        # Manifest scenes[0] tts_text_char_count var ama orijinal metin DEGIL
        assert manifest.scenes[0].tts_text_char_count == len(captured[0]["text"])
        # Replacement count == 1
        assert manifest.scenes[0].replacements_count == 1


# ---------------------------------------------------------------------------
# L2 scene preview
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_scene_preview_manifest_tek_sahne():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_scene_preview(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                narration="Bu tek bir sahne narration'idir.",
                scene_number=3,
                voice_id="voice_xyz",
                language="tr",
            )

        assert manifest.level == "scene"
        assert len(manifest.scenes) == 1
        assert manifest.scenes[0].scene_number == 3
        audio_path = Path(manifest.scenes[0].output_path)
        assert audio_path.exists()
        assert audio_path.name == "scene_003.mp3"


@pytest.mark.asyncio
async def test_scene_preview_bos_narration_hatasi():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            with pytest.raises(ValueError):
                await generate_scene_preview(
                    registry=registry,
                    workspace_root=Path(tmpdir),
                    db=db,
                    narration="   ",
                )


@pytest.mark.asyncio
async def test_scene_preview_scene_energy_override():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_scene_preview(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                narration="Enerjik test.",
                scene_energy="energetic",
            )

        assert manifest.scenes[0].scene_energy == "energetic"


# ---------------------------------------------------------------------------
# L3 draft script preview
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_draft_script_sinir_altinda_tum_sahneler():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        scenes = [
            {"scene_number": 1, "narration": "Sahne 1 kisa."},
            {"scene_number": 2, "narration": "Sahne 2 kisa."},
        ]
        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_draft_script_preview(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                scenes=scenes,
                voice_id="voice_multi",
            )

        assert manifest.level == "draft_script"
        assert len(manifest.scenes) == 2
        assert manifest.controls_snapshot["truncated"] is False
        assert manifest.notes is None


@pytest.mark.asyncio
async def test_draft_script_sinir_asilir_truncated_flag():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        # mock max=120; iki sahne toplamda >> 120
        scenes = [
            {"scene_number": 1, "narration": "A" * 100},
            {"scene_number": 2, "narration": "B" * 100},
            {"scene_number": 3, "narration": "C" * 100},
        ]
        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_draft_script_preview(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
                scenes=scenes,
            )

        assert manifest.controls_snapshot["truncated"] is True
        assert manifest.notes is not None
        # scene_3 uretilmemis — truncated oldu
        scene_numbers = [s.scene_number for s in manifest.scenes]
        assert 3 not in scene_numbers


@pytest.mark.asyncio
async def test_draft_script_bos_liste_hatasi():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            with pytest.raises(ValueError):
                await generate_draft_script_preview(
                    registry=registry,
                    workspace_root=Path(tmpdir),
                    db=db,
                    scenes=[],
                )


# ---------------------------------------------------------------------------
# Manifest loader
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_load_preview_manifest_sonuc_donerl():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_voice_sample(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
            )
            loaded = await load_preview_manifest(
                workspace_root=Path(tmpdir),
                preview_id=manifest.preview_id,
                db=db,
            )

        assert loaded is not None
        assert loaded["preview_id"] == manifest.preview_id
        assert loaded["level"] == "voice_sample"


@pytest.mark.asyncio
async def test_load_preview_manifest_yok_ise_none():
    with tempfile.TemporaryDirectory() as tmpdir:
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            loaded = await load_preview_manifest(
                workspace_root=Path(tmpdir),
                preview_id="prev_does_not_exist",
                db=db,
            )
        assert loaded is None


# ---------------------------------------------------------------------------
# SABIT — preview final uretime karismayacak klasor ayrimi
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_klasoru_final_workspace_ile_karismaz():
    with tempfile.TemporaryDirectory() as tmpdir:
        captured: list[dict] = []
        registry = _make_registry(captured)
        db = MagicMock()

        with patch(
            "app.tts.preview_service.resolve_setting",
            new=_patched_resolve_setting,
        ):
            manifest = await generate_voice_sample(
                registry=registry,
                workspace_root=Path(tmpdir),
                db=db,
            )

        audio_path = Path(manifest.scenes[0].output_path)
        # _tts_previews altindan artifact'lar final job'u etkilemez
        assert audio_path.parent.parent.name == "_tts_previews"
        # Final workspace tree'si (workspace/<job>/artifacts) olusmamali
        final_artifacts = Path(tmpdir) / "artifacts"
        assert not final_artifacts.exists()
