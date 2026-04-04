"""
Provider yetenek tanımları — tüm capability string'leri buradan gelir.

Dispatcher, registry ve executor'lar bu enum'u kullanır.
String literal kullanmak yerine her zaman bu enum tercih edilmelidir.

Geriye dönük uyumluluk: ProviderCapability(str, Enum) olduğu için
mevcut "llm", "tts", "visuals" string karşılaştırmaları çalışmaya devam eder.
"""

from enum import Enum


class ProviderCapability(str, Enum):
    """Provider yetenek sabitleri."""

    LLM = "llm"
    TTS = "tts"
    VISUALS = "visuals"
    WHISPER = "whisper"
