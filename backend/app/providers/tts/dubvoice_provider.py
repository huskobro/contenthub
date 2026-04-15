"""
DubVoice TTS Provider (Faz 1).

DubVoice.ai, ElevenLabs'i saran async task-based TTS servisidir. API sozlesmesi
kullanici tarafindan verilen HTML dosyasindan birebir alinmistir:

  POST https://www.dubvoice.ai/api/v1/tts
    Authorization: Bearer sk_...
    Body (JSON):
      {
        "text": "...",
        "voice_id": "21m00Tcm4TlvDq8ikWAM",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
          "stability": 0.5,
          "similarity_boost": 0.75,
          "speed": 1.0,
          "style": 0.0,
          "use_speaker_boost": true
        }
      }
    Yanit (async):
      { "task_id": "uuid", "status": "pending", "characters": 30 }

  GET https://www.dubvoice.ai/api/v1/tts/{task_id}
    Yanit:
      { "task_id": "uuid",
        "status": "completed" | "pending" | "processing" | "failed",
        "result": "https://supabase.../audio.mp3" | null,
        "error": null | "...",
        "characters": 30 }

Akis:
  1. POST /tts → task_id al
  2. GET /tts/{task_id} → status=completed olana kadar poll et
  3. result URL'den MP3 indir, output_path'e yaz
  4. MP3 suresini mutagen ile olc (fallback: heuristic)

Kurallar:
  - API key Settings Registry (credential.dubvoice_api_key) uzerinden gelir.
    Kodda GOMULU ANAHTAR YOK.
  - API key bos ise provider ConfigurationError (NonRetryable) firlatir —
    resolve_and_invoke fallback yapmaz ve job FAIL olur.
  - Net hatalari (timeout/connect) ProviderInvokeError firlatir; fallback
    davranisi resolution_strict.py tarafindan engellenir (Faz 2).

Bu dosyada YOK:
  - Fallback mantigi (resolution katmani)
  - Preview/render fark (executor katmani)
  - Explicit fallback state machine (Faz 2)
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

import httpx

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import (
    ConfigurationError,
    InputValidationError,
    ProviderInvokeError,
)

logger = logging.getLogger(__name__)


# DubVoice.ai API sozlesmesi (kullanici HTML dosyasindan alinmistir)
_DUBVOICE_BASE_URL = "https://www.dubvoice.ai/api/v1"
_DUBVOICE_TTS_ENDPOINT = f"{_DUBVOICE_BASE_URL}/tts"

# Varsayilan model: ElevenLabs multilingual v2 — TR dahil zengin dil destegi
_DEFAULT_MODEL_ID = "eleven_multilingual_v2"

# Varsayilan voice_id (Rachel — ElevenLabs public) — voice_map override eder
_DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Polling defaults — async task tipik 3-20 saniye araliginda biter
_DEFAULT_POLL_INTERVAL_S = 1.5
_DEFAULT_POLL_TIMEOUT_S = 120.0  # 2 dakika toplam bekleme bütçesi
_DEFAULT_HTTP_TIMEOUT_S = 30.0


class DubVoiceProvider(BaseProvider):
    """
    DubVoice.ai TTS provider'i — primary TTS.

    API key DB tabanli credential resolver uzerinden gelir; runtime'da
    reinit edilebilir (credential_wiring ile).
    """

    def __init__(
        self,
        api_key: str,
        *,
        default_voice_id: Optional[str] = None,
        default_model_id: Optional[str] = None,
        poll_interval_s: Optional[float] = None,
        poll_timeout_s: Optional[float] = None,
        http_timeout_s: Optional[float] = None,
    ) -> None:
        """
        Args:
            api_key: DubVoice Bearer API anahtari.
                     Bos ise provider cagirildiginda ConfigurationError firlatir.
            default_voice_id: TTSRequest'te voice_id verilmediginde kullanilacak
                     ElevenLabs voice_id.
            default_model_id: TTSRequest'te model_id verilmediginde kullanilacak
                     ElevenLabs model kimligi.
            poll_interval_s: GET /tts/{task_id} sorgu arasi bekleme (saniye).
            poll_timeout_s: Task tamamlanana kadar toplam bekleme budcesi.
            http_timeout_s: Tek HTTP istegi timeout suresi.
        """
        self._api_key = (api_key or "").strip()
        self._default_voice_id = default_voice_id or _DEFAULT_VOICE_ID
        self._default_model_id = default_model_id or _DEFAULT_MODEL_ID
        self._poll_interval = poll_interval_s or _DEFAULT_POLL_INTERVAL_S
        self._poll_timeout = poll_timeout_s or _DEFAULT_POLL_TIMEOUT_S
        self._http_timeout = http_timeout_s or _DEFAULT_HTTP_TIMEOUT_S

    def provider_id(self) -> str:
        return "dubvoice"

    def capability(self) -> ProviderCapability:
        return ProviderCapability.TTS

    # ------------------------------------------------------------------
    # Ana invoke
    # ------------------------------------------------------------------

    async def invoke(self, input_data: dict) -> ProviderOutput:
        """
        Girdi metnini DubVoice uzerinden sese cevir, MP3 kaydet, trace dondur.

        Girdi alanlari:
          - text: str (zorunlu)
          - output_path: str (zorunlu)
          - voice_id: str (opsiyonel — default voice_id)
          - model_id: str (opsiyonel — default model_id)
          - voice_settings: dict (opsiyonel — stability/similarity/speed/style/use_speaker_boost)
          - language: str (opsiyonel — trace icin, API payload'a girmez)

        Raises:
          ConfigurationError: API key bos → fallback yapilmaz.
          InputValidationError: text/output_path eksik → fallback yapilmaz.
          ProviderInvokeError: HTTP hatasi / task failed / polling timeout.
        """
        text = (input_data.get("text") or "").strip()
        output_path = (input_data.get("output_path") or "").strip()

        if not text:
            raise InputValidationError(
                self.provider_id(), "'text' alani bos olamaz."
            )
        if not output_path:
            raise InputValidationError(
                self.provider_id(), "'output_path' alani belirtilmelidir."
            )
        if not self._api_key:
            raise ConfigurationError(
                self.provider_id(),
                "DubVoice API key bos. credential.dubvoice_api_key "
                "Settings Registry uzerinden kaydedilmeli.",
            )

        voice_id = (input_data.get("voice_id") or self._default_voice_id).strip()
        model_id = (input_data.get("model_id") or self._default_model_id).strip()

        vs_input: dict = input_data.get("voice_settings") or {}
        voice_settings = {
            "stability": float(vs_input.get("stability", 0.5)),
            "similarity_boost": float(vs_input.get("similarity_boost", 0.75)),
            "speed": float(vs_input.get("speed", 1.0)),
            "style": float(vs_input.get("style", 0.0)),
            "use_speaker_boost": bool(vs_input.get("use_speaker_boost", True)),
        }

        payload = {
            "text": text,
            "voice_id": voice_id,
            "model_id": model_id,
            "voice_settings": voice_settings,
        }

        started = time.monotonic()
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        task_id: str
        characters: int
        audio_url: str

        async with httpx.AsyncClient(timeout=self._http_timeout) as client:
            # 1) Task yarat
            try:
                resp = await client.post(
                    _DUBVOICE_TTS_ENDPOINT, json=payload, headers=headers
                )
            except httpx.TimeoutException as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice POST /tts timeout: {exc}",
                ) from exc
            except httpx.ConnectError as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice baglantisi kurulamadi: {exc}",
                ) from exc

            if resp.status_code >= 400:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice POST /tts {resp.status_code}: {resp.text[:500]}",
                )

            try:
                create_json = resp.json()
            except Exception as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice POST /tts yaniti JSON degil: {exc}",
                ) from exc

            task_id = (create_json.get("task_id") or "").strip()
            characters = int(create_json.get("characters") or 0)
            if not task_id:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice POST /tts yanitinda task_id yok: {create_json}",
                )

            # 2) Polling — status=completed olana kadar
            audio_url = await self._poll_task(client, headers, task_id)

            # 3) MP3 indir
            try:
                audio_resp = await client.get(audio_url)
            except httpx.TimeoutException as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice ses indirme timeout: {exc}",
                ) from exc

            if audio_resp.status_code >= 400:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice ses indirme {audio_resp.status_code}: {audio_url}",
                )

            with open(output_path, "wb") as fh:
                fh.write(audio_resp.content)

        latency_ms = int((time.monotonic() - started) * 1000)

        # Sure olcumu — mutagen varsa gercek deger, yoksa heuristic
        duration_s = self._measure_mp3_duration(output_path, fallback_text=text)

        return ProviderOutput(
            result={
                "output_path": output_path,
                "duration_seconds": duration_s,
            },
            trace={
                "provider_id": self.provider_id(),
                "voice_id": voice_id,
                "model_id": model_id,
                "voice_settings": voice_settings,
                "char_count": len(text),
                "characters_billed": characters,
                "task_id": task_id,
                "audio_url": audio_url,
                "latency_ms": latency_ms,
            },
            provider_id=self.provider_id(),
        )

    # ------------------------------------------------------------------
    # Ic yardimcilar
    # ------------------------------------------------------------------

    async def _poll_task(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        task_id: str,
    ) -> str:
        """
        GET /tts/{task_id} ile tamamlanana kadar poll et, result URL dondur.

        DubVoice status degerleri: pending | processing | completed | failed.

        Raises:
            ProviderInvokeError: status=failed, timeout asimi, result URL yok.
        """
        endpoint = f"{_DUBVOICE_TTS_ENDPOINT}/{task_id}"
        deadline = time.monotonic() + self._poll_timeout

        while True:
            try:
                resp = await client.get(endpoint, headers=headers)
            except httpx.TimeoutException as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice GET /tts/{task_id} timeout: {exc}",
                ) from exc

            if resp.status_code >= 400:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice GET /tts/{task_id} {resp.status_code}: "
                    f"{resp.text[:300]}",
                )

            try:
                data = resp.json()
            except Exception as exc:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice GET /tts/{task_id} JSON degil: {exc}",
                ) from exc

            status = (data.get("status") or "").lower()
            if status == "completed":
                audio_url = (data.get("result") or "").strip()
                if not audio_url:
                    raise ProviderInvokeError(
                        self.provider_id(),
                        f"DubVoice task {task_id} completed ama result URL yok.",
                    )
                return audio_url

            if status == "failed":
                error_msg = data.get("error") or "unknown"
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice task {task_id} failed: {error_msg}",
                )

            # pending / processing — bekle, tekrar dene
            if time.monotonic() >= deadline:
                raise ProviderInvokeError(
                    self.provider_id(),
                    f"DubVoice task {task_id} {self._poll_timeout:.0f}s icinde "
                    f"tamamlanmadi (son status={status}).",
                )

            await asyncio.sleep(self._poll_interval)

    def _measure_mp3_duration(
        self,
        path: str,
        *,
        fallback_text: str = "",
    ) -> float:
        """
        MP3 suresini olc. mutagen yoksa heuristic: karakter/15.

        Edge TTS provider ile birebir tutarli olsun diye fallback formulu ayni.
        """
        try:
            from mutagen.mp3 import MP3  # type: ignore

            info = MP3(path)
            if info.info and info.info.length > 0:
                return round(info.info.length, 2)
        except Exception as exc:
            logger.debug(
                "DubVoice: MP3 metadata okunamadi, heuristic kullaniliyor: %s",
                exc,
            )
        heuristic = round(len(fallback_text) / 15.0, 2) if fallback_text else 0.0
        return heuristic
