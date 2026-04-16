"""
TTS Faz 1 — Common layer + DubVoice foundation testleri.

Kapsam:
  - TTSRequest/VoiceSettings contract (alan + payload dogrulanmasi)
  - voice_map per-provider resolution (edge_tts vs dubvoice)
  - DubVoiceProvider.invoke() acik API key / eksik input davranisi
  - DubVoiceProvider HTTP akisi (mocked httpx) — POST → poll → GET audio
  - DubVoiceProvider failed task davranisi (ProviderInvokeError)
  - DubVoiceProvider polling timeout davranisi
  - Settings Registry — Faz 1 key'leri tanimlanmis ve builtin_default'lari var
  - Credential wiring — _FACTORIES ve map kaydi mevcut
  - main.py TTS register srasi — DubVoice primary (registry uzerinden)

HTTP cagrilari mocklanir (httpx.AsyncClient transport); gercek DubVoice'e
request gitmez.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from app.modules.language import SupportedLanguage
from app.providers.capability import ProviderCapability
from app.providers.exceptions import (
    ConfigurationError,
    InputValidationError,
    ProviderInvokeError,
)
from app.providers.tts.dubvoice_provider import DubVoiceProvider
from app.providers.tts.voice_map import (
    DEFAULT_DUBVOICE_VOICE,
    DEFAULT_EDGE_VOICE,
    DEFAULT_VOICE,
    DUBVOICE_VOICE_MAP,
    EDGE_VOICE_MAP,
    VOICE_MAP,
    get_dubvoice_voice,
    get_edge_voice,
    get_voice,
)
from app.settings.credential_wiring import _CREDENTIAL_PROVIDER_MAP, _FACTORIES
from app.settings.settings_resolver import KNOWN_SETTINGS
from app.tts.contract import TTSRequest, TTSResult, VoiceSettings


# ============================================================
# VoiceSettings + TTSRequest contract
# ============================================================


def test_voice_settings_defaults():
    vs = VoiceSettings()
    assert vs.stability == 0.5
    assert vs.similarity_boost == 0.75
    assert vs.speed == 1.0
    assert vs.style == 0.0
    assert vs.use_speaker_boost is True


def test_voice_settings_dubvoice_payload():
    vs = VoiceSettings(stability=0.3, similarity_boost=0.9, speed=1.1)
    payload = vs.as_dubvoice_payload()
    assert payload == {
        "stability": 0.3,
        "similarity_boost": 0.9,
        "speed": 1.1,
        "style": 0.0,
        "use_speaker_boost": True,
    }


def test_tts_request_to_provider_input_minimal():
    req = TTSRequest(text="Merhaba", language="tr", output_path="/tmp/a.mp3")
    payload = req.to_provider_input()
    assert payload["text"] == "Merhaba"
    assert payload["language"] == "tr"
    assert payload["output_path"] == "/tmp/a.mp3"
    assert payload["voice_settings"]["stability"] == 0.5
    assert payload["preview_mode"] is False
    # opsiyonel alanlar bos ise payload'a girmez
    assert "voice_id" not in payload
    assert "model_id" not in payload
    assert "pitch" not in payload
    assert "emphasis" not in payload


def test_tts_request_to_provider_input_full():
    req = TTSRequest(
        text="Selam",
        language="tr",
        output_path="/tmp/b.mp3",
        voice_id="custom_voice",
        model_id="eleven_turbo_v2_5",
        voice_settings=VoiceSettings(stability=0.4),
        pitch=0.1,
        emphasis=0.8,
        pauses_ms=[250],
        pronunciation_hints={"ContentHub": "konten-hab"},
        preview_mode=True,
        channel_id="ch_001",
        scene_key="hero_card",
    )
    payload = req.to_provider_input()
    assert payload["voice_id"] == "custom_voice"
    assert payload["model_id"] == "eleven_turbo_v2_5"
    assert payload["voice_settings"]["stability"] == 0.4
    assert payload["pitch"] == 0.1
    assert payload["emphasis"] == 0.8
    assert payload["pauses_ms"] == [250]
    assert payload["pronunciation_hints"] == {"ContentHub": "konten-hab"}
    assert payload["preview_mode"] is True
    assert payload["channel_id"] == "ch_001"
    assert payload["scene_key"] == "hero_card"


def test_tts_result_manifest_shape():
    res = TTSResult(
        output_path="/tmp/x.mp3",
        duration_seconds=4.2,
        provider_id="dubvoice",
        trace={"task_id": "abc"},
    )
    manifest = res.to_manifest_dict()
    assert manifest == {
        "output_path": "/tmp/x.mp3",
        "duration_seconds": 4.2,
        "provider_id": "dubvoice",
    }


# ============================================================
# voice_map
# ============================================================


def test_voice_map_edge_tts_defaults():
    assert get_voice(SupportedLanguage.TR, "edge_tts") == "tr-TR-AhmetNeural"
    assert get_voice(SupportedLanguage.EN, "edge_tts") == "en-US-ChristopherNeural"


def test_voice_map_dubvoice_defaults():
    # ElevenLabs public voice_id'leri — degismemeli, sabit kontrat
    assert get_voice(SupportedLanguage.TR, "dubvoice") == "21m00Tcm4TlvDq8ikWAM"
    assert get_voice(SupportedLanguage.EN, "dubvoice") == "pNInz6obpgDQGcFmaJgB"


def test_voice_map_unknown_provider_falls_back_to_edge():
    # provider_id tanimli degilse Edge TTS haritasi kullanilir
    assert get_voice(SupportedLanguage.TR, "bilinmeyen") == "tr-TR-AhmetNeural"


def test_voice_map_backward_compat_aliases():
    assert VOICE_MAP is EDGE_VOICE_MAP
    assert DEFAULT_VOICE == DEFAULT_EDGE_VOICE
    assert get_edge_voice(SupportedLanguage.TR) == DEFAULT_EDGE_VOICE
    assert get_dubvoice_voice(SupportedLanguage.TR) == DEFAULT_DUBVOICE_VOICE


# ============================================================
# DubVoiceProvider — config guard
# ============================================================


def test_dubvoice_empty_api_key_raises_configuration_error(tmp_path: Path):
    provider = DubVoiceProvider(api_key="")
    req = {
        "text": "Merhaba",
        "output_path": str(tmp_path / "out.mp3"),
    }
    with pytest.raises(ConfigurationError):
        asyncio.run(provider.invoke(req))


def test_dubvoice_empty_text_raises_input_validation(tmp_path: Path):
    provider = DubVoiceProvider(api_key="sk_test")
    req = {"text": "   ", "output_path": str(tmp_path / "out.mp3")}
    with pytest.raises(InputValidationError):
        asyncio.run(provider.invoke(req))


def test_dubvoice_missing_output_path_raises_input_validation():
    provider = DubVoiceProvider(api_key="sk_test")
    req = {"text": "Merhaba", "output_path": ""}
    with pytest.raises(InputValidationError):
        asyncio.run(provider.invoke(req))


# ============================================================
# DubVoiceProvider — mocked HTTP akisi
# ============================================================


class _MockTransport(httpx.AsyncBaseTransport):
    """Scripted response transport — POST /tts → GET /tts/{id} → GET audio."""

    def __init__(self, responses: list[httpx.Response]):
        self._responses = list(responses)
        self.requests: list[httpx.Request] = []

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if not self._responses:
            return httpx.Response(500, text="no more scripted responses")
        return self._responses.pop(0)


def _patch_httpx(monkeypatch, transport: _MockTransport):
    """httpx.AsyncClient'i scripted transport ile degistir."""
    original = httpx.AsyncClient.__init__

    def patched(self, *args, **kwargs):
        kwargs["transport"] = transport
        return original(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched)


def test_dubvoice_happy_path_post_poll_download(monkeypatch, tmp_path: Path):
    audio_url = "https://cdn.example.com/audio.mp3"
    audio_bytes = b"\xff\xfb\x90\x00" + b"\x00" * 64  # MP3 sync bayti benzeri
    responses = [
        # 1) POST /tts → task created
        httpx.Response(
            200,
            json={"task_id": "task_123", "status": "pending", "characters": 7},
        ),
        # 2) GET /tts/task_123 → completed
        httpx.Response(
            200,
            json={
                "task_id": "task_123",
                "status": "completed",
                "result": audio_url,
                "error": None,
                "characters": 7,
            },
        ),
        # 3) GET audio_url → MP3 bytes
        httpx.Response(200, content=audio_bytes),
    ]
    transport = _MockTransport(responses)
    _patch_httpx(monkeypatch, transport)

    provider = DubVoiceProvider(
        api_key="sk_test",
        poll_interval_s=0.01,
        poll_timeout_s=5.0,
    )
    out_path = tmp_path / "scene.mp3"
    req = {
        "text": "Merhaba dünya",
        "output_path": str(out_path),
        "voice_id": "custom_voice",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.3, "speed": 1.1},
    }
    output = asyncio.run(provider.invoke(req))

    # Sonuc
    assert output.provider_id == "dubvoice"
    assert output.result["output_path"] == str(out_path)
    assert out_path.exists() and out_path.read_bytes() == audio_bytes
    assert output.trace["task_id"] == "task_123"
    assert output.trace["voice_id"] == "custom_voice"
    assert output.trace["voice_settings"]["stability"] == 0.3
    assert output.trace["audio_url"] == audio_url

    # HTTP cagrilari: 3 adet (POST + GET status + GET audio)
    assert len(transport.requests) == 3
    assert transport.requests[0].method == "POST"
    assert "/api/v1/tts" in str(transport.requests[0].url)
    post_body = json.loads(transport.requests[0].content.decode("utf-8"))
    assert post_body["text"] == "Merhaba dünya"
    assert post_body["voice_id"] == "custom_voice"
    assert post_body["voice_settings"]["stability"] == 0.3
    assert post_body["voice_settings"]["speed"] == 1.1
    assert transport.requests[0].headers["Authorization"] == "Bearer sk_test"


def test_dubvoice_task_failed_raises_invoke_error(monkeypatch, tmp_path: Path):
    responses = [
        httpx.Response(200, json={"task_id": "t1", "status": "pending", "characters": 5}),
        httpx.Response(
            200,
            json={
                "task_id": "t1",
                "status": "failed",
                "result": None,
                "error": "voice_id not found",
                "characters": 5,
            },
        ),
    ]
    transport = _MockTransport(responses)
    _patch_httpx(monkeypatch, transport)

    provider = DubVoiceProvider(api_key="sk_test", poll_interval_s=0.01)
    req = {"text": "Merhaba", "output_path": str(tmp_path / "x.mp3")}
    with pytest.raises(ProviderInvokeError) as exc_info:
        asyncio.run(provider.invoke(req))
    assert "voice_id not found" in str(exc_info.value)


def test_dubvoice_polling_timeout_raises_invoke_error(monkeypatch, tmp_path: Path):
    # POST yaniti + surekli pending → timeout
    responses = [
        httpx.Response(200, json={"task_id": "t2", "status": "pending", "characters": 3}),
    ]
    for _ in range(200):
        responses.append(
            httpx.Response(
                200,
                json={
                    "task_id": "t2",
                    "status": "processing",
                    "result": None,
                    "error": None,
                    "characters": 3,
                },
            )
        )
    transport = _MockTransport(responses)
    _patch_httpx(monkeypatch, transport)

    provider = DubVoiceProvider(
        api_key="sk_test",
        poll_interval_s=0.01,
        poll_timeout_s=0.1,  # agresif timeout
    )
    req = {"text": "Merhaba", "output_path": str(tmp_path / "y.mp3")}
    with pytest.raises(ProviderInvokeError) as exc_info:
        asyncio.run(provider.invoke(req))
    assert "tamamlanmadi" in str(exc_info.value)


def test_dubvoice_http_4xx_raises_invoke_error(monkeypatch, tmp_path: Path):
    responses = [
        httpx.Response(401, text="invalid api key"),
    ]
    transport = _MockTransport(responses)
    _patch_httpx(monkeypatch, transport)

    provider = DubVoiceProvider(api_key="sk_bad", poll_interval_s=0.01)
    req = {"text": "Merhaba", "output_path": str(tmp_path / "z.mp3")}
    with pytest.raises(ProviderInvokeError) as exc_info:
        asyncio.run(provider.invoke(req))
    assert "401" in str(exc_info.value) or "invalid api key" in str(exc_info.value)


# ============================================================
# KNOWN_SETTINGS — Faz 1 key'leri
# ============================================================


@pytest.mark.parametrize(
    "key,expected_default",
    [
        ("credential.dubvoice_api_key", None),
        ("tts.primary_provider", "dubvoice"),
        ("tts.allow_auto_fallback", False),
        ("tts.default_voice.tr", "21m00Tcm4TlvDq8ikWAM"),
        ("tts.default_voice.en", "pNInz6obpgDQGcFmaJgB"),
        ("tts.dubvoice.default_model_id", "eleven_multilingual_v2"),
        ("tts.dubvoice.poll_interval_seconds", 1.5),
        ("tts.dubvoice.poll_timeout_seconds", 120.0),
        ("tts.dubvoice.http_timeout_seconds", 30.0),
        ("tts.voice_settings.stability", 0.5),
        ("tts.voice_settings.similarity_boost", 0.75),
        ("tts.voice_settings.speed", 1.0),
        ("tts.voice_settings.style", 0.0),
        ("tts.voice_settings.use_speaker_boost", True),
    ],
)
def test_known_settings_faz1_defaults(key, expected_default):
    assert key in KNOWN_SETTINGS, f"Faz 1 key eksik: {key}"
    meta = KNOWN_SETTINGS[key]
    assert meta["builtin_default"] == expected_default


def test_known_settings_fallback_providers_is_list():
    meta = KNOWN_SETTINGS["tts.fallback_providers"]
    assert isinstance(meta["builtin_default"], list)
    assert "edge_tts" in meta["builtin_default"]
    assert "system_tts" in meta["builtin_default"]


# ============================================================
# Credential wiring — Faz 1
# ============================================================


def test_credential_wiring_dubvoice_mapping_registered():
    mapping = _CREDENTIAL_PROVIDER_MAP["credential.dubvoice_api_key"]
    assert mapping["capability"] == ProviderCapability.TTS
    assert mapping["provider_id"] == "dubvoice"
    assert mapping["factory"] == "_make_dubvoice_provider"
    assert mapping["register_as_primary"] is True
    assert mapping["register_priority"] == 0


@pytest.mark.asyncio
async def test_credential_wiring_factory_creates_dubvoice_provider():
    # Phase AI — factory artik async + optional db parametreli.
    # db=None verilirse builtin defaults'e duser (legacy davranis korunur).
    factory = _FACTORIES["_make_dubvoice_provider"]
    provider = await factory("sk_fake", db=None)
    assert provider.provider_id() == "dubvoice"
    assert provider.capability() == ProviderCapability.TTS
