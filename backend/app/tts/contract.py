"""
Common TTS contract — Faz 1.

Tum TTS provider'lar (DubVoice, Edge TTS, System) bu sozlesmeyi kabul eder.
Modul executor'lari hangi provider'in calistigini bilmeden kullanir.

Tasarim kurallari:
  - Her alan provider-bagimsiz olsun. Provider ozel ID'ler voice_map uzerinden
    cozulur; executor sadece "language" ve opsiyonel "voice_id" gonderir.
  - Varsayilan degerler conservative (stability=0.5, similarity=0.75) — kanal
    override'lari Settings Registry uzerinden gelir.
  - Fine controls (speed/pitch/style/emphasis/pauses) burada tip guvenli
    aciklanir. Gelecek faz (Faz 4) pronunciation_dictionary + brand_glossary
    alanlarini zenginlestirecek.

Bu dosyada YOK:
  - Provider secimi (resolution katmani)
  - Preview/render fark (executor + orchestration katmani)
  - Canonical subtitle hizalama (Faz 3)
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class VoiceSettings:
    """
    ElevenLabs uyumlu voice fine-tune degerleri.

    DubVoice API'sinin voice_settings bloguna birebir kopyalanir.
    Edge TTS tarafinda stability/similarity kullanilmaz — sadece speed/pitch
    best-effort degerlendirilir.
    """

    stability: float = 0.5
    similarity_boost: float = 0.75
    speed: float = 1.0
    style: float = 0.0
    use_speaker_boost: bool = True

    def as_dubvoice_payload(self) -> dict:
        """DubVoice API formatinda sozlu payload dondur."""
        return {
            "stability": self.stability,
            "similarity_boost": self.similarity_boost,
            "speed": self.speed,
            "style": self.style,
            "use_speaker_boost": self.use_speaker_boost,
        }


@dataclass
class TTSRequest:
    """
    Provider-agnostik TTS istegi.

    Zorunlu alanlar:
      - text: Seslendirilecek metin (script satiri veya scene narration).
      - language: "tr" veya "en" (SupportedLanguage.value ile uyumlu).
      - output_path: MP3 cikti dosyasi (absolute path).

    Opsiyonel provider-spesifik ID'ler:
      - voice_id: Provider-ozel voice kimligi (DubVoice'de ElevenLabs voice_id,
        Edge TTS'de "tr-TR-AhmetNeural"). None verilirse voice_map kullanilir.
      - model_id: DubVoice/ElevenLabs model id (eleven_multilingual_v2 vb).

    Fine controls (Faz 4'e hazir):
      - pitch: -1.0 .. 1.0 semantik (best effort provider farkliliklarina ragmen).
      - emphasis: scene-level energy 0.0 .. 1.0.
      - pauses: provider desteklerse SSML benzeri pausalar (ms).
      - pronunciation_hints: {"brand": "telaffuz"} haritasi.

    Preview/render farki:
      - preview_mode=True → kisa (ilk 2 cumle) + draft kalite uretim.
    """

    text: str
    language: str
    output_path: str

    voice_id: Optional[str] = None
    model_id: Optional[str] = None

    voice_settings: VoiceSettings = field(default_factory=VoiceSettings)

    # Fine controls (Faz 4)
    pitch: Optional[float] = None
    emphasis: Optional[float] = None
    pauses_ms: list = field(default_factory=list)
    pronunciation_hints: dict = field(default_factory=dict)

    # Preview
    preview_mode: bool = False

    # Channel / job context
    channel_id: Optional[str] = None
    scene_key: Optional[str] = None

    def to_provider_input(self) -> dict:
        """
        BaseProvider.invoke() ile uyumlu dict'e cevir.

        Provider kendi tarafinda bilmedigi alanlari yok sayabilir.
        """
        payload: dict = {
            "text": self.text,
            "language": self.language,
            "output_path": self.output_path,
            "voice_settings": self.voice_settings.as_dubvoice_payload(),
            "preview_mode": self.preview_mode,
        }
        if self.voice_id:
            payload["voice_id"] = self.voice_id
        if self.model_id:
            payload["model_id"] = self.model_id
        if self.pitch is not None:
            payload["pitch"] = self.pitch
        if self.emphasis is not None:
            payload["emphasis"] = self.emphasis
        if self.pauses_ms:
            payload["pauses_ms"] = list(self.pauses_ms)
        if self.pronunciation_hints:
            payload["pronunciation_hints"] = dict(self.pronunciation_hints)
        if self.channel_id:
            payload["channel_id"] = self.channel_id
        if self.scene_key:
            payload["scene_key"] = self.scene_key
        return payload


@dataclass
class TTSResult:
    """
    TTS provider'dan donen standart sonuc.

    BaseProvider.invoke() icindeki ProviderOutput.result degerinden elde edilir.
    """

    output_path: str
    duration_seconds: float
    provider_id: str
    trace: dict = field(default_factory=dict)

    def to_manifest_dict(self) -> dict:
        """audio_manifest.json icindeki scene entry'sine uygun dict."""
        return {
            "output_path": self.output_path,
            "duration_seconds": self.duration_seconds,
            "provider_id": self.provider_id,
        }
