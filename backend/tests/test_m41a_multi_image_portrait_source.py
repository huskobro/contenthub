"""
M41a Tests — Multi-image, portrait layout, source name resolution, format picker.

Test kapsamı:
  1. _extract_image_urls: tek görsel → 1 URL
  2. _extract_image_urls: çoklu media_content → birden fazla URL
  3. _extract_image_urls: max 5 sınırı
  4. _extract_image_urls: benzersizlik (dedupe)
  5. resolve_source_domain_name: www.ntv.com.tr → ntv
  6. resolve_source_domain_name: www.bbc.com → bbc
  7. resolve_source_domain_name: www.reuters.com → reuters
  8. resolve_source_domain_name: www.some-site.net → some-site
  9. resolve_source_domain_name: full URL strip
  10. resolve_source_domain_name: boş/None → boş
  11. imageTimeline: 1 görsel, 20sn → 1 segment 20sn
  12. imageTimeline: 4 görsel, 20sn → 4 segment 5sn
  13. imageTimeline: 5 görsel, 20sn → 5 segment 4sn
  14. imageTimeline: 7 görsel → max 5 ile sınırlı
  15. karaoke default-on regression
  16. show_date default-on regression
  17. show_source default-off regression
  18. normalize_entry image_urls_json eklendi
"""

from __future__ import annotations

import json
import types
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entry(**attrs):
    """feedparser entry benzeri basit nesne üret."""
    return types.SimpleNamespace(**attrs)


def _make_source(**attrs):
    """feedparser source benzeri basit nesne üret."""
    defaults = {"id": "src-1", "language": "tr", "category": "general"}
    defaults.update(attrs)
    return types.SimpleNamespace(**defaults)


# ---------------------------------------------------------------------------
# Test 1-4: _extract_image_urls
# ---------------------------------------------------------------------------

def test_extract_image_urls_single():
    """Test 1: Tek media_content → 1 URL."""
    from app.source_scans.scan_engine import _extract_image_urls
    entry = _make_entry(media_content=[{"url": "https://img.example.com/1.jpg"}])
    urls = _extract_image_urls(entry)
    assert urls == ["https://img.example.com/1.jpg"]


def test_extract_image_urls_multiple_media_content():
    """Test 2: Birden fazla media_content → birden fazla URL."""
    from app.source_scans.scan_engine import _extract_image_urls
    entry = _make_entry(media_content=[
        {"url": "https://img.example.com/1.jpg"},
        {"url": "https://img.example.com/2.jpg"},
        {"url": "https://img.example.com/3.jpg"},
    ])
    urls = _extract_image_urls(entry)
    assert len(urls) == 3
    assert "https://img.example.com/2.jpg" in urls


def test_extract_image_urls_max_5():
    """Test 3: 7 görsel → max 5 ile sınırlı."""
    from app.source_scans.scan_engine import _extract_image_urls
    entry = _make_entry(media_content=[
        {"url": f"https://img.example.com/{i}.jpg"} for i in range(7)
    ])
    urls = _extract_image_urls(entry, max_count=5)
    assert len(urls) == 5


def test_extract_image_urls_dedup():
    """Test 4: Aynı URL tekrarı → benzersiz."""
    from app.source_scans.scan_engine import _extract_image_urls
    entry = _make_entry(
        media_content=[
            {"url": "https://img.example.com/1.jpg"},
            {"url": "https://img.example.com/1.jpg"},
        ],
        media_thumbnail=[
            {"url": "https://img.example.com/1.jpg"},
        ],
    )
    urls = _extract_image_urls(entry)
    assert len(urls) == 1


# ---------------------------------------------------------------------------
# Test 5-10: resolve_source_domain_name
# ---------------------------------------------------------------------------

def test_source_name_ntv():
    """Test 5: www.ntv.com.tr → ntv."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    assert resolve_source_domain_name("www.ntv.com.tr") == "ntv"


def test_source_name_bbc():
    """Test 6: www.bbc.com → bbc."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    assert resolve_source_domain_name("www.bbc.com") == "bbc"


def test_source_name_reuters():
    """Test 7: www.reuters.com → reuters."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    assert resolve_source_domain_name("www.reuters.com") == "reuters"


def test_source_name_some_site():
    """Test 8: www.some-site.net → some-site."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    assert resolve_source_domain_name("www.some-site.net") == "some-site"


def test_source_name_full_url():
    """Test 9: Full URL → domain extract + TLD strip."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    result = resolve_source_domain_name("https://news.example.org/feed/rss")
    assert result == "news.example"


def test_source_name_empty():
    """Test 10: Boş → boş."""
    from app.modules.news_bulletin.executors.composition import resolve_source_domain_name
    assert resolve_source_domain_name("") == ""
    assert resolve_source_domain_name(None) == ""


# ---------------------------------------------------------------------------
# Test 11-14: imageTimeline hesaplaması
# ---------------------------------------------------------------------------

def _build_timeline(image_urls, item_duration):
    """imageTimeline hesaplama mantığı — composition executor'dan kopyalandı."""
    MAX_IMAGES = 5
    urls = image_urls[:MAX_IMAGES]
    if not urls or item_duration <= 0:
        return None
    count = len(urls)
    segment_duration = round(item_duration / count, 3)
    timeline = []
    for i, url in enumerate(urls):
        start = round(i * segment_duration, 3)
        dur = round(item_duration - start, 3) if i == count - 1 else segment_duration
        timeline.append({
            "url": url,
            "startSeconds": start,
            "durationSeconds": dur,
        })
    return timeline


def test_timeline_single_image():
    """Test 11: 1 görsel, 20sn → 1 segment 20sn."""
    tl = _build_timeline(["img1.jpg"], 20.0)
    assert len(tl) == 1
    assert tl[0]["startSeconds"] == 0
    assert tl[0]["durationSeconds"] == 20.0


def test_timeline_four_images():
    """Test 12: 4 görsel, 20sn → 4 segment 5sn."""
    tl = _build_timeline(["a", "b", "c", "d"], 20.0)
    assert len(tl) == 4
    assert tl[0]["durationSeconds"] == 5.0
    assert tl[1]["startSeconds"] == 5.0
    assert tl[2]["startSeconds"] == 10.0
    assert tl[3]["startSeconds"] == 15.0
    total = sum(s["durationSeconds"] for s in tl)
    assert abs(total - 20.0) < 0.01


def test_timeline_five_images():
    """Test 13: 5 görsel, 20sn → 5 segment 4sn."""
    tl = _build_timeline(["a", "b", "c", "d", "e"], 20.0)
    assert len(tl) == 5
    assert tl[0]["durationSeconds"] == 4.0
    total = sum(s["durationSeconds"] for s in tl)
    assert abs(total - 20.0) < 0.01


def test_timeline_seven_images_capped_to_five():
    """Test 14: 7 görsel → max 5 ile sınırlı."""
    tl = _build_timeline(["a", "b", "c", "d", "e", "f", "g"], 20.0)
    assert len(tl) == 5


# ---------------------------------------------------------------------------
# Test 15-17: Settings regression
# ---------------------------------------------------------------------------

def test_karaoke_default_on():
    """Test 15: karaoke_enabled varsayılan True."""
    from app.settings.settings_resolver import KNOWN_SETTINGS
    sv = KNOWN_SETTINGS["standard_video.config.karaoke_enabled"]
    nb = KNOWN_SETTINGS["news_bulletin.config.karaoke_enabled"]
    assert sv["builtin_default"] is True
    assert nb["builtin_default"] is True


def test_show_date_default_on():
    """Test 16: show_date varsayılan True."""
    from app.settings.settings_resolver import KNOWN_SETTINGS
    s = KNOWN_SETTINGS["news_bulletin.config.show_date"]
    assert s["builtin_default"] is True


def test_show_source_default_off():
    """Test 17: show_source varsayılan False."""
    from app.settings.settings_resolver import KNOWN_SETTINGS
    s = KNOWN_SETTINGS["news_bulletin.config.show_source"]
    assert s["builtin_default"] is False


# ---------------------------------------------------------------------------
# Test 18: normalize_entry image_urls_json
# ---------------------------------------------------------------------------

def test_normalize_entry_includes_image_urls_json():
    """Test 18: normalize_entry çıktısında image_urls_json alanı var."""
    from app.source_scans.scan_engine import normalize_entry
    entry = _make_entry(
        link="https://example.com/news/1",
        title="Test Haber",
        summary="Ozet",
        media_content=[
            {"url": "https://img.example.com/1.jpg"},
            {"url": "https://img.example.com/2.jpg"},
        ],
    )
    source = _make_source()
    result = normalize_entry(entry, source, "scan-99")
    assert result is not None
    assert "image_urls_json" in result
    parsed = json.loads(result["image_urls_json"])
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    # Eski uyumluluk: image_url hala var
    assert result["image_url"] == "https://img.example.com/1.jpg"
