"""
Dil → TTS ses esleme kayit defteri.

Faz 1'de provider-farkinda yapiya gecis yapildi:
  - Edge TTS icin bolgesel voice kodlari (tr-TR-AhmetNeural)
  - DubVoice / ElevenLabs icin voice_id (UUID-benzeri kimlik)

Yeni dil veya voice override eklenince bu dosya guncellenir — executor'lar
dogrudan dokunulmaz.
"""

from __future__ import annotations

from app.modules.language import SupportedLanguage


# Edge TTS voice kodlari (dil → varsayilan ses)
EDGE_VOICE_MAP: dict[SupportedLanguage, str] = {
    SupportedLanguage.TR: "tr-TR-AhmetNeural",
    SupportedLanguage.EN: "en-US-ChristopherNeural",
}

# DubVoice / ElevenLabs voice_id'leri (dil → varsayilan voice)
# NOT: Bu ID'ler ElevenLabs public voice katalogundan gelir. Kanal bazli
# override Settings Registry (tts.default_voice.{tr|en}) uzerinden saglanir.
DUBVOICE_VOICE_MAP: dict[SupportedLanguage, str] = {
    # Adam (English, M) — varsayilan multilingual referans voice
    SupportedLanguage.EN: "pNInz6obpgDQGcFmaJgB",
    # Rachel (English, F) turunde Turkce desteklenen multilingual voice
    # Production'da kanal bazli TR voice_id override edilmeli
    SupportedLanguage.TR: "21m00Tcm4TlvDq8ikWAM",
}

# Yedek voice kodlari
DEFAULT_EDGE_VOICE = EDGE_VOICE_MAP[SupportedLanguage.TR]
DEFAULT_DUBVOICE_VOICE = DUBVOICE_VOICE_MAP[SupportedLanguage.TR]

# Geriye uyumluluk aliaslari — M2-C4 test suite'i bu isimleri import ediyor.
# Faz 1 oncesi kod tabani "VOICE_MAP" + "DEFAULT_VOICE" seklinde kullaniyordu.
VOICE_MAP = EDGE_VOICE_MAP
DEFAULT_VOICE = DEFAULT_EDGE_VOICE


def get_voice(language: SupportedLanguage, provider_id: str = "edge_tts") -> str:
    """
    Dile ve provider'a uygun TTS sesini dondur.

    Args:
        language: Cozulmus dil enum degeri.
        provider_id: "edge_tts" | "dubvoice" | "system_tts" vb. Provider'in
            BaseProvider.provider_id() dondurdugu degerle uyumlu.

    Returns:
        Provider-spesifik voice kimligi (Edge TTS icin voice kodu,
        DubVoice icin voice_id).
    """
    pid = (provider_id or "").strip().lower()
    if pid == "dubvoice":
        return DUBVOICE_VOICE_MAP.get(language, DEFAULT_DUBVOICE_VOICE)
    # system_tts ve edge_tts ayni harita uzerinden cozulur
    return EDGE_VOICE_MAP.get(language, DEFAULT_EDGE_VOICE)


def get_edge_voice(language: SupportedLanguage) -> str:
    """Geriye uyumlu kisa yol: Edge TTS voice kodu."""
    return EDGE_VOICE_MAP.get(language, DEFAULT_EDGE_VOICE)


def get_dubvoice_voice(language: SupportedLanguage) -> str:
    """DubVoice voice_id kisa yolu."""
    return DUBVOICE_VOICE_MAP.get(language, DEFAULT_DUBVOICE_VOICE)
