"""
Modüller arası paylaşılan yardımcı fonksiyonlar.

Tüm content modülleri (standard_video, news_bulletin, vb.) tarafından
kullanılabilir. Modül-spesifik artifact fonksiyonları hâlâ her modülün
kendi _helpers.py dosyasındadır.

İçerik:
  - measure_audio_duration     : Ses dosyası gerçek süre ölçümü
  - validate_audio_duration    : Ölçüm vs tahmin karşılaştırması
  - clean_narration_for_tts    : TTS öncesi metin temizleme
  - validate_script_data       : LLM script çıktı doğrulaması
  - download_image_to_workspace: Harici görsel URL'ini yerel workspace'e indir
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Audio Duration Measurement — TTS-provider-agnostic
# ---------------------------------------------------------------------------

def measure_audio_duration(file_path: str) -> Optional[float]:
    """
    MP3/WAV dosyasının gerçek süresini ölçer (saniye).

    TTS provider'dan bağımsız çalışır — herhangi bir TTS çözümü kullanılsa
    bile üretilen ses dosyasının gerçek süresini doğrulayabilir.

    Öncelik sırası:
      1. mutagen MP3 (hızlı, güvenilir)
      2. mutagen WAVE
      3. None döner (çağıran taraf heuristic fallback kullanabilir)

    Returns:
        Süre (saniye, float) veya ölçülemezse None.
    """
    p = Path(file_path)
    if not p.exists():
        logger.warning("measure_audio_duration: dosya bulunamadı: %s", file_path)
        return None

    suffix = p.suffix.lower()

    # MP3
    if suffix in (".mp3",):
        try:
            from mutagen.mp3 import MP3
            audio = MP3(file_path)
            if audio.info and audio.info.length > 0:
                return round(audio.info.length, 3)
        except Exception as exc:
            logger.warning(
                "measure_audio_duration: mutagen MP3 okunamadı (%s): %s",
                file_path, exc,
            )

    # WAV
    if suffix in (".wav",):
        try:
            from mutagen.wave import WAVE
            audio = WAVE(file_path)
            if audio.info and audio.info.length > 0:
                return round(audio.info.length, 3)
        except Exception as exc:
            logger.warning(
                "measure_audio_duration: mutagen WAVE okunamadı (%s): %s",
                file_path, exc,
            )

    # Genel mutagen fallback (herhangi bir format)
    try:
        import mutagen
        audio = mutagen.File(file_path)
        if audio and audio.info and hasattr(audio.info, "length") and audio.info.length > 0:
            return round(audio.info.length, 3)
    except Exception:
        pass

    return None


def validate_audio_duration(
    measured: Optional[float],
    estimated: float,
    file_path: str,
    job_id: str,
) -> float:
    """
    Ölçülen ve tahmini ses süresini karşılaştırır, nihai değeri döner.

    Kurallar:
      - measured varsa ve >0 ise → measured kullan
      - measured yoksa → estimated kullan + WARNING log
      - Fark >%30 ise → WARNING log (potansiyel sync sorunu)

    Returns:
        Nihai süre (saniye).
    """
    if measured is not None and measured > 0:
        if estimated > 0:
            deviation = abs(measured - estimated) / max(estimated, 0.1)
            if deviation > 0.30:
                logger.warning(
                    "validate_audio_duration: ölçüm-tahmin farkı yüksek (%%%.0f). "
                    "measured=%.2fs estimated=%.2fs file=%s job=%s",
                    deviation * 100, measured, estimated, file_path, job_id,
                )
        return round(measured, 3)

    logger.warning(
        "validate_audio_duration: ölçüm başarısız, tahmin kullanılıyor. "
        "estimated=%.2fs file=%s job=%s",
        estimated, file_path, job_id,
    )
    return round(estimated, 2)


# ---------------------------------------------------------------------------
# Narration Text Cleanup — TTS öncesi metin temizleme
# ---------------------------------------------------------------------------

# Markdown kalıntıları
_RE_BOLD = re.compile(r"\*\*(.+?)\*\*")
_RE_ITALIC = re.compile(r"\*(.+?)\*")
_RE_BOLD_US = re.compile(r"__(.+?)__")
_RE_ITALIC_US = re.compile(r"_(.+?)_")
_RE_STRIKETHROUGH = re.compile(r"~~(.+?)~~")
_RE_INLINE_CODE = re.compile(r"`(.+?)`")
_RE_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_RE_BULLET = re.compile(r"^[\-\*]\s+", re.MULTILINE)
_RE_NUMBERED = re.compile(r"^\d+\.\s+", re.MULTILINE)

# URL'ler
_RE_URL = re.compile(r"https?://\S+")
_RE_MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")

# Özel karakterler — TTS'in literal okumasını engelle
_RE_MULTIPLE_DOTS = re.compile(r"\.{3,}")
_RE_MULTIPLE_DASHES = re.compile(r"-{2,}")
_RE_MULTIPLE_SPACES = re.compile(r"\s{2,}")
_RE_QUOTES = re.compile(r'[\u201c\u201d\u201e]')  # " " „
_RE_SINGLE_QUOTES = re.compile(r"[\u2018\u2019\u201a]")  # ' ' ‚


def clean_narration_for_tts(text: str) -> str:
    """
    Narration metnini TTS için temizler.

    Temizlik adımları:
      1. Markdown formatları kaldır (bold, italic, heading, bullet, code)
      2. URL'leri kaldır
      3. Markdown linkleri → sadece link metni
      4. Özel karakterleri normalleştir
      5. Çoklu boşlukları tekle
      6. Baş/son trim

    Bu fonksiyon semantik değişiklik yapmaz — sadece TTS'in doğru
    okuması için format temizliği yapar. Herhangi bir TTS provider ile
    kullanılabilir.

    Returns:
        Temizlenmiş metin.
    """
    if not text:
        return ""

    t = text

    # Markdown link → sadece metin
    t = _RE_MARKDOWN_LINK.sub(r"\1", t)

    # URL kaldır
    t = _RE_URL.sub("", t)

    # Markdown formatlarını kaldır — iç metin korunur
    t = _RE_BOLD.sub(r"\1", t)
    t = _RE_ITALIC.sub(r"\1", t)
    t = _RE_BOLD_US.sub(r"\1", t)
    t = _RE_ITALIC_US.sub(r"\1", t)
    t = _RE_STRIKETHROUGH.sub(r"\1", t)
    t = _RE_INLINE_CODE.sub(r"\1", t)

    # Başlık/liste işaretleri
    t = _RE_HEADING.sub("", t)
    t = _RE_BULLET.sub("", t)
    t = _RE_NUMBERED.sub("", t)

    # Üç nokta → tek üç nokta
    t = _RE_MULTIPLE_DOTS.sub("...", t)

    # Çoklu tire → tek tire
    t = _RE_MULTIPLE_DASHES.sub("—", t)

    # Tırnak normalizasyonu
    t = _RE_QUOTES.sub('"', t)
    t = _RE_SINGLE_QUOTES.sub("'", t)

    # Çoklu boşluk
    t = _RE_MULTIPLE_SPACES.sub(" ", t)

    return t.strip()


# ---------------------------------------------------------------------------
# Script Validation — LLM çıktı doğrulaması
# ---------------------------------------------------------------------------

def validate_script_data(
    script_data: dict,
    module_id: str,
    job_id: str,
    target_duration_seconds: int = 60,
) -> list[str]:
    """
    LLM tarafından üretilen script JSON'ını doğrular ve uyarı listesi döner.

    Doğrulama kuralları:
      - scenes/items listesi boş olmamalı
      - Her sahne/item'da narration alanı olmalı
      - Narration boş olmamalı (boşlar raporlanır)
      - Toplam narration çok kısa veya çok uzun olmamalı

    Hata seviyesi: uyarı. Job'u durdurmaz ama loglanır ve artifact'a yazılır.

    Args:
        script_data: LLM'den gelen parse edilmiş JSON.
        module_id: Modül kimliği (scenes vs items key seçimi).
        job_id: Log için job ID.
        target_duration_seconds: Hedef süre (uzunluk kontrolü için).

    Returns:
        list[str]: Uyarı mesajları listesi (boşsa → sorun yok).
    """
    warnings: list[str] = []

    # scenes/items key seçimi
    if module_id == "news_bulletin":
        items = script_data.get("items", [])
        item_key = "items"
    else:
        items = script_data.get("scenes", [])
        item_key = "scenes"

    if not items:
        warnings.append(f"Script {item_key} listesi boş — LLM geçerli sahne üretmedi")
        return warnings

    empty_narrations = 0
    total_word_count = 0
    for i, item in enumerate(items):
        narration = item.get("narration", "").strip()
        if not narration:
            empty_narrations += 1
            warnings.append(f"Sahne/item {i + 1}: narration boş")
        else:
            total_word_count += len(narration.split())

    if empty_narrations == len(items):
        warnings.append("Tüm sahne/item narration'ları boş — TTS hiç ses üretmeyecek")

    # Kelime sayısı kontrolü — hedef süreye göre makul aralık
    # Ortalama konuşma hızı: ~2.5 kelime/saniye (Türkçe), ~3 kelime/saniye (İngilizce)
    min_expected = int(target_duration_seconds * 1.5)  # çok yavaş tempo
    max_expected = int(target_duration_seconds * 4.0)  # çok hızlı tempo

    if total_word_count > 0:
        if total_word_count < min_expected:
            warnings.append(
                f"Toplam kelime sayısı düşük ({total_word_count} kelime, "
                f"hedef süre {target_duration_seconds}s için beklenen min ~{min_expected})"
            )
        elif total_word_count > max_expected:
            warnings.append(
                f"Toplam kelime sayısı yüksek ({total_word_count} kelime, "
                f"hedef süre {target_duration_seconds}s için beklenen max ~{max_expected})"
            )

    return warnings


# ---------------------------------------------------------------------------
# Image Download — harici URL → yerel workspace kopyası
# ---------------------------------------------------------------------------

_IMAGE_DOWNLOAD_TIMEOUT = 15  # saniye
_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def download_image_to_workspace(
    url: str,
    workspace_root: str,
    job_id: str,
    sub_dir: str = "visuals",
    filename_hint: Optional[str] = None,
) -> Optional[str]:
    """
    Harici bir görsel URL'ini workspace'e indirir.

    Remotion headless render sırasında harici sunuculara güvenilir erişim
    mümkün olmayabilir (CORS, rate-limit, timeout). Bu fonksiyon görseli
    yerel workspace'e indirerek güvenilir erişim sağlar.

    İndirilen dosya: workspace/{job_id}/artifacts/{sub_dir}/{filename}
    Dönen değer: "artifacts/{sub_dir}/{filename}" (relative path —
    asset server üzerinden erişim için).

    İdempotency: Aynı URL için dosya zaten varsa tekrar indirmez.

    Args:
        url: İndirilecek görsel URL'i (http/https).
        workspace_root: Job workspace kök dizini.
        job_id: Job ID (loglama + fallback dizin için).
        sub_dir: artifacts altındaki alt dizin (varsayılan: "visuals").
        filename_hint: Dosya adı ipucu (opsiyonel).

    Returns:
        Relative artifact path (str) veya indirme başarısızsa None.
    """
    if not url or not url.startswith(("http://", "https://")):
        return None

    # Dosya adı: URL hash + uzantı
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    # URL'den uzantı çıkar
    url_path = url.split("?")[0].split("#")[0]
    suffix = ".jpg"
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if url_path.lower().endswith(ext):
            suffix = ext
            break

    if filename_hint:
        fname = filename_hint
    else:
        fname = f"{url_hash}{suffix}"

    # Hedef dizin
    if workspace_root:
        visuals_dir = Path(workspace_root) / "artifacts" / sub_dir
    else:
        import tempfile
        visuals_dir = (
            Path(tempfile.gettempdir())
            / "contenthub_workspace"
            / job_id
            / "artifacts"
            / sub_dir
        )

    visuals_dir.mkdir(parents=True, exist_ok=True)
    dest_path = visuals_dir / fname

    # İdempotency: dosya zaten varsa atla
    if dest_path.exists() and dest_path.stat().st_size > 0:
        relative = f"artifacts/{sub_dir}/{fname}"
        return relative

    # İndir
    try:
        import urllib.request
        import urllib.error
        import urllib.parse

        # URL'deki Unicode karakterleri encode et (Türkçe ç, ş, ı vb.)
        # Sadece path ve query kısımlarını encode et, scheme/host dokunma
        parsed = urllib.parse.urlsplit(url)
        safe_path = urllib.parse.quote(parsed.path, safe="/-_.~!$&'()*+,;=:@")
        safe_query = urllib.parse.quote(parsed.query, safe="/-_.~!$&'()*+,;=:@?")
        safe_url = urllib.parse.urlunsplit((
            parsed.scheme, parsed.netloc, safe_path, safe_query, parsed.fragment,
        ))

        req = urllib.request.Request(safe_url, headers={
            "User-Agent": "ContentHub/1.0 (image-downloader)",
        })
        with urllib.request.urlopen(req, timeout=_IMAGE_DOWNLOAD_TIMEOUT) as resp:
            content_length = resp.headers.get("Content-Length")
            if content_length and int(content_length) > _MAX_IMAGE_SIZE_BYTES:
                logger.warning(
                    "download_image_to_workspace: dosya çok büyük (%s bytes). "
                    "url=%s job=%s",
                    content_length, url[:100], job_id,
                )
                return None

            data = resp.read(_MAX_IMAGE_SIZE_BYTES + 1)
            if len(data) > _MAX_IMAGE_SIZE_BYTES:
                logger.warning(
                    "download_image_to_workspace: okunan veri çok büyük. "
                    "url=%s job=%s",
                    url[:100], job_id,
                )
                return None

        dest_path.write_bytes(data)
        relative = f"artifacts/{sub_dir}/{fname}"
        logger.info(
            "download_image_to_workspace: %s → %s job=%s",
            url[:80], relative, job_id,
        )
        return relative

    except Exception as exc:
        logger.warning(
            "download_image_to_workspace: indirme başarısız — %s url=%s job=%s",
            type(exc).__name__, url[:100], job_id,
        )
        return None
