"""
Yerel Whisper transkripsiyon provider'ı (LocalWhisperProvider).

faster-whisper kütüphanesi üzerinden çalışır; kelime-düzeyi zaman damgaları üretir.
Her kelime için {word, start, end, probability} çıktısı verir.

Girdi:
  - audio_path: str — transkripte edilecek ses dosyasının mutlak yolu.
  - language: str (opsiyonel) — dil kodu (örn. "tr", "en"). Belirtilmezse otomatik algılanır.

Çıktı result:
  - segments: list[dict] — her biri {id, start, end, text, words: list[WordTiming]} içeren bölüm listesi.
  - language: str — tespit edilen veya belirtilen dil.
  - duration_seconds: float — toplam ses süresi.

Çıktı trace:
  - provider_id: "local_whisper"
  - model_size: str — kullanılan model boyutu.
  - device: str — "cpu" veya "cuda".
  - language: str
  - word_count: int
  - latency_ms: int

Hata yönetimi:
  - Ses dosyası bulunamazsa → ProviderInvokeError.
  - faster-whisper import edilemezse → ConfigurationError (kurulum eksik).
  - Transkripsiyon başarısız olursa → ProviderInvokeError.

NOT: Bu provider yerel makinede çalışır, dış API çağrısı yapmaz.
     Modelin ilk yüklenmesi 2-10 saniye sürebilir; model önbelleğe alınır.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ConfigurationError, ProviderInvokeError

logger = logging.getLogger(__name__)

# Model önbelleği — process ömrü boyunca yeniden yüklenmemesi için
_model_cache: dict[str, object] = {}


def _load_model(model_size: str, device: str, compute_type: str) -> object:
    """
    faster-whisper modelini yükler; önbellekte varsa döndürür.

    Args:
        model_size: "tiny", "base", "small", "medium", "large-v2" vb.
        device: "cpu" veya "cuda".
        compute_type: "int8", "float16", "float32" vb.

    Returns:
        WhisperModel örneği.

    Raises:
        ConfigurationError: faster-whisper kurulu değilse.
    """
    cache_key = f"{model_size}:{device}:{compute_type}"
    if cache_key in _model_cache:
        return _model_cache[cache_key]

    try:
        from faster_whisper import WhisperModel  # type: ignore[import]
    except ImportError as exc:
        raise ConfigurationError(
            "local_whisper",
            "faster-whisper kütüphanesi kurulu değil. "
            "Kurulum: pip install faster-whisper",
        ) from exc

    logger.info(
        "LocalWhisperProvider: model yükleniyor model=%s device=%s compute=%s",
        model_size,
        device,
        compute_type,
    )
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    _model_cache[cache_key] = model
    return model


class LocalWhisperProvider(BaseProvider):
    """
    Yerel Whisper transkripsiyon provider'ı — kelime-düzeyi zaman damgaları üretir.

    faster-whisper kütüphanesini kullanır. İlk çağrıda model yüklenir,
    sonraki çağrılar önbelleği kullanır.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        """
        Args:
            model_size: Kullanılacak Whisper model boyutu (önerilen: "base" veya "small").
            device: Hesaplama cihazı — "cpu" veya "cuda".
            compute_type: Hesaplama tipi — CPU için "int8" yeterlidir.
        """
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type

    def provider_id(self) -> str:
        """Provider kimliği."""
        return "local_whisper"

    def capability(self) -> ProviderCapability:
        """Bu provider WHISPER yeteneğini sağlar."""
        return ProviderCapability.WHISPER

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Ses dosyasını transkripte eder; kelime-düzeyi zaman damgaları üretir.

        Args:
            input_data:
                - audio_path (str, zorunlu): Ses dosyasının mutlak yolu.
                - language (str, opsiyonel): Dil kodu. Belirtilmezse otomatik algılanır.

        Returns:
            ProviderOutput:
                result.segments: list[dict] — her segmentin kelime listesiyle birlikte.
                result.language: str
                result.duration_seconds: float

        Raises:
            ProviderInvokeError: Ses dosyası bulunamazsa veya transkripsiyon başarısız olursa.
            ConfigurationError: faster-whisper kurulu değilse.
        """
        audio_path_str: str | None = input_data.get("audio_path")
        if not audio_path_str:
            raise ProviderInvokeError(
                self.provider_id(),
                "invoke() için 'audio_path' zorunludur.",
            )

        audio_path = Path(audio_path_str)
        if not audio_path.exists():
            raise ProviderInvokeError(
                self.provider_id(),
                f"Ses dosyası bulunamadı: {audio_path}",
            )

        language: str | None = input_data.get("language")

        t_start = time.monotonic()

        try:
            model = _load_model(self._model_size, self._device, self._compute_type)
        except ConfigurationError:
            raise

        try:
            segments_gen, info = model.transcribe(
                str(audio_path),
                language=language,
                word_timestamps=True,
                beam_size=5,
            )
            segments_list = list(segments_gen)
        except Exception as exc:
            raise ProviderInvokeError(
                self.provider_id(),
                f"Transkripsiyon başarısız: {exc}",
            ) from exc

        latency_ms = int((time.monotonic() - t_start) * 1000)

        output_segments: list[dict] = []
        word_count = 0
        duration_seconds = 0.0

        for seg in segments_list:
            words: list[dict] = []
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    })
                    word_count += 1

            output_segments.append({
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words,
            })
            duration_seconds = max(duration_seconds, seg.end)

        detected_language = getattr(info, "language", language or "unknown")

        logger.info(
            "LocalWhisperProvider: transkripsiyon tamamlandı dosya=%s dil=%s "
            "segment=%d kelime=%d sure=%.1fs latency=%dms",
            audio_path.name,
            detected_language,
            len(output_segments),
            word_count,
            duration_seconds,
            latency_ms,
        )

        return ProviderOutput(
            result={
                "segments": output_segments,
                "language": detected_language,
                "duration_seconds": round(duration_seconds, 3),
            },
            trace={
                "provider_id": self.provider_id(),
                "model_size": self._model_size,
                "device": self._device,
                "language": detected_language,
                "word_count": word_count,
                "latency_ms": latency_ms,
            },
            provider_id=self.provider_id(),
        )
