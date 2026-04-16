"""
Preview / final artifact classifier.

Deterministic, filename-based. Tek otorite — modul bazli preview uretiminde
tutarsiz isimlendirme olursa buraya yeni kural eklenir; parallel pattern YOK.

Sinifandirma kurallari (sirali; ilk eslesen kazanir):

  1. 'tmp_*' prefix veya '*.tmp' extension              -> TEMP (gizli)
  2. 'preview_frame.jpg' / 'preview_frame.png'          -> PREVIEW, scope=PREVIEW, kind=THUMBNAIL
  3. 'preview_mini.mp4' / 'preview_mini.webm'           -> PREVIEW, kind=VIDEO_RENDER
  4. 'preview_*.json'                                   -> PREVIEW, kind=METADATA
  5. 'preview_*.(jpg|png|gif)'                          -> PREVIEW, kind=THUMBNAIL
  6. 'preview_*.(mp4|webm|mov)'                         -> PREVIEW, kind=VIDEO_RENDER
  7. 'preview_*.(mp3|wav|aac)'                          -> PREVIEW, kind=AUDIO
  8. 'preview_*.*'                                      -> PREVIEW, kind=GENERIC
  9. 'final.mp4' / 'render*.mp4' / '*.mp4'              -> FINAL, kind=VIDEO_RENDER
 10. 'thumbnail*.(jpg|png)'                             -> FINAL, kind=THUMBNAIL
 11. 'script*.json' / 'metadata*.json'                  -> FINAL, kind=SCRIPT or METADATA
 12. 'composition_props.json'                           -> FINAL, kind=COMPOSITION_PROPS
 13. '*.mp3' / '*.wav'                                  -> FINAL, kind=AUDIO
 14. '*.srt' / '*.vtt'                                  -> FINAL, kind=SUBTITLE
 15. kalanlar                                           -> FINAL, kind=GENERIC

Not: kind.SCRIPT ayrimi ozellikle 'script' prefix ile yapilir; 'product_scrape'
icin GENERIC verilir — false positive'den kacinmak icin.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from app.contracts.enums import ArtifactKind, ArtifactScope


__all__ = ["ClassifiedArtifact", "classify_filename", "is_hidden"]


@dataclass(frozen=True)
class ClassifiedArtifact:
    """Siniflandirma sonucu — API yuzeyine cikan minimum alan seti."""

    name: str
    scope: ArtifactScope
    kind: ArtifactKind
    # Dosya adindan turetilen mantiksal adim — UI'da "Source step: render"
    # gibi gosterim icin. None ise turetilemedi.
    source_step: Optional[str] = None
    # Dosya adindan turetilen "preview label" — UI'da "Mini preview",
    # "Frame preview" gibi okunabilir etiket icin.
    label: Optional[str] = None


# ---------------------------------------------------------------------------
# Hidden files — artifact list'te hic gorunmez.
# ---------------------------------------------------------------------------


_HIDDEN_PREFIXES = ("tmp_", ".", "_")
_HIDDEN_EXTENSIONS = {".tmp", ".part", ".swp"}


def is_hidden(name: str) -> bool:
    """Liste'de gizlenecek dosya (tmp, partial, editor swap, dotfile)."""
    if not name:
        return True
    if any(name.startswith(p) for p in _HIDDEN_PREFIXES):
        return True
    suffix = Path(name).suffix.lower()
    return suffix in _HIDDEN_EXTENSIONS


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------


def _stem_lower(name: str) -> str:
    return Path(name).stem.lower()


def _suffix_lower(name: str) -> str:
    return Path(name).suffix.lower()


_VIDEO_EXT = {".mp4", ".webm", ".mov"}
_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif"}
_AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a"}
_SUBTITLE_EXT = {".srt", ".vtt"}


def classify_filename(name: str) -> ClassifiedArtifact:
    """
    Bir dosya adini deterministik olarak sinifandir.

    Gizli dosyalar (is_hidden) bu fonksiyona gelmeden filtrelenmelidir;
    yine de gelirse GENERIC + FINAL kabul edilir (sessizce gecmez, dürüst
    default).
    """
    stem = _stem_lower(name)
    suffix = _suffix_lower(name)

    # 2. preview_frame
    if stem in ("preview_frame",) and suffix in _IMAGE_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.THUMBNAIL,
            source_step="render_still",
            label="Frame preview",
        )

    # 3. preview_mini (video)
    if stem in ("preview_mini",) and suffix in _VIDEO_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.VIDEO_RENDER,
            source_step="preview_mini",
            label="Mini preview",
        )

    # 4. preview_* .json
    if stem.startswith("preview_") and suffix == ".json":
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.METADATA,
            source_step=_derive_source_step_from_preview_stem(stem),
            label=_derive_preview_label(stem),
        )

    # 5. preview_* image
    if stem.startswith("preview_") and suffix in _IMAGE_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.THUMBNAIL,
            source_step=_derive_source_step_from_preview_stem(stem),
            label=_derive_preview_label(stem),
        )

    # 6. preview_* video
    if stem.startswith("preview_") and suffix in _VIDEO_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.VIDEO_RENDER,
            source_step=_derive_source_step_from_preview_stem(stem),
            label=_derive_preview_label(stem),
        )

    # 7. preview_* audio
    if stem.startswith("preview_") and suffix in _AUDIO_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.AUDIO,
            source_step=_derive_source_step_from_preview_stem(stem),
            label=_derive_preview_label(stem),
        )

    # 8. preview_* generic
    if stem.startswith("preview_"):
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.PREVIEW,
            kind=ArtifactKind.GENERIC,
            source_step=_derive_source_step_from_preview_stem(stem),
            label=_derive_preview_label(stem),
        )

    # 9-15. final / fallback
    if suffix in _VIDEO_EXT:
        step = "render" if stem in ("final", "render", "render_final") else None
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.VIDEO_RENDER,
            source_step=step,
        )

    if suffix in _IMAGE_EXT and stem.startswith("thumbnail"):
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.THUMBNAIL,
            source_step="thumbnail",
        )

    if suffix in _IMAGE_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.VISUAL_ASSET,
        )

    if suffix == ".json":
        if stem.startswith("script"):
            return ClassifiedArtifact(
                name=name,
                scope=ArtifactScope.FINAL,
                kind=ArtifactKind.SCRIPT,
                source_step="script",
            )
        if stem.startswith("metadata"):
            return ClassifiedArtifact(
                name=name,
                scope=ArtifactScope.FINAL,
                kind=ArtifactKind.METADATA,
                source_step="metadata",
            )
        if stem == "composition_props":
            return ClassifiedArtifact(
                name=name,
                scope=ArtifactScope.FINAL,
                kind=ArtifactKind.COMPOSITION_PROPS,
                source_step="composition",
            )
        if stem.startswith("publish"):
            return ClassifiedArtifact(
                name=name,
                scope=ArtifactScope.FINAL,
                kind=ArtifactKind.PUBLISH_PAYLOAD,
                source_step="publish",
            )
        # Diger JSON (news_selected, product_scrape, vs.) -> GENERIC + FINAL
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.GENERIC,
        )

    if suffix in _AUDIO_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.AUDIO,
            source_step="tts",
        )

    if suffix in _SUBTITLE_EXT:
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.SUBTITLE,
            source_step="subtitle",
        )

    if suffix == ".log":
        return ClassifiedArtifact(
            name=name,
            scope=ArtifactScope.FINAL,
            kind=ArtifactKind.LOG,
        )

    return ClassifiedArtifact(
        name=name,
        scope=ArtifactScope.FINAL,
        kind=ArtifactKind.GENERIC,
    )


# ---------------------------------------------------------------------------
# Stem helpers
# ---------------------------------------------------------------------------


_PREVIEW_STEP_MAP = {
    "preview_mini": "preview_mini",
    "preview_frame": "render_still",
    "preview_script": "script",
    "preview_metadata": "metadata",
    "preview_subtitle": "subtitle",
    "preview_composition": "composition",
    "preview_thumbnail": "thumbnail",
    "preview_news_selected": "news_selected",
    "preview_props": "render_still",
}


def _derive_source_step_from_preview_stem(stem: str) -> Optional[str]:
    """
    'preview_mini' -> 'preview_mini'
    'preview_mini_props' -> 'preview_mini'
    'preview_script_v2' -> 'script'
    ...
    """
    # Direct match
    if stem in _PREVIEW_STEP_MAP:
        return _PREVIEW_STEP_MAP[stem]
    # Prefix match (en uzun onek kazanir)
    best: Optional[str] = None
    best_len = 0
    for prefix, step in _PREVIEW_STEP_MAP.items():
        if stem.startswith(prefix) and len(prefix) > best_len:
            best = step
            best_len = len(prefix)
    return best


_PREVIEW_LABEL_MAP = {
    "preview_mini": "Mini preview",
    "preview_frame": "Frame preview",
    "preview_script": "Script preview",
    "preview_metadata": "Metadata preview",
    "preview_subtitle": "Subtitle preview",
    "preview_composition": "Composition preview",
    "preview_thumbnail": "Thumbnail preview",
    "preview_news_selected": "Selected items preview",
    "preview_props": "Preview render props",
}


def _derive_preview_label(stem: str) -> Optional[str]:
    if stem in _PREVIEW_LABEL_MAP:
        return _PREVIEW_LABEL_MAP[stem]
    best: Optional[str] = None
    best_len = 0
    for prefix, lbl in _PREVIEW_LABEL_MAP.items():
        if stem.startswith(prefix) and len(prefix) > best_len:
            best = lbl
            best_len = len(prefix)
    return best
