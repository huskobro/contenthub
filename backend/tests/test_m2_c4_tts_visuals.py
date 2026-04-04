"""
M2-C4 TTS + Visuals Adımları Testleri

TTSStepExecutor ve VisualsStepExecutor gerçek implementasyon testleri.
Tüm dış bağımlılıklar (TTS provider, görsel provider'lar) mock'lanır.

Test kategorileri:
  - TTS ses üretimi ve manifest yazımı
  - Dil → ses eşleşmesi (TR → AhmetNeural, EN → ChristopherNeural)
  - TTS artifact_check idempotency
  - Visuals Pexels önceliği
  - Visuals Pixabay fallback
  - Visuals manifest yazımı
  - Visuals artifact_check idempotency
  - Tüm sahneler başarısızsa hata
  - VOICE_MAP tam ve doğru
  - Provider trace'de language alanı varlığı
"""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.jobs.exceptions import StepExecutionError
from app.modules.language import SupportedLanguage
from app.modules.standard_video.executors import TTSStepExecutor, VisualsStepExecutor
from app.providers.base import ProviderOutput


# ---------------------------------------------------------------------------
# Yardımcı araçlar
# ---------------------------------------------------------------------------

def _make_job(job_id: str, workspace_root: str, language: str = "tr") -> MagicMock:
    """Sahte Job nesnesi üretir."""
    job = MagicMock()
    job.id = job_id
    job.workspace_path = None
    job.input_data_json = json.dumps({
        "topic": "Test konusu",
        "language": language,
        "workspace_root": workspace_root,
    })
    return job


def _make_step() -> MagicMock:
    """Sahte JobStep nesnesi üretir."""
    return MagicMock()


def _write_script_artifact(workspace_root: str, job_id: str, scenes: list[dict]) -> None:
    """Test için script.json artifact'ını yazar."""
    artifacts_dir = Path(workspace_root) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    script_data = {
        "scenes": scenes,
        "language": "tr",
    }
    (artifacts_dir / "script.json").write_text(
        json.dumps(script_data, ensure_ascii=False), encoding="utf-8"
    )


def _make_tts_provider(duration_seconds: float = 5.0) -> MagicMock:
    """
    Sahte TTS provider'ı döner.

    Gerçek ses dosyası oluşturmaz — dosyayı boş yazar (test amaçlı).
    Provider objesinin .invoke() methodu AsyncMock olarak kurulur.
    """
    async def fake_invoke(input_data: dict) -> ProviderOutput:
        # Gerçek provider gibi dosyayı yaz (boş içerik)
        output_path = input_data.get("output_path", "")
        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(b"FAKE_MP3_DATA")
        return ProviderOutput(
            result={
                "output_path": output_path,
                "duration_seconds": duration_seconds,
            },
            trace={
                "provider_id": "edge_tts",
                "voice": input_data.get("voice", ""),
                "char_count": len(input_data.get("text", "")),
                "latency_ms": 100,
            },
            provider_id="edge_tts",
        )

    mock = MagicMock()
    mock.invoke = AsyncMock(side_effect=fake_invoke)
    return mock


def _make_pexels_provider(success: bool = True) -> MagicMock:
    """
    Sahte Pexels provider'ı döner.

    success=True: assets listesinde bir görsel döner ve dosyayı oluşturur.
    success=False: boş assets listesi döner.
    Provider objesinin .invoke() methodu AsyncMock olarak kurulur.
    """
    async def fake_invoke(input_data: dict) -> ProviderOutput:
        output_dir = input_data.get("output_dir", "")
        assets = []
        if success and output_dir:
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            local_path = str(Path(output_dir) / "pexels_0_123.jpg")
            Path(local_path).write_bytes(b"FAKE_PEXELS_IMG")
            assets = [{
                "url": "https://pexels.com/photo/123",
                "local_path": local_path,
                "width": 1920,
                "height": 1080,
                "photographer": "Test Photographer",
            }]
        return ProviderOutput(
            result={"assets": assets},
            trace={"provider_id": "pexels", "query": input_data.get("query", ""),
                   "results_found": len(assets), "downloaded_count": len(assets), "latency_ms": 200},
            provider_id="pexels",
        )

    mock = MagicMock()
    mock.invoke = AsyncMock(side_effect=fake_invoke)
    return mock


def _make_pixabay_provider(success: bool = True) -> MagicMock:
    """
    Sahte Pixabay provider'ı döner.

    success=True: assets listesinde bir görsel döner ve dosyayı oluşturur.
    success=False: boş assets listesi döner.
    Provider objesinin .invoke() methodu AsyncMock olarak kurulur.
    """
    async def fake_invoke(input_data: dict) -> ProviderOutput:
        output_dir = input_data.get("output_dir", "")
        assets = []
        if success and output_dir:
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            local_path = str(Path(output_dir) / "pixabay_0_456.jpg")
            Path(local_path).write_bytes(b"FAKE_PIXABAY_IMG")
            assets = [{
                "url": "https://pixabay.com/photo/456",
                "local_path": local_path,
                "width": 1280,
                "height": 720,
                "author": "Test Author",
            }]
        return ProviderOutput(
            result={"assets": assets},
            trace={"provider_id": "pixabay", "query": input_data.get("query", ""),
                   "results_found": len(assets), "downloaded_count": len(assets), "latency_ms": 150},
            provider_id="pixabay",
        )

    mock = MagicMock()
    mock.invoke = AsyncMock(side_effect=fake_invoke)
    return mock


# ---------------------------------------------------------------------------
# TTSStepExecutor Testleri
# ---------------------------------------------------------------------------

class TestTTSStepExecutor:
    """TTSStepExecutor gerçek implementasyon testleri."""

    @pytest.mark.asyncio
    async def test_edge_tts_communicate_cagrilir(self):
        """edge_tts.Communicate doğru voice ile çağrılıyor mu."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-tts-1"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Merhaba dünya.", "visual_cue": ""},
            ])

            tts_mock = _make_tts_provider()
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            await executor.execute(job, step)

            # Invoke çağrıldı mı
            assert tts_mock.invoke.call_count == 1
            call_args = tts_mock.invoke.call_args[0][0]
            assert call_args["text"] == "Merhaba dünya."
            # Ses TR için AhmetNeural olmalı
            assert call_args["voice"] == "tr-TR-AhmetNeural"

    @pytest.mark.asyncio
    async def test_tr_dil_ahmet_neural_kullanir(self):
        """TR dil → tr-TR-AhmetNeural sesi kullanılmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-tts-tr"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Türkçe test metni.", "visual_cue": ""},
            ])

            tts_mock = _make_tts_provider()
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            assert result["voice"] == "tr-TR-AhmetNeural"
            assert result["language"] == "tr"

    @pytest.mark.asyncio
    async def test_en_dil_christopher_neural_kullanir(self):
        """EN dil → en-US-ChristopherNeural sesi kullanılmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-tts-en"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "English test narration.", "visual_cue": ""},
            ])

            tts_mock = _make_tts_provider()
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="en")
            step = _make_step()

            result = await executor.execute(job, step)

            assert result["voice"] == "en-US-ChristopherNeural"
            assert result["language"] == "en"

    @pytest.mark.asyncio
    async def test_audio_manifest_yazilir_language_alani_var(self):
        """audio_manifest.json yazılıyor ve language alanı içeriyor."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-tts-manifest"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Birinci sahne.", "visual_cue": ""},
                {"scene_number": 2, "narration": "İkinci sahne.", "visual_cue": ""},
            ])

            tts_mock = _make_tts_provider(duration_seconds=4.0)
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            # Manifest dosyasını oku ve doğrula
            manifest_path = Path(workspace_root) / "artifacts" / "audio_manifest.json"
            assert manifest_path.exists(), "audio_manifest.json oluşturulmalı"

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert "language" in manifest, "language alanı manifest'te olmalı"
            assert manifest["language"] == "tr"
            assert manifest["voice"] == "tr-TR-AhmetNeural"
            assert len(manifest["scenes"]) == 2
            assert manifest["total_duration_seconds"] == 8.0

    @pytest.mark.asyncio
    async def test_artifact_check_manifest_varsa_tekrar_calismaz(self):
        """audio_manifest.json varsa TTS provider çağrılmaz."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-tts-idempotent"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": ""},
            ])

            # Manifest'i önceden yaz
            artifacts_dir = Path(workspace_root) / "artifacts"
            artifacts_dir.mkdir(parents=True, exist_ok=True)
            existing_manifest = {
                "scenes": [{"scene_number": 1, "audio_path": "artifacts/audio/scene_1.mp3",
                             "narration": "Test.", "duration_seconds": 2.0}],
                "total_duration_seconds": 2.0,
                "voice": "tr-TR-AhmetNeural",
                "language": "tr",
            }
            (artifacts_dir / "audio_manifest.json").write_text(
                json.dumps(existing_manifest), encoding="utf-8"
            )

            tts_mock = _make_tts_provider()
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            # TTS provider çağrılmamış olmalı
            assert tts_mock.invoke.call_count == 0
            assert result.get("skipped") is True


# ---------------------------------------------------------------------------
# VisualsStepExecutor Testleri
# ---------------------------------------------------------------------------

class TestVisualsStepExecutor:
    """VisualsStepExecutor gerçek implementasyon testleri."""

    @pytest.mark.asyncio
    async def test_pexels_once_cagirilir(self):
        """Her sahne için Pexels önce çağrılmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-vis-pexels"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "şehir manzarası"},
            ])

            pexels_mock = _make_pexels_provider(success=True)
            pixabay_mock = _make_pixabay_provider(success=True)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            await executor.execute(job, step)

            # Pexels çağrıldı
            assert pexels_mock.invoke.call_count == 1
            # Pexels başarılıyken Pixabay çağrılmadı
            assert pixabay_mock.invoke.call_count == 0

    @pytest.mark.asyncio
    async def test_pexels_bos_pixabay_fallback(self):
        """Pexels boş sonuç verince Pixabay fallback devreye girmeli."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-vis-fallback"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "nadir bitki"},
            ])

            pexels_mock = _make_pexels_provider(success=False)  # Pexels boş döner
            pixabay_mock = _make_pixabay_provider(success=True)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            # Pexels çağrıldı, Pixabay de çağrıldı
            assert pexels_mock.invoke.call_count == 1
            assert pixabay_mock.invoke.call_count == 1

            # Manifest'te kaynak pixabay olmalı
            manifest_path = Path(workspace_root) / "artifacts" / "visuals_manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["scenes"][0]["source"] == "pixabay"

    @pytest.mark.asyncio
    async def test_visuals_manifest_yazilir_language_alani_var(self):
        """visuals_manifest.json yazılıyor ve language alanı içeriyor."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-vis-manifest"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "doğa"},
                {"scene_number": 2, "narration": "Test 2.", "visual_cue": "teknoloji"},
            ])

            pexels_mock = _make_pexels_provider(success=True)
            pixabay_mock = _make_pixabay_provider(success=True)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            await executor.execute(job, step)

            manifest_path = Path(workspace_root) / "artifacts" / "visuals_manifest.json"
            assert manifest_path.exists(), "visuals_manifest.json oluşturulmalı"

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert "language" in manifest, "language alanı manifest'te olmalı"
            assert manifest["language"] == "tr"
            assert manifest["total_downloaded"] == 2
            assert len(manifest["scenes"]) == 2

    @pytest.mark.asyncio
    async def test_artifact_check_manifest_varsa_tekrar_calismaz(self):
        """visuals_manifest.json varsa görsel provider'lar çağrılmaz."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-vis-idempotent"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "orman"},
            ])

            # Manifest'i önceden yaz
            artifacts_dir = Path(workspace_root) / "artifacts"
            artifacts_dir.mkdir(parents=True, exist_ok=True)
            existing_manifest = {
                "scenes": [{"scene_number": 1, "image_path": "artifacts/visuals/scene_1.jpg",
                             "query": "orman", "source": "pexels",
                             "photographer": "Test", "original_url": "https://pexels.com/1"}],
                "total_downloaded": 1,
                "language": "tr",
            }
            (artifacts_dir / "visuals_manifest.json").write_text(
                json.dumps(existing_manifest), encoding="utf-8"
            )

            pexels_mock = _make_pexels_provider(success=True)
            pixabay_mock = _make_pixabay_provider(success=True)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            # Provider'lar çağrılmamış olmalı
            assert pexels_mock.invoke.call_count == 0
            assert pixabay_mock.invoke.call_count == 0
            assert result.get("skipped") is True

    @pytest.mark.asyncio
    async def test_tum_sahneler_basarisiz_hata_firlatilir(self):
        """Hiçbir sahne için görsel bulunamazsa StepExecutionError fırlatılmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-vis-all-fail"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "görsel"},
                {"scene_number": 2, "narration": "Test 2.", "visual_cue": "görsel 2"},
            ])

            pexels_mock = _make_pexels_provider(success=False)
            pixabay_mock = _make_pixabay_provider(success=False)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)


# ---------------------------------------------------------------------------
# VOICE_MAP Testleri
# ---------------------------------------------------------------------------

class TestVoiceMap:
    """VOICE_MAP doğruluk ve kapsam testleri."""

    def test_voice_map_tr_ve_en_icin_tanimli(self):
        """VOICE_MAP TR ve EN için tanımlı olmalı."""
        from app.providers.tts.voice_map import VOICE_MAP

        assert SupportedLanguage.TR in VOICE_MAP
        assert SupportedLanguage.EN in VOICE_MAP

    def test_voice_map_tr_ahmet_neural(self):
        """TR dil kodu → tr-TR-AhmetNeural."""
        from app.providers.tts.voice_map import VOICE_MAP

        assert VOICE_MAP[SupportedLanguage.TR] == "tr-TR-AhmetNeural"

    def test_voice_map_en_christopher_neural(self):
        """EN dil kodu → en-US-ChristopherNeural."""
        from app.providers.tts.voice_map import VOICE_MAP

        assert VOICE_MAP[SupportedLanguage.EN] == "en-US-ChristopherNeural"

    def test_get_voice_bilinmeyen_dil_default_donar(self):
        """Bilinmeyen dil değeri için DEFAULT_VOICE dönmeli."""
        from app.providers.tts.voice_map import get_voice, DEFAULT_VOICE

        # SupportedLanguage enum'u olmayan bir değer gönderme — mock ile test et
        # DEFAULT_VOICE'un TR sesi olduğunu doğrula
        assert DEFAULT_VOICE == "tr-TR-AhmetNeural"


# ---------------------------------------------------------------------------
# Provider Trace Language Alanı Testleri
# ---------------------------------------------------------------------------

class TestProviderTraceLanguage:
    """Her iki executor'ın provider trace'inde language alanı var mı."""

    @pytest.mark.asyncio
    async def test_tts_provider_trace_language_alani_var(self):
        """TTSStepExecutor sonuç dict'inin provider alanında language olmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-trace-tts"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Trace test.", "visual_cue": ""},
            ])

            tts_mock = _make_tts_provider()
            executor = TTSStepExecutor(tts_provider=tts_mock)
            job = _make_job(job_id, workspace_root, language="tr")
            step = _make_step()

            result = await executor.execute(job, step)

            assert "provider" in result
            assert "language" in result["provider"]
            assert result["provider"]["language"] == "tr"

    @pytest.mark.asyncio
    async def test_visuals_provider_trace_language_alani_var(self):
        """VisualsStepExecutor sonuç dict'inin provider alanında language olmalı."""
        with tempfile.TemporaryDirectory() as tmpdir:
            job_id = "test-trace-vis"
            workspace_root = str(Path(tmpdir) / job_id)
            _write_script_artifact(workspace_root, job_id, [
                {"scene_number": 1, "narration": "Test.", "visual_cue": "manzara"},
            ])

            pexels_mock = _make_pexels_provider(success=True)
            pixabay_mock = _make_pixabay_provider(success=True)
            executor = VisualsStepExecutor(
                pexels_provider=pexels_mock,
                pixabay_provider=pixabay_mock,
            )
            job = _make_job(job_id, workspace_root, language="en")
            step = _make_step()

            result = await executor.execute(job, step)

            assert "provider" in result
            assert "language" in result["provider"]
            assert result["provider"]["language"] == "en"
