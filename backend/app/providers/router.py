"""
Provider Admin Router (M3-C3)

Admin paneli için provider sağlık durumu ve varsayılan seçim endpoint'leri.

Endpoint'ler:
  GET  /providers          — Tüm kayıtlı provider'ların listesi + health snapshot
  POST /providers/{id}/default — Capability için admin varsayılan provider'ı ayarla
  POST /providers/{id}/enable  — Provider'ı etkinleştir
  POST /providers/{id}/disable — Provider'ı devre dışı bırak

Kısıtlar:
  - Default seam bellekte tutulur (settings DB bağlantısı M4+).
  - Provider'ı tamamen kaldırma endpoint'i yok — yalnızca enable/disable.
  - Health verileri sunucu yeniden başlatıldığında sıfırlanır (kalıcılık M4+).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.providers.capability import ProviderCapability
from app.providers.registry import provider_registry
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers", tags=["providers"], dependencies=[Depends(require_visible("panel:providers"))])


# ---------------------------------------------------------------------------
# Şemalar
# ---------------------------------------------------------------------------

class SetDefaultRequest(BaseModel):
    """Varsayılan provider ayarlama isteği."""
    capability: str   # "llm" | "tts" | "visuals"
    provider_id: str


class ProviderActionResponse(BaseModel):
    """Provider aksiyon sonucu."""
    ok: bool
    message: str


# ---------------------------------------------------------------------------
# Endpoint'ler
# ---------------------------------------------------------------------------

@router.get("")
async def list_providers():
    """
    Tüm kayıtlı provider'ların listesini ve runtime health snapshot'ını döner.

    Dönüş:
      - capabilities: capability bazlı provider listesi + health alanları
      - defaults: her capability için admin varsayılan provider_id (varsa)
    """
    snapshot = provider_registry.get_health_snapshot()
    defaults: dict[str, str | None] = {}
    for cap in ProviderCapability:
        defaults[cap.value] = provider_registry.get_default_provider_id(cap)

    return {
        "capabilities": snapshot,
        "defaults": defaults,
    }


@router.post("/default")
async def set_provider_default(body: SetDefaultRequest):
    """
    Belirtilen capability için admin varsayılan provider'ını ayarlar.

    Bu ayar bellekte tutulur — sunucu yeniden başlatıldığında sıfırlanır.
    Settings DB kalıcılığı M4'te eklenecek.

    Body:
      - capability: "llm" | "tts" | "visuals"
      - provider_id: Varsayılan olarak seçilecek provider_id

    Raises:
      422 : Geçersiz capability değeri.
      404 : Belirtilen provider_id kayıtlı değil.
    """
    try:
        cap = ProviderCapability(body.capability)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Geçersiz capability: {body.capability!r}. "
                   f"Geçerli değerler: {[c.value for c in ProviderCapability]}",
        )

    # Provider kayıtlı mı kontrol et
    snapshot = provider_registry.get_health_snapshot()
    cap_entries = snapshot.get(cap.value, [])
    registered_ids = [e["provider_id"] for e in cap_entries]
    if body.provider_id not in registered_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Provider bulunamadı: {body.provider_id!r}. "
                   f"Kayıtlı provider'lar: {registered_ids}",
        )

    provider_registry.set_default(cap, body.provider_id)
    logger.info(
        "Admin varsayılan provider ayarlandı: capability=%s, provider_id=%s",
        cap.value,
        body.provider_id,
    )
    return ProviderActionResponse(
        ok=True,
        message=f"{cap.value} için varsayılan provider '{body.provider_id}' olarak ayarlandı.",
    )


@router.post("/{provider_id}/enable")
async def enable_provider(provider_id: str):
    """
    Belirtilen provider_id'ye sahip provider'ı etkinleştirir.

    Raises:
      404: Provider kayıtlı değil.
    """
    changed = _set_provider_enabled(provider_id, enabled=True)
    if not changed:
        raise HTTPException(status_code=404, detail=f"Provider bulunamadı: {provider_id!r}")
    logger.info("Provider etkinleştirildi: %s", provider_id)
    return ProviderActionResponse(ok=True, message=f"Provider '{provider_id}' etkinleştirildi.")


@router.post("/{provider_id}/disable")
async def disable_provider(provider_id: str):
    """
    Belirtilen provider_id'ye sahip provider'ı devre dışı bırakır.

    Devre dışı provider get_chain() sonucuna dahil edilmez.
    Tüm provider'lar devre dışı bırakılırsa ProviderNotFoundError oluşur.

    Raises:
      404: Provider kayıtlı değil.
    """
    changed = _set_provider_enabled(provider_id, enabled=False)
    if not changed:
        raise HTTPException(status_code=404, detail=f"Provider bulunamadı: {provider_id!r}")
    logger.info("Provider devre dışı bırakıldı: %s", provider_id)
    return ProviderActionResponse(ok=True, message=f"Provider '{provider_id}' devre dışı bırakıldı.")


# ---------------------------------------------------------------------------
# Yardımcı
# ---------------------------------------------------------------------------

def _set_provider_enabled(provider_id: str, enabled: bool) -> bool:
    """
    Registry'de provider_id ile eşleşen entry'nin enabled alanını günceller.

    Returns:
        True: Güncelleme yapıldı.
        False: Provider bulunamadı.
    """
    all_entries = provider_registry.list_all()
    for entries in all_entries.values():
        for entry in entries:
            if entry.provider.provider_id() == provider_id:
                entry.enabled = enabled
                return True
    return False
