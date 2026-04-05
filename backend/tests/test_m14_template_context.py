"""
M14-B: Template Context Completion — executor consumer/non-consumer matrix tests.

Tests cover:
  - TTS executor voice_style override from template context
  - TTS executor without template context (backward compat)
  - TTS executor with template context but no voice_style (no override)
  - Non-consumer executors documented as intentional non-consumers
  - Full consumer matrix verification
"""

from __future__ import annotations

import inspect
import json

import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.modules.standard_video.executors.tts import TTSStepExecutor
from app.modules.standard_video.executors.subtitle import SubtitleStepExecutor
from app.modules.standard_video.executors.render_still import RenderStillExecutor
from app.modules.standard_video.executors.render import RenderStepExecutor


def _make_mock_job(input_data: dict, template_ctx=None):
    """Create a mock Job with optional template context."""
    job = MagicMock()
    job.id = "test-m14-tpl"
    job.input_data_json = json.dumps(input_data)
    job.workspace_path = None
    if template_ctx is not None:
        object.__setattr__(job, '_template_context', template_ctx)
    return job


def _make_mock_step():
    step = MagicMock()
    step.id = "step-m14"
    return step


TEMPLATE_CTX_WITH_VOICE = {
    "template_id": "tpl-1",
    "template_name": "Test Template",
    "template_version": 1,
    "link_role": "primary",
    "content_rules": {"tone": "energetic"},
    "publish_profile": None,
    "style_blueprint": {
        "id": "bp-1",
        "name": "Test Blueprint",
        "version": 1,
        "visual_rules": None,
        "motion_rules": {"voice_style": "tr-TR-EmelNeural"},
        "layout_rules": None,
        "subtitle_rules": None,
        "thumbnail_rules": None,
    },
}

TEMPLATE_CTX_NO_VOICE = {
    "template_id": "tpl-2",
    "template_name": "No Voice Template",
    "template_version": 1,
    "link_role": "primary",
    "content_rules": None,
    "publish_profile": None,
    "style_blueprint": {
        "id": "bp-2",
        "name": "Minimal Blueprint",
        "version": 1,
        "visual_rules": None,
        "motion_rules": {},
        "layout_rules": None,
        "subtitle_rules": None,
        "thumbnail_rules": None,
    },
}

TEMPLATE_CTX_NO_BLUEPRINT = {
    "template_id": "tpl-3",
    "template_name": "No Blueprint Template",
    "template_version": 1,
    "link_role": "primary",
    "content_rules": None,
    "publish_profile": None,
    "style_blueprint": None,
}

JOB_INPUT = {
    "topic": "test",
    "duration_seconds": 30,
    "language": "tr",
    "workspace_root": "/tmp/test",
}


class TestTTSTemplateContext:
    """TTS executor template context consumption tests."""

    @pytest.mark.asyncio
    async def test_tts_voice_override_from_template(self):
        """TTS executor should use voice_style from template blueprint motion_rules."""
        job = _make_mock_job(JOB_INPUT, template_ctx=TEMPLATE_CTX_WITH_VOICE)
        step = _make_mock_step()

        registry = MagicMock()
        executor = TTSStepExecutor(registry=registry)

        with patch("app.modules.standard_video.executors.tts._read_artifact") as mock_read, \
             patch("app.modules.standard_video.executors.tts._resolve_artifact_path") as mock_path, \
             patch("app.modules.standard_video.executors.tts._write_artifact") as mock_write, \
             patch("app.modules.standard_video.executors.tts.resolve_and_invoke") as mock_invoke:

            # manifest does not exist → proceed with TTS
            mock_artifact_path = MagicMock()
            mock_artifact_path.exists.return_value = False
            mock_artifact_path.parent = MagicMock()
            mock_path.return_value = mock_artifact_path

            mock_read.return_value = {
                "scenes": [{"narration": "Test metin", "scene_number": 1}],
            }
            mock_write.return_value = "/tmp/test/artifacts/audio_manifest.json"

            invoke_result = MagicMock()
            invoke_result.result = {"duration_seconds": 2.0}
            mock_invoke.return_value = invoke_result

            result = await executor.execute(job, step)

            # Verify template_info in result
            assert result.get("template_info") is not None
            assert result["template_info"]["template_id"] == "tpl-1"
            assert result["template_info"]["template_name"] == "Test Template"
            assert result.get("voice_style_override_applied") is True

            # Verify the TTS was called with overridden voice
            assert mock_invoke.called
            call_kwargs = mock_invoke.call_args
            invoke_params = call_kwargs[0][2]  # third positional arg = params dict
            assert invoke_params["voice"] == "tr-TR-EmelNeural"

            # Verify result voice is the overridden value
            assert result["voice"] == "tr-TR-EmelNeural"

    @pytest.mark.asyncio
    async def test_tts_without_template_context(self):
        """TTS executor should work normally without template context."""
        job = _make_mock_job(JOB_INPUT)
        step = _make_mock_step()

        registry = MagicMock()
        executor = TTSStepExecutor(registry=registry)

        with patch("app.modules.standard_video.executors.tts._read_artifact") as mock_read, \
             patch("app.modules.standard_video.executors.tts._resolve_artifact_path") as mock_path, \
             patch("app.modules.standard_video.executors.tts._write_artifact") as mock_write, \
             patch("app.modules.standard_video.executors.tts.resolve_and_invoke") as mock_invoke:

            mock_artifact_path = MagicMock()
            mock_artifact_path.exists.return_value = False
            mock_artifact_path.parent = MagicMock()
            mock_path.return_value = mock_artifact_path

            mock_read.return_value = {
                "scenes": [{"narration": "Test metin", "scene_number": 1}],
            }
            mock_write.return_value = "/tmp/test/artifacts/audio_manifest.json"

            invoke_result = MagicMock()
            invoke_result.result = {"duration_seconds": 2.0}
            mock_invoke.return_value = invoke_result

            result = await executor.execute(job, step)

            # No template_info in result
            assert result.get("template_info") is None
            assert result.get("voice_style_override_applied") is None

    @pytest.mark.asyncio
    async def test_tts_template_context_without_voice_style(self):
        """TTS executor should use default voice when template has no voice_style."""
        job = _make_mock_job(JOB_INPUT, template_ctx=TEMPLATE_CTX_NO_VOICE)
        step = _make_mock_step()

        registry = MagicMock()
        executor = TTSStepExecutor(registry=registry)

        with patch("app.modules.standard_video.executors.tts._read_artifact") as mock_read, \
             patch("app.modules.standard_video.executors.tts._resolve_artifact_path") as mock_path, \
             patch("app.modules.standard_video.executors.tts._write_artifact") as mock_write, \
             patch("app.modules.standard_video.executors.tts.resolve_and_invoke") as mock_invoke:

            mock_artifact_path = MagicMock()
            mock_artifact_path.exists.return_value = False
            mock_artifact_path.parent = MagicMock()
            mock_path.return_value = mock_artifact_path

            mock_read.return_value = {
                "scenes": [{"narration": "Test metin", "scene_number": 1}],
            }
            mock_write.return_value = "/tmp/test/artifacts/audio_manifest.json"

            invoke_result = MagicMock()
            invoke_result.result = {"duration_seconds": 2.0}
            mock_invoke.return_value = invoke_result

            result = await executor.execute(job, step)

            # template_info should exist but no voice override
            assert result.get("template_info") is not None
            assert result["template_info"]["template_id"] == "tpl-2"
            assert result.get("voice_style_override_applied") is False

            # voice should NOT be overridden — default Turkish voice used
            assert mock_invoke.called
            call_kwargs = mock_invoke.call_args
            invoke_params = call_kwargs[0][2]
            assert invoke_params["voice"] != "tr-TR-EmelNeural"

    @pytest.mark.asyncio
    async def test_tts_template_context_no_blueprint(self):
        """TTS executor should handle template context with no style_blueprint."""
        job = _make_mock_job(JOB_INPUT, template_ctx=TEMPLATE_CTX_NO_BLUEPRINT)
        step = _make_mock_step()

        registry = MagicMock()
        executor = TTSStepExecutor(registry=registry)

        with patch("app.modules.standard_video.executors.tts._read_artifact") as mock_read, \
             patch("app.modules.standard_video.executors.tts._resolve_artifact_path") as mock_path, \
             patch("app.modules.standard_video.executors.tts._write_artifact") as mock_write, \
             patch("app.modules.standard_video.executors.tts.resolve_and_invoke") as mock_invoke:

            mock_artifact_path = MagicMock()
            mock_artifact_path.exists.return_value = False
            mock_artifact_path.parent = MagicMock()
            mock_path.return_value = mock_artifact_path

            mock_read.return_value = {
                "scenes": [{"narration": "Test metin", "scene_number": 1}],
            }
            mock_write.return_value = "/tmp/test/artifacts/audio_manifest.json"

            invoke_result = MagicMock()
            invoke_result.result = {"duration_seconds": 2.0}
            mock_invoke.return_value = invoke_result

            result = await executor.execute(job, step)

            # template_info should exist but voice_style_override_applied=False
            assert result.get("template_info") is not None
            assert result["template_info"]["template_id"] == "tpl-3"
            assert result.get("voice_style_override_applied") is False


class TestNonConsumerExecutors:
    """Verify non-consumer executors are documented as intentional non-consumers."""

    def test_subtitle_executor_is_documented_non_consumer(self):
        """SubtitleStepExecutor should have non-consumer documentation."""
        source = inspect.getsource(SubtitleStepExecutor)
        assert "NON-CONSUMER" in source
        assert "intentional" in source.lower()
        assert "timing engine" in source.lower()

    def test_render_still_executor_is_documented_non_consumer(self):
        """RenderStillExecutor should have non-consumer documentation."""
        source = inspect.getsource(RenderStillExecutor)
        assert "NON-CONSUMER" in source
        assert "intentional" in source.lower()
        assert "preview" in source.lower()

    def test_render_executor_is_documented_non_consumer(self):
        """RenderStepExecutor should have non-consumer documentation."""
        source = inspect.getsource(RenderStepExecutor)
        assert "NON-CONSUMER" in source
        assert "intentional" in source.lower()
        assert "composition" in source.lower()


class TestConsumerMatrix:
    """Verify the full consumer/non-consumer matrix across all 8 executors."""

    def test_tts_is_consumer(self):
        """TTS executor should read _template_context in its execute method."""
        source = inspect.getsource(TTSStepExecutor.execute)
        assert "_template_context" in source
        assert "voice_style_override" in source

    def test_subtitle_does_not_consume_template_context(self):
        """SubtitleStepExecutor.execute should NOT reference _template_context."""
        source = inspect.getsource(SubtitleStepExecutor.execute)
        assert "_template_context" not in source

    def test_render_still_does_not_consume_template_context(self):
        """RenderStillExecutor.execute should NOT reference _template_context."""
        source = inspect.getsource(RenderStillExecutor.execute)
        assert "_template_context" not in source

    def test_render_does_not_consume_template_context(self):
        """RenderStepExecutor.execute should NOT reference _template_context."""
        source = inspect.getsource(RenderStepExecutor.execute)
        assert "_template_context" not in source
