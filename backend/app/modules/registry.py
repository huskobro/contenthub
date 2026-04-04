"""
Modül Kayıt Defteri (M2-C1)

Uygulama başlatılırken içerik modülleri buraya kaydedilir.
Pipeline runner ve job servisi, hangi adımları çalıştıracağını bu kayıt
defterinden öğrenir.

Bu dosya yalnızca kayıt ve sorgulama mantığını içerir.
Provider kaydı, sağlık yönetimi ve yedek mantığı M3 kapsamındadır.
"""

from __future__ import annotations

from app.modules.base import ModuleDefinition, StepDefinition


class ModuleRegistry:
    """
    Modül kayıt defteri: module_id -> ModuleDefinition.

    Singleton olarak kullanılmalıdır. Modüller uygulama lifespan başlangıcında
    kayıt edilir; çalışma süresi boyunca değişmez.
    """

    def __init__(self) -> None:
        # Dahili depolama: module_id → ModuleDefinition
        self._modules: dict[str, ModuleDefinition] = {}

    def register(self, module: ModuleDefinition) -> None:
        """
        Modülü kayıt defterine ekler.

        Aynı module_id ile tekrar çağrılırsa mevcut kayıt güncellenir.
        Bu, yeniden başlatma sırasında modül yeniden tanımlamalarına izin verir.

        Args:
            module: Kaydedilecek ModuleDefinition nesnesi.
        """
        self._modules[module.module_id] = module

    def get(self, module_id: str) -> ModuleDefinition | None:
        """
        module_id'ye karşılık gelen modülü döndürür.

        Args:
            module_id: Sorgulanacak modülün kimliği.

        Returns:
            ModuleDefinition veya None (bulunamazsa).
        """
        return self._modules.get(module_id)

    def list_all(self) -> list[ModuleDefinition]:
        """
        Kayıtlı tüm modüllerin listesini döndürür.

        Returns:
            ModuleDefinition listesi (kayıt sırasına göre).
        """
        return list(self._modules.values())

    def get_steps(self, module_id: str) -> list[StepDefinition]:
        """
        Modülün adım tanımlarını step_order'a göre sıralı döndürür.

        Args:
            module_id: Adımları sorgulanacak modülün kimliği.

        Returns:
            StepDefinition listesi (sıralı). Modül bulunamazsa boş liste.
        """
        module = self._modules.get(module_id)
        if module is None:
            return []
        return sorted(module.steps, key=lambda s: s.step_order)


# Global singleton — uygulama boyunca tek örnek kullanılır
module_registry = ModuleRegistry()
