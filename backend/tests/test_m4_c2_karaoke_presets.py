"""
M4-C2 Testleri — Karaoke Rendering + Subtitle Style Presets

Test kapsamı:
  1.  SUBTITLE_PRESETS tüm beklenen preset ID'lerini içeriyor.
  2.  get_preset() bilinen preset_id için doğru SubtitlePreset döner.
  3.  get_preset() bilinmeyen preset_id → ValueError.
  4.  DEFAULT_PRESET_ID SUBTITLE_PRESETS içinde mevcut.
  5.  get_preset_for_composition() None → varsayılan preset kullanılır.
  6.  get_preset_for_composition() geçersiz → varsayılan preset kullanılır.
  7.  get_preset_for_composition() geçerli preset_id → doğru preset alanları döner.
  8.  Her preset active_color ≠ text_color (highlight görünür olmalı).
  9.  Her preset font_size > 0.
  10. Her preset outline_width ≥ 0.
  11. CompositionStepExecutor: subtitle_style composition_props.json içinde yer alıyor.
  12. CompositionStepExecutor: timing_mode composition_props.json içinde yer alıyor.
  13. CompositionStepExecutor: word_timing_path composition_props.json içinde yer alıyor.
  14. CompositionStepExecutor: subtitle_style_preset varsayılan preset kullanılıyor.
  15. CompositionStepExecutor: subtitle_style_preset job input'tan alınıyor.
  16. CompositionStepExecutor: subtitle_style_preset geçersiz → varsayılan preset kullanılıyor.
  17. CompositionStepExecutor: return değerinde subtitle_style_preset ve timing_mode alanları var.
  18. CompositionStepExecutor: provider trace'de subtitle_style_preset ve timing_mode alanları var.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.modules.standard_video.subtitle_presets import (
    SUBTITLE_PRESETS,
    VALID_PRESET_IDS,
    DEFAULT_PRESET_ID,
    SubtitlePreset,
    get_preset,
    get_preset_for_composition,
)
from app.modules.standard_video.executors.composition import CompositionStepExecutor


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

def _make_job(tmpdir: str, language: str = "tr", extra_input: dict | None = None) -> MagicMock:
    """Test için sahte Job nesnesi oluşturur."""
    job = MagicMock()
    job.id = "test-job-m4c2"
    job.workspace_path = None
    input_data = {
        "topic": "Test konusu",
        "language": language,
        "workspace_root": tmpdir,
    }
    if extra_input:
        input_data.update(extra_input)
    job.input_data_json = json.dumps(input_data)
    return job


def _make_step() -> MagicMock:
    """Test için sahte JobStep nesnesi oluşturur."""
    step = MagicMock()
    step.id = "test-step-m4c2"
    return step


def _write_json(path: Path, data: dict) -> None:
    """Belirtilen path'e JSON yazar, dizini oluşturur."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _setup_composition_artifacts(
    tmpdir: str,
    timing_mode: str = "whisper_word",
    word_timing_path: str | None = None,
) -> None:
    """Composition adımı için gerekli artifact'ları hazırlar."""
    artifacts_dir = Path(tmpdir) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    _write_json(artifacts_dir / "script.json", {
        "scenes": [
            {"scene_number": 1, "narration": "Test anlatımı.", "visual_cue": "Test görseli"},
        ],
        "language": "tr",
    })
    _write_json(artifacts_dir / "audio_manifest.json", {
        "scenes": [
            {
                "scene_number": 1,
                "narration": "Test anlatımı.",
                "duration_seconds": 5.0,
                "audio_path": "artifacts/audio/scene_1.mp3",
            },
        ],
        "total_duration_seconds": 5.0,
        "voice": "tr-TR-EmelNeural",
        "language": "tr",
    })
    _write_json(artifacts_dir / "subtitle_metadata.json", {
        "srt_path": str(artifacts_dir / "subtitles.srt"),
        "word_timing_path": word_timing_path,
        "segment_count": 1,
        "total_duration_seconds": 5.0,
        "language": "tr",
        "timing_mode": timing_mode,
    })
    _write_json(artifacts_dir / "metadata.json", {
        "title": "Test Başlığı",
        "description": "Test açıklaması.",
        "tags": ["test"],
        "hashtags": ["#test"],
    })


# ---------------------------------------------------------------------------
# Test 1-10: SubtitlePreset veri modeli
# ---------------------------------------------------------------------------

def test_preset_katalogu_tum_idleri_icerir():
    """Test 1: SUBTITLE_PRESETS tüm beklenen preset ID'lerini içeriyor."""
    for preset_id in VALID_PRESET_IDS:
        assert preset_id in SUBTITLE_PRESETS, f"Eksik preset: {preset_id}"


def test_get_preset_bilinen_id():
    """Test 2: get_preset() bilinen preset_id için SubtitlePreset döner."""
    preset = get_preset("clean_white")
    assert isinstance(preset, SubtitlePreset)
    assert preset.preset_id == "clean_white"


def test_get_preset_bilinmeyen_id_valueerror():
    """Test 3: get_preset() bilinmeyen preset_id → ValueError."""
    with pytest.raises(ValueError, match="Bilinmeyen altyazı stili"):
        get_preset("olmayan_preset")


def test_default_preset_mevcut():
    """Test 4: DEFAULT_PRESET_ID SUBTITLE_PRESETS içinde mevcut."""
    assert DEFAULT_PRESET_ID in SUBTITLE_PRESETS


def test_get_preset_for_composition_none():
    """Test 5: get_preset_for_composition(None) → varsayılan preset kullanılır."""
    result = get_preset_for_composition(None)
    assert result["preset_id"] == DEFAULT_PRESET_ID


def test_get_preset_for_composition_gecersiz():
    """Test 6: get_preset_for_composition() geçersiz ID → varsayılan preset kullanılır."""
    result = get_preset_for_composition("kesinlikle_olmayan_preset")
    assert result["preset_id"] == DEFAULT_PRESET_ID


def test_get_preset_for_composition_gecerli():
    """Test 7: get_preset_for_composition() geçerli preset_id → doğru preset alanları döner."""
    result = get_preset_for_composition("bold_yellow")
    assert result["preset_id"] == "bold_yellow"
    assert "font_size" in result
    assert "text_color" in result
    assert "active_color" in result
    assert "background" in result
    assert "outline_width" in result
    assert "line_height" in result


def test_her_preset_active_color_farkli():
    """Test 8: Her preset active_color ≠ text_color (karaoke highlight görünür olmalı)."""
    for pid, preset in SUBTITLE_PRESETS.items():
        assert preset.active_color != preset.text_color, (
            f"Preset '{pid}': active_color == text_color, highlight görünmez olur."
        )


def test_her_preset_font_size_pozitif():
    """Test 9: Her preset font_size > 0."""
    for pid, preset in SUBTITLE_PRESETS.items():
        assert preset.font_size > 0, f"Preset '{pid}': font_size ≤ 0"


def test_her_preset_outline_width_negatif_degil():
    """Test 10: Her preset outline_width ≥ 0."""
    for pid, preset in SUBTITLE_PRESETS.items():
        assert preset.outline_width >= 0, f"Preset '{pid}': outline_width negatif"


# ---------------------------------------------------------------------------
# Test 11-18: CompositionStepExecutor subtitle_style entegrasyonu
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_composition_subtitle_style_alanı_var():
    """Test 11: composition_props.json props içinde subtitle_style alanı var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir, timing_mode="whisper_word")
        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert "subtitle_style" in props["props"]
        assert "preset_id" in props["props"]["subtitle_style"]


@pytest.mark.asyncio
async def test_composition_timing_mode_alani_var():
    """Test 12: composition_props.json props içinde timing_mode alanı var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir, timing_mode="whisper_word")
        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert "timing_mode" in props["props"]
        assert props["props"]["timing_mode"] == "whisper_word"


@pytest.mark.asyncio
async def test_composition_word_timing_path_alani_var():
    """Test 13: composition_props.json props içinde word_timing_path alanı var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        wt_path = str(Path(tmpdir) / "artifacts" / "word_timing.json")
        _setup_composition_artifacts(tmpdir, timing_mode="whisper_word", word_timing_path=wt_path)
        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert "word_timing_path" in props["props"]
        assert props["props"]["word_timing_path"] == wt_path


@pytest.mark.asyncio
async def test_composition_default_preset_kullanilir():
    """Test 14: subtitle_style_preset belirtilmeden varsayılan preset kullanılır."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)
        job = _make_job(tmpdir)  # subtitle_style_preset yok
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert props["props"]["subtitle_style"]["preset_id"] == DEFAULT_PRESET_ID


@pytest.mark.asyncio
async def test_composition_preset_job_inputtan_alinir():
    """Test 15: subtitle_style_preset job input'tan alınır ve doğru preset uygulanır."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)
        job = _make_job(tmpdir, extra_input={"subtitle_style_preset": "bold_yellow"})
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert props["props"]["subtitle_style"]["preset_id"] == "bold_yellow"


@pytest.mark.asyncio
async def test_composition_gecersiz_preset_varsayilan_kullanilir():
    """Test 16: Geçersiz subtitle_style_preset → varsayılan preset kullanılır."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)
        job = _make_job(tmpdir, extra_input={"subtitle_style_preset": "olmayan_preset"})
        step = _make_step()
        executor = CompositionStepExecutor()
        await executor.execute(job, step)

        props_path = Path(tmpdir) / "artifacts" / "composition_props.json"
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert props["props"]["subtitle_style"]["preset_id"] == DEFAULT_PRESET_ID


@pytest.mark.asyncio
async def test_composition_donus_degeri_subtitle_alanlari():
    """Test 17: execute() dönüş değerinde subtitle_style_preset ve timing_mode alanları var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir, timing_mode="cursor")
        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        assert "subtitle_style_preset" in result
        assert "timing_mode" in result
        assert result["timing_mode"] == "cursor"


@pytest.mark.asyncio
async def test_composition_provider_trace_subtitle_alanlari():
    """Test 18: provider trace'de subtitle_style_preset ve timing_mode alanları var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir, timing_mode="whisper_segment")
        job = _make_job(tmpdir, extra_input={"subtitle_style_preset": "gradient_glow"})
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        trace = result.get("provider", {})
        assert "subtitle_style_preset" in trace
        assert "timing_mode" in trace
        assert trace["subtitle_style_preset"] == "gradient_glow"
        assert trace["timing_mode"] == "whisper_segment"
