"""
TTS Faz 2 — Strict resolution (NO auto-fallback) + explicit fallback testleri.

Kapsam (SABIT kurallar):
  - resolve_tts_strict primary basarisiz olursa AUTO-FALLBACK YAPMAZ
    → TTSPrimaryFailedError firlatilir.
  - explicit_provider_id allowed_fallback_provider_ids listesinde OLMAK ZORUNDA
    → degilse TTSFallbackNotAllowedError.
  - allowed list bos iken explicit fallback istenemez.
  - Fallback service audit trail'i (tts_fallback_audit.json) append-mode yazar.
  - get_job_fallback_selection Job.input_data_json._tts_fallback_selection okur.
  - TTSStepExecutor TTSPrimaryFailedError'i StepExecutionError(retryable=False)
    olarak yukselitir — auto-retry yapilmamalidir.

Testler gercek httpx cagrisi yapmaz; provider'lar AsyncMock ile simule edilir.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.jobs.exceptions import StepExecutionError
from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import (
    ConfigurationError,
    InputValidationError,
    ProviderInvokeError,
    ProviderNotFoundError,
)
from app.providers.registry import ProviderRegistry
from app.tts.fallback_service import (
    _SELECTION_KEY,
    append_fallback_audit_entry,
    clear_job_fallback_selection,
    get_job_fallback_selection,
    read_fallback_audit,
)
from app.tts.strict_resolution import (
    TTSFallbackNotAllowedError,
    TTSFallbackSelection,
    TTSPrimaryFailedError,
    TTSProviderNotFoundError,
    resolve_tts_strict,
)


# ============================================================
# Yardimcilar — sahte provider + registry
# ============================================================


class _FakeProvider(BaseProvider):
    """Parametreli davranis: success | invoke_error | nonretryable."""

    def __init__(
        self,
        provider_id: str,
        behavior: str = "success",
        *,
        trace_extra: dict | None = None,
    ) -> None:
        self._pid = provider_id
        self._behavior = behavior
        self._trace_extra = trace_extra or {}
        self.call_count = 0
        self.last_input: dict | None = None

    def provider_id(self) -> str:
        return self._pid

    def capability(self) -> ProviderCapability:
        return ProviderCapability.TTS

    async def invoke(self, input_data: dict) -> ProviderOutput:
        self.call_count += 1
        self.last_input = input_data
        if self._behavior == "invoke_error":
            raise ProviderInvokeError(self._pid, f"{self._pid} invoke failed")
        if self._behavior == "nonretryable_config":
            raise ConfigurationError(self._pid, f"{self._pid} missing config")
        if self._behavior == "nonretryable_input":
            raise InputValidationError(self._pid, f"{self._pid} bad input")
        if self._behavior == "http_timeout":
            raise httpx.TimeoutException("upstream timeout")
        # success
        return ProviderOutput(
            result={"output_path": input_data.get("output_path"), "duration_seconds": 2.5},
            trace={"voice_id": input_data.get("voice_id") or input_data.get("voice"), **self._trace_extra},
            provider_id=self._pid,
        )


def _make_registry(*providers: tuple[_FakeProvider, bool, int]) -> ProviderRegistry:
    """
    providers: (provider, is_primary, priority) tuple'lari.
    """
    reg = ProviderRegistry()
    for p, is_primary, priority in providers:
        reg.register(p, ProviderCapability.TTS, is_primary=is_primary, priority=priority)
    return reg


# ============================================================
# resolve_tts_strict — primary success
# ============================================================


def test_strict_primary_success_trace_rol_primary(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="success")
    reg = _make_registry((primary, True, 0))

    out = asyncio.run(
        resolve_tts_strict(
            reg,
            {"text": "Merhaba", "output_path": str(tmp_path / "a.mp3"), "voice_id": "v1"},
        )
    )
    assert out.provider_id == "dubvoice"
    assert out.trace["resolution_role"] == "primary"
    assert out.trace["resolved_by"] == "resolve_tts_strict"
    assert out.trace["auto_fallback_allowed"] is False
    assert primary.call_count == 1


# ============================================================
# resolve_tts_strict — primary FAIL → NO auto-fallback
# ============================================================


def test_strict_primary_invoke_error_raises_ttsprimaryfailederror(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="invoke_error")
    fallback = _FakeProvider("edge_tts", behavior="success")
    reg = _make_registry((primary, True, 0), (fallback, False, 1))

    with pytest.raises(TTSPrimaryFailedError) as exc_info:
        asyncio.run(
            resolve_tts_strict(
                reg,
                {"text": "Merhaba", "output_path": str(tmp_path / "b.mp3")},
            )
        )

    # SABIT: primary calisti, fallback ASLA cagrilmadi
    assert exc_info.value.primary_provider_id == "dubvoice"
    assert exc_info.value.allow_auto_fallback is False
    assert primary.call_count == 1
    assert fallback.call_count == 0, "Auto-fallback KAPALI olmali — fallback cagrilamaz"


def test_strict_primary_http_timeout_also_raises_ttsprimaryfailederror(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="http_timeout")
    fallback = _FakeProvider("edge_tts", behavior="success")
    reg = _make_registry((primary, True, 0), (fallback, False, 1))

    with pytest.raises(TTSPrimaryFailedError):
        asyncio.run(
            resolve_tts_strict(reg, {"text": "x", "output_path": str(tmp_path / "t.mp3")})
        )
    assert fallback.call_count == 0


def test_strict_primary_nonretryable_passes_through(tmp_path: Path):
    """Config/input hatalari NonRetryableProviderError olarak yukseltilir."""
    primary = _FakeProvider("dubvoice", behavior="nonretryable_config")
    reg = _make_registry((primary, True, 0))

    with pytest.raises(ConfigurationError):
        asyncio.run(
            resolve_tts_strict(reg, {"text": "x", "output_path": str(tmp_path / "c.mp3")})
        )


def test_strict_no_provider_registered_raises_providernotfound(tmp_path: Path):
    reg = ProviderRegistry()  # bos registry

    with pytest.raises(TTSProviderNotFoundError):
        asyncio.run(
            resolve_tts_strict(reg, {"text": "x", "output_path": str(tmp_path / "n.mp3")})
        )


# ============================================================
# resolve_tts_strict — explicit fallback
# ============================================================


def test_strict_explicit_fallback_success_trace_rol_explicit(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="invoke_error")
    fallback = _FakeProvider("edge_tts", behavior="success")
    reg = _make_registry((primary, True, 0), (fallback, False, 1))

    out = asyncio.run(
        resolve_tts_strict(
            reg,
            {"text": "Merhaba", "output_path": str(tmp_path / "e.mp3"), "voice": "tr-TR-AhmetNeural"},
            explicit_provider_id="edge_tts",
            allowed_fallback_provider_ids=["edge_tts", "system_tts"],
        )
    )
    assert out.provider_id == "edge_tts"
    assert out.trace["resolution_role"] == "explicit_fallback"
    assert out.trace["resolved_by"] == "resolve_tts_strict"
    assert out.trace["auto_fallback_allowed"] is False
    # Primary hic cagrilmamali — operator direkt edge_tts secti
    assert primary.call_count == 0
    assert fallback.call_count == 1


def test_strict_explicit_fallback_provider_not_in_allowed_raises(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="success")
    fallback = _FakeProvider("edge_tts", behavior="success")
    reg = _make_registry((primary, True, 0), (fallback, False, 1))

    with pytest.raises(TTSFallbackNotAllowedError):
        asyncio.run(
            resolve_tts_strict(
                reg,
                {"text": "x", "output_path": str(tmp_path / "x.mp3")},
                explicit_provider_id="edge_tts",
                allowed_fallback_provider_ids=["system_tts"],  # edge_tts YOK
            )
        )


def test_strict_explicit_fallback_with_empty_allowed_list_raises(tmp_path: Path):
    primary = _FakeProvider("dubvoice", behavior="success")
    reg = _make_registry((primary, True, 0))

    with pytest.raises(TTSFallbackNotAllowedError):
        asyncio.run(
            resolve_tts_strict(
                reg,
                {"text": "x", "output_path": str(tmp_path / "e.mp3")},
                explicit_provider_id="edge_tts",
                allowed_fallback_provider_ids=None,
            )
        )


def test_strict_explicit_fallback_provider_not_registered_raises(tmp_path: Path):
    """Allowed listte ama registry'de yok → TTSProviderNotFoundError."""
    primary = _FakeProvider("dubvoice", behavior="success")
    reg = _make_registry((primary, True, 0))

    with pytest.raises(TTSProviderNotFoundError):
        asyncio.run(
            resolve_tts_strict(
                reg,
                {"text": "x", "output_path": str(tmp_path / "y.mp3")},
                explicit_provider_id="edge_tts",
                allowed_fallback_provider_ids=["edge_tts"],
            )
        )


# ============================================================
# fallback_service — audit trail & selection persistence
# ============================================================


def test_audit_trail_append_mode_creates_and_extends(tmp_path: Path):
    job_id = "job-audit-1"
    workspace_root = str(tmp_path / job_id)

    sel1 = TTSFallbackSelection(
        provider_id="edge_tts",
        selected_by="admin@contenthub.local",
        selected_at="2026-04-15T21:00:00Z",
        reason="dubvoice timeout",
    )
    sel2 = TTSFallbackSelection(
        provider_id="system_tts",
        selected_by="admin@contenthub.local",
        selected_at="2026-04-15T21:05:00Z",
        reason="edge_tts quota",
    )

    path1 = append_fallback_audit_entry(
        workspace_root, job_id, selection=sel1, primary_failure="DubVoice POST /tts 504"
    )
    assert path1.exists()

    audit = read_fallback_audit(workspace_root, job_id)
    assert len(audit["entries"]) == 1
    assert audit["entries"][0]["provider_id"] == "edge_tts"
    assert audit["entries"][0]["selected_by"] == "admin@contenthub.local"
    assert audit["entries"][0]["primary_failure"] == "DubVoice POST /tts 504"

    # Ikinci entry append olmali
    append_fallback_audit_entry(workspace_root, job_id, selection=sel2)
    audit2 = read_fallback_audit(workspace_root, job_id)
    assert len(audit2["entries"]) == 2
    assert audit2["entries"][1]["provider_id"] == "system_tts"
    # Ikinci entry primary_failure icermez (opsiyonel)
    assert "primary_failure" not in audit2["entries"][1]


def test_read_audit_missing_file_returns_empty_skeleton(tmp_path: Path):
    result = read_fallback_audit(str(tmp_path / "nope"), "ghost-job")
    assert result == {"entries": []}


def test_get_job_fallback_selection_returns_none_when_not_set():
    job = MagicMock()
    job.input_data_json = json.dumps({"topic": "test"})
    assert get_job_fallback_selection(job) is None


def test_get_job_fallback_selection_returns_selection_when_set():
    job = MagicMock()
    job.input_data_json = json.dumps({
        "topic": "test",
        _SELECTION_KEY: {
            "provider_id": "edge_tts",
            "selected_by": "operator@ch.local",
            "selected_at": "2026-04-15T20:00:00Z",
            "reason": "manual fallback",
        },
    })
    sel = get_job_fallback_selection(job)
    assert sel is not None
    assert sel.provider_id == "edge_tts"
    assert sel.selected_by == "operator@ch.local"
    assert sel.reason == "manual fallback"


def test_get_job_fallback_selection_ignores_entry_without_provider_id():
    job = MagicMock()
    job.input_data_json = json.dumps({
        _SELECTION_KEY: {"selected_by": "x"},  # provider_id yok
    })
    assert get_job_fallback_selection(job) is None


def test_clear_job_fallback_selection_removes_key():
    job = MagicMock()
    job.input_data_json = json.dumps({
        "topic": "t",
        _SELECTION_KEY: {"provider_id": "edge_tts"},
    })
    clear_job_fallback_selection(job)
    data = json.loads(job.input_data_json)
    assert _SELECTION_KEY not in data
    assert data["topic"] == "t"


# ============================================================
# Executor integration — primary fail → StepExecutionError retryable=False
# ============================================================


def _write_script_artifact(workspace_root: str, scenes: list[dict]) -> None:
    artifacts_dir = Path(workspace_root) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "script.json").write_text(
        json.dumps({"scenes": scenes, "language": "tr"}, ensure_ascii=False),
        encoding="utf-8",
    )


def _make_job_mock(job_id: str, workspace_root: str, selection: dict | None = None) -> MagicMock:
    data = {
        "topic": "Test",
        "language": "tr",
        "workspace_root": workspace_root,
    }
    if selection is not None:
        data[_SELECTION_KEY] = selection
    job = MagicMock()
    job.id = job_id
    job.workspace_path = None
    job.input_data_json = json.dumps(data)
    return job


@pytest.mark.asyncio
async def test_executor_primary_fail_raises_step_execution_error_non_retryable():
    """
    Executor TTSPrimaryFailedError'i StepExecutionError(retryable=False) olarak
    yukseltmelidir. Auto-retry yapilmamalidir.
    """
    from app.modules.standard_video.executors import TTSStepExecutor

    with tempfile.TemporaryDirectory() as tmpdir:
        job_id = "job-fail-1"
        workspace_root = str(Path(tmpdir) / job_id)
        _write_script_artifact(workspace_root, [
            {"scene_number": 1, "narration": "Merhaba.", "visual_cue": ""},
        ])
        job = _make_job_mock(job_id, workspace_root)
        step = MagicMock()

        # Mock registry — 'edge_tts' primary gibi davransin
        reg = MagicMock(spec=ProviderRegistry)
        primary_mock = MagicMock()
        primary_mock.provider_id = MagicMock(return_value="edge_tts")
        reg.get_primary = MagicMock(return_value=primary_mock)

        # resolve_tts_strict TTSPrimaryFailedError firlatsin
        async def _raise(*args, **kwargs):
            raise TTSPrimaryFailedError(
                primary_provider_id="edge_tts",
                original_error=ProviderInvokeError("edge_tts", "edge_tts down"),
                allow_auto_fallback=False,
            )

        with patch(
            "app.modules.standard_video.executors.tts.resolve_tts_strict",
            new=AsyncMock(side_effect=_raise),
        ):
            executor = TTSStepExecutor(registry=reg)
            with pytest.raises(StepExecutionError) as exc_info:
                await executor.execute(job, step)

            err = exc_info.value
            assert err.retryable is False
            assert "auto-fallback KAPALI" in str(err) or "basarisiz" in str(err).lower()


@pytest.mark.asyncio
async def test_executor_uses_explicit_fallback_when_selection_present():
    """
    Job.input_data_json._tts_fallback_selection varsa executor bu provider'i
    kullanir ve resolve_tts_strict'i explicit_provider_id ile cagirir.
    """
    from app.modules.standard_video.executors import TTSStepExecutor

    captured_kwargs: dict = {}

    async def _capture(registry, input_data, **kwargs):
        captured_kwargs.update(kwargs)
        # Test dosyasini olustur (executor duration olcumu yapiyor)
        output_path = input_data.get("output_path")
        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(b"FAKE_MP3")
        return ProviderOutput(
            result={"output_path": output_path, "duration_seconds": 3.0},
            trace={"resolution_role": "explicit_fallback"},
            provider_id="edge_tts",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        job_id = "job-explicit-1"
        workspace_root = str(Path(tmpdir) / job_id)
        _write_script_artifact(workspace_root, [
            {"scene_number": 1, "narration": "Merhaba.", "visual_cue": ""},
        ])
        job = _make_job_mock(
            job_id,
            workspace_root,
            selection={
                "provider_id": "edge_tts",
                "selected_by": "admin@ch",
                "selected_at": "2026-04-15T21:00:00Z",
                "reason": "dubvoice timeout",
            },
        )
        step = MagicMock()

        reg = MagicMock(spec=ProviderRegistry)
        # Explicit fallback kullanildiginda registry.get_primary cagrilmamali
        reg.get_primary = MagicMock(side_effect=AssertionError(
            "Explicit fallback varsa primary secilmemeli"
        ))

        with patch(
            "app.modules.standard_video.executors.tts.resolve_tts_strict",
            new=AsyncMock(side_effect=_capture),
        ):
            executor = TTSStepExecutor(registry=reg)
            result = await executor.execute(job, step)

        assert captured_kwargs.get("explicit_provider_id") == "edge_tts"
        assert result["provider"]["provider_id"] == "edge_tts"
        assert result["provider"]["explicit_fallback_used"] is True
        assert result["provider"]["auto_fallback_allowed"] is False
        assert "explicit_fallback_selection" in result
        assert result["explicit_fallback_selection"]["provider_id"] == "edge_tts"
