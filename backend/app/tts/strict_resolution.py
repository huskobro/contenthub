"""
TTS strict resolution — Faz 2.

Hard rule (SABIT):
  TTS primary basarisiz olursa OTOMATIK FALLBACK YAPILMAZ.
  Step FAIL, Job FAIL, `last_error` acik sebep ile doldurulur.

Kullanici/operator `Explicit Fallback Aksiyonu` ile secim yaparsa:
  - Secilen provider_id `tts.fallback_providers` listesinde OLMAK ZORUNDA.
  - Secim sadece OZELLIKLE belirtilen job'un bir sonraki retry'inde kullanilir.
  - Secim audit trail'e yazilir (tts_fallback_audit.json).

Bu modul:
  - resolve_tts_strict(registry, input_data, explicit_provider_id=None) saglar.
  - resolve_and_invoke'u KULLANMAZ — tek provider calistirir, fallback'e gecmez.

Hata turleri:
  - TTSPrimaryFailedError: Primary calisti ama hata firlatti (retryable=True).
  - TTSConfigurationError: API key vb. Non-retryable (NonRetryableProviderError
    zaten ustunde, bu burada anlamli degil — provider zaten yukselter).
  - TTSFallbackNotAllowedError: Explicit fallback istendi ama liste disi.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from app.providers.base import ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import (
    NonRetryableProviderError,
    ProviderInvokeError,
    ProviderNotFoundError,
)
from app.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


@dataclass
class TTSFallbackSelection:
    """Explicit fallback secimi — audit + invoke icin ortak veri yapisi."""

    provider_id: str
    selected_by: str
    selected_at: str
    reason: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "provider_id": self.provider_id,
            "selected_by": self.selected_by,
            "selected_at": self.selected_at,
            "reason": self.reason,
        }


class TTSPrimaryFailedError(Exception):
    """
    Primary TTS calisti ama hata firlatti. Auto-fallback yapilmadi.

    step.last_error alanina bu hata yazilir. Operator panelden explicit
    fallback secimi yapabilir veya provider konfigurasyonunu duzeltir.
    """

    def __init__(
        self,
        primary_provider_id: str,
        original_error: Exception,
        allow_auto_fallback: bool = False,
    ) -> None:
        self.primary_provider_id = primary_provider_id
        self.original_error = original_error
        self.allow_auto_fallback = allow_auto_fallback
        super().__init__(
            f"TTS primary '{primary_provider_id}' basarisiz (auto-fallback YAPILMADI): "
            f"{original_error}"
        )


class TTSFallbackNotAllowedError(Exception):
    """Explicit fallback istendi ama provider_id izin verilen listede degil."""


class TTSProviderNotFoundError(Exception):
    """Registry'de TTS capability icin provider yok."""


async def resolve_tts_strict(
    registry: ProviderRegistry,
    input_data: dict,
    *,
    explicit_provider_id: Optional[str] = None,
    allowed_fallback_provider_ids: Optional[list[str]] = None,
) -> ProviderOutput:
    """
    TTS invoke — NO AUTO-FALLBACK.

    Davranis:
      - explicit_provider_id=None → registry.get_primary(TTS) calistir.
        Hata → TTSPrimaryFailedError (fallback DENENMEZ).
      - explicit_provider_id verildi → allowed_fallback_provider_ids listesinde
        olmali. Degilse TTSFallbackNotAllowedError.
        Izinli ise, o provider'i REGISTRY'den cek ve invoke et. Basarisizligi
        dogrudan yukselt (ayni provider'in ikinci denemesi yine auto-fallback
        olarak sayilmaz; kullanici tekrar secim yapar).

    Args:
        registry: Provider kayit defteri.
        input_data: Provider'a gondermekte olan payload (TTSRequest.to_provider_input).
        explicit_provider_id: Operator secimi (None → primary kullan).
        allowed_fallback_provider_ids: tts.fallback_providers setting degeri.

    Returns:
        ProviderOutput — trace'e resolution_role (primary | explicit_fallback),
        resolved_by="resolve_tts_strict" eklenir.

    Raises:
        TTSProviderNotFoundError: Registry'de TTS yok.
        TTSFallbackNotAllowedError: Explicit fallback izinli degil.
        TTSPrimaryFailedError: Primary (veya secilen explicit) provider hata firlatti.
        NonRetryableProviderError: Provider config/input hatasi (zaten yukselmeli).
    """
    # 1) Provider sec
    if explicit_provider_id:
        if not allowed_fallback_provider_ids:
            raise TTSFallbackNotAllowedError(
                f"Explicit fallback istendi ({explicit_provider_id}) ama "
                f"allowed list bos — tts.fallback_providers setting'i kontrol et."
            )
        if explicit_provider_id not in allowed_fallback_provider_ids:
            raise TTSFallbackNotAllowedError(
                f"Provider '{explicit_provider_id}' tts.fallback_providers "
                f"listesinde degil. Izinli: {allowed_fallback_provider_ids}"
            )

        # Registry'den istenen provider'i bul
        provider = None
        for entry in registry.list_by_capability(ProviderCapability.TTS):
            if (
                entry.provider.provider_id() == explicit_provider_id
                and entry.enabled
            ):
                provider = entry.provider
                break
        if provider is None:
            raise TTSProviderNotFoundError(
                f"Explicit fallback provider '{explicit_provider_id}' registry'de "
                f"kayitli degil veya disabled."
            )
        role = "explicit_fallback"
    else:
        try:
            provider = registry.get_primary(ProviderCapability.TTS)
        except ProviderNotFoundError as exc:
            raise TTSProviderNotFoundError(
                f"TTS capability icin primary yok: {exc}"
            ) from exc
        role = "primary"

    # 2) Invoke — tek provider, fallback YOK
    started = time.monotonic()
    provider_id = provider.provider_id()
    try:
        output = await provider.invoke(input_data)
        latency_ms = int((time.monotonic() - started) * 1000)
        registry.record_outcome(
            capability=ProviderCapability.TTS,
            provider_id=provider_id,
            success=True,
            latency_ms=latency_ms,
        )
        output.trace["resolution_role"] = role
        output.trace["resolved_by"] = "resolve_tts_strict"
        output.trace["auto_fallback_allowed"] = False
        return output

    except NonRetryableProviderError:
        latency_ms = int((time.monotonic() - started) * 1000)
        registry.record_outcome(
            capability=ProviderCapability.TTS,
            provider_id=provider_id,
            success=False,
            latency_ms=latency_ms,
            error_message="NonRetryableProviderError — fallback yapilmadi",
        )
        raise

    except (ProviderInvokeError, httpx.TimeoutException, httpx.ConnectError) as exc:
        latency_ms = int((time.monotonic() - started) * 1000)
        # Faz 4: bare `str(exc)` on httpx TimeoutException / ConnectError
        # collapsed to an empty string, so provider-health outcomes showed
        # "failed — (no detail)". Including the type name makes the failure
        # self-describing in the health registry and in downstream UI.
        error_detail = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
        registry.record_outcome(
            capability=ProviderCapability.TTS,
            provider_id=provider_id,
            success=False,
            latency_ms=latency_ms,
            error_message=error_detail,
        )
        logger.warning(
            "resolve_tts_strict: TTS provider=%s rol=%s basarisiz (AUTO-FALLBACK YOK): %s",
            provider_id,
            role,
            exc,
        )
        raise TTSPrimaryFailedError(
            primary_provider_id=provider_id,
            original_error=exc,
            allow_auto_fallback=False,
        ) from exc
