"""
Faz 5 — Preview router unit testleri.

Full TestClient entegrasyonu yerine route handler fonksiyonlarini dogrudan
cagirir. DB + provider_registry + preview_service mock'lanir.

Kapsam:
  - post_voice_sample → manifest dict doner
  - post_scene_preview → validation + manifest
  - post_draft_script_preview → validation + manifest
  - get_preview_manifest → 404 / 200
  - get_preview_audio → path traversal reddi + 404 + 200
  - Hata yolu: TTSPrimaryFailedError → 502
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.tts import preview_router
from app.tts.preview_router import (
    DraftScriptRequest,
    DraftSceneInput,
    ScenePreviewRequest,
    VoiceSampleRequest,
    get_preview_audio,
    get_preview_manifest,
    post_draft_script_preview,
    post_scene_preview,
    post_voice_sample,
)
from app.tts.preview_service import TTSPreviewManifest, PreviewSceneResult
from app.tts.strict_resolution import (
    TTSFallbackNotAllowedError,
    TTSPrimaryFailedError,
    TTSProviderNotFoundError,
)


def _fake_manifest(level: str = "voice_sample") -> TTSPreviewManifest:
    return TTSPreviewManifest(
        preview_id="prev_test123",
        level=level,
        provider_id="dubvoice",
        voice_id="voice_abc",
        language="tr",
        created_at="2026-04-15T12:00:00+00:00",
        scenes=[
            PreviewSceneResult(
                scene_number=1,
                output_path="/tmp/voice_sample.mp3",
                duration_seconds=2.5,
                tts_text_char_count=20,
                replacements_count=0,
                scene_energy="neutral",
                voice_settings={"stability": 0.5},
            )
        ],
        controls_snapshot={"speed": 1.0},
    )


# ---------------------------------------------------------------------------
# Voice sample
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_voice_sample_basari():
    payload = VoiceSampleRequest(voice_id="v1", custom_text="ornek")
    db = MagicMock()

    with patch.object(preview_router, "generate_voice_sample", new=AsyncMock(return_value=_fake_manifest())):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            result = await post_voice_sample(payload, db=db)

    assert result["level"] == "voice_sample"
    assert result["is_preview"] is True
    assert result["preview_id"] == "prev_test123"


@pytest.mark.asyncio
async def test_post_voice_sample_primary_fail_502():
    payload = VoiceSampleRequest()
    db = MagicMock()

    async def _raise(*a, **kw):
        raise TTSPrimaryFailedError(
            primary_provider_id="dubvoice",
            original_error=RuntimeError("timeout"),
        )

    with patch.object(preview_router, "generate_voice_sample", new=AsyncMock(side_effect=_raise)):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            with pytest.raises(HTTPException) as exc_info:
                await post_voice_sample(payload, db=db)
    assert exc_info.value.status_code == 502
    assert "auto-fallback yok" in exc_info.value.detail["message"].lower()


@pytest.mark.asyncio
async def test_post_voice_sample_provider_not_found_503():
    payload = VoiceSampleRequest()
    db = MagicMock()

    async def _raise(*a, **kw):
        raise TTSProviderNotFoundError("registry'de TTS yok")

    with patch.object(preview_router, "generate_voice_sample", new=AsyncMock(side_effect=_raise)):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            with pytest.raises(HTTPException) as exc_info:
                await post_voice_sample(payload, db=db)
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_post_voice_sample_value_error_422():
    payload = VoiceSampleRequest()
    db = MagicMock()

    async def _raise(*a, **kw):
        raise ValueError("custom_text bos")

    with patch.object(preview_router, "generate_voice_sample", new=AsyncMock(side_effect=_raise)):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            with pytest.raises(HTTPException) as exc_info:
                await post_voice_sample(payload, db=db)
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# Scene preview
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_scene_preview_basari():
    payload = ScenePreviewRequest(narration="Ornek sahne.", scene_number=2)
    db = MagicMock()

    with patch.object(
        preview_router,
        "generate_scene_preview",
        new=AsyncMock(return_value=_fake_manifest(level="scene")),
    ):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            result = await post_scene_preview(payload, db=db)

    assert result["level"] == "scene"


def test_scene_preview_request_min_length_validation():
    """Pydantic validation — bos narration kabul edilmez."""
    with pytest.raises(Exception):
        ScenePreviewRequest(narration="")


# ---------------------------------------------------------------------------
# Draft script
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_draft_script_basari():
    payload = DraftScriptRequest(
        scenes=[
            DraftSceneInput(scene_number=1, narration="Sahne 1."),
            DraftSceneInput(scene_number=2, narration="Sahne 2."),
        ]
    )
    db = MagicMock()

    with patch.object(
        preview_router,
        "generate_draft_script_preview",
        new=AsyncMock(return_value=_fake_manifest(level="draft_script")),
    ):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            result = await post_draft_script_preview(payload, db=db)

    assert result["level"] == "draft_script"


def test_draft_script_bos_scenes_kabul_edilmez():
    with pytest.raises(Exception):
        DraftScriptRequest(scenes=[])


# ---------------------------------------------------------------------------
# Manifest get
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_preview_manifest_yok_404():
    db = MagicMock()
    with patch.object(preview_router, "load_preview_manifest", new=AsyncMock(return_value=None)):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            with pytest.raises(HTTPException) as exc_info:
                await get_preview_manifest("nope", db=db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_preview_manifest_200_sonuc():
    db = MagicMock()
    with patch.object(
        preview_router,
        "load_preview_manifest",
        new=AsyncMock(return_value={"preview_id": "X", "is_preview": True}),
    ):
        with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
            result = await get_preview_manifest("X", db=db)
    assert result["preview_id"] == "X"


# ---------------------------------------------------------------------------
# Audio stream
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_preview_audio_path_traversal_reddedilir():
    db = MagicMock()
    with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
        with pytest.raises(HTTPException) as exc_info:
            await get_preview_audio("prev_abc", "../etc/passwd", db=db)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_preview_audio_filename_uzanti_kontrolu():
    db = MagicMock()
    with patch.object(preview_router, "get_workspace_root", return_value=Path("/tmp/ws")):
        with pytest.raises(HTTPException) as exc_info:
            await get_preview_audio("prev_abc", "evil.sh", db=db)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_preview_audio_yok_ise_404():
    with tempfile.TemporaryDirectory() as tmpdir:
        db = MagicMock()
        with patch.object(preview_router, "get_workspace_root", return_value=Path(tmpdir)):
            with pytest.raises(HTTPException) as exc_info:
                await get_preview_audio("prev_zzz", "voice_sample.mp3", db=db)
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_preview_audio_var_ise_200_fileresponse():
    with tempfile.TemporaryDirectory() as tmpdir:
        preview_root = Path(tmpdir) / "_tts_previews" / "prev_abc"
        preview_root.mkdir(parents=True)
        audio = preview_root / "voice_sample.mp3"
        audio.write_bytes(b"ID3\x03\x00\x00\x00")

        db = MagicMock()
        with patch.object(preview_router, "get_workspace_root", return_value=Path(tmpdir)):
            response = await get_preview_audio("prev_abc", "voice_sample.mp3", db=db)

        # FileResponse — media_type = audio/mpeg
        assert response.media_type == "audio/mpeg"
