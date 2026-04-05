"""
Provider Trace Helper — M15.

Executor'lar icin standart provider trace dict'i olusturur.
Pipeline, executor result dict'ini provider_trace_json olarak step'e yazar.
Bu helper trace bilgisini yapisal ve okunabilir hale getirir.
"""

import time
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def build_provider_trace(
    *,
    provider_name: str,
    provider_kind: str,
    step_key: str,
    success: bool,
    latency_ms: int,
    model: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    cost_usd_estimate: Optional[float] = None,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    extra: Optional[dict] = None,
) -> dict:
    """
    Yapisal provider trace dict'i olusturur.

    Pipeline bu dict'i JSON olarak step.provider_trace_json'a yazar.
    Frontend Job Detail sayfasinda bu yapiya gore goruntuleme yapar.
    """
    trace = {
        "provider_name": provider_name,
        "provider_kind": provider_kind,
        "step_key": step_key,
        "model": model,
        "success": success,
        "latency_ms": latency_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd_estimate": cost_usd_estimate,
        "error_type": error_type,
        "error_message": error_message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        trace["extra"] = extra
    return trace


class TraceTimer:
    """Context manager: provider cagrisi gecikme suresi olcer."""

    def __init__(self):
        self._start: Optional[float] = None
        self.latency_ms: int = 0

    def __enter__(self):
        self._start = time.monotonic()
        return self

    def __exit__(self, *args):
        if self._start is not None:
            self.latency_ms = int((time.monotonic() - self._start) * 1000)
