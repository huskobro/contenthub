"""
Publish Adaptör Kayıt Defteri — M7-C2.

Platform adından adaptör instance'ına erişim sağlar.
Servis katmanı ve executor bu registry üzerinden adaptör alır.

Tasarım kuralları:
  - Her platform yalnızca bir kez kayıt edilir.
  - Kayıtsız platform talep edilirse PublishAdapterNotRegisteredError fırlatılır.
  - Registry singleton değil — test izolasyonu için farklı instance'lar oluşturulabilir.
  - Uygulama başlangıcında main.py registry'i başlatır.
"""

from typing import Dict

from app.publish.adapter import PublishAdapter


class PublishAdapterNotRegisteredError(Exception):
    """İstenen platform için adaptör kayıtlı değil."""


class PublishAdapterRegistry:
    """
    Platform adından adaptör instance'ına erişim.

    Kullanım:
        registry = PublishAdapterRegistry()
        registry.register(YouTubeAdapter())
        adapter = registry.get("youtube")
    """

    def __init__(self) -> None:
        self._adapters: Dict[str, PublishAdapter] = {}

    def register(self, adapter: PublishAdapter) -> None:
        """Adaptörü platform adına kayıt eder."""
        name = adapter.platform_name
        if name in self._adapters:
            raise ValueError(
                f"'{name}' platformu için adaptör zaten kayıtlı. "
                f"Yeniden kayıt yapılmak isteniyorsa önce unregister() çağrılmalı."
            )
        self._adapters[name] = adapter

    def unregister(self, platform_name: str) -> None:
        """Kaydı siler (test ve yeniden kayıt için)."""
        self._adapters.pop(platform_name, None)

    def get(self, platform_name: str) -> PublishAdapter:
        """
        Platform adına göre adaptör döndürür.

        Raises:
            PublishAdapterNotRegisteredError: Platform kayıtlı değil.
        """
        adapter = self._adapters.get(platform_name)
        if adapter is None:
            registered = list(self._adapters.keys())
            raise PublishAdapterNotRegisteredError(
                f"'{platform_name}' platformu için adaptör kayıtlı değil. "
                f"Kayıtlı platformlar: {registered}"
            )
        return adapter

    def list_registered(self) -> list[str]:
        """Kayıtlı platform adlarını döndürür."""
        return list(self._adapters.keys())

    def is_registered(self, platform_name: str) -> bool:
        return platform_name in self._adapters


# Uygulama genelinde kullanılan singleton registry
# main.py lifespan'ında doldurulur
publish_adapter_registry = PublishAdapterRegistry()
