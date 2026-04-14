"""
News Bulletin → YouTube publish description formatter.

Pure function module. Takes the artifacts and selection snapshot that the
news_bulletin pipeline already produces and renders a deterministic
publish-ready description string that honors the YouTube rules we care
about:

  * chapters start at 00:00 and are monotonic
  * at least three chapters (YouTube requirement) — if fewer news items
    exist we still render the chapters section but the validation flag
    is exposed to the caller
  * source citations per item (title — source_name — url), with a
    domain fallback when source_name is missing
  * dominant category + language footer
  * 5000-char cap: optional per-item summaries are dropped first,
    chapters and source block are never truncated

The formatter does not touch the database, does not call providers, and
does not know about YouTube adapter internals. The metadata executor
invokes it post-LLM to override the description field; nothing else
about the pipeline changes.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


# YouTube hard limits — description 5000 chars, tags total 500 chars.
MAX_DESCRIPTION_LENGTH = 5000
MAX_TAGS_TOTAL_LENGTH = 500

# Keep some headroom so we never ship a description that is right at the
# wire limit (YouTube occasionally rejects edge-case payloads).
_DESCRIPTION_HEADROOM = 64


def _format_timestamp(total_seconds: float) -> str:
    """Return a YouTube chapter-style timestamp.

    Under one hour we use ``M:SS`` (with a leading zero for the seconds);
    at or above one hour we switch to ``H:MM:SS``.  YouTube accepts both.
    The first chapter must be ``0:00`` — the caller is responsible for
    sorting the items, we just format the value.
    """
    seconds = max(0, int(round(float(total_seconds))))
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def _domain_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        netloc = urlparse(url).netloc
    except Exception:
        return None
    if not netloc:
        return None
    # Strip leading "www." so the fallback reads a bit nicer.
    return netloc[4:] if netloc.lower().startswith("www.") else netloc


def _coalesce_str(*values: Any) -> Optional[str]:
    """Return the first non-empty stripped string from *values*."""
    for v in values:
        if v is None:
            continue
        if not isinstance(v, str):
            v = str(v)
        stripped = v.strip()
        if stripped:
            return stripped
    return None


def _script_items(script_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not script_data:
        return []
    items = script_data.get("items")
    if not isinstance(items, list):
        return []
    return [i for i in items if isinstance(i, dict)]


def _build_chapters(
    items: List[Dict[str, Any]],
) -> Tuple[List[Tuple[str, str]], bool]:
    """Build ``[(timestamp, title), ...]`` chapters.

    Returns ``(chapters, valid_for_youtube)``.  ``valid_for_youtube`` is
    True when the list has at least three entries and the first one
    starts at 0 seconds — the rules YouTube enforces on the server side.
    We still render invalid chapter lists (they just won't be rendered
    as clickable on YouTube, which is the documented behavior).
    """
    chapters: List[Tuple[str, str]] = []
    cursor_seconds = 0.0
    for idx, item in enumerate(items):
        title = _coalesce_str(
            item.get("headline"),
            item.get("title"),
            item.get("chapter_title"),
            f"Haber {idx + 1}",
        ) or f"Haber {idx + 1}"

        start = item.get("start_time_seconds")
        if not isinstance(start, (int, float)):
            # Fall back to a running cursor based on duration_seconds so
            # we still emit monotonic timestamps for older scripts.
            start = cursor_seconds
        start = max(0.0, float(start))
        if idx == 0:
            # YouTube requires the very first chapter at 0:00.
            start = 0.0

        duration = item.get("duration_seconds")
        if isinstance(duration, (int, float)) and duration > 0:
            cursor_seconds = start + float(duration)
        else:
            cursor_seconds = start + 30.0

        chapters.append((_format_timestamp(start), title))

    valid = len(chapters) >= 3 and chapters[0][0].endswith("0:00")
    return chapters, valid


def _build_source_citations(
    items: List[Dict[str, Any]],
    news_items_map: Dict[str, Dict[str, Any]],
) -> List[str]:
    """Render source citation lines for each news item we can resolve.

    Map lookup happens in this priority order:
      1. ``item["news_item_id"]`` / ``item["id"]`` → direct DB match
      2. position-based fallback — the formatter receives an ordered
         ``news_items_map`` *plus* ordered ``items``; when the script
         item has no FK we fall back to the map entry at the same
         position index.  This keeps older script artifacts (which only
         copied ``source_name`` but not ``news_item_id``/``url``) usable
         for citation rendering without forcing a script-side rewrite.
    """
    lines: List[str] = []
    seen_urls: set[str] = set()
    map_values = list(news_items_map.values())
    for idx, item in enumerate(items):
        news_item_id = item.get("news_item_id") or item.get("id")
        src: Optional[Dict[str, Any]] = (
            news_items_map.get(news_item_id) if news_item_id else None
        )
        if src is None and idx < len(map_values):
            # Position-based fallback — selection ordering and script
            # item ordering are produced from the same position_index.
            src = map_values[idx]

        title = _coalesce_str(
            (src or {}).get("title") if isinstance(src, dict) else None,
            item.get("headline"),
            item.get("title"),
            f"Haber {idx + 1}",
        )
        url = _coalesce_str(
            (src or {}).get("url") if isinstance(src, dict) else None,
            item.get("url"),
        )
        source_name = _coalesce_str(
            (src or {}).get("source_name") if isinstance(src, dict) else None,
            item.get("source_name"),
        )

        if not url:
            # Without a URL the citation is effectively noise — drop it
            # but warn so we can spot data-quality regressions.
            logger.warning(
                "description_formatter: source citation dropped — no URL "
                "for news_item_id=%s (idx=%d, title=%r)",
                news_item_id, idx, title,
            )
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)

        if not source_name:
            source_name = _domain_from_url(url) or "kaynak"

        # Title fallback — formatter must always render something useful.
        display_title = title or f"Haber {idx + 1}"
        lines.append(f"• {display_title} — {source_name} ({url})")
    return lines


def _build_per_item_summaries(items: List[Dict[str, Any]]) -> List[str]:
    """One short narration-based blurb per item (optional block)."""
    lines: List[str] = []
    for idx, item in enumerate(items):
        narration = _coalesce_str(item.get("narration"), item.get("summary"))
        if not narration:
            continue
        snippet = narration.strip()
        if len(snippet) > 180:
            snippet = snippet[:177].rstrip() + "…"
        headline = _coalesce_str(
            item.get("headline"), item.get("title"), f"Haber {idx + 1}"
        )
        lines.append(f"{idx + 1}. {headline}\n   {snippet}")
    return lines


def _normalize_hashtag(value: str) -> Optional[str]:
    if not value:
        return None
    token = value.strip()
    if not token:
        return None
    if token.startswith("#"):
        token = token[1:]
    # Replace spaces/dashes with underscores — YouTube hashtags must be
    # one token and alphanumeric-ish.
    token = "".join(ch for ch in token if ch.isalnum() or ch == "_")
    return f"#{token}" if token else None


def _build_hashtag_line(
    metadata: Dict[str, Any],
    dominant_category: Optional[str],
) -> Optional[str]:
    seeds: List[str] = ["haber", "bulten"]
    if dominant_category:
        seeds.append(dominant_category)
    raw_hashtags = metadata.get("hashtags") if isinstance(metadata, dict) else None
    if isinstance(raw_hashtags, list):
        for raw in raw_hashtags:
            if isinstance(raw, str):
                seeds.append(raw)
    tags = metadata.get("tags") if isinstance(metadata, dict) else None
    if isinstance(tags, list):
        for raw in tags[:3]:
            if isinstance(raw, str):
                seeds.append(raw)

    rendered: List[str] = []
    seen: set[str] = set()
    for seed in seeds:
        tag = _normalize_hashtag(seed)
        if tag and tag.lower() not in seen:
            seen.add(tag.lower())
            rendered.append(tag)
    if not rendered:
        return None
    # YouTube renders up to 15 hashtags above the title — stay well under.
    return " ".join(rendered[:6])


def _trim_to_limit(text: str, limit: int = MAX_DESCRIPTION_LENGTH) -> str:
    """Hard cap with a trailing ellipsis — last-resort safeguard."""
    max_len = max(0, limit - _DESCRIPTION_HEADROOM)
    if len(text) <= max_len:
        return text
    trimmed = text[: max_len - 1].rstrip()
    return trimmed + "…"


def build_publish_description(
    *,
    script_data: Optional[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]],
    news_items_map: Optional[Dict[str, Dict[str, Any]]] = None,
    dominant_category: Optional[str] = None,
    language: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Render the final YouTube description for a news bulletin.

    ``news_items_map`` maps ``news_item_id`` → a dict with ``title``,
    ``url``, ``source_name``.  The formatter gracefully degrades when
    the map is missing — it falls back to fields already embedded in
    the script items (script.py copies source_name / url into the
    items under M41/M41a).

    Returns a dict::

        {
          "description": <final string>,
          "chapter_count": <int>,
          "chapters_valid_for_youtube": <bool>,
          "source_count": <int>,
          "truncated": <bool>,
          "dropped_sections": [<list of section names dropped for limit>],
        }
    """
    metadata = metadata or {}
    news_items_map = news_items_map or {}
    items = _script_items(script_data)

    hook = _coalesce_str(metadata.get("description"))
    # If the LLM description already opens with our structured block
    # (e.g. re-run) strip it down to the first paragraph only — we keep
    # the opening sentence as the hook.
    if hook:
        first_para = hook.split("\n\n", 1)[0].strip()
        if first_para:
            hook = first_para

    chapters, chapters_valid = _build_chapters(items)
    source_lines = _build_source_citations(items, news_items_map)
    per_item_lines = _build_per_item_summaries(items)

    # Footer pieces: category + language + hashtags + signature.
    footer_lines: List[str] = []
    label_bits: List[str] = []
    if dominant_category:
        label_bits.append(f"Kategori: {dominant_category}")
    lang = language or metadata.get("language")
    if lang:
        label_bits.append(str(lang).upper())
    if label_bits:
        footer_lines.append("🏷 " + " · ".join(label_bits))

    hashtag_line = _build_hashtag_line(metadata, dominant_category)
    if hashtag_line:
        footer_lines.append(hashtag_line)

    footer_lines.append("— ContentHub otomatik bülteni")

    # Assemble the critical block first — chapters + sources + footer.
    # These must survive the 5000-char budget.
    critical_parts: List[str] = []
    if hook:
        critical_parts.append(hook)

    if chapters:
        chapter_block = ["📰 Bu bültende:"]
        chapter_block.extend(f"{ts}  {title}" for ts, title in chapters)
        critical_parts.append("\n".join(chapter_block))

    if source_lines:
        source_block = ["🔗 Kaynaklar:"]
        source_block.extend(source_lines)
        critical_parts.append("\n".join(source_block))

    critical_parts.append("\n".join(footer_lines))

    critical_text = "\n\n".join(critical_parts)

    # Now see whether we can afford the optional per-item summary block.
    dropped_sections: List[str] = []
    budget = MAX_DESCRIPTION_LENGTH - _DESCRIPTION_HEADROOM
    final_text = critical_text

    if per_item_lines:
        optional_block = "📄 Özetler:\n" + "\n\n".join(per_item_lines)
        tentative = critical_text + "\n\n" + optional_block
        if len(tentative) <= budget:
            final_text = tentative
        else:
            dropped_sections.append("per_item_summaries")

    truncated = False
    if len(final_text) > budget:
        final_text = _trim_to_limit(final_text)
        truncated = True

    return {
        "description": final_text,
        "chapter_count": len(chapters),
        "chapters_valid_for_youtube": chapters_valid,
        "source_count": len(source_lines),
        "truncated": truncated,
        "dropped_sections": dropped_sections,
    }


def build_publish_tags(
    *,
    metadata: Optional[Dict[str, Any]],
    dominant_category: Optional[str] = None,
    extra: Optional[Iterable[str]] = None,
) -> List[str]:
    """
    Build a YouTube-friendly tag list.

    Merges the LLM tags with bulletin-wide defaults ("haber", "bulten",
    dominant_category) and enforces YouTube's 500-char total budget
    (tags are joined with commas internally by YouTube).
    """
    metadata = metadata or {}
    seen: set[str] = set()
    collected: List[str] = []

    def _add(value: Any) -> None:
        if not isinstance(value, str):
            return
        token = value.strip()
        if not token:
            return
        key = token.lower()
        if key in seen:
            return
        seen.add(key)
        collected.append(token)

    _add("haber")
    _add("bulten")
    if dominant_category:
        _add(dominant_category)

    raw_tags = metadata.get("tags")
    if isinstance(raw_tags, list):
        for tag in raw_tags:
            _add(tag)

    if extra:
        for tag in extra:
            _add(tag)

    # Enforce the 500-char budget (includes commas between tags).
    budget = MAX_TAGS_TOTAL_LENGTH
    rendered: List[str] = []
    running = 0
    for tag in collected:
        addition = len(tag) + (1 if rendered else 0)  # +1 for comma
        if running + addition > budget:
            break
        rendered.append(tag)
        running += addition

    return rendered
