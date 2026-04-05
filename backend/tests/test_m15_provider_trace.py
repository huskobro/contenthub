"""
M15: Provider Trace Foundation testleri.

Test edilen:
  - build_provider_trace yapisal dict olusturur
  - build_provider_trace tum alanlari icermelidir
  - TraceTimer gecikme suresi olcer
  - Executor result dict'inde provider_trace anahtari dogrulama
"""

import time
from app.providers.trace_helper import build_provider_trace, TraceTimer


def test_build_provider_trace_basic():
    """build_provider_trace temel alanlari iceren dict olusturur."""
    trace = build_provider_trace(
        provider_name="openai-gpt4o",
        provider_kind="llm",
        step_key="script",
        success=True,
        latency_ms=1234,
        model="gpt-4o",
        input_tokens=500,
        output_tokens=200,
    )
    assert trace["provider_name"] == "openai-gpt4o"
    assert trace["provider_kind"] == "llm"
    assert trace["step_key"] == "script"
    assert trace["success"] is True
    assert trace["latency_ms"] == 1234
    assert trace["model"] == "gpt-4o"
    assert trace["input_tokens"] == 500
    assert trace["output_tokens"] == 200
    assert trace["created_at"] is not None
    assert "extra" not in trace


def test_build_provider_trace_with_error():
    """build_provider_trace hata bilgisi icermelidir."""
    trace = build_provider_trace(
        provider_name="openai-gpt4o",
        provider_kind="llm",
        step_key="script",
        success=False,
        latency_ms=500,
        error_type="rate_limit",
        error_message="Rate limit exceeded",
    )
    assert trace["success"] is False
    assert trace["error_type"] == "rate_limit"
    assert trace["error_message"] == "Rate limit exceeded"


def test_build_provider_trace_with_extra():
    """build_provider_trace extra alanlari icermelidir."""
    trace = build_provider_trace(
        provider_name="edge_tts",
        provider_kind="tts",
        step_key="tts",
        success=True,
        latency_ms=800,
        extra={"voice": "tr-TR-AhmetNeural", "total_chars": 1500},
    )
    assert trace["extra"]["voice"] == "tr-TR-AhmetNeural"
    assert trace["extra"]["total_chars"] == 1500


def test_build_provider_trace_with_cost():
    """build_provider_trace maliyet tahmini icermelidir."""
    trace = build_provider_trace(
        provider_name="openai-gpt4o",
        provider_kind="llm",
        step_key="metadata",
        success=True,
        latency_ms=900,
        cost_usd_estimate=0.015,
    )
    assert trace["cost_usd_estimate"] == 0.015


def test_build_provider_trace_required_fields():
    """build_provider_trace gerekli tum alanlara sahip olmali."""
    trace = build_provider_trace(
        provider_name="test",
        provider_kind="internal",
        step_key="test_step",
        success=True,
        latency_ms=0,
    )
    required_keys = [
        "provider_name", "provider_kind", "step_key", "model",
        "success", "latency_ms", "input_tokens", "output_tokens",
        "cost_usd_estimate", "error_type", "error_message", "created_at",
    ]
    for key in required_keys:
        assert key in trace, f"Missing required key: {key}"


def test_trace_timer():
    """TraceTimer gecikme suresi olcer."""
    with TraceTimer() as t:
        time.sleep(0.05)  # 50ms
    assert t.latency_ms >= 40  # tolerans
    assert t.latency_ms < 500  # makul ust sinir


def test_trace_timer_default():
    """TraceTimer bos birakilirsa 0 doner."""
    t = TraceTimer()
    assert t.latency_ms == 0
