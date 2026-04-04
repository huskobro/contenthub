"""
M2-C3 testleri — Language-aware script ve metadata adımları.

Test kapsamı:
  1.  resolve_language(None) → tr döner
  2.  resolve_language("en") → en döner
  3.  resolve_language("TR") → tr döner (normalize)
  4.  resolve_language("turkish") → UnsupportedLanguageError
  5.  StepExecutionContext.from_job_input → language doğru resolve eder
  6.  build_script_prompt → language=tr, mesajlarda Türkçe instruction var
  7.  build_script_prompt → language=en, mesajlarda İngilizce instruction var
  8.  build_metadata_prompt → language field taşıyor
  9.  ScriptStepExecutor mock test: LLM çağrısı, artifact yazma, language trace
  10. MetadataStepExecutor mock test: script okunuyor, metadata artifact, language trace
  11. Geçersiz dil → UnsupportedLanguageError (sessiz fallback yok)
  12. Artifact output'unda language field mevcut
  13. Provider trace'de language field mevcut
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.language import (
    SupportedLanguage,
    UnsupportedLanguageError,
    resolve_language,
    DEFAULT_LANGUAGE,
)
from app.modules.step_context import StepExecutionContext
from app.modules.prompt_builder import build_script_prompt, build_metadata_prompt
from app.modules.standard_video.executors import ScriptStepExecutor, MetadataStepExecutor
from app.providers.base import ProviderOutput
from app.providers.registry import ProviderRegistry


# ===========================================================================
# resolve_language testleri (1–4, 11)
# ===========================================================================

def test_resolve_language_none_returns_tr():
    """Test 1: None → varsayılan dil TR döner."""
    result = resolve_language(None)
    assert result == SupportedLanguage.TR
    assert result == DEFAULT_LANGUAGE


def test_resolve_language_en():
    """Test 2: 'en' → EN döner."""
    result = resolve_language("en")
    assert result == SupportedLanguage.EN


def test_resolve_language_uppercase_tr_normalized():
    """Test 3: 'TR' büyük harf → normalize edilerek TR döner."""
    result = resolve_language("TR")
    assert result == SupportedLanguage.TR


def test_resolve_language_turkish_raises_error():
    """Test 4: 'turkish' geçersiz kod → UnsupportedLanguageError fırlatılır."""
    with pytest.raises(UnsupportedLanguageError) as exc_info:
        resolve_language("turkish")
    assert "turkish" in str(exc_info.value)


def test_resolve_language_invalid_raises_error():
    """Test 11: Geçersiz dil kodu → UnsupportedLanguageError (sessiz fallback yok)."""
    with pytest.raises(UnsupportedLanguageError):
        resolve_language("xyz123")

    # Sessiz fallback olmadığını doğrula: hata fırlatılıyor, None dönmüyor
    try:
        resolve_language("de")
        assert False, "Hata fırlatılmalıydı"
    except UnsupportedLanguageError as err:
        assert err.lang == "de"


# ===========================================================================
# StepExecutionContext testleri (5)
# ===========================================================================

def test_step_execution_context_from_job_input_resolves_language():
    """Test 5: from_job_input() dili doğru resolve eder."""
    ctx = StepExecutionContext.from_job_input(
        job_id="job-123",
        module_id="standard_video",
        raw_input={"topic": "Yapay Zeka", "language": "tr", "duration_seconds": 90},
    )
    assert ctx.language == SupportedLanguage.TR
    assert ctx.topic == "Yapay Zeka"
    assert ctx.duration_seconds == 90
    assert ctx.job_id == "job-123"


def test_step_execution_context_defaults_to_tr():
    """from_job_input() language alanı yoksa TR varsayılan döner."""
    ctx = StepExecutionContext.from_job_input(
        job_id="job-456",
        module_id="standard_video",
        raw_input={"topic": "Python"},
    )
    assert ctx.language == SupportedLanguage.TR
    assert ctx.duration_seconds == 60  # varsayılan süre


def test_step_execution_context_en_language():
    """from_job_input() language=en doğru resolve eder."""
    ctx = StepExecutionContext.from_job_input(
        job_id="job-789",
        module_id="standard_video",
        raw_input={"topic": "AI Basics", "language": "en"},
    )
    assert ctx.language == SupportedLanguage.EN


def test_step_execution_context_invalid_language_raises():
    """from_job_input() geçersiz dil → UnsupportedLanguageError."""
    with pytest.raises(UnsupportedLanguageError):
        StepExecutionContext.from_job_input(
            job_id="job-999",
            module_id="standard_video",
            raw_input={"topic": "Test", "language": "fr"},
        )


# ===========================================================================
# build_script_prompt testleri (6–7)
# ===========================================================================

def test_build_script_prompt_tr_contains_turkish_instruction():
    """Test 6: language=tr → mesajlarda Türkçe instruction bulunur."""
    messages = build_script_prompt(
        topic="Yapay Zeka",
        duration_seconds=60,
        language=SupportedLanguage.TR,
    )
    full_text = " ".join(m["content"] for m in messages)

    # Türkçe locale adı
    assert "Türkçe" in full_text
    # Dil özellikli talimat
    assert "Doğal" in full_text or "akıcı" in full_text
    # Mesaj formatı
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"


def test_build_script_prompt_en_contains_english_instruction():
    """Test 7: language=en → mesajlarda İngilizce instruction bulunur."""
    messages = build_script_prompt(
        topic="Artificial Intelligence",
        duration_seconds=60,
        language=SupportedLanguage.EN,
    )
    full_text = " ".join(m["content"] for m in messages)

    # İngilizce locale adı
    assert "English" in full_text
    # Dil özellikli talimat
    assert "Natural" in full_text or "flowing" in full_text


def test_build_script_prompt_contains_topic_and_duration():
    """build_script_prompt → konu ve süre user mesajına dahil edilir."""
    messages = build_script_prompt(
        topic="Blockchain Nedir",
        duration_seconds=120,
        language=SupportedLanguage.TR,
    )
    user_content = messages[1]["content"]
    assert "Blockchain Nedir" in user_content
    assert "120" in user_content


# ===========================================================================
# build_metadata_prompt testleri (8)
# ===========================================================================

def test_build_metadata_prompt_carries_language_field():
    """Test 8: build_metadata_prompt language field'ı taşır."""
    script = {
        "title": "Yapay Zeka Geleceği",
        "scenes": [
            {"scene_number": 1, "narration": "Yapay zeka hızla büyüyor.", "visual_cue": "office", "duration_seconds": 20}
        ],
        "total_duration_seconds": 60,
        "language": "tr",
    }
    messages = build_metadata_prompt(script=script, language=SupportedLanguage.TR)
    full_text = " ".join(m["content"] for m in messages)

    # Dil bilgisi taşınıyor
    assert "tr" in full_text
    assert "Türkçe" in full_text or "türkçe" in full_text.lower()
    assert len(messages) == 2


def test_build_metadata_prompt_en():
    """build_metadata_prompt EN diliyle doğru çalışır."""
    script = {
        "title": "AI Future",
        "scenes": [{"scene_number": 1, "narration": "AI is growing fast.", "visual_cue": "tech", "duration_seconds": 15}],
        "total_duration_seconds": 60,
        "language": "en",
    }
    messages = build_metadata_prompt(script=script, language=SupportedLanguage.EN)
    full_text = " ".join(m["content"] for m in messages)
    assert "English" in full_text


# ===========================================================================
# ScriptStepExecutor mock testleri (9, 12, 13)
# ===========================================================================

def _make_mock_llm(response_dict: dict) -> AsyncMock:
    """LLM provider mock'u oluşturur."""
    mock_provider = AsyncMock()
    mock_provider.invoke = AsyncMock(
        return_value=ProviderOutput(
            result={"content": json.dumps(response_dict), "finish_reason": "stop"},
            trace={
                "provider_id": "mock_llm",
                "model": "mock-model",
                "input_tokens": 100,
                "output_tokens": 200,
                "latency_ms": 50,
            },
            provider_id="mock_llm",
        )
    )
    return mock_provider


def _make_resolve_output(response_dict: dict) -> ProviderOutput:
    """resolve_and_invoke patch'i için ProviderOutput döndürür."""
    return ProviderOutput(
        result={"content": json.dumps(response_dict), "finish_reason": "stop"},
        trace={
            "provider_id": "mock_llm",
            "model": "mock-model",
            "input_tokens": 100,
            "output_tokens": 200,
            "latency_ms": 50,
            "resolution_role": "primary",
            "resolved_by": "provider_registry",
        },
        provider_id="mock_llm",
    )


def _make_mock_registry() -> MagicMock:
    """ProviderRegistry mock'u oluşturur."""
    return MagicMock(spec=ProviderRegistry)


def _make_mock_job(job_id: str, workspace_root: str, input_data: dict) -> MagicMock:
    """Job ORM mock'u oluşturur."""
    job = MagicMock()
    job.id = job_id
    job.input_data_json = json.dumps(input_data)
    job.workspace_path = workspace_root
    return job


def _make_mock_step(step_key: str) -> MagicMock:
    """JobStep ORM mock'u oluşturur."""
    step = MagicMock()
    step.step_key = step_key
    return step


@pytest.mark.asyncio
async def test_script_executor_calls_llm_with_correct_format():
    """Test 9: ScriptStepExecutor resolve_and_invoke'u doğru input ile çağırır."""
    script_response = {
        "title": "Test Senaryosu",
        "scenes": [
            {"scene_number": 1, "narration": "Test anlatım.", "visual_cue": "Test görsel", "duration_seconds": 30}
        ],
        "total_duration_seconds": 60,
        "language": "tr",
    }
    resolve_output = _make_resolve_output(script_response)

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "test_job")
        (Path(workspace_root) / "artifacts").mkdir(parents=True)

        job = _make_mock_job(
            job_id="test-job-001",
            workspace_root=workspace_root,
            input_data={"topic": "Test Konusu", "language": "tr", "duration_seconds": 60},
        )
        step = _make_mock_step("script")

        with patch(
            "app.modules.standard_video.executors.script.resolve_and_invoke",
            new=AsyncMock(return_value=resolve_output),
        ) as mock_resolve:
            executor = ScriptStepExecutor(registry=_make_mock_registry())
            result = await executor.execute(job, step)

            # resolve_and_invoke çağrıldı mı?
            mock_resolve.assert_called_once()
            call_args = mock_resolve.call_args[0]
            # input_data["messages"] kontrolü
            assert "messages" in call_args[2]
            assert len(call_args[2]["messages"]) == 2

        # Sonuç doğru alanları içeriyor mu?
        assert result["step"] == "script"
        assert result["language"] == "tr"
        assert result["scene_count"] == 1
        assert "provider" in result
        assert "artifact_path" in result


@pytest.mark.asyncio
async def test_script_executor_artifact_written_with_language():
    """Test 12: Artifact output'unda language field mevcut."""
    script_response = {
        "title": "Dil Testi",
        "scenes": [
            {"scene_number": 1, "narration": "Merhaba dünya.", "visual_cue": "Dünya", "duration_seconds": 10}
        ],
        "total_duration_seconds": 60,
        "language": "tr",
    }
    resolve_output = _make_resolve_output(script_response)

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "lang_test_job")

        job = _make_mock_job(
            job_id="lang-test-001",
            workspace_root=workspace_root,
            input_data={"topic": "Dil Test Konusu", "language": "tr"},
        )
        step = _make_mock_step("script")

        with patch(
            "app.modules.standard_video.executors.script.resolve_and_invoke",
            new=AsyncMock(return_value=resolve_output),
        ):
            executor = ScriptStepExecutor(registry=_make_mock_registry())
            result = await executor.execute(job, step)

        # Artifact dosyası yazıldı mı?
        artifact_path = Path(result["artifact_path"])
        assert artifact_path.exists()

        # Artifact içeriğinde language alanı var mı?
        artifact_data = json.loads(artifact_path.read_text(encoding="utf-8"))
        assert "language" in artifact_data
        assert artifact_data["language"] == "tr"


@pytest.mark.asyncio
async def test_script_executor_provider_trace_contains_language():
    """Test 13: Provider trace'de language field mevcut."""
    script_response = {
        "title": "Trace Testi",
        "scenes": [],
        "total_duration_seconds": 30,
        "language": "en",
    }
    resolve_output = _make_resolve_output(script_response)

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "trace_test_job")

        job = _make_mock_job(
            job_id="trace-test-001",
            workspace_root=workspace_root,
            input_data={"topic": "Trace Topic", "language": "en"},
        )
        step = _make_mock_step("script")

        with patch(
            "app.modules.standard_video.executors.script.resolve_and_invoke",
            new=AsyncMock(return_value=resolve_output),
        ):
            executor = ScriptStepExecutor(registry=_make_mock_registry())
            result = await executor.execute(job, step)

        # Provider trace'de language var mı?
        assert "language" in result
        assert result["language"] == "en"
        assert "provider" in result
        assert result["provider"]["provider_id"] == "mock_llm"


# ===========================================================================
# MetadataStepExecutor mock testleri (10)
# ===========================================================================

@pytest.mark.asyncio
async def test_metadata_executor_reads_script_writes_metadata():
    """Test 10: MetadataStepExecutor script okur, metadata artifact yazar."""
    metadata_response = {
        "title": "Yapay Zeka Geleceği - Türkçe",
        "description": "Bu video yapay zeka hakkında bilgi verir.",
        "tags": ["yapay zeka", "teknoloji"],
        "hashtags": ["#yapayZeka", "#teknoloji"],
        "language": "tr",
    }
    mock_llm = _make_mock_llm(metadata_response)

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "metadata_test_job")
        artifacts_dir = Path(workspace_root) / "artifacts"
        artifacts_dir.mkdir(parents=True)

        # Script artifact'ını önceden yaz
        script_data = {
            "title": "Yapay Zeka",
            "scenes": [
                {"scene_number": 1, "narration": "AI büyüyor.", "visual_cue": "future", "duration_seconds": 30}
            ],
            "total_duration_seconds": 60,
            "language": "tr",
        }
        (artifacts_dir / "script.json").write_text(
            json.dumps(script_data, ensure_ascii=False), encoding="utf-8"
        )

        job = _make_mock_job(
            job_id="metadata-test-001",
            workspace_root=workspace_root,
            input_data={"topic": "Yapay Zeka", "language": "tr"},
        )
        step = _make_mock_step("metadata")

        resolve_output = _make_resolve_output(metadata_response)
        with patch(
            "app.modules.standard_video.executors.metadata.resolve_and_invoke",
            new=AsyncMock(return_value=resolve_output),
        ) as mock_resolve:
            executor = MetadataStepExecutor(registry=_make_mock_registry())
            result = await executor.execute(job, step)

            # resolve_and_invoke çağrıldı mı?
            mock_resolve.assert_called_once()

        # Sonuç doğru mu?
        assert result["step"] == "metadata"
        assert result["language"] == "tr"
        assert "artifact_path" in result
        assert "provider" in result

        # Metadata artifact dosyası yazıldı mı?
        artifact_path = Path(result["artifact_path"])
        assert artifact_path.exists()
        artifact_data = json.loads(artifact_path.read_text(encoding="utf-8"))
        assert "language" in artifact_data
        assert artifact_data["language"] == "tr"


@pytest.mark.asyncio
async def test_metadata_executor_raises_if_script_missing():
    """MetadataStepExecutor script artifact yoksa StepExecutionError fırlatır."""
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "no_script_job")
        # artifacts dizini var ama script.json yok

        job = _make_mock_job(
            job_id="no-script-001",
            workspace_root=workspace_root,
            input_data={"topic": "Test", "language": "tr"},
        )
        step = _make_mock_step("metadata")

        with patch(
            "app.modules.standard_video.executors.metadata.resolve_and_invoke",
            new=AsyncMock(),
        ) as mock_resolve:
            executor = MetadataStepExecutor(registry=_make_mock_registry())
            with pytest.raises(StepExecutionError) as exc_info:
                await executor.execute(job, step)

            assert "Script artifact" in str(exc_info.value) or "script.json" in str(exc_info.value)
            # resolve_and_invoke çağrılmadı — hata script eksikliğinden önce oluştu
            mock_resolve.assert_not_called()


@pytest.mark.asyncio
async def test_script_executor_invalid_language_raises():
    """ScriptStepExecutor geçersiz dil → StepExecutionError (sessiz fallback yok)."""
    from app.jobs.exceptions import StepExecutionError

    with tempfile.TemporaryDirectory() as tmp_dir:
        workspace_root = str(Path(tmp_dir) / "invalid_lang_job")

        job = _make_mock_job(
            job_id="invalid-lang-001",
            workspace_root=workspace_root,
            input_data={"topic": "Test", "language": "french"},
        )
        step = _make_mock_step("script")

        with patch(
            "app.modules.standard_video.executors.script.resolve_and_invoke",
            new=AsyncMock(),
        ) as mock_resolve:
            executor = ScriptStepExecutor(registry=_make_mock_registry())
            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)

            # resolve_and_invoke çağrılmadı — geçersiz dil erken yaklandı
            mock_resolve.assert_not_called()
