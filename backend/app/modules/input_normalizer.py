"""
Girdi Normalizasyon Servisi (M2-C1)

Job oluşturulurken kullanıcı girdisini modülün input_schema'sına göre normalize eder.

Sorumluluklar:
  1. Zorunlu alanların varlığını kontrol eder.
  2. Eksik opsiyonel alanları şema varsayılan değerleriyle doldurur.
  3. Belirtilen modülün kayıtlı olup olmadığını kontrol eder.

Kapsam dışında (bu sınıfta YOK):
  - JSON Schema type/format doğrulaması (M3+ kapsamı)
  - minLength / maximum gibi kısıt doğrulamaları (M3+ kapsamı)
"""

from app.modules.registry import ModuleRegistry
from app.modules.exceptions import ModuleNotFoundError, InputValidationError


class InputNormalizer:
    """
    Modül girdi normalizatörü.

    Her ModuleRegistry örneğiyle çalışabilir; global singleton'a bağlı değildir.
    Bu, test izolasyonunu kolaylaştırır.
    """

    def __init__(self, registry: ModuleRegistry) -> None:
        """
        Args:
            registry: Modül tanımlarını içeren ModuleRegistry örneği.
        """
        self._registry = registry

    def normalize(self, module_id: str, raw_input: dict) -> dict:
        """
        raw_input'u module_id'ye ait modülün input_schema'sına göre normalize eder.

        İşlem adımları:
          1. Modülün kayıtlı olduğunu doğrular.
          2. Zorunlu alanların hepsinin mevcut olduğunu kontrol eder.
          3. Eksik opsiyonel alanları varsayılan değerleriyle doldurur.
          4. Normalize edilmiş sözlüğü döndürür.

        Args:
            module_id : Normalize edilecek modülün kimliği.
            raw_input : Kullanıcıdan gelen ham girdi sözlüğü.

        Returns:
            Normalize edilmiş girdi sözlüğü.

        Raises:
            ModuleNotFoundError  : module_id kayıt defterinde bulunamazsa.
            InputValidationError : Zorunlu alan eksikse.
        """
        module = self._registry.get(module_id)
        if module is None:
            raise ModuleNotFoundError(module_id)

        schema = module.input_schema
        properties = schema.get("properties", {})
        required_fields = schema.get("required", [])

        # Zorunlu alan kontrolü
        for field_name in required_fields:
            if field_name not in raw_input:
                raise InputValidationError(
                    field=field_name,
                    reason=f"Zorunlu alan eksik: {field_name!r}",
                )

        # Girdiyi kopyala ve varsayılan değerleri uygula
        normalized = dict(raw_input)
        for field_name, field_schema in properties.items():
            if field_name not in normalized and "default" in field_schema:
                normalized[field_name] = field_schema["default"]

        return normalized
