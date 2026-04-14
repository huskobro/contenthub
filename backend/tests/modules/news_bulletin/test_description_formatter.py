"""
Unit tests for news_bulletin description_formatter.

Covers:
    * timestamp formatting (under/over one hour)
    * domain fallback for missing source_name
    * happy path (3-item bulletin → chapters + citations + footer)
    * position-based fallback when script items lack news_item_id
    * invalid chapter count (<3 → chapters_valid_for_youtube=False)
    * 5000-char budget enforcement (summaries dropped first, then hard trim)
    * tag builder 500-char total cap + dedupe
"""

from __future__ import annotations

from app.modules.news_bulletin.description_formatter import (
    MAX_DESCRIPTION_LENGTH,
    _domain_from_url,
    _format_timestamp,
    build_publish_description,
    build_publish_tags,
)


def _make_script(items):
    return {"items": items, "language": "tr"}


def test_format_timestamp_under_one_hour():
    assert _format_timestamp(0) == "0:00"
    assert _format_timestamp(7) == "0:07"
    assert _format_timestamp(59) == "0:59"
    assert _format_timestamp(60) == "1:00"
    assert _format_timestamp(125) == "2:05"


def test_format_timestamp_over_one_hour():
    assert _format_timestamp(3600) == "1:00:00"
    assert _format_timestamp(3725) == "1:02:05"


def test_domain_from_url_strips_www():
    assert _domain_from_url("https://www.ntv.com.tr/x/y") == "ntv.com.tr"
    assert _domain_from_url("https://example.org") == "example.org"
    assert _domain_from_url(None) is None
    assert _domain_from_url("") is None


def test_happy_path_3_items_renders_chapters_sources_footer():
    items = [
        {
            "headline": "Kaza haberi",
            "narration": "İnşaatta kaza oldu.",
            "duration_seconds": 20,
            "news_item_id": "n-1",
        },
        {
            "headline": "Yağmur etkisi",
            "narration": "Yağmur trafiği etkiledi.",
            "duration_seconds": 18,
            "news_item_id": "n-2",
        },
        {
            "headline": "Hırsızlık zanlısı",
            "narration": "Zanlı yakalandı.",
            "duration_seconds": 22,
            "news_item_id": "n-3",
        },
    ]
    news_map = {
        "n-1": {"title": "Şantiye kazası", "url": "https://ntv.com.tr/a", "source_name": "NTV"},
        "n-2": {"title": "İstanbul trafik", "url": "https://ntv.com.tr/b", "source_name": "NTV"},
        "n-3": {"title": "Adres sorma", "url": "https://ntv.com.tr/c", "source_name": "NTV"},
    }
    result = build_publish_description(
        script_data=_make_script(items),
        metadata={"description": "Gündem bülteni özeti."},
        news_items_map=news_map,
        dominant_category="gundem",
        language="tr",
    )
    assert result["chapter_count"] == 3
    assert result["source_count"] == 3
    assert result["chapters_valid_for_youtube"] is True
    assert result["truncated"] is False
    assert "0:00" in result["description"]
    assert "📰 Bu bültende:" in result["description"]
    assert "🔗 Kaynaklar:" in result["description"]
    assert "🏷 Kategori: gundem" in result["description"]
    assert "— ContentHub otomatik bülteni" in result["description"]


def test_position_based_fallback_when_news_item_id_missing():
    """Script items without news_item_id should still get citations via position mapping."""
    items = [
        {"headline": "A", "narration": "a", "duration_seconds": 10},
        {"headline": "B", "narration": "b", "duration_seconds": 10},
        {"headline": "C", "narration": "c", "duration_seconds": 10},
    ]
    # Map keys are irrelevant; only ordering (insertion) matters
    news_map = {
        "id-1": {"title": "Kaynak A", "url": "https://ex.com/1", "source_name": "ExA"},
        "id-2": {"title": "Kaynak B", "url": "https://ex.com/2", "source_name": "ExB"},
        "id-3": {"title": "Kaynak C", "url": "https://ex.com/3", "source_name": "ExC"},
    }
    result = build_publish_description(
        script_data=_make_script(items),
        metadata={},
        news_items_map=news_map,
        dominant_category=None,
        language="tr",
    )
    assert result["source_count"] == 3
    assert "https://ex.com/1" in result["description"]
    assert "https://ex.com/3" in result["description"]


def test_fewer_than_3_chapters_marks_invalid():
    items = [
        {"headline": "Tek", "narration": "tek haber", "duration_seconds": 30},
        {"headline": "İki", "narration": "iki haber", "duration_seconds": 30},
    ]
    result = build_publish_description(
        script_data=_make_script(items),
        metadata={},
        news_items_map={},
        dominant_category=None,
        language="tr",
    )
    assert result["chapter_count"] == 2
    assert result["chapters_valid_for_youtube"] is False


def test_summaries_dropped_when_budget_exceeded():
    big_narration = "x" * 220  # 220 chars per item → huge summaries block
    items = []
    news_map = {}
    for i in range(40):  # 40 items × ~200 char summary → well over 5000
        items.append({
            "headline": f"Haber {i}",
            "narration": big_narration,
            "duration_seconds": 15,
            "news_item_id": f"id-{i}",
        })
        news_map[f"id-{i}"] = {
            "title": f"Uzun başlık {i} " + ("y" * 30),
            "url": f"https://ex.com/art/{i}",
            "source_name": "Kaynak",
        }
    result = build_publish_description(
        script_data=_make_script(items),
        metadata={"description": "Çok haberli bülten."},
        news_items_map=news_map,
        dominant_category="gundem",
        language="tr",
    )
    assert len(result["description"]) <= MAX_DESCRIPTION_LENGTH
    # Either summaries were dropped or the text was hard-trimmed.
    assert (
        "per_item_summaries" in result["dropped_sections"]
        or result["truncated"] is True
    )
    # Critical sections must still be present
    assert "📰 Bu bültende:" in result["description"]
    assert "🔗 Kaynaklar:" in result["description"]


def test_build_publish_tags_respects_500_char_budget_and_dedupes():
    metadata = {
        "tags": [
            "haber",  # duplicates bulten-wide default
            "gundem",  # duplicates dominant_category
            "çok uzun etiket " + ("x" * 40),  # long
            "başka etiket",
            "Başka Etiket",  # case-insensitive dup
        ] + [f"etiket_{i}" * 5 for i in range(50)]  # overflow
    }
    tags = build_publish_tags(metadata=metadata, dominant_category="gundem")
    # First three are bulletin defaults in order; dedupe must not duplicate them
    assert tags[0] == "haber"
    assert tags[1] == "bulten"
    assert tags[2] == "gundem"
    # "başka etiket" dedupes with "Başka Etiket" (case-insensitive)
    lowered = [t.lower() for t in tags]
    assert lowered.count("başka etiket") == 1
    # Budget: comma-joined length must be ≤ 500
    total = sum(len(t) for t in tags) + max(0, len(tags) - 1)
    assert total <= 500


def test_empty_inputs_return_stable_shape():
    result = build_publish_description(
        script_data=None,
        metadata=None,
        news_items_map=None,
        dominant_category=None,
        language=None,
    )
    assert result["chapter_count"] == 0
    assert result["source_count"] == 0
    assert result["chapters_valid_for_youtube"] is False
    assert result["truncated"] is False
    assert isinstance(result["description"], str)
