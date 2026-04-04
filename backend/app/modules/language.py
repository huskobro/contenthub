"""Dil sözleşmesi — pipeline genelinde kullanılan resmi dil tanımları."""

from __future__ import annotations

from enum import Enum
from typing import Optional


class SupportedLanguage(str, Enum):
    """Desteklenen dil kodları."""
    TR = "tr"
    EN = "en"


# Tek yerde tanımlı varsayılan dil
DEFAULT_LANGUAGE = SupportedLanguage.TR


class UnsupportedLanguageError(ValueError):
    """Desteklenmeyen dil kodu kullanıldığında fırlatılır."""

    def __init__(self, lang: str) -> None:
        self.lang = lang
        super().__init__(
            f"Desteklenmeyen dil: '{lang}'. "
            f"Kabul edilen değerler: {[l.value for l in SupportedLanguage]}"
        )


def resolve_language(raw: Optional[str]) -> SupportedLanguage:
    """
    Ham dil girdisini resmi SupportedLanguage değerine çözer.

    - None → DEFAULT_LANGUAGE (TR) döner
    - Büyük/küçük harf normalize edilir ('TR' → 'tr')
    - 'turkish', 'eng' gibi varyasyonlar kabul EDİLMEZ → UnsupportedLanguageError
    - Sessiz fallback YOKTUR; geçersiz değer doğrudan hata fırlatır

    Args:
        raw: Ham dil kodu (örn. 'tr', 'EN', None).

    Returns:
        SupportedLanguage enum değeri.

    Raises:
        UnsupportedLanguageError: Bilinmeyen dil kodu girildiğinde.
    """
    if raw is None:
        return DEFAULT_LANGUAGE
    try:
        return SupportedLanguage(raw.lower())
    except ValueError:
        raise UnsupportedLanguageError(raw)
