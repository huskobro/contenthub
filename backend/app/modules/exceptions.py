"""
Modül Sistemi Exception Modeli (M2-C1)

Modül kayıt defteri ve girdi normalizasyonuna özgü hata türleri.

Exception hiyerarşisi:
    ModuleNotFoundError    — kayıtlı olmayan modül sorgulandı
    InputValidationError   — zorunlu girdi alanı eksik veya geçersiz
"""


class ModuleNotFoundError(Exception):
    """
    Kayıtlı olmayan bir module_id sorgulandığında fırlatılır.

    Attributes:
        module_id : Bulunamayan modülün kimliği.
    """

    def __init__(self, module_id: str) -> None:
        self.module_id = module_id
        super().__init__(f"Modül bulunamadı: module_id={module_id!r}")


class InputValidationError(Exception):
    """
    Job girdisi modülün input_schema gereksinimlerini karşılamadığında fırlatılır.

    Attributes:
        field  : Geçersiz veya eksik alanın adı.
        reason : Hatanın insan tarafından okunabilir açıklaması.
    """

    def __init__(self, field: str, reason: str) -> None:
        self.field = field
        self.reason = reason
        super().__init__(f"Girdi doğrulama hatası [{field!r}]: {reason}")
