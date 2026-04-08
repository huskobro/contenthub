"""
Bülten kompozisyon adımı executor'ı (BulletinCompositionExecutor) — M28/M31.

Tüm artifact'ları toplar ve Remotion'a gönderilecek NewsBulletin composition
props yapısını üretir. Sadece composition_props.json yazar — render tetiklemez.

M28 sınır kuralı:
  - Bu executor Remotion CLI çağırmaz
  - Render işlemi ayrı RenderStepExecutor tarafından yapılır (step 6)
  - Bu executor sadece "props_ready" durumunda bırakır

Güvenli composition mapping (CLAUDE.md C-07):
  - composition_id sabit mapping'den gelir (composition_map.py)
  - get_composition_id("news_bulletin") → "NewsBulletin"

M31 render_mode genişletmesi:
  - combined  : tüm haberler tek video (varsayılan, M28 davranışı korunur)
  - per_category: her kategori için ayrı props bloğu composition_props içinde
  - per_item  : her haber için ayrı props bloğu composition_props içinde

  per_category ve per_item modlarında:
    - composition_props.json tek bir dosya olarak yazılır
    - İçinde "render_outputs" dizisi bulunur (her çıktı için ayrı props)
    - RenderStepExecutor her output için ayrı render çağrısı yapabilir (M31+)
    - Geriye dönük uyumluluk: "props" alanı combined view olarak her zaman vardır

  Bu executor render kararı vermez — sadece props hazırlar.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.modules.standard_video.composition_map import get_composition_id
from app.modules.standard_video.subtitle_presets import get_preset_for_composition

from app.modules.shared_helpers import download_image_to_workspace
from ._helpers import (
    _resolve_artifact_path,
    _write_artifact,
    _read_artifact,
)

logger = logging.getLogger(__name__)


def _guess_ext(url: str) -> str:
    """URL'den görsel uzantısını tahmin et."""
    clean = url.split("?")[0].split("#")[0].lower()
    for ext in (".png", ".webp", ".gif", ".jpeg"):
        if clean.endswith(ext):
            return ext
    return ".jpg"


# ---------------------------------------------------------------------------
# M41a: Source name resolution — domain fallback
# ---------------------------------------------------------------------------

# Bilinen TLD uzantıları (www./tld strip mantığı için)
_TLD_SUFFIXES = {
    "com", "net", "org", "io", "co", "edu", "gov", "info", "biz", "me", "tv",
    "com.tr", "org.tr", "net.tr", "gov.tr", "edu.tr",
    "co.uk", "org.uk", "com.au", "co.jp", "co.in",
}


def resolve_source_domain_name(url_or_domain: str) -> str:
    """
    URL veya domain'den okunur kaynak adı çıkarır.

    Kurallar:
      - www. prefiksi atılır
      - TLD uzantıları atılır (com, net, org, com.tr, ...)
      - Aradaki asıl isim bölümü korunur

    Örnekler:
      www.ntv.com.tr → ntv
      www.bbc.com    → bbc
      www.reuters.com → reuters
      www.some-site.net → some-site
      https://news.example.org/feed → news.example
    """
    if not url_or_domain:
        return ""

    # URL'den domain çıkar
    domain = url_or_domain.strip()
    # Protokol strip
    for prefix in ("https://", "http://", "//"):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    # Path strip
    domain = domain.split("/")[0].split("?")[0].split("#")[0]
    # Port strip
    domain = domain.split(":")[0]
    # www. strip
    if domain.startswith("www."):
        domain = domain[4:]

    if not domain:
        return ""

    # TLD strip — en uzun eşleşen TLD'yi bul
    parts = domain.split(".")
    best_tld_len = 0
    for i in range(1, len(parts)):
        candidate = ".".join(parts[i:])
        if candidate in _TLD_SUFFIXES:
            best_tld_len = len(parts) - i

    if best_tld_len > 0 and best_tld_len < len(parts):
        name_parts = parts[:len(parts) - best_tld_len]
        return ".".join(name_parts)

    # Eşleşen TLD yoksa: son parçayı at (generic)
    if len(parts) > 1:
        return ".".join(parts[:-1])

    return domain


def _resolve_source_name_fallback(source_id: str) -> str:
    """
    source_id'den fallback isim üretir.

    Gerçek kaynak adı service snapshot'tan gelmeli.
    Bu sadece source_name hiç yoksa son çare.
    """
    # source_id genellikle UUID, okunur değil
    return source_id[:12] if source_id else ""


# ---------------------------------------------------------------------------
# M31: Render output plan builder
# ---------------------------------------------------------------------------

def _build_render_outputs(
    render_mode: str,
    props_items: list[dict],
    bulletin_title: str,
    composition_id: str,
    subtitles_srt: str | None,
    word_timing_path: str | None,
    timing_mode: str,
    resolved_subtitle_style: dict,
    lower_third_style: str | None,
    language: str,
    metadata_data: dict,
    bulletin_style: str = "breaking",
    network_name: str = "ContentHub Haber",
    show_ticker: bool = True,
    ticker_items: list[str] | None = None,
    render_format: str = "landscape",
    karaoke_anim_preset: str = "hype",
) -> list[dict]:
    """
    render_mode'a göre çıktı planını oluşturur.

    Her çıktı bir dict:
      - output_key    : unique key (combined | category_{name} | item_{n})
      - output_label  : kullanıcıya gösterilecek etiket
      - composition_id: güvenli mapping'den (sabit)
      - items         : bu çıktıya dahil haber item listesi
      - suggested_filename: önerilen artifact dosya adı

    combined  → tek output, tüm item'lar
    per_category → her farklı kategori için ayrı output
    per_item  → her item için ayrı output

    Bilinmeyen mod → combined fallback, WARNING logu.
    """
    def _make_output(key: str, label: str, items: list[dict], filename: str) -> dict:
        total_dur = sum(i.get("durationSeconds", 0.0) for i in items)
        return {
            "output_key": key,
            "output_label": label,
            "composition_id": composition_id,
            "items": items,
            "suggested_filename": filename,
            "total_duration_seconds": round(total_dur, 3),
            "props": {
                "bulletinTitle": label,
                "items": items,
                "subtitlesSrt": subtitles_srt,
                "wordTimingPath": word_timing_path,
                "timingMode": timing_mode,
                "subtitleStyle": resolved_subtitle_style,
                "lowerThirdStyle": lower_third_style,
                "renderMode": render_mode,
                "totalDurationSeconds": round(total_dur, 3),
                "language": language,
                "bulletinStyle": bulletin_style,
                "networkName": network_name,
                "showTicker": show_ticker,
                "tickerItems": ticker_items,
                "renderFormat": render_format,
                "karaokeAnimPreset": karaoke_anim_preset,
                "metadata": {
                    "title": metadata_data.get("title", ""),
                    "description": metadata_data.get("description", ""),
                    "tags": metadata_data.get("tags", []),
                    "hashtags": metadata_data.get("hashtags", []),
                },
            },
        }

    if render_mode == "per_item":
        outputs = []
        for item in props_items:
            n = item.get("itemNumber", 0)
            headline = item.get("headline", f"Haber {n}")[:40]
            key = f"item_{n}"
            label = f"Haber {n}: {headline}"
            filename = f"output_item_{n:02d}.mp4"
            outputs.append(_make_output(key, label, [item], filename))
        logger.info(
            "_build_render_outputs: per_item mod — %d ayrı çıktı planı oluşturuldu.",
            len(outputs),
        )
        return outputs

    elif render_mode == "per_category":
        from collections import OrderedDict
        category_map: dict[str, list[dict]] = OrderedDict()
        for item in props_items:
            cat = item.get("category") or "genel"
            if cat not in category_map:
                category_map[cat] = []
            category_map[cat].append(item)

        outputs = []
        for cat, items in category_map.items():
            key = f"category_{cat.lower().replace(' ', '_')}"
            label = f"{bulletin_title} — {cat.capitalize()}"
            filename = f"output_{cat.lower().replace(' ', '_')}.mp4"
            outputs.append(_make_output(key, label, items, filename))

        logger.info(
            "_build_render_outputs: per_category mod — %d kategori, %d çıktı planı.",
            len(outputs), len(outputs),
        )
        return outputs

    else:
        # combined (varsayılan) — tek çıktı
        if render_mode not in ("combined", None, ""):
            logger.warning(
                "_build_render_outputs: bilinmeyen render_mode=%r, combined kullanılıyor.",
                render_mode,
            )
        total_dur = sum(i.get("durationSeconds", 0.0) for i in props_items)
        return [_make_output(
            "combined",
            bulletin_title or "Haber Bülteni",
            props_items,
            "output.mp4",
        )]


class BulletinCompositionExecutor(StepExecutor):
    """
    Bülten kompozisyon adımı executor'ı — M28.

    Tüm artifact'ları birleştirerek NewsBulletin composition props üretir.
    artifact_check: composition_props.json varsa adımı atlar (idempotency).

    ÖNEMLİ: Bu executor render yapmaz — sadece props hazırlar.
    """

    def step_key(self) -> str:
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Composition adımını çalıştırır.

        Adımlar:
          1. artifact_check — composition_props.json varsa erken dön.
          2. Tüm artifact'ları oku: bulletin_script.json, audio_manifest.json,
             subtitle_metadata.json, metadata.json.
          3. composition_id güvenli mapping'den al.
          4. NewsBulletin props yapısını oluştur.
          5. artifacts/composition_props.json yaz.

        Returns:
            dict: artifact_path, composition_id, render_status, item_count.

        Raises:
            StepExecutionError: Zorunlu artifact eksikse veya composition_id bulunamazsa.
        """
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        workspace_root = raw_input.get("workspace_root", "")
        if not workspace_root and hasattr(job, "workspace_path") and job.workspace_path:
            workspace_root = str(job.workspace_path)

        # artifact_check: composition_props zaten varsa adımı atla
        props_path = _resolve_artifact_path(workspace_root, job.id, "composition_props.json")
        if props_path.exists():
            logger.info(
                "BulletinCompositionExecutor: composition_props.json mevcut, adım atlanıyor. job=%s",
                job.id,
            )
            existing = json.loads(props_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(props_path),
                "composition_id": existing.get("composition_id"),
                "render_status": existing.get("render_status"),
                "skipped": True,
                "step": self.step_key(),
            }

        # Zorunlu artifact'ları oku
        script_data = _read_artifact(workspace_root, job.id, "bulletin_script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"bulletin_script.json bulunamadı: job={job.id}. "
                "Script adımı önce tamamlanmış olmalı.",
            )

        audio_manifest = _read_artifact(workspace_root, job.id, "audio_manifest.json")
        if audio_manifest is None:
            raise StepExecutionError(
                self.step_key(),
                f"audio_manifest.json bulunamadı: job={job.id}. "
                "TTS adımı önce tamamlanmış olmalı.",
            )

        # İsteğe bağlı artifact'lar
        subtitle_metadata = _read_artifact(workspace_root, job.id, "subtitle_metadata.json") or {}
        metadata_data = _read_artifact(workspace_root, job.id, "metadata.json") or {}

        # Güvenli composition mapping (CLAUDE.md C-07)
        try:
            composition_id = get_composition_id("news_bulletin")
        except ValueError as err:
            raise StepExecutionError(
                self.step_key(),
                f"Composition ID çözümlenemedi: {err}",
            )

        language = raw_input.get("language", script_data.get("language", "tr"))

        # M30: subtitle_style from snapshot (fallback to default preset)
        snapshot_subtitle_style = raw_input.get("subtitle_style")
        resolved_subtitle_style = get_preset_for_composition(snapshot_subtitle_style)

        # M30: lower_third_style and render_mode from snapshot
        lower_third_style = raw_input.get("lower_third_style")
        render_mode = raw_input.get("render_mode", "combined")

        # M33: YTRobot visual style props
        bulletin_style = raw_input.get("bulletin_style", "breaking")
        network_name = raw_input.get("network_name", "ContentHub Haber")
        show_ticker = raw_input.get("show_ticker", True)
        ticker_items = raw_input.get("ticker_items") or None

        # Script item'larını ve audio bilgilerini birleştir
        script_items: list[dict] = script_data.get("items", [])
        audio_scenes: list[dict] = audio_manifest.get("scenes", [])

        if len(script_items) != len(audio_scenes):
            logger.warning(
                "BulletinCompositionExecutor: script item sayısı (%d) audio sahne sayısıyla "
                "(%d) uyuşmuyor. job=%s",
                len(script_items),
                len(audio_scenes),
                job.id,
            )

        # M41a: Max image count per item
        MAX_IMAGES_PER_ITEM = 5

        props_items: list[dict] = []
        for i, script_item in enumerate(script_items):
            audio_scene = audio_scenes[i] if i < len(audio_scenes) else {}
            item_duration = audio_scene.get("duration_seconds", 0.0)

            # M41a: Çoklu görsel desteği — image_urls listesi öncelikli
            image_urls: list = script_item.get("image_urls", [])
            image_url_single = script_item.get("image_url")

            # Fallback: image_urls boşsa tek image_url'den liste oluştur
            if not image_urls and image_url_single:
                image_urls = [image_url_single]

            # Max 5 görsel sınırı
            image_urls = image_urls[:MAX_IMAGES_PER_ITEM]

            # Harici görselleri workspace'e indir — Remotion headless render
            # harici URL'lere güvenilir erişim sağlayamaz (CORS, timeout, vb.)
            local_image_paths: list[str] = []
            for img_idx, img_url in enumerate(image_urls):
                local_path = download_image_to_workspace(
                    url=img_url,
                    workspace_root=workspace_root,
                    job_id=job.id,
                    sub_dir="visuals",
                    filename_hint=f"item_{i + 1}_img_{img_idx + 1}{_guess_ext(img_url)}",
                )
                if local_path:
                    local_image_paths.append(local_path)
                else:
                    # İndirme başarısızsa orijinal URL'yi koru (fallback)
                    local_image_paths.append(img_url)

            # M41a: image timeline hesaplaması — süreyi görseller arasında eşit böl
            image_timeline = None
            effective_urls = local_image_paths if local_image_paths else image_urls
            if effective_urls and item_duration > 0:
                count = len(effective_urls)
                segment_duration = round(item_duration / count, 3)
                image_timeline = []
                for img_idx, eff_url in enumerate(effective_urls):
                    start = round(img_idx * segment_duration, 3)
                    # Son segment kalan süreyi alır (yuvarlama farkları için)
                    dur = round(item_duration - start, 3) if img_idx == count - 1 else segment_duration
                    image_timeline.append({
                        "url": eff_url,
                        "startSeconds": start,
                        "durationSeconds": dur,
                    })

            # M41a: Source name resolution (domain fallback)
            source_name = script_item.get("source_name")
            source_id = script_item.get("source_id")
            if not source_name and source_id:
                source_name = _resolve_source_name_fallback(source_id)

            props_items.append({
                "itemNumber": i + 1,
                "headline": script_item.get("headline", ""),
                "narration": script_item.get("narration", ""),
                "audioPath": audio_scene.get("audio_path"),
                "imagePath": local_image_paths[0] if local_image_paths else (image_urls[0] if image_urls else None),
                "imageTimeline": image_timeline,
                "durationSeconds": item_duration,
                "category": script_item.get("category"),
                # M41: tarih ve kaynak
                "publishedAt": script_item.get("published_at"),
                "sourceId": source_id,
                # M41a: kaynak adı
                "sourceName": source_name,
            })

        total_duration = sum(item.get("durationSeconds", 0.0) for item in props_items)
        subtitles_srt = subtitle_metadata.get("srt_path")
        word_timing_path = subtitle_metadata.get("word_timing_path")
        timing_mode = subtitle_metadata.get("timing_mode", "cursor")

        # M41: karaoke_enabled kapalıysa timing_mode'u cursor'a düşür
        karaoke_enabled = raw_input.get("_settings_snapshot", {}).get(
            "news_bulletin.config.karaoke_enabled", True
        )
        if not karaoke_enabled:
            timing_mode = "cursor"

        # M41: show_date ve show_source ayarlarını oku
        show_date = raw_input.get("_settings_snapshot", {}).get(
            "news_bulletin.config.show_date", True
        )
        show_source = raw_input.get("_settings_snapshot", {}).get(
            "news_bulletin.config.show_source", False
        )

        start_time = time.monotonic()

        bulletin_title = metadata_data.get("title", script_data.get("bulletin_id", ""))

        # M42: karaoke_anim_preset — settings snapshot'tan oku
        karaoke_anim_preset = raw_input.get("_settings_snapshot", {}).get(
            "news_bulletin.config.karaoke_anim_preset", "hype"
        )
        # M41: render_format — settings snapshot'tan oku
        render_format_val = raw_input.get("_settings_snapshot", {}).get(
            "news_bulletin.config.render_format", "landscape"
        )

        # M31: render_output dizisi — render moduna göre çıktı planı
        render_outputs = _build_render_outputs(
            render_mode=render_mode,
            props_items=props_items,
            bulletin_title=bulletin_title,
            composition_id=composition_id,
            subtitles_srt=subtitles_srt,
            word_timing_path=word_timing_path,
            timing_mode=timing_mode,
            resolved_subtitle_style=resolved_subtitle_style,
            lower_third_style=lower_third_style,
            language=language,
            metadata_data=metadata_data,
            bulletin_style=bulletin_style,
            network_name=network_name,
            show_ticker=show_ticker,
            ticker_items=ticker_items,
            render_format=render_format_val,
            karaoke_anim_preset=karaoke_anim_preset,
        )

        composition_props: dict = {
            "job_id": job.id,
            "module_id": "news_bulletin",
            "language": language,
            "composition_id": composition_id,
            "render_mode": render_mode,
            "render_outputs": render_outputs,
            "props": {
                # Combined view — her zaman mevcut (geriye dönük uyumluluk + combined mode)
                "bulletinTitle": bulletin_title,
                "items": props_items,
                "subtitlesSrt": subtitles_srt,
                "wordTimingPath": word_timing_path,
                "timingMode": timing_mode,
                "subtitleStyle": resolved_subtitle_style,
                "lowerThirdStyle": lower_third_style,
                "renderMode": render_mode,
                "totalDurationSeconds": round(total_duration, 3),
                "language": language,
                # M33: YTRobot visual style
                "bulletinStyle": bulletin_style,
                "networkName": network_name,
                "showTicker": show_ticker,
                "tickerItems": ticker_items,
                # M41: renderFormat
                "renderFormat": render_format_val,
                # M42: karaokeAnimPreset
                "karaokeAnimPreset": karaoke_anim_preset,
                # M41: tarih ve kaynak gosterim ayarlari
                "showDate": show_date,
                "showSource": show_source,
                "metadata": {
                    "title": metadata_data.get("title", ""),
                    "description": metadata_data.get("description", ""),
                    "tags": metadata_data.get("tags", []),
                    "hashtags": metadata_data.get("hashtags", []),
                },
            },
            "render_status": "props_ready",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        latency_ms = int((time.monotonic() - start_time) * 1000)

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="composition_props.json",
            data=composition_props,
        )

        logger.info(
            "BulletinCompositionExecutor: job=%s composition_id=%s items=%d "
            "toplam_sure=%.1fs render_status=props_ready artifact=%s",
            job.id,
            composition_id,
            len(props_items),
            total_duration,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "composition_id": composition_id,
            "render_status": "props_ready",
            "render_mode": render_mode,
            "render_outputs_count": len(render_outputs),
            "items_included": len(props_items),
            "timing_mode": timing_mode,
            "total_duration_seconds": round(total_duration, 3),
            "provider": {
                "provider_id": "bulletin_composition_props_builder",
                "composition_id": composition_id,
                "items_included": len(props_items),
                "render_status": "props_ready",
                "render_mode": render_mode,
                "render_outputs_count": len(render_outputs),
                "timing_mode": timing_mode,
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }
