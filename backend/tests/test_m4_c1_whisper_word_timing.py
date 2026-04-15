"""
M4-C1 Testleri — Whisper Entegrasyonu + Kelime-Düzeyi Zamanlama

Test kapsamı:
  1.  ProviderCapability.WHISPER enum değeri mevcut.
  2.  LocalWhisperProvider provider_id() doğru.
  3.  LocalWhisperProvider capability() == WHISPER.
  4.  LocalWhisperProvider: faster-whisper yoksa ConfigurationError fırlatılır.
  5.  LocalWhisperProvider: ses dosyası bulunamazsa ProviderInvokeError.
  6.  LocalWhisperProvider: audio_path zorunludur.
  7.  LocalWhisperProvider: başarılı invoke → segments, language, duration_seconds.
  8.  LocalWhisperProvider: trace alanları mevcut.
  9.  SubtitleStepExecutor: Whisper yoksa cursor modu (timing_mode="cursor").
  10. SubtitleStepExecutor: Whisper yoksa word_timing_path=None.
  11. SubtitleStepExecutor: Whisper varsa timing_mode="whisper_word".
  12. SubtitleStepExecutor: Whisper varsa word_timing.json üretilir.
  13. SubtitleStepExecutor: word_timing.json yapısı doğru.
  14. SubtitleStepExecutor: Whisper varsa SRT Whisper segmentlerinden gelir.
  15. SubtitleStepExecutor: Whisper başarısız → sahne için cursor-tabanlı fallback.
  16. SubtitleStepExecutor: artifact_check — timing_mode korunur.
  17. SubtitleStepExecutor: ses dosyası eksik → cursor-tabanlı fallback (adım başarısız olmaz).
  18. _build_srt_from_whisper: boş text olan segment atlanır.
  19. _extract_word_timings_from_segments: sahne ofseti doğru uygulanır.
  20. Dispatcher _build_executor_from_registry: SubtitleStepExecutor registry alıyor.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.providers.capability import ProviderCapability
from app.providers.base import BaseProvider, ProviderOutput
from app.providers.exceptions import ConfigurationError, ProviderInvokeError
from app.providers.registry import ProviderRegistry
from app.modules.standard_video.executors.subtitle import (
    SubtitleStepExecutor,
    _build_srt_from_whisper,
    _extract_word_timings_from_segments,
    _seconds_to_srt_time,
)


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

class _FakeWhisperProvider(BaseProvider):
    """Test amaçlı sahte Whisper provider."""

    def __init__(self, segments: list[dict] | None = None) -> None:
        self._segments = segments or []

    def provider_id(self) -> str:
        return "fake_whisper"

    def capability(self) -> ProviderCapability:
        return ProviderCapability.WHISPER

    async def invoke(self, input_data: dict) -> ProviderOutput:
        return ProviderOutput(
            result={
                "segments": self._segments,
                "language": "tr",
                "duration_seconds": 8.0,
            },
            trace={
                "provider_id": "fake_whisper",
                "model_size": "base",
                "device": "cpu",
                "language": "tr",
                "word_count": sum(len(s.get("words", [])) for s in self._segments),
                "latency_ms": 100,
            },
            provider_id="fake_whisper",
        )


class _FailingWhisperProvider(BaseProvider):
    """Her invoke'ta hata fırlatan Whisper provider."""

    def provider_id(self) -> str:
        return "failing_whisper"

    def capability(self) -> ProviderCapability:
        return ProviderCapability.WHISPER

    async def invoke(self, input_data: dict) -> ProviderOutput:
        raise ProviderInvokeError("failing_whisper", "Kasıtlı test hatası")


SAMPLE_WHISPER_SEGMENTS = [
    {
        "id": 0,
        "start": 0.0,
        "end": 3.5,
        "text": "İlk sahne anlatımı.",
        "words": [
            {"word": "İlk", "start": 0.0, "end": 0.5, "probability": 0.99},
            {"word": "sahne", "start": 0.5, "end": 1.0, "probability": 0.98},
            {"word": "anlatımı.", "start": 1.0, "end": 3.5, "probability": 0.97},
        ],
    },
    {
        "id": 1,
        "start": 3.5,
        "end": 7.0,
        "text": "Devam cümlesi.",
        "words": [
            {"word": "Devam", "start": 3.5, "end": 4.5, "probability": 0.96},
            {"word": "cümlesi.", "start": 4.5, "end": 7.0, "probability": 0.95},
        ],
    },
]


def _make_registry_with_whisper(segments: list[dict] | None = None) -> ProviderRegistry:
    """Whisper provider kayıtlı registry oluşturur."""
    registry = ProviderRegistry()
    provider = _FakeWhisperProvider(segments=segments or SAMPLE_WHISPER_SEGMENTS)
    registry.register(provider, ProviderCapability.WHISPER, is_primary=True)
    return registry


def _make_registry_without_whisper() -> ProviderRegistry:
    """Whisper provider kayıtsız boş registry oluşturur."""
    return ProviderRegistry()


def _make_job(tmpdir: str, language: str = "tr") -> MagicMock:
    """Test için sahte Job nesnesi oluşturur."""
    job = MagicMock()
    job.id = "test-job-m4c1"
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
    step.id = "test-step-m4c1"
    return step


def _write_json(path: Path, data: dict) -> None:
    """Belirtilen path'e JSON yazar, dizini oluşturur."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


SAMPLE_AUDIO_SCENES = [
    {
        "scene_number": 1,
        "narration": "İlk sahne anlatımı.",
        "duration_seconds": 8.0,
        "audio_path": "artifacts/audio/scene_1.mp3",
    },
]

SAMPLE_SCRIPT_SCENES = [
    {
        "scene_number": 1,
        "narration": "İlk sahne anlatımı.",
        "visual_cue": "Açık mavi gökyüzü",
    },
]


def _setup_artifacts(tmpdir: str, with_audio: bool = False) -> Path:
    """Temel artifact'ları hazırlar."""
    artifacts_dir = Path(tmpdir) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    _write_json(artifacts_dir / "audio_manifest.json", {
        "scenes": SAMPLE_AUDIO_SCENES,
        "total_duration_seconds": 8.0,
        "voice": "tr-TR-EmelNeural",
        "language": "tr",
    })
    _write_json(artifacts_dir / "script.json", {
        "scenes": SAMPLE_SCRIPT_SCENES,
        "language": "tr",
    })

    if with_audio:
        audio_dir = artifacts_dir / "audio"
        audio_dir.mkdir(exist_ok=True)
        # Sahte ses dosyası (gerçek Whisper çağrısı mock'lanacak)
        (audio_dir / "scene_1.mp3").write_bytes(b"fake_audio")

    return artifacts_dir


# ---------------------------------------------------------------------------
# Test 1-3: ProviderCapability + LocalWhisperProvider temel
# ---------------------------------------------------------------------------

def test_whisper_capability_mevcut():
    """Test 1: ProviderCapability.WHISPER enum değeri mevcut."""
    assert ProviderCapability.WHISPER == "whisper"


def test_local_whisper_provider_id():
    """Test 2: LocalWhisperProvider provider_id() doğru."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    p = LocalWhisperProvider()
    assert p.provider_id() == "local_whisper"


def test_local_whisper_capability():
    """Test 3: LocalWhisperProvider capability() == WHISPER."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    p = LocalWhisperProvider()
    assert p.capability() == ProviderCapability.WHISPER


# ---------------------------------------------------------------------------
# Test 4-8: LocalWhisperProvider invoke davranışı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_local_whisper_faster_whisper_yoksa_configuration_error():
    """Test 4: faster-whisper kurulu değilse ConfigurationError fırlatılır."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    import app.providers.whisper.local_whisper_provider as lwp_module

    lwp_module._model_cache.clear()

    def _raise_config(*args, **kwargs):
        raise ConfigurationError("local_whisper", "faster-whisper kurulu değil")

    p = LocalWhisperProvider()
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(b"fake")
        audio_path = f.name

    with patch(
        "app.providers.whisper.local_whisper_provider._load_model",
        side_effect=_raise_config,
    ):
        with pytest.raises(ConfigurationError):
            await p.invoke({"audio_path": audio_path})


@pytest.mark.asyncio
async def test_local_whisper_ses_dosyasi_bulunamazsa_error():
    """Test 5: Ses dosyası bulunamazsa ProviderInvokeError fırlatılır."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    p = LocalWhisperProvider()
    with pytest.raises(ProviderInvokeError, match="bulunamadı"):
        await p.invoke({"audio_path": "/tmp/kesinlikle_olmayan_dosya_m4c1.mp3"})


@pytest.mark.asyncio
async def test_local_whisper_audio_path_zorunlu():
    """Test 6: audio_path alanı olmadan invoke çağrılırsa ProviderInvokeError."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider
    p = LocalWhisperProvider()
    with pytest.raises(ProviderInvokeError, match="zorunludur"):
        await p.invoke({})


@pytest.mark.asyncio
async def test_local_whisper_basarili_invoke():
    """Test 7: Başarılı invoke → segments, language, duration_seconds alanları var."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider, _model_cache

    _model_cache.clear()

    # Sahte WhisperModel
    mock_word1 = MagicMock()
    mock_word1.word = "Merhaba"
    mock_word1.start = 0.0
    mock_word1.end = 0.5
    mock_word1.probability = 0.99

    mock_seg = MagicMock()
    mock_seg.id = 0
    mock_seg.start = 0.0
    mock_seg.end = 0.5
    mock_seg.text = " Merhaba"
    mock_seg.words = [mock_word1]

    mock_info = MagicMock()
    mock_info.language = "tr"

    mock_model = MagicMock()
    mock_model.transcribe.return_value = ([mock_seg], mock_info)

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(b"fake")
        audio_path = f.name

    with patch(
        "app.providers.whisper.local_whisper_provider._load_model",
        return_value=mock_model,
    ):
        p = LocalWhisperProvider()
        output = await p.invoke({"audio_path": audio_path, "language": "tr"})

    assert "segments" in output.result
    assert "language" in output.result
    assert "duration_seconds" in output.result
    assert output.result["language"] == "tr"
    assert len(output.result["segments"]) == 1
    assert output.result["segments"][0]["text"] == "Merhaba"


@pytest.mark.asyncio
async def test_local_whisper_trace_alanlari():
    """Test 8: Başarılı invoke → trace alanları mevcut."""
    from app.providers.whisper.local_whisper_provider import LocalWhisperProvider, _model_cache

    _model_cache.clear()

    mock_seg = MagicMock()
    mock_seg.id = 0
    mock_seg.start = 0.0
    mock_seg.end = 1.0
    mock_seg.text = " Test"
    mock_seg.words = []

    mock_info = MagicMock()
    mock_info.language = "tr"

    mock_model = MagicMock()
    mock_model.transcribe.return_value = ([mock_seg], mock_info)

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(b"fake")
        audio_path = f.name

    with patch(
        "app.providers.whisper.local_whisper_provider._load_model",
        return_value=mock_model,
    ):
        p = LocalWhisperProvider()
        output = await p.invoke({"audio_path": audio_path})

    assert output.trace["provider_id"] == "local_whisper"
    assert "model_size" in output.trace
    assert "device" in output.trace
    assert "latency_ms" in output.trace
    assert isinstance(output.trace["word_count"], int)


# ---------------------------------------------------------------------------
# Test 9-17: SubtitleStepExecutor Whisper entegrasyonu
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_subtitle_whisper_yok_cursor_modu():
    """Test 9: Whisper yoksa timing_mode='cursor'."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir)
        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor(registry=_make_registry_without_whisper())
        result = await executor.execute(job, step)
        assert result["timing_mode"] == "cursor"


@pytest.mark.asyncio
async def test_subtitle_whisper_yok_word_timing_path_none():
    """Test 10: Whisper yoksa word_timing_path=None."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir)
        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor(registry=_make_registry_without_whisper())
        result = await executor.execute(job, step)
        assert result["word_timing_path"] is None


@pytest.mark.asyncio
async def test_subtitle_whisper_var_timing_mode_script_canonical_whisper():
    """Test 11 (Faz 3): Whisper varsa timing_mode='script_canonical_whisper'.

    Faz 3 SABIT: Whisper transkripti asla altyazi olarak kullanilmaz; sadece
    script token'larina word-level timing saglamak icin kullanilir.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = _setup_artifacts(tmpdir, with_audio=True)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = _make_registry_with_whisper(segments=SAMPLE_WHISPER_SEGMENTS)
        executor = SubtitleStepExecutor(registry=registry)
        result = await executor.execute(job, step)

        assert result["timing_mode"] == "script_canonical_whisper"
        assert result["text_source"] == "script_canonical"


@pytest.mark.asyncio
async def test_subtitle_whisper_var_word_timing_json_uretilir():
    """Test 12: Whisper varsa word_timing.json artifact'ı üretilir."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = _setup_artifacts(tmpdir, with_audio=True)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = _make_registry_with_whisper(segments=SAMPLE_WHISPER_SEGMENTS)
        executor = SubtitleStepExecutor(registry=registry)
        result = await executor.execute(job, step)

        word_timing_path = result.get("word_timing_path")
        assert word_timing_path is not None
        assert Path(word_timing_path).exists()


@pytest.mark.asyncio
async def test_subtitle_word_timing_json_yapisi_dogru():
    """Test 13 (Faz 3): word_timing.json script-canonical schema.

    Faz 3: version=='2', source=='script_canonical', her kelime
    {word, start, end, scene, timing_from_whisper}.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, with_audio=True)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = _make_registry_with_whisper(segments=SAMPLE_WHISPER_SEGMENTS)
        executor = SubtitleStepExecutor(registry=registry)
        result = await executor.execute(job, step)

        word_timing_path = result.get("word_timing_path")
        assert word_timing_path is not None

        data = json.loads(Path(word_timing_path).read_text(encoding="utf-8"))
        assert data["version"] == "2"
        assert data["timing_mode"] == "script_canonical_whisper"
        assert data["source"] == "script_canonical"
        assert data["language"] == "tr"
        assert "words" in data
        assert data["word_count"] > 0

        # Ilk kelime yapisi — Faz 3 schema
        first_word = data["words"][0]
        assert "word" in first_word
        assert "start" in first_word
        assert "end" in first_word
        assert "scene" in first_word
        assert "timing_from_whisper" in first_word


@pytest.mark.asyncio
async def test_subtitle_whisper_var_srt_script_canonical_metin_icerir():
    """Test 14 (Faz 3): SRT metni SCRIPT narration'dan gelir — Whisper transkripti DEĞİL.

    Whisper'dan sadece word-level timing alinir; metin her zaman script canonical'dir.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, with_audio=True)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = _make_registry_with_whisper(segments=SAMPLE_WHISPER_SEGMENTS)
        executor = SubtitleStepExecutor(registry=registry)
        result = await executor.execute(job, step)

        srt_content = Path(result["artifact_path"]).read_text(encoding="utf-8")
        # Script canonical narration SRT'de bulunmali
        # (SAMPLE_SCRIPT_SCENES[0].narration == "İlk sahne anlatımı.")
        assert "İlk" in srt_content
        assert "sahne" in srt_content
        assert "anlatımı" in srt_content


@pytest.mark.asyncio
async def test_subtitle_whisper_basarisiz_cursor_fallback():
    """Test 15: Whisper başarısız olursa sahne cursor-tabanlı SRT ile devam eder."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _setup_artifacts(tmpdir, with_audio=True)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = ProviderRegistry()
        failing = _FailingWhisperProvider()
        registry.register(failing, ProviderCapability.WHISPER, is_primary=True)

        executor = SubtitleStepExecutor(registry=registry)
        # Hata fırlatmamalı; cursor-tabanlı SRT üretmeli
        result = await executor.execute(job, step)

        assert result["artifact_path"] is not None
        srt_content = Path(result["artifact_path"]).read_text(encoding="utf-8")
        assert "-->" in srt_content


@pytest.mark.asyncio
async def test_subtitle_artifact_check_timing_mode_korunur():
    """Test 16: artifact_check — timing_mode metadata'dan doğru okunur."""
    with tempfile.TemporaryDirectory() as tmpdir:
        artifacts_dir = Path(tmpdir) / "artifacts"
        artifacts_dir.mkdir()

        existing_metadata = {
            "srt_path": str(artifacts_dir / "subtitles.srt"),
            "word_timing_path": str(artifacts_dir / "word_timing.json"),
            "segment_count": 1,
            "total_duration_seconds": 8.0,
            "language": "tr",
            "timing_mode": "whisper_word",
        }
        _write_json(artifacts_dir / "subtitle_metadata.json", existing_metadata)
        (artifacts_dir / "subtitles.srt").write_text("1\n00:00:00,000 --> 00:00:08,000\nMevcut.")

        job = _make_job(tmpdir)
        step = _make_step()
        executor = SubtitleStepExecutor(registry=_make_registry_without_whisper())
        result = await executor.execute(job, step)

        assert result.get("skipped") is True
        assert result["timing_mode"] == "whisper_word"


@pytest.mark.asyncio
async def test_subtitle_ses_dosyasi_eksik_cursor_fallback():
    """Test 17: Ses dosyası eksik → cursor-tabanlı fallback kullanılır, adım başarısız olmaz."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # audio_path tanımlı ama dosya yok
        artifacts_dir = _setup_artifacts(tmpdir, with_audio=False)
        job = _make_job(tmpdir)
        step = _make_step()

        registry = _make_registry_with_whisper()
        executor = SubtitleStepExecutor(registry=registry)
        result = await executor.execute(job, step)

        # Adım başarılı olmalı (cursor fallback ile)
        assert result["artifact_path"] is not None
        srt_content = Path(result["artifact_path"]).read_text(encoding="utf-8")
        assert "-->" in srt_content


# ---------------------------------------------------------------------------
# Test 18-19: Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def test_build_srt_from_whisper_bos_text_atlanir():
    """Test 18: Boş text olan Whisper segmenti SRT bloğuna dahil edilmez."""
    segments = [
        {"id": 0, "start": 0.0, "end": 1.0, "text": "Merhaba", "words": []},
        {"id": 1, "start": 1.0, "end": 2.0, "text": "", "words": []},  # boş
        {"id": 2, "start": 2.0, "end": 3.0, "text": "Dünya", "words": []},
    ]
    blocks = _build_srt_from_whisper(segments, scene_offset=0.0)
    assert len(blocks) == 2
    assert "Merhaba" in blocks[0]
    assert "Dünya" in blocks[1]


def test_extract_word_timings_scene_ofseti():
    """Test 19: _extract_word_timings_from_segments sahne ofsetini doğru uygular."""
    segments = [
        {
            "id": 0,
            "start": 0.0,
            "end": 3.0,
            "text": "Test",
            "words": [
                {"word": "Test", "start": 0.5, "end": 1.5, "probability": 0.99},
            ],
        },
    ]
    offset = 5.0  # Bu sahne 5. saniyede başlıyor
    words = _extract_word_timings_from_segments(segments, scene_number=2, scene_offset=offset)

    assert len(words) == 1
    assert words[0]["word"] == "Test"
    assert words[0]["start"] == pytest.approx(5.5, rel=1e-3)  # 5.0 + 0.5
    assert words[0]["end"] == pytest.approx(6.5, rel=1e-3)    # 5.0 + 1.5
    assert words[0]["scene"] == 2


# ---------------------------------------------------------------------------
# Test 20: Dispatcher
# ---------------------------------------------------------------------------

def test_dispatcher_subtitle_executor_registry_aliyor():
    """Test 20: _build_executor_from_registry SubtitleStepExecutor'a registry geçiriyor."""
    from app.jobs.dispatcher import _build_executor_from_registry

    registry = ProviderRegistry()
    executor = _build_executor_from_registry(SubtitleStepExecutor, registry)

    assert isinstance(executor, SubtitleStepExecutor)
    assert executor._registry is registry
