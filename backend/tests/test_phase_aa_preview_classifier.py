"""
PHASE AA — Preview classifier pure-logic tests.

Filename-only deterministic classifier; hicbir I/O yapmaz. Bu test dosyasi
classifier'in KNOWN senaryolari dogru kategoriledigini garantiler.

Kurallari ihlal edersek (parallel pattern, hatali scope), bu test kirilir —
preview/final sinirinin bulanmasini bu kontrat engeller.
"""
from __future__ import annotations

import pytest

from app.previews.classifier import (
    ClassifiedArtifact,
    classify_filename,
    is_hidden,
)
from app.contracts.enums import ArtifactKind, ArtifactScope


# ---------------------------------------------------------------------------
# is_hidden
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "name",
    [
        "tmp_script.json",
        "tmp_foo.mp4",
        ".DS_Store",
        "_partial.mp3",
        "foo.tmp",
        "foo.part",
        "foo.swp",
    ],
)
def test_hidden_detected(name: str) -> None:
    assert is_hidden(name) is True


@pytest.mark.parametrize(
    "name",
    [
        "preview_mini.mp4",
        "preview_frame.jpg",
        "final.mp4",
        "script.json",
        "thumbnail.png",
        "metadata.json",
    ],
)
def test_not_hidden(name: str) -> None:
    assert is_hidden(name) is False


def test_empty_name_is_hidden() -> None:
    assert is_hidden("") is True


# ---------------------------------------------------------------------------
# Preview classification — rules 2-8
# ---------------------------------------------------------------------------


def test_preview_frame_is_thumbnail_preview() -> None:
    c = classify_filename("preview_frame.jpg")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.THUMBNAIL
    assert c.source_step == "render_still"
    assert c.label == "Frame preview"


def test_preview_frame_png_is_thumbnail_preview() -> None:
    c = classify_filename("preview_frame.png")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.THUMBNAIL


def test_preview_mini_is_video_render_preview() -> None:
    c = classify_filename("preview_mini.mp4")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.VIDEO_RENDER
    assert c.source_step == "preview_mini"
    assert c.label == "Mini preview"


def test_preview_mini_webm_is_video_preview() -> None:
    c = classify_filename("preview_mini.webm")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.VIDEO_RENDER


def test_preview_script_json_is_metadata_preview() -> None:
    c = classify_filename("preview_script.json")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.METADATA
    assert c.source_step == "script"


def test_preview_arbitrary_json_is_metadata_preview() -> None:
    c = classify_filename("preview_foo.json")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.METADATA


def test_preview_image_defaults_to_thumbnail() -> None:
    c = classify_filename("preview_hero.png")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.THUMBNAIL


def test_preview_audio_classified_as_audio() -> None:
    c = classify_filename("preview_narration.mp3")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.AUDIO


def test_preview_generic_fallback() -> None:
    c = classify_filename("preview_weird.xyz")
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.GENERIC


# ---------------------------------------------------------------------------
# Final classification — rules 9-15
# ---------------------------------------------------------------------------


def test_final_video_named_final() -> None:
    c = classify_filename("final.mp4")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.VIDEO_RENDER
    assert c.source_step == "render"


def test_final_video_named_render() -> None:
    c = classify_filename("render.mp4")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.VIDEO_RENDER
    assert c.source_step == "render"


def test_arbitrary_mp4_is_final_video() -> None:
    c = classify_filename("bulletin_render.mp4")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.VIDEO_RENDER


def test_thumbnail_image_is_final_thumbnail() -> None:
    c = classify_filename("thumbnail.jpg")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.THUMBNAIL
    assert c.source_step == "thumbnail"


def test_script_json_is_final_script() -> None:
    c = classify_filename("script.json")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.SCRIPT
    assert c.source_step == "script"


def test_metadata_json_is_final_metadata() -> None:
    c = classify_filename("metadata.json")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.METADATA


def test_composition_props_is_final() -> None:
    c = classify_filename("composition_props.json")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.COMPOSITION_PROPS


def test_publish_json_is_final_publish_payload() -> None:
    c = classify_filename("publish_youtube.json")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.PUBLISH_PAYLOAD


def test_unknown_json_is_generic_final() -> None:
    c = classify_filename("news_selected.json")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.GENERIC


def test_mp3_is_final_audio() -> None:
    c = classify_filename("narration.mp3")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.AUDIO
    assert c.source_step == "tts"


def test_srt_is_final_subtitle() -> None:
    c = classify_filename("subtitles.srt")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.SUBTITLE


def test_log_is_final_log() -> None:
    c = classify_filename("run.log")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.LOG


def test_unknown_extension_is_generic_final() -> None:
    c = classify_filename("weird.xyz")
    assert c.scope == ArtifactScope.FINAL
    assert c.kind == ArtifactKind.GENERIC


# ---------------------------------------------------------------------------
# Scope boundary — the important guard.
# ---------------------------------------------------------------------------


def test_preview_files_never_get_final_scope() -> None:
    """Preview dosyasi sonsuza kadar PREVIEW kalir — final artifact gibi davranamaz."""
    for name in [
        "preview_mini.mp4",
        "preview_frame.jpg",
        "preview_script.json",
        "preview_thumbnail.png",
        "preview_audio.mp3",
        "preview_generic.dat",
    ]:
        c = classify_filename(name)
        assert c.scope == ArtifactScope.PREVIEW, (
            f"{name} PREVIEW scope'unu kaybetti — preview/final siniri bozuldu"
        )


def test_final_files_never_get_preview_scope() -> None:
    for name in [
        "final.mp4",
        "script.json",
        "metadata.json",
        "thumbnail.jpg",
        "narration.mp3",
        "subtitles.srt",
    ]:
        c = classify_filename(name)
        assert c.scope == ArtifactScope.FINAL


def test_preview_stem_is_case_insensitive() -> None:
    """Bazi pipeline'lar buyuk harf yazabilir — regression korumasi."""
    c = classify_filename("PREVIEW_MINI.MP4")
    # Classifier lowercase karsilastirma yapar
    assert c.scope == ArtifactScope.PREVIEW
    assert c.kind == ArtifactKind.VIDEO_RENDER


# ---------------------------------------------------------------------------
# Return type contract
# ---------------------------------------------------------------------------


def test_classify_returns_frozen_dataclass() -> None:
    c = classify_filename("preview_mini.mp4")
    assert isinstance(c, ClassifiedArtifact)
    with pytest.raises(Exception):
        # dataclass frozen — mutasyon izin yok
        c.name = "other.mp4"  # type: ignore[misc]
