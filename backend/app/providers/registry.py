"""
Provider kayıt defteri — capability bazlı provider çözümleme (M3-C1 / M3-C3).

Tek resmi provider çözümleme noktası. dispatcher.py ve executor'lar
provider'a bu registry üzerinden erişir.

Bu dosyada:
  - Capability bazlı kayıt
  - Primary/fallback zinciri çözümleme
  - Admin default seam (M3-C3 — bellekte; settings DB bağlantısı M4+)
  - Runtime health takibi (M3-C3): invoke_count, error_count, son hata, gecikme

Bu dosyada DEĞIL:
  - HTTP health polling (gelecek)
  - invoke mantığı (resolution.py)
  - Maliyet DB kalıcılığı (M4+)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.providers.capability import ProviderCapability
from app.providers.base import BaseProvider
from app.providers.exceptions import ProviderNotFoundError


@dataclass
class ProviderEntry:
    """
    Kayıtlı bir provider kaydı.

    Health alanları resolution.py tarafından record_outcome() üzerinden güncellenir.
    Doğrudan değiştirilmemeli.
    """

    provider: BaseProvider
    is_primary: bool = True   # False = fallback
    priority: int = 0         # Düşük sayı = daha önce denenir
    enabled: bool = True

    # Runtime health — M3-C3
    invoke_count: int = 0
    error_count: int = 0
    last_error: Optional[str] = None          # Son hata mesajı (None = hiç hata yok)
    last_used_at: Optional[datetime] = None   # Son başarılı invoke zamanı (UTC)
    last_latency_ms: Optional[int] = None     # Son başarılı invoke gecikme süresi


class ProviderRegistry:
    """
    Capability bazlı provider kayıt defteri.

    Kullanım:
      registry.register(llm_provider, ProviderCapability.LLM, is_primary=True)
      registry.register(fallback_llm, ProviderCapability.LLM, is_primary=False)

      primary = registry.get_primary(ProviderCapability.LLM)
      chain   = registry.get_chain(ProviderCapability.LLM)   # [primary, fallback1, ...]
    """

    def __init__(self) -> None:
        # capability → kayıtlı entry listesi
        self._entries: dict[ProviderCapability, list[ProviderEntry]] = {}
        # Admin default seam — M3-C3'te settings registry ile bağlanacak
        self._defaults: dict[ProviderCapability, str] = {}

    # ------------------------------------------------------------------
    # Kayıt
    # ------------------------------------------------------------------

    def register(
        self,
        provider: BaseProvider,
        capability: ProviderCapability,
        is_primary: bool = True,
        priority: int = 0,
    ) -> None:
        """Provider'ı belirtilen capability için kaydeder."""
        if capability not in self._entries:
            self._entries[capability] = []
        entry = ProviderEntry(
            provider=provider,
            is_primary=is_primary,
            priority=priority,
        )
        self._entries[capability].append(entry)

    # ------------------------------------------------------------------
    # Çözümleme
    # ------------------------------------------------------------------

    def get_primary(self, capability: ProviderCapability) -> BaseProvider:
        """
        Capability için birincil (primary) provider'ı döner.

        Admin default ayarlanmışsa o provider_id ile kayıtlı birincil döner;
        yoksa öncelik sırasındaki ilk primary döner.
        Bulunamazsa ProviderNotFoundError fırlatır.
        """
        default_id = self._defaults.get(capability)
        chain = self._sorted_entries(capability)

        if not chain:
            raise ProviderNotFoundError(str(capability))

        if default_id:
            # Admin varsayılanı kayıtlı mı kontrol et
            for entry in chain:
                if entry.provider.provider_id() == default_id and entry.enabled:
                    return entry.provider

        # Admin default yoksa veya bulunamadıysa: ilk enabled primary
        for entry in chain:
            if entry.is_primary and entry.enabled:
                return entry.provider

        raise ProviderNotFoundError(str(capability))

    def get_chain(self, capability: ProviderCapability) -> list[BaseProvider]:
        """
        Capability için provider zincirini döner: [primary, fallback1, fallback2, ...].

        Önce primary'ler (priority sırasıyla), sonra fallback'ler gelir.
        En az bir provider yoksa ProviderNotFoundError fırlatır.
        """
        entries = self._sorted_entries(capability)
        if not entries:
            raise ProviderNotFoundError(str(capability))

        enabled = [e for e in entries if e.enabled]
        if not enabled:
            raise ProviderNotFoundError(str(capability))

        primaries = [e.provider for e in enabled if e.is_primary]
        fallbacks = [e.provider for e in enabled if not e.is_primary]
        return primaries + fallbacks

    def list_by_capability(self, capability: ProviderCapability) -> list[ProviderEntry]:
        """Capability için tüm kayıtlı entry'leri döner."""
        return list(self._entries.get(capability, []))

    def list_all(self) -> dict[ProviderCapability, list[ProviderEntry]]:
        """Tüm kayıtlı provider'ları capability bazlı döner."""
        return {cap: list(entries) for cap, entries in self._entries.items()}

    # ------------------------------------------------------------------
    # Runtime health kaydı — M3-C3
    # ------------------------------------------------------------------

    def record_outcome(
        self,
        capability: ProviderCapability,
        provider_id: str,
        success: bool,
        latency_ms: int,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Invoke sonucunu ilgili provider entry'sine kaydeder.

        resolution.py tarafından her invoke sonrasında çağrılır.
        Doğrudan çağrılmamalı — yalnızca resolution.py kullanır.

        Args:
            capability    : Provider'ın capability'si.
            provider_id   : İnvoke edilen provider'ın kimliği.
            success       : True = başarılı, False = hata.
            latency_ms    : Invoke süresi (milisaniye).
            error_message : Hata durumunda mesaj (None = başarılı).
        """
        entries = self._entries.get(capability, [])
        for entry in entries:
            if entry.provider.provider_id() == provider_id:
                entry.invoke_count += 1
                if success:
                    entry.last_used_at = datetime.now(timezone.utc)
                    entry.last_latency_ms = latency_ms
                    entry.last_error = None
                else:
                    entry.error_count += 1
                    entry.last_error = error_message
                return

    def get_health_snapshot(self) -> dict:
        """
        Tüm kayıtlı provider'ların health durumunu döner.

        Dönüş yapısı:
          {
            "llm": [
              {
                "provider_id": "kie_ai_gemini-2.5-flash",
                "is_primary": true,
                "priority": 0,
                "enabled": true,
                "invoke_count": 12,
                "error_count": 1,
                "last_error": null,
                "last_used_at": "2026-04-04T14:30:00Z",
                "last_latency_ms": 420,
              },
              ...
            ],
            "tts": [...],
            "visuals": [...],
          }
        """
        snapshot: dict = {}
        for cap, entries in self._entries.items():
            sorted_entries = sorted(entries, key=lambda e: e.priority)
            snapshot[cap.value] = [
                {
                    "provider_id": e.provider.provider_id(),
                    "is_primary": e.is_primary,
                    "priority": e.priority,
                    "enabled": e.enabled,
                    "invoke_count": e.invoke_count,
                    "error_count": e.error_count,
                    "last_error": e.last_error,
                    "last_used_at": e.last_used_at.isoformat() if e.last_used_at else None,
                    "last_latency_ms": e.last_latency_ms,
                }
                for e in sorted_entries
            ]
        return snapshot

    # ------------------------------------------------------------------
    # Admin default seam — M3-C3 (bellekte; settings DB bağlantısı M4+)
    # ------------------------------------------------------------------

    def set_default(self, capability: ProviderCapability, provider_id: str) -> None:
        """
        Admin tarafından capability için varsayılan provider'ı ayarlar.
        Settings registry yokken geçici bellekte tutulur.
        """
        self._defaults[capability] = provider_id

    def get_default_provider_id(self, capability: ProviderCapability) -> str | None:
        """Capability için admin tarafından seçilmiş varsayılan provider ID'sini döner."""
        return self._defaults.get(capability)

    # ------------------------------------------------------------------
    # İç yardımcı
    # ------------------------------------------------------------------

    def _sorted_entries(self, capability: ProviderCapability) -> list[ProviderEntry]:
        """Capability için entry'leri priority'e göre sıralı döner."""
        entries = self._entries.get(capability, [])
        return sorted(entries, key=lambda e: e.priority)


# Global singleton — main.py ve dispatcher.py bu nesneyi kullanır
provider_registry = ProviderRegistry()
