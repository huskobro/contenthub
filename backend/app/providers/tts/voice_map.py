"""
Dil → TTS ses eşleştirmesi.

Yeni dil desteği eklenince bu dosyayı genişlet.
Ses kodları Microsoft Edge TTS formatındadır.
"""

from __future__ import annotations

from app.modules.language import SupportedLanguage

# Her desteklenen dil için varsayılan TTS ses kodu.
# Yeni dil eklenince buraya yeni satır ekle — executor'lara dokunma.
VOICE_MAP: dict[SupportedLanguage, str] = {
    SupportedLanguage.TR: "tr-TR-AhmetNeural",
    SupportedLanguage.EN: "en-US-ChristopherNeural",
}

# Dil bulunamazsa kullanılacak yedek ses
DEFAULT_VOICE = VOICE_MAP[SupportedLanguage.TR]


def get_voice(language: SupportedLanguage) -> str:
    """
    Dile uygun TTS sesini döner.

    Bilinmeyen dil gelirse DEFAULT_VOICE (Türkçe) kullanılır.

    Args:
        language: Çözülmüş dil enum değeri.

    Returns:
        Microsoft Edge TTS ses kodu (str).
    """
    return VOICE_MAP.get(language, DEFAULT_VOICE)
