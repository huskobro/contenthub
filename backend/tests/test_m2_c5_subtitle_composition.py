"""
M2-C5 Subtitle + Composition adımları testleri.

Test kapsamı:
  1.  SubtitleStepExecutor: SRT formatı doğru üretiliyor mu
  2.  SubtitleStepExecutor: Zamanlamalar kümülatif ve doğru mu
  3.  SubtitleStepExecutor: subtitle_metadata.json language field içeriyor mu
  4.  SubtitleStepExecutor: artifact_check — metadata varsa adımı atla
  5.  CompositionStepExecutor: composition_props.json üretiliyor mu
  6.  CompositionStepExecutor: composition_id doğru mapping'den geliyor mu
  7.  CompositionStepExecutor: render_status = "props_ready"
  8.  CompositionStepExecutor: language field props içinde var mı
  9.  CompositionStepExecutor: artifact_check — props varsa adımı atla
  10. get_composition_id: bilinmeyen module_id → ValueError
  11. SubtitleStepExecutor provider trace: language alanı mevcut mu
  12. CompositionStepExecutor provider trace: language alanı mevcut mu
  13. _build_srt: boş narration olan sahne dahil edilmemeli
  14. _seconds_to_srt_time: doğru format üretiyor mu
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Optional
from unittest.mock import MagicMock

import pytest

from app.modules.standard_video.executors.subtitle import (
    SubtitleStepExecutor,
    _build_srt,
    _seconds_to_srt_time,
)
from app.modules.standard_video.executors.composition import CompositionStepExecutor
from app.modules.standard_video.composition_map import get_composition_id, COMPOSITION_MAP


# ---------------------------------------------------------------------------
# Yardımcı sabitler ve fabrika fonksiyonları
# ---------------------------------------------------------------------------

SAMPLE_SCENES = [
    {
        "scene_number": 1,
        "narration": "İlk sahne anlatımı burada yer alır.",
        "duration_seconds": 8.0,
    },
    {
        "scene_number": 2,
        "narration": "İkinci sahnenin anlatımı.",
        "duration_seconds": 6.5,
    },
    {
        "scene_number": 3,
        "narration": "Üçüncü sahne.",
        "duration_seconds": 10.0,
    },
]

SAMPLE_SCRIPT_SCENES = [
    {
        "scene_number": 1,
        "narration": "İlk sahne anlatımı burada yer alır.",
        "visual_cue": "Açık mavi gökyüzü",
    },
    {
        "scene_number": 2,
        "narration": "İkinci sahnenin anlatımı.",
        "visual_cue": "Şehir manzarası",
    },
    {
        "scene_number": 3,
        "narration": "Üçüncü sahne.",
        "visual_cue": "Orman",
    },
]


def _make_job(tmpdir: str, language: str = "tr") -> MagicMock:
    """Test için sahte Job nesnesi oluşturur."""
    job = MagicMock()
    job.id = "test-job-m2c5"
    job.workspace_path = None
    job.input_data_json = json.dumps({
        "topic": "Test konusu",
        "language": language,
        "workspace_root": tmpdir,
    })
    return job


def _make_step() -> MagicMock:
    """Test için sahte JobStep nesnesi oluşturur."""
    step = MagicMock()
    step.id = "test-step-m2c5"
    return step


def _write_json(path: Path, data: dict) -> None:
    """Belirtilen path'e JSON yazar, dizini oluşturur."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_text(path: Path, content: str) -> None:
    """Belirtilen path'e metin yazar, dizini oluşturur."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# _seconds_to_srt_time testleri
# ---------------------------------------------------------------------------

def test_seconds_to_srt_time_sifir():
    """Sıfır saniye → 00:00:00,000 döndürmelidir."""
    assert _seconds_to_srt_time(0.0) == "00:00:00,000"


def test_seconds_to_srt_time_kesirsiz():
    """8 saniye → 00:00:08,000 döndürmelidir."""
    assert _seconds_to_srt_time(8.0) == "00:00:08,000"


def test_seconds_to_srt_time_kesirli():
    """8.5 saniye → 00:00:08,500 döndürmelidir."""
    assert _seconds_to_srt_time(8.5) == "00:00:08,500"


def test_seconds_to_srt_time_dakika():
    """75 saniye → 00:01:15,000 döndürmelidir."""
    assert _seconds_to_srt_time(75.0) == "00:01:15,000"


def test_seconds_to_srt_time_saat():
    """3661.1 saniye → 01:01:01,100 döndürmelidir."""
    assert _seconds_to_srt_time(3661.1) == "01:01:01,100"


# ---------------------------------------------------------------------------
# _build_srt testleri
# ---------------------------------------------------------------------------

def test_build_srt_format():
    """SRT formatı: index, zaman satırı, metin bloğu içermelidir (Test 1)."""
    srt = _build_srt(SAMPLE_SCENES)
    blocks = srt.strip().split("\n\n")
    assert len(blocks) == 3

    # İlk blok formatını doğrula
    lines = blocks[0].strip().split("\n")
    assert lines[0] == "1"
    assert "-->" in lines[1]
    assert lines[2] == "İlk sahne anlatımı burada yer alır."


def test_build_srt_kumulatif_zamanlama():
    """
    Zamanlamalar kümülatif olmalıdır (Test 2).
    Sahne 1: 0.000 → 8.000
    Sahne 2: 8.000 → 14.500
    Sahne 3: 14.500 → 24.500
    """
    srt = _build_srt(SAMPLE_SCENES)
    blocks = srt.strip().split("\n\n")

    # Sahne 1
    time_line_1 = blocks[0].strip().split("\n")[1]
    assert "00:00:00,000 --> 00:00:08,000" in time_line_1

    # Sahne 2
    time_line_2 = blocks[1].strip().split("\n")[1]
    assert "00:00:08,000 --> 00:00:14,500" in time_line_2

    # Sahne 3
    time_line_3 = blocks[2].strip().split("\n")[1]
    assert "00:00:14,500 --> 00:00:24,500" in time_line_3


def test_build_srt_bos_narration_dahil_edilmemeli():
    """
    Boş narration olan sahne SRT çıktısına dahil edilmemelidir (Test 13).
    """
    scenes_with_empty = [
        {"narration": "İlk sahne.", "duration_seconds": 5.0},
        {"narration": "", "duration_seconds": 3.0},  # boş narration
        {"narration": "Üçüncü sahne.", "duration_seconds": 4.0},
    ]
    srt = _build_srt(scenes_with_empty)
    blocks = [b for b in srt.strip().split("\n\n") if b.strip()]
    # Sadece 2 blok olmalı (boş narration atlanmalı)
    assert len(blocks) == 2
    # Üçüncü sahnenin zamanlaması: boş sahne (3s) atlanmış, ama kursor ilerlemeli
    # Sahne 1: 0 → 5, Sahne 3 (boşluk sonrası): 8 → 12
    time_line_2 = blocks[1].strip().split("\n")[1]
    assert "00:00:08,000 --> 00:00:12,000" in time_line_2


# ---------------------------------------------------------------------------
# SubtitleStepExecutor testleri
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subtitle_executor_srt_uretiliyor():
    """SubtitleStepExecutor SRT dosyasını üretmelidir (Test 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        # Gerekli artifact'ları hazırla
        audio_manifest = {
            "scenes": SAMPLE_SCENES,
            "total_duration_seconds": 24.5,
            "voice": "tr-TR-EmelNeural",
            "language": "tr",
        }
        script_data = {
            "scenes": SAMPLE_SCRIPT_SCENES,
            "language": "tr",
        }
        _write_json(artifacts_dir / "audio_manifest.json", audio_manifest)
        _write_json(artifacts_dir / "script.json", script_data)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor()

        result = await executor.execute(job, step)

        # SRT dosyası üretilmiş olmalı
        srt_path = Path(result["artifact_path"])
        assert srt_path.exists()
        srt_content = srt_path.read_text(encoding="utf-8")
        assert "-->" in srt_content
        assert "1\n" in srt_content


@pytest.mark.asyncio
async def test_subtitle_executor_zamanlamalar_kumulatif():
    """Zamanlamalar kümülatif ve doğru hesaplanmalıdır (Test 2)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        audio_manifest = {
            "scenes": SAMPLE_SCENES,
            "total_duration_seconds": 24.5,
            "voice": "tr-TR-EmelNeural",
            "language": "tr",
        }
        _write_json(artifacts_dir / "audio_manifest.json", audio_manifest)
        _write_json(artifacts_dir / "script.json", {"scenes": SAMPLE_SCRIPT_SCENES})

        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor()
        result = await executor.execute(job, step)

        srt_content = Path(result["artifact_path"]).read_text(encoding="utf-8")
        # İlk sahne 0.000 → 8.000
        assert "00:00:00,000 --> 00:00:08,000" in srt_content
        # İkinci sahne 8.000 → 14.500
        assert "00:00:08,000 --> 00:00:14,500" in srt_content


@pytest.mark.asyncio
async def test_subtitle_executor_metadata_language_field():
    """subtitle_metadata.json language alanını içermelidir (Test 3)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        _write_json(artifacts_dir / "audio_manifest.json", {
            "scenes": SAMPLE_SCENES[:1],
            "total_duration_seconds": 8.0,
            "voice": "tr-TR-EmelNeural",
            "language": "tr",
        })
        _write_json(artifacts_dir / "script.json", {
            "scenes": SAMPLE_SCRIPT_SCENES[:1],
        })

        job = _make_job(tmpdir, language="tr")
        step = _make_step()
        executor = SubtitleStepExecutor()
        await executor.execute(job, step)

        metadata_path = artifacts_dir / "subtitle_metadata.json"
        assert metadata_path.exists()
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        assert "language" in metadata
        assert metadata["language"] == "tr"


@pytest.mark.asyncio
async def test_subtitle_executor_artifact_check_atla():
    """subtitle_metadata.json zaten varsa adım atlanmalıdır (Test 4)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        # Önceden mevcut metadata
        existing_metadata = {
            "srt_path": str(artifacts_dir / "subtitles.srt"),
            "segment_count": 3,
            "total_duration_seconds": 24.5,
            "language": "tr",
        }
        _write_json(artifacts_dir / "subtitle_metadata.json", existing_metadata)
        _write_text(artifacts_dir / "subtitles.srt", "1\n00:00:00,000 --> 00:00:08,000\nMevcut.")

        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor()
        result = await executor.execute(job, step)

        assert result.get("skipped") is True
        assert result["language"] == "tr"


@pytest.mark.asyncio
async def test_subtitle_executor_provider_trace_language():
    """SubtitleStepExecutor provider trace'de language alanı bulunmalıdır (Test 11)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        _write_json(artifacts_dir / "audio_manifest.json", {
            "scenes": SAMPLE_SCENES[:2],
            "total_duration_seconds": 14.5,
            "voice": "tr-TR-EmelNeural",
            "language": "tr",
        })
        _write_json(artifacts_dir / "script.json", {
            "scenes": SAMPLE_SCRIPT_SCENES[:2],
        })

        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor()
        result = await executor.execute(job, step)

        trace = result.get("provider", {})
        assert "language" in trace
        assert trace["language"] == "tr"
        assert trace["provider_id"] == "builtin_srt_generator"


# ---------------------------------------------------------------------------
# CompositionStepExecutor testleri
# ---------------------------------------------------------------------------

def _setup_composition_artifacts(tmpdir: str) -> Path:
    """Composition testleri için gerekli artifact'ları hazırlar."""
    artifacts_dir = Path(tmpdir) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    _write_json(artifacts_dir / "script.json", {
        "scenes": SAMPLE_SCRIPT_SCENES,
        "language": "tr",
    })
    _write_json(artifacts_dir / "audio_manifest.json", {
        "scenes": SAMPLE_SCENES,
        "total_duration_seconds": 24.5,
        "voice": "tr-TR-EmelNeural",
        "language": "tr",
    })
    _write_json(artifacts_dir / "visuals_manifest.json", {
        "scenes": [
            {"scene_number": 1, "image_path": "artifacts/visuals/scene_1.jpg", "source": "pexels"},
            {"scene_number": 2, "image_path": "artifacts/visuals/scene_2.jpg", "source": "pexels"},
            {"scene_number": 3, "image_path": "artifacts/visuals/scene_3.jpg", "source": "pixabay"},
        ],
        "language": "tr",
    })
    _write_json(artifacts_dir / "subtitle_metadata.json", {
        "srt_path": "artifacts/subtitles.srt",
        "segment_count": 3,
        "total_duration_seconds": 24.5,
        "language": "tr",
    })
    _write_json(artifacts_dir / "metadata.json", {
        "title": "Test Video Başlığı",
        "description": "Test video açıklaması.",
        "tags": ["test", "video"],
        "hashtags": ["#test"],
        "language": "tr",
    })
    return artifacts_dir


@pytest.mark.asyncio
async def test_composition_executor_props_uretiliyor():
    """CompositionStepExecutor composition_props.json üretmelidir (Test 5)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        props_path = Path(result["artifact_path"])
        assert props_path.exists()

        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert "props" in props
        assert "scenes" in props["props"]
        assert len(props["props"]["scenes"]) == 3


@pytest.mark.asyncio
async def test_composition_executor_composition_id_mapping():
    """CompositionStepExecutor composition_id doğru mapping'den gelmelidir (Test 6)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        assert result["composition_id"] == "StandardVideo"

        props_path = Path(result["artifact_path"])
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert props["composition_id"] == "StandardVideo"


@pytest.mark.asyncio
async def test_composition_executor_render_status():
    """CompositionStepExecutor render_status = 'props_ready' olmalıdır (Test 7)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        assert result["render_status"] == "props_ready"

        props_path = Path(result["artifact_path"])
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert props["render_status"] == "props_ready"


@pytest.mark.asyncio
async def test_composition_executor_language_props_icinde():
    """CompositionStepExecutor props içinde language alanı bulunmalıdır (Test 8)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        props_path = Path(result["artifact_path"])
        props = json.loads(props_path.read_text(encoding="utf-8"))
        assert "language" in props["props"]
        assert props["props"]["language"] == "tr"


@pytest.mark.asyncio
async def test_composition_executor_artifact_check_atla():
    """composition_props.json zaten varsa adım atlanmalıdır (Test 9)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir(parents=True, exist_ok=True)

        existing_props = {
            "job_id": "test-job-m2c5",
            "module_id": "standard_video",
            "language": "tr",
            "composition_id": "StandardVideo",
            "props": {
                "language": "tr",
                "scenes": [],
            },
            "render_status": "props_ready",
            "created_at": "2026-04-04T00:00:00+00:00",
        }
        _write_json(artifacts_dir / "composition_props.json", existing_props)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        assert result.get("skipped") is True
        assert result["render_status"] == "props_ready"


@pytest.mark.asyncio
async def test_composition_executor_provider_trace_language():
    """CompositionStepExecutor provider trace'de language alanı bulunmalıdır (Test 12)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_composition_artifacts(tmpdir)

        job = _make_job(tmpdir)
        step = _make_step()
        executor = CompositionStepExecutor()
        result = await executor.execute(job, step)

        trace = result.get("provider", {})
        assert "language" in trace
        assert trace["language"] == "tr"
        assert trace["provider_id"] == "composition_props_builder"


# ---------------------------------------------------------------------------
# composition_map testleri
# ---------------------------------------------------------------------------

def test_get_composition_id_gecerli_modul():
    """standard_video modülü için 'StandardVideo' döndürmelidir (Test 6 desteği)."""
    assert get_composition_id("standard_video") == "StandardVideo"


def test_get_composition_id_bilinmeyen_modul_value_error():
    """Bilinmeyen module_id için ValueError fırlatılmalıdır (Test 10)."""
    with pytest.raises(ValueError) as exc_info:
        get_composition_id("bilinmeyen_modul_xyz")
    assert "bilinmeyen_modul_xyz" in str(exc_info.value)


def test_composition_map_icerigi():
    """COMPOSITION_MAP en az 'standard_video' girişini içermelidir."""
    assert "standard_video" in COMPOSITION_MAP
    assert COMPOSITION_MAP["standard_video"] == "StandardVideo"
