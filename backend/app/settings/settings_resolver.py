"""
Settings Resolver — M10.

Merkezi ayar cozumleme katmani. Tum runtime bilesenler ayar degerlerini
bu modul uzerinden okur.

Oncelik zinciri:
  1. DB admin_value_json (yonetici tarafindan girilmis deger)
  2. DB default_value_json (tanimda belirtilmis varsayilan)
  3. .env / ortam degiskeni (varsa)
  4. KNOWN_SETTINGS builtin default (kod icinde tanimlanmis son cayir)

Sorumluluklar:
  - resolve(key) -> effective value (typed)
  - explain(key) -> effective value + source + metadata
  - resolve_group(group) -> grup icerigindeki tum ayarlar
  - list_effective() -> tum bilinen ayarlar, effective deger ve kaynak ile
  - Credential resolver'i tamamlar ama ikame etmez.
    Credential'lar icin mevcut credential_resolver kullanilmaya devam eder.

Tasarim:
  - Read-only servis. Yazma islemi settings service ve credential resolver'da.
  - KNOWN_SETTINGS registry'si tum bilinen ayarlarin master tanimini tutar.
  - Bilinmeyen key icin None doner, hata firlatmaz.
  - Secret tipi icin maskeleme bilgisi explain'de verilir.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting, UserSettingOverride

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Type coercion
# ---------------------------------------------------------------------------

def _coerce(raw: Any, expected_type: str) -> Any:
    """Deterministic type coercion. Gecersiz deger icin None doner."""
    if raw is None:
        return None
    try:
        if expected_type == "string":
            return str(raw)
        elif expected_type == "secret":
            return str(raw)
        elif expected_type == "boolean":
            if isinstance(raw, bool):
                return raw
            if isinstance(raw, str):
                return raw.lower() in ("true", "1", "yes", "on")
            return bool(raw)
        elif expected_type == "integer":
            return int(float(raw))
        elif expected_type == "float":
            return float(raw)
        elif expected_type == "json":
            if isinstance(raw, (dict, list)):
                return raw
            if isinstance(raw, str):
                return json.loads(raw)
            return raw
        else:
            return raw
    except (ValueError, TypeError, json.JSONDecodeError) as e:
        logger.warning("Type coercion failed for type=%s, value=%r: %s", expected_type, raw, e)
        return None


def _parse_json_field(raw: Optional[str]) -> Any:
    """JSON-encoded DB field'dan Python degerini cikarir."""
    if raw is None or raw in ("", "null"):
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


def _mask_value(value: str) -> str:
    """Son 4 karakter gorunur, geri kalan maskelenir."""
    if len(value) < 5:
        return "\u25cf" * len(value)
    return "\u25cf" * (len(value) - 4) + value[-4:]


# ---------------------------------------------------------------------------
# Known Settings Registry — master definition of all settings
# ---------------------------------------------------------------------------

KNOWN_SETTINGS: Dict[str, Dict[str, Any]] = {
    # --- Credentials (delegated to credential_resolver for write, but listed here) ---
    "credential.kie_ai_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Kie.ai API Key",
        "help_text": "Kie.ai uzerinden Gemini LLM erisimi icin API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_KIE_AI_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "LLM provider (KieAiProvider) — startup + runtime reinit",
    },
    "credential.openai_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "OpenAI API Key",
        "help_text": "OpenAI uyumlu LLM fallback icin API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_OPENAI_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "LLM fallback provider (OpenAICompatProvider) — startup + runtime reinit",
    },
    "credential.pexels_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Pexels API Key",
        "help_text": "Pexels gorsel arama API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_PEXELS_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "Visuals provider (PexelsProvider) — startup + runtime reinit",
    },
    "credential.pixabay_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "Pixabay API Key",
        "help_text": "Pixabay gorsel arama API anahtari.",
        "module_scope": None,
        "env_var": "CONTENTHUB_PIXABAY_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "Visuals fallback provider (PixabayProvider) — startup + runtime reinit",
    },
    "credential.youtube_client_id": {
        "group": "credentials",
        "type": "secret",
        "label": "YouTube OAuth Client ID",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client ID.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": None,
        "wired": True,
        "wired_to": "YouTube OAuth auth-url + token exchange",
    },
    "credential.youtube_client_secret": {
        "group": "credentials",
        "type": "secret",
        "label": "YouTube OAuth Client Secret",
        "help_text": "Google API Console'dan alinan YouTube OAuth2 Client Secret.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": None,
        "wired": True,
        "wired_to": "YouTube OAuth token exchange",
    },

    # --- Provider Settings ---
    # NOT: Asagidaki provider ayarlari tanimlanmis ve UI'da gorunur.
    # "wired: True" olan ayarlar gercekten resolve() ile runtime'da okunuyor.
    # "wired: False" olanlar tanimlanmis ama provider kodu henuz bu degeri
    # settings resolver'dan okumuyor — kendi hardcoded default'larini kullaniyor.
    # Bu durum durustce "DEFINED" olarak isaretlenmistir.
    "provider.llm.kie_model": {
        "group": "providers",
        "type": "string",
        "label": "Kie.ai LLM Model",
        "help_text": "Kie.ai uzerinden kullanilacak LLM model adi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "gemini-2.5-flash",
        "wired": True,
        "wired_to": "KieAiProvider constructor — startup + credential reinit",
    },
    "provider.llm.kie_temperature": {
        "group": "providers",
        "type": "float",
        "label": "Kie.ai LLM Temperature",
        "help_text": "LLM yaraticilik seviyesi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.7,
        "wired": True,
        "wired_to": "KieAiProvider constructor — startup + credential reinit",
    },
    "provider.llm.openai_model": {
        "group": "providers",
        "type": "string",
        "label": "OpenAI Fallback Model",
        "help_text": "OpenAI uyumlu fallback icin model adi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "gpt-4o-mini",
        "wired": True,
        "wired_to": "main.py startup + credential_wiring factory — resolve() ile okunuyor",
    },
    "provider.llm.openai_temperature": {
        "group": "providers",
        "type": "float",
        "label": "OpenAI Fallback Temperature",
        "help_text": "OpenAI fallback LLM yaraticilik seviyesi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.7,
        "wired": True,
        "wired_to": "OpenAICompatProvider constructor — startup + credential reinit",
    },
    "provider.llm.timeout_seconds": {
        "group": "providers",
        "type": "float",
        "label": "LLM HTTP Timeout (saniye)",
        "help_text": "LLM API cagrilarinda HTTP timeout suresi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 60.0,
        "wired": True,
        "wired_to": "_openai_compat_base timeout — startup + credential reinit",
    },
    "provider.tts.edge_default_voice": {
        "group": "providers",
        "type": "string",
        "label": "Edge TTS Varsayilan Ses",
        "help_text": "Edge TTS icin varsayilan ses profili.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "tr-TR-AhmetNeural",
        "wired": True,
        "wired_to": "EdgeTTSProvider constructor — startup",
    },

    # --- TTS Common Layer (Faz 1) — DubVoice primary, no-auto-fallback ---
    "credential.dubvoice_api_key": {
        "group": "credentials",
        "type": "secret",
        "label": "DubVoice API Key",
        "help_text": "DubVoice.ai TTS Bearer API anahtari (sk_...).",
        "module_scope": None,
        "env_var": "CONTENTHUB_DUBVOICE_API_KEY",
        "builtin_default": None,
        "wired": True,
        "wired_to": "DubVoiceProvider constructor — startup + credential reinit",
    },
    "tts.primary_provider": {
        "group": "tts",
        "type": "string",
        "label": "Birincil TTS Saglayicisi",
        "help_text": "Tum modullerde kullanilacak birincil TTS saglayicisi. "
                     "'dubvoice' onerilir; bos ise dubvoice kabul edilir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "dubvoice",
        "wired": True,
        "wired_to": "resolve_tts_strict — primary secimi",
    },
    "tts.allow_auto_fallback": {
        "group": "tts",
        "type": "boolean",
        "label": "TTS Otomatik Fallback",
        "help_text": "KAPALI zorunludur. Primary basarisiz olursa step FAIL ve "
                     "job FAIL; kullanici explicit fallback aksiyonu almali. "
                     "True olarak ayarlanmasi Core Invariant ihlalidir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": False,
        "wired": True,
        "wired_to": "resolve_tts_strict — fallback kilidi",
    },
    "tts.fallback_providers": {
        "group": "tts",
        "type": "json",
        "label": "Izin Verilen Fallback Saglayicilari",
        "help_text": "Kullanici explicit fallback aksiyonu aldiginda secim "
                     "menusunde gosterilecek provider kimlikleri. Ornek: "
                     "[\"edge_tts\", \"system_tts\"]",
        "module_scope": None,
        "env_var": "",
        "builtin_default": ["edge_tts", "system_tts"],
        "wired": True,
        "wired_to": "TTS explicit fallback router — Faz 2",
    },
    "tts.default_voice.tr": {
        "group": "tts",
        "type": "string",
        "label": "Varsayilan TR Voice (DubVoice)",
        "help_text": "Turkce icerikler icin DubVoice voice_id. Kanal bazli "
                     "override channel_tts_overrides tablosunda.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "21m00Tcm4TlvDq8ikWAM",
        "wired": True,
        "wired_to": "DubVoiceProvider.default_voice_id + voice_map.get_voice",
    },
    "tts.default_voice.en": {
        "group": "tts",
        "type": "string",
        "label": "Varsayilan EN Voice (DubVoice)",
        "help_text": "Ingilizce icerikler icin DubVoice voice_id.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "pNInz6obpgDQGcFmaJgB",
        "wired": True,
        "wired_to": "DubVoiceProvider.default_voice_id + voice_map.get_voice",
    },
    "tts.dubvoice.default_model_id": {
        "group": "tts",
        "type": "string",
        "label": "DubVoice Varsayilan Model",
        "help_text": "ElevenLabs model kimligi. Secenekler: "
                     "eleven_multilingual_v2 (dengeli), eleven_turbo_v2_5 "
                     "(hizli), eleven_flash_v2_5 (en hizli), eleven_v3 (beta).",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "eleven_multilingual_v2",
        "wired": True,
        "wired_to": "DubVoiceProvider constructor",
    },
    "tts.dubvoice.poll_interval_seconds": {
        "group": "tts",
        "type": "float",
        "label": "DubVoice Polling Araligi (saniye)",
        "help_text": "Async task status sorgu arasi bekleme suresi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 1.5,
        "wired": True,
        "wired_to": "DubVoiceProvider._poll_task",
    },
    "tts.dubvoice.poll_timeout_seconds": {
        "group": "tts",
        "type": "float",
        "label": "DubVoice Toplam Polling Budcesi (saniye)",
        "help_text": "Task tamamlanana kadar beklenecek maksimum sure.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 120.0,
        "wired": True,
        "wired_to": "DubVoiceProvider._poll_task",
    },
    "tts.dubvoice.http_timeout_seconds": {
        "group": "tts",
        "type": "float",
        "label": "DubVoice HTTP Istegi Timeout (saniye)",
        "help_text": "Tek POST/GET istegi icin HTTP timeout.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 30.0,
        "wired": True,
        "wired_to": "DubVoiceProvider httpx.AsyncClient timeout",
    },
    "tts.voice_settings.stability": {
        "group": "tts",
        "type": "float",
        "label": "ElevenLabs stability (varsayilan)",
        "help_text": "0.0-1.0. Dusuk deger = daha anlamli tonlama, yuksek = "
                     "tekrarlanabilir okuma.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.5,
        "wired": True,
        "wired_to": "VoiceSettings dataclass default",
    },
    "tts.voice_settings.similarity_boost": {
        "group": "tts",
        "type": "float",
        "label": "ElevenLabs similarity_boost",
        "help_text": "0.0-1.0. Voice'un orijinal referansa benzerligini artirir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.75,
        "wired": True,
        "wired_to": "VoiceSettings dataclass default",
    },
    "tts.voice_settings.speed": {
        "group": "tts",
        "type": "float",
        "label": "TTS Hizi",
        "help_text": "1.0 = normal, 0.8 = yavas, 1.2 = hizli. Provider "
                     "desteklerse uygulanir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 1.0,
        "wired": True,
        "wired_to": "VoiceSettings dataclass default",
    },
    "tts.voice_settings.style": {
        "group": "tts",
        "type": "float",
        "label": "ElevenLabs style",
        "help_text": "0.0-1.0. Ton/stil yogunlugu. Yuksek deger overacting "
                     "olusturabilir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.0,
        "wired": True,
        "wired_to": "VoiceSettings dataclass default",
    },
    "tts.voice_settings.use_speaker_boost": {
        "group": "tts",
        "type": "boolean",
        "label": "ElevenLabs use_speaker_boost",
        "help_text": "Voice benzerligini %5-15 artirir ama latency eklenir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "VoiceSettings dataclass default",
    },

    # Faz 4 — TTS fine controls
    "tts.voice_settings.pitch": {
        "group": "tts",
        "type": "float",
        "label": "TTS Pitch (-1..+1)",
        "help_text": "Ses perdesi. 0 = normal. DubVoice yok sayar; Edge TTS "
                     "Hz'e cevirip uygular (-20..+20Hz).",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.0,
        "wired": True,
        "wired_to": "app.tts.controls.build_provider_voice_settings",
    },
    "tts.voice_settings.emphasis": {
        "group": "tts",
        "type": "float",
        "label": "TTS Vurgu Yogunlugu (0..1)",
        "help_text": "Kullanici-yonlu vurgu kontrolu. DubVoice icin 'style' "
                     "alanina dondurulur; yuksek deger daha dramatik tonlama.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0.5,
        "wired": True,
        "wired_to": "app.tts.controls.TTSFineControls.emphasis",
    },
    "tts.pauses.sentence_break_ms": {
        "group": "tts",
        "type": "integer",
        "label": "Cumle Arasi Duraklama (ms)",
        "help_text": "Cumle sonu noktalama sonrasi eklenecek SSML break "
                     "suresi. 0 = kapali. SSML destekleyen provider'a gore "
                     "uygulanir (Edge TTS SSML, DubVoice ignore edebilir).",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0,
        "wired": True,
        "wired_to": "app.tts.controls.insert_ssml_pauses",
    },
    "tts.pauses.paragraph_break_ms": {
        "group": "tts",
        "type": "integer",
        "label": "Paragraf Arasi Duraklama (ms)",
        "help_text": "Cift yeni satir (paragraph boundary) sonrasi SSML "
                     "break. 0 = kapali.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0,
        "wired": True,
        "wired_to": "app.tts.controls.insert_ssml_pauses",
    },
    "tts.pauses.scene_break_ms": {
        "group": "tts",
        "type": "integer",
        "label": "Sahne Arasi Duraklama (ms)",
        "help_text": "Iki sahne arasina eklenecek bos ses suresi. 0 = kapali. "
                     "Composition adiminda audio mix'e uygulanir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 0,
        "wired": True,
        "wired_to": "Composition step — audio gap between scenes",
    },
    "tts.glossary.brand": {
        "group": "tts",
        "type": "json",
        "label": "Marka Glossary (pronunciation)",
        "help_text": "Marka isimlerinin TTS icin fonetik yazimi. "
                     "Ornek: {\"ContentHub\": \"kontent hab\"}. SABIT: bu "
                     "degisim SADECE TTS metninde uygulanir; subtitle metni "
                     "her zaman script canonical'dir (Faz 3 kurali gecerli).",
        "module_scope": None,
        "env_var": "",
        "builtin_default": {},
        "wired": True,
        "wired_to": "app.tts.controls.apply_glossary_and_pronunciation",
    },
    "tts.glossary.product": {
        "group": "tts",
        "type": "json",
        "label": "Urun Glossary (pronunciation)",
        "help_text": "Urun isimlerinin TTS icin fonetik yazimi. Benzer "
                     "sekilde subtitle etkilemez.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": {},
        "wired": True,
        "wired_to": "app.tts.controls.apply_glossary_and_pronunciation",
    },
    "tts.pronunciation.overrides": {
        "group": "tts",
        "type": "json",
        "label": "Genel Pronunciation Overrides",
        "help_text": "Marka/urun disi sozluk (aksent, yerellestirme vb.). "
                     "Ornek: {\"Istanbul\": \"isztanbul\"}. Subtitle "
                     "etkilenmez.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": {},
        "wired": True,
        "wired_to": "app.tts.controls.apply_glossary_and_pronunciation",
    },
    "tts.controls.ssml_pauses_enabled": {
        "group": "tts",
        "type": "boolean",
        "label": "SSML Break Etiketlerini Enjekte Et",
        "help_text": "Acikken sentence_break_ms/paragraph_break_ms degerleri "
                     "<break> etiketi olarak TTS metnine eklenir. DubVoice "
                     "SSML destegi sinirlidir; default KAPALI.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": False,
        "wired": True,
        "wired_to": "app.tts.controls.plan_scene_tts apply_ssml_pauses bayragi",
    },
    "tts.controls.default_scene_energy": {
        "group": "tts",
        "type": "string",
        "label": "Varsayilan Sahne Enerjisi",
        "help_text": "calm | neutral | energetic | '' (off). Per-sahne "
                     "override input.scenes[].scene_energy ile yapilabilir.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "neutral",
        "wired": True,
        "wired_to": "app.tts.controls.apply_scene_energy",
    },

    # --- Faz 5: Preview-first TTS ---
    "tts.preview.voice_sample_text": {
        "group": "tts",
        "type": "string",
        "label": "Voice sample metni (Faz 5 L1)",
        "help_text": "Voice sample preview'inde kullanilan kisa cumle. "
                     "Kullanici bu cumleyi farkli ses/ayarlarla dener.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "Merhaba, bu ses ornegidir. ContentHub ile nasil bir tonda konustugunu dinleyin.",
        "wired": True,
        "wired_to": "app.tts.preview_service.generate_voice_sample",
    },
    "tts.preview.max_characters_draft": {
        "group": "tts",
        "type": "integer",
        "label": "Draft preview karakter siniri (Faz 5 L3)",
        "help_text": "Draft script preview'inde TOPLAM karakter siniri. "
                     "Asilirsa metin kisaltilir — tam uretim kotasi yenmez.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 1500,
        "wired": True,
        "wired_to": "app.tts.preview_service.generate_draft_script_preview",
    },
    "tts.preview.workspace_dir": {
        "group": "tts",
        "type": "string",
        "label": "Preview artifact dizini",
        "help_text": "Preview mp3 + manifest dosyalarinin yazildigi klasor "
                     "(workspace_root altindaki rolatif yol).",
        "module_scope": None,
        "env_var": "",
        "builtin_default": "_tts_previews",
        "wired": True,
        "wired_to": "app.tts.preview_service.resolve_preview_root",
    },

    "provider.visuals.pexels_default_count": {
        "group": "providers",
        "type": "integer",
        "label": "Pexels Varsayilan Gorsel Sayisi",
        "help_text": "Pexels aramasinda varsayilan sonuc sayisi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 5,
        "wired": True,
        "wired_to": "PexelsProvider constructor — startup + credential reinit",
    },
    "provider.visuals.pixabay_default_count": {
        "group": "providers",
        "type": "integer",
        "label": "Pixabay Varsayilan Gorsel Sayisi",
        "help_text": "Pixabay aramasinda varsayilan sonuc sayisi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 5,
        "wired": True,
        "wired_to": "PixabayProvider constructor — startup + credential reinit",
    },
    "provider.visuals.search_timeout_seconds": {
        "group": "providers",
        "type": "float",
        "label": "Gorsel Arama Timeout (saniye)",
        "help_text": "Gorsel provider HTTP arama timeout suresi.",
        "module_scope": None,
        "env_var": "",
        "builtin_default": 30.0,
        "wired": True,
        "wired_to": "Pexels/Pixabay provider constructor — startup + credential reinit",
    },
    "provider.whisper.model_size": {
        "group": "providers",
        "type": "string",
        "label": "Whisper Model Boyutu",
        "help_text": "Yerel Whisper transkripsiyon model boyutu.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "base",
        "wired": True,
        "wired_to": "LocalWhisperProvider constructor — main.py startup",
    },

    # --- Execution Settings ---
    "system.workspace_root": {
        "group": "execution",
        "type": "string",
        "label": "Çıktı Klasörü (Workspace)",
        "help_text": "Job artifact'larının yazılacağı ana dizin. Boş bırakılırsa backend/workspace/ kullanılır.",
        "module_scope": None,
        "env_var": "CONTENTHUB_WORKSPACE_ROOT",
        "builtin_default": "",
        "wired": True,
        "wired_to": "start_production — job workspace_path hesaplanırken okunur",
    },

    "system.output_dir": {
        "group": "execution",
        "type": "string",
        "label": "Çıktı Dizini (Exports)",
        "help_text": "Tamamlanan videoların ve son çıktıların yazılacağı dizin. Boş bırakılırsa workspace/users/{slug}/exports/ kullanılır.",
        "module_scope": None,
        "env_var": "CONTENTHUB_OUTPUT_DIR",
        "builtin_default": "",
        "wired": True,
        "wired_to": "export operations, publish executor — final output destination",
    },

    "system.active_user_id": {
        "group": "system",
        "type": "string",
        "label": "Aktif Kullanıcı ID",
        "help_text": "En son aktif kullanıcının ID'si. Uygulama yeniden açıldığında bu kullanıcı ile devam edilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "",
        "wired": True,
        "wired_to": "frontend.userStore + backend user context",
    },

    "execution.render_still_timeout_seconds": {
        "group": "execution",
        "type": "integer",
        "label": "Render Still Timeout (saniye)",
        "help_text": "Remotion still frame render isleminde maksimum bekleme suresi.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 120,
        "wired": True,
        "wired_to": "RenderStillExecutor._resolve_timeout() — runtime lazy resolve",
    },

    # --- Source Scan Settings ---
    "source_scans.auto_scan_enabled": {
        "group": "source_scans",
        "type": "boolean",
        "label": "Otomatik Tarama Aktif",
        "help_text": "RSS kaynaklarinin otomatik taranmasini etkinlestirir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "source_scans.scheduler",
    },
    "source_scans.auto_scan_interval_seconds": {
        "group": "source_scans",
        "type": "integer",
        "label": "Otomatik Tarama Araligi (saniye)",
        "help_text": "Otomatik taramalar arasi bekleme suresi.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 300,
        "wired": True,
        "wired_to": "source_scans.scheduler",
    },
    "source_scans.soft_dedupe_threshold": {
        "group": "source_scans",
        "type": "float",
        "label": "Soft Dedupe Esigi",
        "help_text": "Baslik benzerlik esigi (0.0-1.0). scan_engine → dedupe_service soft_threshold olarak kullanilir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 0.65,
        "wired": True,
        "wired_to": "scan_engine.execute_rss_scan → build_dedupe_context(soft_threshold=...)",
    },
    "news_items.soft_dedupe_window_days": {
        "group": "source_scans",
        "type": "integer",
        "label": "Soft Dedupe Rolling Window (gun)",
        "help_text": "Soft dedupe karsilastirmasinda gecmise dogru tarama penceresi. Bu pencerenin disindaki eski news_items karsilastirilmaz (maliyet kontrolu + alaka). Clamp: 1-365.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 30,
        "wired": True,
        "wired_to": "scan_engine.execute_rss_scan → _load_existing_items(window_days=...)",
    },
    "news_items.retention.enabled": {
        "group": "source_scans",
        "type": "boolean",
        "label": "News Items Retention Aktif",
        "help_text": "Eski news_items kayitlarinin otomatik silinmesi. UsedNewsRegistry'de referans verilen kayitlar her zaman korunur.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "source_scans.retention.poll_retention",
    },
    "news_items.retention.days": {
        "group": "source_scans",
        "type": "integer",
        "label": "News Items Saklama Suresi (gun)",
        "help_text": "Bu suren eski, kullanilmamis news_items kayitlari silinir. Clamp: 7-3650.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 180,
        "wired": True,
        "wired_to": "source_scans.retention.poll_retention",
    },
    "source_scans.retention.days": {
        "group": "source_scans",
        "type": "integer",
        "label": "Source Scan Saklama Suresi (gun)",
        "help_text": "Bu suren eski source_scans kayitlari silinir; iliskili news_items kayitlari source_scan_id=NULL olarak detach edilir. Clamp: 1-3650.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 90,
        "wired": True,
        "wired_to": "source_scans.retention.poll_retention",
    },
    "source_scans.retention.poll_interval_seconds": {
        "group": "source_scans",
        "type": "integer",
        "label": "Retention Sweep Araligi (saniye)",
        "help_text": "Arka plan retention sweeper'inin calisma araligi. Clamp: 300-86400.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 3600,
        "wired": True,
        "wired_to": "source_scans.retention.poll_retention",
    },
    "source_scans.og_scrape_enabled": {
        "group": "source_scans",
        "type": "boolean",
        "label": "OG Scrape Aktif",
        "help_text": "RSS haberlerinde gorsel yoksa kaynak sayfadan Open Graph meta tag'leri cekilerek image_url zenginlestirilir. Guvenli hostlar icin per-host throttle + SSRF korumasi aktiftir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "scan_engine.normalize_entry → og_scrape",
    },
    "source_scans.og_scrape_min_interval_seconds": {
        "group": "source_scans",
        "type": "integer",
        "label": "OG Scrape Per-Host Minimum Bekleme (saniye)",
        "help_text": "Ayni hosta ardisik OG scrape istekleri arasi minimum bekleme. Hedef siteye nazik davranma + rate-limit korunmasi. Clamp: 1-60.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 5,
        "wired": True,
        "wired_to": "scan_engine._og_scrape_throttle",
    },

    # --- UI Settings ---
    "ui.active_theme": {
        "group": "ui",
        "type": "string",
        "label": "Aktif Tema",
        "help_text": "Kullanicinin secili temasi. Frontend tema degisikliklerinde backend'e kaydedilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "default",
        "wired": True,
        "wired_to": "frontend.theme_store",
    },
    "ui.timezone": {
        "group": "ui",
        "type": "string",
        "label": "Saat Dilimi",
        "help_text": "Tarih ve saat gosteriminde kullanilacak saat dilimi. Ornek: Europe/Istanbul (UTC+3), UTC, America/New_York. Bos birakilirsa tarayici yerel saati kullanilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "Europe/Istanbul",
        "wired": True,
        "wired_to": "frontend.date_formatting",
    },
    "ui.date_format": {
        "group": "ui",
        "type": "string",
        "label": "Tarih Formatı",
        "help_text": "Tarih gosterim formati: 'short' (03.04.2026 14:30) veya 'long' (03 Nisan 2026 14:30:00).",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "short",
        "wired": True,
        "wired_to": "frontend.date_formatting",
    },

    # --- UI Surface Registry (Faz 1 — Infrastructure) ---
    # Surface Registry altyapisinin kill-switch'i. Default: false (altyapi kapali,
    # legacy/horizon davranisi aynen korunur). true yapildiginda resolver
    # user-preference/role-default/global-default zincirini degerlendirir.
    "ui.surface.infrastructure.enabled": {
        "group": "ui",
        "type": "boolean",
        "label": "Surface Registry Altyapisi Aktif",
        "help_text": (
            "Surface Registry altyapisi icin kill-switch. Kapaliyken (varsayilan) "
            "arayuz eski classic/horizon davranisiyla calisir. Acildiginda resolver "
            "kullanici tercihi -> rol varsayilani -> global varsayilan -> legacy "
            "zincirini degerlendirir. Hatalar her zaman legacy'ye dusurur."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "frontend.surfaces.resolver",
    },
    "ui.surface.default.admin": {
        "group": "ui",
        "type": "string",
        "label": "Admin Paneli Varsayilan Yuzey",
        "help_text": (
            "Kullanici kendi tercihini belirtmemisse admin panelinde varsayilan olarak "
            "hangi yuzey gosterilsin? Gecerli degerler: legacy, horizon, atrium, bridge, "
            "canvas. Urunsel varsayilan 'bridge' (Operations Command Center) — admin "
            "scope'undaki tek beta yuzey ve Faz 2'de uc sayfa override'i (jobs registry/"
            "jobs detail/publish center) ile teslim edildi. Resolver layer-3 role-default "
            "olarak kullanir; `ui.surface.bridge.enabled=false` veya kill-switch kapaliysa "
            "otomatik olarak legacy'e duser. Bos/tanimsiz birakilirsa yine legacy kullanilir."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": "bridge",
        "wired": True,
        "wired_to": "frontend.surfaces.resolver",
    },
    "ui.surface.default.user": {
        "group": "ui",
        "type": "string",
        "label": "Kullanici Paneli Varsayilan Yuzey",
        "help_text": (
            "Kullanici kendi tercihini belirtmemisse kullanici panelinde varsayilan olarak "
            "hangi yuzey gosterilsin? Gecerli degerler: legacy, horizon, atrium, bridge, "
            "canvas. Urunsel varsayilan 'canvas' (Creator Workspace Pro) — Faz 3/3A/3B'de "
            "dokuz sayfa override'i (dashboard, projects list/detail, publish, channels "
            "list/detail, connections, analytics, calendar) ile teslim edildi ve user "
            "scope'undaki en kapsamli yuzey. Atrium premium alternatif olarak opt-in "
            "kalir (yalnizca uc override). Resolver layer-3 role-default olarak kullanir; "
            "`ui.surface.canvas.enabled=false` veya kill-switch kapaliysa otomatik olarak "
            "legacy'e duser. Bos/tanimsiz birakilirsa yine legacy kullanilir."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": "canvas",
        "wired": True,
        "wired_to": "frontend.surfaces.resolver",
    },
    "ui.surface.atrium.enabled": {
        "group": "ui",
        "type": "boolean",
        "label": "Atrium Yuzeyi Aktif",
        "help_text": (
            "Atrium (Premium Media OS) yuzeyini admin/kullanicilara acar. Faz 1'de "
            "yalnizca placeholder olarak kayitlidir, gercek kabuk mevcut degildir; "
            "secilmesi durumunda resolver legacy'ye duser."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "frontend.surfaces.registry",
    },
    "ui.surface.bridge.enabled": {
        "group": "ui",
        "type": "boolean",
        "label": "Bridge Yuzeyi Aktif",
        "help_text": (
            "Bridge (Operations Command Center) yuzeyini admin/kullanicilara acar. "
            "Faz 1'de yalnizca placeholder olarak kayitlidir, gercek kabuk mevcut "
            "degildir; secilmesi durumunda resolver legacy'ye duser."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "frontend.surfaces.registry",
    },
    "ui.surface.canvas.enabled": {
        "group": "ui",
        "type": "boolean",
        "label": "Canvas Yuzeyi Aktif",
        "help_text": (
            "Canvas (Creator Workspace Pro) yuzeyini admin/kullanicilara acar. Faz 1'de "
            "yalnizca placeholder olarak kayitlidir, gercek kabuk mevcut degildir; "
            "secilmesi durumunda resolver legacy'ye duser."
        ),
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "frontend.surfaces.registry",
    },

    # --- Wizard Governance Settings ---
    "wizard.standard_video.entry_mode": {
        "group": "wizard",
        "type": "string",
        "label": "Standart Video Giriş Modu",
        "help_text": (
            "Kullanıcı 'Standart Video Oluştur' butonuna tıkladığında nereye yönlendirilsin? "
            "'wizard' → adım adım wizard akışı (/admin/standard-videos/wizard), "
            "'form' → tek sayfa form (/admin/standard-videos/new)"
        ),
        "module_scope": "standard_video",
        "env_var": None,
        "builtin_default": "wizard",
        "wired": True,
        "wired_to": "user_content_entry → navigation target",
    },
    "wizard.news_bulletin.entry_mode": {
        "group": "wizard",
        "type": "string",
        "label": "Haber Bülteni Giriş Modu",
        "help_text": (
            "Kullanıcı 'Haber Bülteni Oluştur' butonuna tıkladığında nereye yönlendirilsin? "
            "'wizard' → adım adım wizard akışı (/admin/news-bulletins/wizard), "
            "'form' → tek sayfa form (/admin/news-bulletins/new)"
        ),
        "module_scope": "news_bulletin",
        "env_var": None,
        "builtin_default": "wizard",
        "wired": True,
        "wired_to": "user_content_entry → navigation target",
    },

    # --- Job Engine Settings ---
    "jobs.auto_retry_enabled": {
        "group": "jobs",
        "type": "boolean",
        "label": "Otomatik Yeniden Deneme",
        "help_text": "Basarisiz islerin otomatik yeniden denenmesini etkinlestirir. Varsayilan olarak kapalidir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "jobs.retry_scheduler",
    },
    "jobs.max_auto_retries": {
        "group": "jobs",
        "type": "integer",
        "label": "Maks Otomatik Deneme",
        "help_text": "Bir isin otomatik yeniden denenebilecegi maksimum sayi.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 3,
        "wired": True,
        "wired_to": "jobs.retry_scheduler",
    },
    "jobs.retry_base_delay_seconds": {
        "group": "jobs",
        "type": "integer",
        "label": "Yeniden Deneme Baz Gecikme (saniye)",
        "help_text": "Ilk yeniden deneme oncesi bekleme suresi. Sonraki denemeler katlanarak artar.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 60,
        "wired": True,
        "wired_to": "jobs.retry_scheduler",
    },

    # --- YouTube / Publish Settings ---
    "publish.youtube.upload_timeout_seconds": {
        "group": "publish",
        "type": "float",
        "label": "YouTube Upload Timeout (saniye)",
        "help_text": "YouTube video yukleme isleminde HTTP timeout suresi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": 60.0,
        "wired": True,
        "wired_to": "YouTubeAdapter constructor (upload_timeout) — main.py startup",
    },
    "publish.youtube.default_category_id": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Kategori ID",
        "help_text": "Payload'da category_id yoksa kullanilacak YouTube kategori ID'si. 22=People & Blogs, 24=Entertainment, 25=News & Politics, 27=Education, 28=Science & Technology.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "22",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da category_id yoksa settings'ten okunur",
    },
    "publish.youtube.default_description": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Aciklama",
        "help_text": "Payload'da description yoksa kullanilacak varsayilan video aciklamasi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da description yoksa settings'ten okunur",
    },
    "publish.youtube.default_tags": {
        "group": "publish",
        "type": "string",
        "label": "YouTube Varsayilan Etiketler (virgul ayirmali)",
        "help_text": "Payload'da tags yoksa kullanilacak varsayilan etiketler. Virgul ile ayirilmis liste.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "YouTubeAdapter.upload() — payload'da tags yoksa settings'ten okunur",
    },

    # --- YouTube Analytics API v2 (Sprint 1 / Faz YT-A1) ---
    "publish.youtube.analytics.sync_interval_hours": {
        "group": "publish",
        "type": "float",
        "label": "YouTube Analytics Senkron Araligi (saat)",
        "help_text": "Scheduler'in YouTube Analytics snapshot verisini ne siklikta cekecegi. Varsayilan 24 saat (gunluk).",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": 24.0,
        "wired": True,
        "wired_to": "publish/scheduler.py — youtube_analytics_daily_sync job",
    },
    "publish.youtube.analytics.backfill_days": {
        "group": "publish",
        "type": "float",
        "label": "YouTube Analytics Backfill Penceresi (gun)",
        "help_text": "Ilk sync'te ve manuel backfill'de geriye kac gunluk veri cekilecegi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": 28.0,
        "wired": True,
        "wired_to": "analytics/youtube_analytics_service.py — run_sync(window_days)",
    },
    "publish.youtube.analytics.retention_enabled": {
        "group": "publish",
        "type": "bool",
        "label": "Audience Retention Senkronu Aktif",
        "help_text": "elapsedVideoTimeRatio ile retention egrisini cekmek icin ek API cagrisi yapilsin mi. Quota maliyeti dusuk.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "youtube_analytics_service.run_sync — retention fetch toggle",
    },
    "publish.youtube.analytics.demographics_enabled": {
        "group": "publish",
        "type": "bool",
        "label": "Demografik Snapshot Aktif",
        "help_text": "Yas grubu, cinsiyet, trafik kaynagi ve cihaz kirilimlari cekilsin mi.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "youtube_analytics_service.run_sync — demographics/traffic/devices fetch toggle",
    },
    "publish.youtube.analytics.max_videos_per_sync": {
        "group": "publish",
        "type": "float",
        "label": "Sync Basina Maksimum Video",
        "help_text": "Tek bir senkron calismasinda video bazli metrikleri cekilecek en fazla video sayisi. Buyuk kanallar icin quota koruma amacli.",
        "module_scope": "publish",
        "env_var": "",
        "builtin_default": 50.0,
        "wired": True,
        "wired_to": "youtube_analytics_service.fetch_video_daily(max_videos)",
    },

    # --- News Bulletin Module (M28) ---
    "news_bulletin.prompt.narration_system": {
        "group": "news_bulletin",
        "type": "prompt",
        "label": "Bulten Narration Sistem Prompt",
        "help_text": "Spiker tarzinda haber anlatimi icin LLM sistem talimatlari.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": (
            "Sen profesyonel bir TV haber spikerisin. Sana verilen haber ozetlerini kisa, net, resmi ve "
            "konusulabilir bir dilde yeniden yaz. Her haber 40-80 kelime arasinda olmali. Turkce formal "
            "broadcast dilini kullan. Cevrilmis metin hissi verme."
        ),
        "wired": True,
        "wired_to": "BulletinScriptExecutor — narration uretimi sistem prompt",
    },
    "news_bulletin.prompt.narration_style_rules": {
        "group": "news_bulletin",
        "type": "prompt",
        "label": "Bulten Narration Stil Kurallari",
        "help_text": "Formal broadcast, kisa cumle, ton kurallari.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": (
            "Kurallar:\n"
            "- Kisa cumleler kullan, max 15 kelime per cumle\n"
            "- Aktif cumle yapisi tercih et\n"
            "- Teknik jargon kullanma\n"
            "- Resmi ama soguk olmayan ton\n"
            "- Her haberi bagimsiz anlat, onceki habere referans verme\n"
            "- Kapanisi temiz bitir, 'devam edecek' gibi ifadeler kullanma"
        ),
        "wired": True,
        "wired_to": "BulletinScriptExecutor — narration stil kurallari",
    },
    "news_bulletin.prompt.anti_clickbait_rules": {
        "group": "news_bulletin",
        "type": "prompt",
        "label": "Bulten Anti-Clickbait Kurallari",
        "help_text": "Yasakli kaliplar, byline yasagi, abartili ifade engelleme.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": (
            "Yasaklar:\n"
            "- Clickbait basliklar kullanma\n"
            "- 'Inanilmaz', 'sok edici', 'merak edilen' gibi abartili ifadeler yasak\n"
            "- Kaynak adini, muhabir adini, byline bilgisini tekrarlama\n"
            "- 'According to' kaliplarini kullanma\n"
            "- Soru formunda baslik kullanma"
        ),
        "wired": True,
        "wired_to": "BulletinScriptExecutor — anti-clickbait kurallari",
    },
    "news_bulletin.prompt.metadata_title_rules": {
        "group": "news_bulletin",
        "type": "prompt",
        "label": "Bulten Metadata Uretim Kurallari",
        "help_text": "Baslik, aciklama, etiket formati icin LLM talimatlari.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": (
            "Bulten icin YouTube metadata uret:\n"
            "- Baslik: max 60 karakter, bilgilendirici, clickbait degil\n"
            "- Aciklama: 2-3 cumle, bultendeki haberlerin ozeti\n"
            "- Etiketler: 5-10 adet, Turkce, hem genel hem habere ozel\n"
            "- Hashtag: 3-5 adet, #haber #gundem formatinda"
        ),
        "wired": True,
        "wired_to": "BulletinMetadataExecutor — metadata uretim kurallari",
    },
    "news_bulletin.config.default_language": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Varsayilan Bulten Dili",
        "help_text": "ISO 639-1 dil kodu (tr, en, vb.).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "tr",
        "wired": True,
        "wired_to": "BulletinScriptExecutor, BulletinMetadataExecutor — dil secimi",
    },
    "news_bulletin.config.default_tone": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Varsayilan Anlatim Tonu",
        "help_text": "Narration tonu: formal, casual, energetic, vb.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "formal",
        "wired": True,
        "wired_to": "BulletinScriptExecutor — anlatim tonu",
    },
    "news_bulletin.config.default_duration_seconds": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Varsayilan Hedef Sure (sn)",
        "help_text": "Bulten hedef suresi — saniye cinsinden.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 120,
        "wired": True,
        "wired_to": "BulletinScriptExecutor — hedef sure",
    },
    "news_bulletin.config.max_items_per_bulletin": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Max Haber Sayisi",
        "help_text": "Tek bultendeki maksimum haber ogesi sayisi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 10,
        "wired": True,
        "wired_to": "start_production precondition check",
    },
    "news_bulletin.config.narration_word_limit_per_item": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Haber Basina Max Kelime",
        "help_text": "Her haberin narration metnindeki kelime limiti.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 80,
        "wired": True,
        "wired_to": "BulletinScriptExecutor — kelime limiti",
    },
    "news_bulletin.config.render_mode": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Render Modu",
        "help_text": "M28: sadece 'combined'. M29+: per-category, per-item.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "combined",
        "wired": False,
        "wired_to": "DEFINED — M28 sadece combined destekler",
    },
    "news_bulletin.config.render_fps": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Render FPS",
        "help_text": "Video render kare hizi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 30,
        "wired": False,
        "wired_to": "DEFINED — Remotion composition'da kullanilacak",
    },
    "news_bulletin.config.render_format": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Render Formati",
        "help_text": "16:9 (landscape) veya 9:16 (portrait). Composition ve Remotion boyutlarini belirler.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "landscape",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.renderFormat → Root.tsx calculateMetadata",
    },
    # --- News Bulletin Module (M30) ---
    # --- M41: Karaoke ayarları ---
    "news_bulletin.config.karaoke_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Karaoke Altyazi",
        "help_text": "Karaoke (kelime bazli vurgulama) modunu etkinlestirir. Kapali ise cursor modu kullanilir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → timing_mode override; karaoke kapali ise cursor kullanilir",
    },
    # --- M41: Haber gosterim ayarlari ---
    "news_bulletin.config.show_date": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Tarih Goster",
        "help_text": "Haber bulteninde her haberin yayin tarihini gosterir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.showDate → BulletinLowerThird",
    },
    "news_bulletin.config.show_source": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Kaynak Goster",
        "help_text": "Haber bulteninde her haberin kaynagini gosterir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": False,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.showSource → BulletinLowerThird",
    },
    "news_bulletin.config.default_subtitle_style": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Varsayilan Altyazi Stili",
        "help_text": "Altyazi preset ID: clean_white, bold_yellow, minimal_dark, gradient_glow, outline_only.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "clean_white",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor — subtitle preset secimi",
    },
    "news_bulletin.config.default_lower_third_style": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Varsayilan Lower-Third Stili",
        "help_text": "Lower-third stil: broadcast, minimal, modern.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "broadcast",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor — lower-third stil secimi",
    },
    "news_bulletin.config.trust_enforcement_level": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Guvenilirlik Zorlama Seviyesi",
        "help_text": "none: kontrol yok, warn: uyari, block: engelle. Kaynak trust_level='low' olan haberler icin.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "warn",
        "wired": True,
        "wired_to": "editorial_gate / service — trust enforcement",
    },
    "news_bulletin.config.category_style_mapping_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Kategori → Stil Eslemesi Aktif",
        "help_text": "True ise wizard'da kategori bazli stil onerisi gosterilir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "wizard — category style suggestion",
    },
    "news_bulletin.config.normalize_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Normalizasyon Aktif",
        "help_text": "Haber baslik/icerik normalizasyonunu etkinlestirir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "PromptAssemblyService — nb.normalize block condition",
    },
    "news_bulletin.config.humanize_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Humanizer Aktif",
        "help_text": "Insansi dil zenginlestirmeyi etkinlestirir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": False,
        "wired": True,
        "wired_to": "PromptAssemblyService — nb.humanizer block condition",
    },
    "news_bulletin.config.tts_enhance_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "TTS Uyumluluk Aktif",
        "help_text": "TTS uyumluluk talimatlarini etkinlestirir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "PromptAssemblyService — nb.tts_enhance block condition",
    },
    "news_bulletin.config.anti_clickbait_enabled": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Anti-Clickbait Aktif",
        "help_text": "Clickbait engelleme kurallarini etkinlestirir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "PromptAssemblyService — nb.anti_clickbait block condition",
    },
    # --- News Bulletin Visual Style (M33) ---
    "news_bulletin.config.default_bulletin_style": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Varsayilan Gorsel Stil",
        "help_text": "YTRobot gorsel stili: breaking, tech, corporate, sport, finance, weather, science, entertainment, dark.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "breaking",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor — bulletinStyle prop",
    },
    "news_bulletin.config.network_name": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Kanal Adi",
        "help_text": "Video ust barinda gorunen kanal/ag adi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "ContentHub Haber",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor — networkName prop",
    },
    "news_bulletin.config.show_ticker": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Alt Ticker Goster",
        "help_text": "Alt haber akisi bandini gosterir/gizler.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor — showTicker prop",
    },

    # --- M43: News Bulletin Visual & Ticker Parameters ---
    "news_bulletin.config.ticker_speed": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Ticker Hizi (px/frame)",
        "help_text": "Alt ticker bandinin kayma hizi. Deger arttikca ticker daha hizli kayar.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 4,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.tickerSpeed → NewsTicker",
    },
    "news_bulletin.config.ticker_bg_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Ticker Arka Plan Rengi",
        "help_text": "Alt ticker bandinin arka plan rengi (hex).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#1E293B",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.tickerBgColor → NewsTicker",
    },
    "news_bulletin.config.ticker_text_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Ticker Yazi Rengi",
        "help_text": "Alt ticker bandinin yazi rengi (hex).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#FFFFFF",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.tickerTextColor → NewsTicker",
    },
    "news_bulletin.config.show_live_badge": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "CANLI Badge Goster",
        "help_text": "Video uzerinde CANLI/LIVE badge gosterimini etkinlestirir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.showLiveBadge → NetworkBar",
    },
    "news_bulletin.config.show_category_flash": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Kategori Flash Goster",
        "help_text": "Her haberin basinda kategori flash animasyonunu gosterir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.showCategoryFlash → CategoryFlash",
    },
    "news_bulletin.config.category_flash_duration": {
        "group": "news_bulletin",
        "type": "float",
        "label": "Kategori Flash Suresi (sn)",
        "help_text": "Kategori flash animasyonunun suresi (saniye). YTRobot varsayilan: 1.5.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 1.5,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → duration hesabi + composition_props.categoryFlashDuration",
    },
    "news_bulletin.config.show_item_intro": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Haber Giris Paneli Goster",
        "help_text": "Her haberin basinda kisa bir branded giris paneli gosterir.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.showItemIntro → NewsItemIntro",
    },
    "news_bulletin.config.item_intro_duration": {
        "group": "news_bulletin",
        "type": "float",
        "label": "Haber Giris Suresi (sn)",
        "help_text": "Haber giris panelinin suresi (saniye).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 2.0,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → duration hesabi + composition_props.itemIntroDuration",
    },
    # --- M43: Lower Third Style Parameters ---
    "news_bulletin.config.lower_third_font_family": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Lower Third Font",
        "help_text": "Lower third yazitipi ailesi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "Inter",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.lowerThirdFontFamily",
    },
    "news_bulletin.config.lower_third_font_size": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Lower Third Font Boyutu",
        "help_text": "Lower third yazi boyutu (px).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 18,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.lowerThirdFontSize",
    },
    "news_bulletin.config.lower_third_bg_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Lower Third Arka Plan",
        "help_text": "Lower third arka plan rengi (hex, alpha destekler: #000000CC).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#000000CC",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.lowerThirdBgColor",
    },
    "news_bulletin.config.lower_third_text_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Lower Third Yazi Rengi",
        "help_text": "Lower third yazi rengi (hex).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#FFFFFF",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.lowerThirdTextColor",
    },
    # --- M43: Subtitle Style Parameters ---
    "news_bulletin.config.subtitle_font_family": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Altyazi Font",
        "help_text": "Altyazi yazitipi ailesi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "Inter",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleFontFamily",
    },
    "news_bulletin.config.subtitle_font_size": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Altyazi Font Boyutu",
        "help_text": "Altyazi yazi boyutu (px).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 28,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleFontSize",
    },
    "news_bulletin.config.subtitle_bg_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Altyazi Arka Plan",
        "help_text": "Altyazi arka plan rengi (hex, alpha destekler).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#000000AA",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleBgColor",
    },
    "news_bulletin.config.subtitle_text_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Altyazi Yazi Rengi",
        "help_text": "Altyazi yazi rengi (hex).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#FFFFFF",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleTextColor",
    },
    "news_bulletin.config.subtitle_stroke_color": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Altyazi Dis Cizgi Rengi",
        "help_text": "Altyazi dis cizgi (stroke) rengi.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "#000000",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleStrokeColor",
    },
    "news_bulletin.config.subtitle_stroke_width": {
        "group": "news_bulletin",
        "type": "integer",
        "label": "Altyazi Dis Cizgi Kalinligi",
        "help_text": "Altyazi dis cizgi kalinligi (px).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": 2,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleStrokeWidth",
    },
    "news_bulletin.config.subtitle_animation": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Altyazi Animasyon Tipi",
        "help_text": "Altyazi animasyon modu: karaoke, fade, none.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "karaoke",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.subtitleAnimation",
    },
    # --- M43: Image & Animation Parameters ---
    "news_bulletin.config.image_ken_burns": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Ken Burns Efekti",
        "help_text": "Gorsellere zoom/pan animasyonu uygular.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.imageKenBurns → Layout bileşenleri",
    },
    "news_bulletin.config.image_transition": {
        "group": "news_bulletin",
        "type": "string",
        "label": "Gorsel Gecis Tipi",
        "help_text": "Gorseller arasi gecis animasyonu: crossfade, slide, zoom, cut.",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": "crossfade",
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.imageTransition → Layout bileşenleri",
    },
    "news_bulletin.config.auto_layout_selection": {
        "group": "news_bulletin",
        "type": "boolean",
        "label": "Otomatik Layout Secimi",
        "help_text": "Her haberin medya tipine gore otomatik layout secimi yapar (16:9, 9:16 video, 1:1, medyasiz).",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.autoLayoutSelection → Layout dispatcher",
    },
    # --- M43: Category Style Mapping (JSON) ---
    "news_bulletin.config.category_style_mapping": {
        "group": "news_bulletin",
        "type": "json",
        "label": "Kategori Gorsel Stil Esleme Tablosu",
        "help_text": "JSON: Her kategori icin accent, bg, grid renkleri. Ornek: {\"breaking\": {\"accent\": \"#DC2626\", \"bg\": \"#0A0A0A\", \"grid\": \"rgba(220,38,38,0.06)\"}, ...}",
        "module_scope": "news_bulletin",
        "env_var": "",
        "builtin_default": {
            "breaking": {"accent": "#DC2626", "bg": "#0A0A0A", "grid": "rgba(220,38,38,0.06)", "label_tr": "SON DAKİKA", "label_en": "BREAKING NEWS"},
            "tech": {"accent": "#00E5FF", "bg": "#0D1B2A", "grid": "rgba(0,229,255,0.06)", "label_tr": "TEKNOLOJİ", "label_en": "TECHNOLOGY"},
            "corporate": {"accent": "#2563EB", "bg": "#0A1628", "grid": "rgba(37,99,235,0.06)", "label_tr": "KURUMSAL", "label_en": "CORPORATE"},
            "sport": {"accent": "#10B981", "bg": "#051A10", "grid": "rgba(16,185,129,0.06)", "label_tr": "SPOR", "label_en": "SPORTS"},
            "finance": {"accent": "#F59E0B", "bg": "#1A1405", "grid": "rgba(245,158,11,0.06)", "label_tr": "FİNANS", "label_en": "FINANCE"},
            "weather": {"accent": "#38BDF8", "bg": "#0C1F3D", "grid": "rgba(56,189,248,0.06)", "label_tr": "HAVA DURUMU", "label_en": "WEATHER"},
            "science": {"accent": "#8B5CF6", "bg": "#0F0B1E", "grid": "rgba(139,92,246,0.06)", "label_tr": "BİLİM/TEKNİK", "label_en": "SCIENCE"},
            "entertainment": {"accent": "#EC4899", "bg": "#1A0515", "grid": "rgba(236,72,153,0.06)", "label_tr": "EĞLENCE/MAGAZİN", "label_en": "ENTERTAINMENT"},
            "dark": {"accent": "#94A3B8", "bg": "#000000", "grid": "rgba(148,163,184,0.06)", "label_tr": "GÜNDEM", "label_en": "HEADLINES"},
        },
        "wired": True,
        "wired_to": "BulletinCompositionExecutor → composition_props.categoryStyleMapping → StudioBackground, CategoryFlash",
    },

    # --- Standard Video Module Prompts (Phase 2 follow-up) ---
    "standard_video.prompt.script_system": {
        "group": "standard_video",
        "type": "prompt",
        "label": "Video Script Sistem Prompt",
        "help_text": "Video senaryosu uretimi icin LLM sistem talimatlari. Dil/ton/sure bilgileri runtime'da eklenir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": (
            "Sen bir video script yazarisin. "
            "Sahne sahne senaryo ureteceksin.\n\n"
            "Dil ve ton kurallari icin asagidaki bilgileri kullan.\n\n"
            "CIKTI FORMATI: Yalnizca gecerli JSON dondur, baska hicbir sey ekleme."
        ),
        "wired": True,
        "wired_to": "ScriptStepExecutor — script uretimi sistem prompt",
    },
    "standard_video.prompt.metadata_system": {
        "group": "standard_video",
        "type": "prompt",
        "label": "Video Metadata Sistem Prompt",
        "help_text": "YouTube metadata uretimi icin LLM sistem talimatlari. Dil/ton/etiket stilleri runtime'da eklenir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": (
            "Sen bir YouTube icerik uzmanisin. "
            "Verilen script'ten platform icin optimize edilmis metadata ureteceksin.\n\n"
            "CIKTI FORMATI: Yalnizca gecerli JSON dondur, baska hicbir sey ekleme."
        ),
        "wired": True,
        "wired_to": "MetadataStepExecutor — metadata uretimi sistem prompt",
    },

    # --- Standard Video Format (M41) ---
    "standard_video.config.render_format": {
        "group": "standard_video",
        "type": "string",
        "label": "Render Formati",
        "help_text": "16:9 (landscape) veya 9:16 (portrait). Video cikti boyutlarini belirler.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "landscape",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.renderFormat → Root.tsx calculateMetadata",
    },

    # --- M41: Standard Video Karaoke ---
    "standard_video.config.karaoke_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Karaoke Altyazi",
        "help_text": "Karaoke (kelime bazli vurgulama) modunu etkinlestirir. Kapali ise cursor modu kullanilir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "CompositionStepExecutor → timing_mode override; karaoke kapali ise cursor kullanilir",
    },

    # --- Standard Video Behavior Block Settings ---
    "standard_video.config.opening_hooks_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Acilis Hook Kurallari",
        "builtin_default": True,
        "module_scope": "standard_video",
        "help_text": "Acilis hook blogu etkin mi. sv.opening_hooks blocku ile baglantilidlr.",
        "wired": True,
        "wired_to": "sv.opening_hooks block condition",
    },
    "standard_video.config.humanize_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Humanizer",
        "builtin_default": False,
        "module_scope": "standard_video",
        "help_text": "Humanizer blogu etkin mi. sv.humanizer blocku ile baglantilidlr. Varsayilan kapali.",
        "wired": True,
        "wired_to": "sv.humanizer block condition",
    },
    "standard_video.config.tts_enhance_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "TTS Uyumluluk",
        "builtin_default": True,
        "module_scope": "standard_video",
        "help_text": "TTS uyumluluk blogu etkin mi. sv.tts_enhance blocku ile baglantilidlr.",
        "wired": True,
        "wired_to": "sv.tts_enhance block condition",
    },
    "standard_video.config.seo_rules_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "SEO Kurallari",
        "builtin_default": True,
        "module_scope": "standard_video",
        "help_text": "SEO optimizasyon blogu etkin mi. sv.metadata_seo_rules blocku ile baglantilidlr.",
        "wired": True,
        "wired_to": "sv.metadata_seo_rules block condition",
    },
    "standard_video.config.category_guidance_enabled": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Kategori Yonlendirme",
        "builtin_default": True,
        "module_scope": "standard_video",
        "help_text": "Kategori yonlendirme blogu etkin mi. sv.category_guidance data_presence ile kontrol edilir.",
        "wired": True,
        "wired_to": "sv.category_guidance block condition",
    },

    # --- M44: Standard Video Visual & Subtitle Parameters ---
    "standard_video.config.karaoke_anim_preset": {
        "group": "standard_video",
        "type": "string",
        "label": "Karaoke Animasyon Preset",
        "help_text": "Kelime vurgulama animasyon stili: hype, smooth, bounce, typewriter, glow.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "hype",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.karaokeAnimPreset → KaraokeSubtitle",
    },
    "standard_video.config.render_fps": {
        "group": "standard_video",
        "type": "integer",
        "label": "Render FPS",
        "help_text": "Video render kare hizi. 30 standart, 60 yuksek kalite.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 30,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.renderFps → Remotion config",
    },
    "standard_video.config.subtitle_font_family": {
        "group": "standard_video",
        "type": "string",
        "label": "Altyazi Font",
        "help_text": "Altyazi font ailesi. Bos ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleFontFamily → KaraokeSubtitle",
    },
    "standard_video.config.subtitle_font_size": {
        "group": "standard_video",
        "type": "integer",
        "label": "Altyazi Font Boyutu",
        "help_text": "Altyazi font boyutu (px). 0 ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 0,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleFontSize → KaraokeSubtitle override",
    },
    "standard_video.config.subtitle_text_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Altyazi Yazi Rengi",
        "help_text": "Altyazi metin rengi (hex). Bos ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleTextColor → KaraokeSubtitle override",
    },
    "standard_video.config.subtitle_active_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Altyazi Aktif Kelime Rengi",
        "help_text": "Karaoke vurgulanan kelimenin rengi (hex). Bos ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleActiveColor → KaraokeSubtitle override",
    },
    "standard_video.config.subtitle_bg_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Altyazi Arka Plan",
        "help_text": "Altyazi arka plan rengi (hex/rgba). Bos ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleBgColor → KaraokeSubtitle override",
    },
    "standard_video.config.subtitle_stroke_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Altyazi Dis Cizgi Rengi",
        "help_text": "Altyazi kontur/stroke rengi (hex). Bos ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleStrokeColor → KaraokeSubtitle override",
    },
    "standard_video.config.subtitle_stroke_width": {
        "group": "standard_video",
        "type": "integer",
        "label": "Altyazi Dis Cizgi Kalinligi",
        "help_text": "Altyazi kontur kalinligi (px). -1 ise preset'ten gelir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": -1,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.subtitleStrokeWidth → KaraokeSubtitle override",
    },
    "standard_video.config.image_ken_burns": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Ken Burns Efekti",
        "help_text": "Sahnelerdeki gorsellere yavas zoom/pan efekti uygular.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.imageKenBurns → SceneComponent",
    },
    "standard_video.config.image_transition": {
        "group": "standard_video",
        "type": "string",
        "label": "Gorsel Gecis Tipi",
        "help_text": "Sahneler arasi gorsel gecis efekti: crossfade, cut, slide, zoom.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "crossfade",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.imageTransition → SceneComponent",
    },
    "standard_video.config.scene_transition_duration": {
        "group": "standard_video",
        "type": "float",
        "label": "Sahne Gecis Suresi (sn)",
        "help_text": "Sahne gecis animasyonunun suresi saniye cinsinden.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 0.5,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.sceneTransitionDuration → SceneComponent",
    },
    "standard_video.config.bg_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Arka Plan Rengi",
        "help_text": "Gorsel yoksa veya gorsel yuklenmeden once gorunen arka plan rengi.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "#0a0a0a",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.bgColor → SceneComponent/AbsoluteFill",
    },
    "standard_video.config.show_title_overlay": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Baslik Overlay Goster",
        "help_text": "Video basligini portrait/landscape overlay olarak gosterir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.showTitleOverlay → PortraitOverlay/LandscapeOverlay",
    },
    "standard_video.config.title_font_size": {
        "group": "standard_video",
        "type": "integer",
        "label": "Baslik Font Boyutu",
        "help_text": "Overlay baslik font boyutu (px). Portrait ve landscape icin baz deger.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 30,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.titleFontSize → PortraitOverlay",
    },
    "standard_video.config.title_color": {
        "group": "standard_video",
        "type": "string",
        "label": "Baslik Rengi",
        "help_text": "Overlay baslik metin rengi (hex).",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "#FFFFFF",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.titleColor → PortraitOverlay",
    },
    "standard_video.config.gradient_intensity": {
        "group": "standard_video",
        "type": "float",
        "label": "Gradient Yogunlugu",
        "help_text": "Alt gradient (vignette) opakligi. 0.0=yok, 1.0=tam koyu. Varsayilan 0.65.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 0.65,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.gradientIntensity → LandscapeOverlay/PortraitOverlay",
    },
    "standard_video.config.watermark_text": {
        "group": "standard_video",
        "type": "string",
        "label": "Watermark Metni",
        "help_text": "Video kosesinde gosterilecek kanal/marka adi. Bos ise watermark gosterilmez.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.watermarkText → WatermarkOverlay",
    },
    "standard_video.config.watermark_opacity": {
        "group": "standard_video",
        "type": "float",
        "label": "Watermark Opakligi",
        "help_text": "Watermark seffafligi. 0.0=gorunmez, 1.0=tam gorunur.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": 0.3,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.watermarkOpacity → WatermarkOverlay",
    },
    "standard_video.config.watermark_position": {
        "group": "standard_video",
        "type": "string",
        "label": "Watermark Konumu",
        "help_text": "Watermark konumu: top-left, top-right, bottom-left, bottom-right.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": "bottom-right",
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.watermarkPosition → WatermarkOverlay",
    },
    # B6: Visual cue overlay kontrolü
    "standard_video.config.show_visual_cue": {
        "group": "standard_video",
        "type": "boolean",
        "label": "Sahne Gorsel Ipucu Goster",
        "help_text": "Aktif ise sahne basinda visual_cue metni kisa sureligine goruntulenir.",
        "module_scope": "standard_video",
        "env_var": "",
        "builtin_default": True,
        "wired": True,
        "wired_to": "CompositionStepExecutor → composition_props.showVisualCue → VisualCueTag",
    },

    # --- Module Registry Settings (Phase 2 — Faz A) ---
    "module.standard_video.enabled": {
        "group": "modules",
        "type": "boolean",
        "label": "Standart Video modülü etkin",
        "help_text": "Devre dışı bırakıldığında: menüde gizlenir, yeni üretim engellenir, mevcut kayıtlar etkilenmez.",
        "module_scope": "standard_video",
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "Module registry + sidebar + command palette + wizard",
    },
    "module.news_bulletin.enabled": {
        "group": "modules",
        "type": "boolean",
        "label": "Haber Bülteni modülü etkin",
        "help_text": "Devre dışı bırakıldığında: menüde gizlenir, yeni üretim engellenir, mevcut kayıtlar etkilenmez.",
        "module_scope": "news_bulletin",
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "Module registry + sidebar + command palette + wizard",
    },
    # --- Automation (Full-Auto Mode v1) ---
    # Global kill switch + defaults for per-project full-auto.
    "automation.full_auto.enabled": {
        "group": "automation",
        "type": "boolean",
        "label": "Tam otomatik mod kullanilabilir",
        "help_text": "Kapali olursa hicbir proje tam otomatik calistirilamaz (per-project enable yoksayilir).",
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "AutomationService.can_full_auto + scheduler + trigger endpoint",
    },
    "automation.full_auto.allowed_modules": {
        "group": "automation",
        "type": "json",
        "label": "Tam otomatik izinli moduller",
        "help_text": "Ilk faz: yalnizca standard_video. Baska modul girisleri reddedilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": ["standard_video"],
        "wired": True,
        "wired_to": "AutomationService.validate_module",
    },
    "automation.full_auto.require_review_gate": {
        "group": "automation",
        "type": "boolean",
        "label": "Varsayilan: review gate zorunlu",
        "help_text": "Yeni projelerde automation_require_review_gate icin varsayilan. Kapali olsa bile proje bazinda ac/kapa edilebilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "ContentProject.create defaults",
    },
    "automation.full_auto.default_publish_policy": {
        "group": "automation",
        "type": "string",
        "label": "Varsayilan yayin politikasi",
        "help_text": "draft | schedule | publish_now. Ilk faz: immediate publish 'publish_now' etkisizdir; review gate varsa draft olarak biter.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "draft",
        "wired": True,
        "wired_to": "Post-completion hook in AutomationService",
    },
    "automation.full_auto.max_concurrent_per_user": {
        "group": "automation",
        "type": "integer",
        "label": "Kullanici basi es zamanli full-auto is sayisi",
        "help_text": "Kullanici icin ayni anda calisabilecek maksimum tam otomatik is. Faz 1 guardrail'i.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 1,
        "wired": True,
        "wired_to": "AutomationService.check_concurrency_guards",
    },
    "automation.full_auto.max_concurrent_per_project": {
        "group": "automation",
        "type": "integer",
        "label": "Proje basi es zamanli full-auto is sayisi",
        "help_text": "Ayni projeden ayni anda birden fazla tam otomatik is calismaz.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 1,
        "wired": True,
        "wired_to": "AutomationService.check_concurrency_guards",
    },
    "automation.full_auto.max_daily_runs_per_project": {
        "group": "automation",
        "type": "integer",
        "label": "Proje basi gunluk maksimum tam otomatik calisma",
        "help_text": "Gunluk limit asildiginda scheduler ve trigger reddedilir. Proje seviyesinde daha kisitlayici bir deger verilebilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 5,
        "wired": True,
        "wired_to": "AutomationService.check_daily_quota",
    },
    "automation.full_auto.require_template": {
        "group": "automation",
        "type": "boolean",
        "label": "Template zorunlu",
        "help_text": "Full-auto calismasi icin projede varsayilan template tanimli olmali.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "AutomationService.validate_project_config",
    },
    "automation.full_auto.require_channel": {
        "group": "automation",
        "type": "boolean",
        "label": "Kanal zorunlu",
        "help_text": "Projede channel_profile_id bos olan full-auto istekleri reddedilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": True,
        "wired": True,
        "wired_to": "AutomationService.validate_project_config",
    },
    "automation.full_auto.require_blueprint": {
        "group": "automation",
        "type": "boolean",
        "label": "Style Blueprint zorunlu",
        "help_text": "Projede varsayilan style blueprint tanimli olmali.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "AutomationService.validate_project_config",
    },
    "automation.scheduler.enabled": {
        "group": "automation",
        "type": "boolean",
        "label": "Proje cron scheduler etkin",
        "help_text": "Kapali olursa zamanlanmis proje calistirmalari tetiklenmez. Manuel tetikleme etkilenmez.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": False,
        "wired": True,
        "wired_to": "app.main.lifespan + AutomationScheduler.poll",
    },
    "automation.scheduler.poll_interval_seconds": {
        "group": "automation",
        "type": "integer",
        "label": "Scheduler polling araligi (saniye)",
        "help_text": "AutomationScheduler iki tetik kontrolunu kac saniyede bir yapsin.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": 60,
        "wired": True,
        "wired_to": "app.main.lifespan",
    },
    "automation.scheduler.default_timezone": {
        "group": "automation",
        "type": "string",
        "label": "Scheduler varsayilan zaman dilimi",
        "help_text": "Proje kendi timezone'u yoksa bu deger kullanilir. 'UTC' tavsiye edilir.",
        "module_scope": None,
        "env_var": None,
        "builtin_default": "UTC",
        "wired": True,
        "wired_to": "AutomationScheduler.compute_next_run",
    },

    # -----------------------------------------------------------------
    # Product Review Module (Faz A — 23 setting)
    # -----------------------------------------------------------------
    # Scrape / ingestion
    "product_review.scrape.enabled": {
        "group": "product_review",
        "type": "boolean",
        "label": "Urun tarama etkin",
        "help_text": "Kapali oldugunda product_scrape adimi kullaniciya acik hata verir.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": True,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.timeout_seconds": {
        "group": "product_review",
        "type": "integer",
        "label": "Scrape HTTP timeout (saniye)",
        "help_text": "Urun sayfasi cekme HTTP timeout'u.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 15,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.max_body_bytes": {
        "group": "product_review",
        "type": "integer",
        "label": "Scrape max icerik boyutu (byte)",
        "help_text": "Bu limiti asan sayfalar kesilir ve uyari verilir.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 2_000_000,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.min_interval_seconds_per_host": {
        "group": "product_review",
        "type": "integer",
        "label": "Host basina scrape araligi (saniye)",
        "help_text": "Ayni host'a pes pese istekleri engeller — kibarlik + anti-ban.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 5,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.respect_robots_txt": {
        "group": "product_review",
        "type": "boolean",
        "label": "robots.txt'e uy",
        "help_text": (
            "Varsayilan KAPALI (user karari: default false). Acildiginda scrape "
            "oncesi robots.txt okunur; izin yoksa adim hata verir + audit log. "
            "UYARI: Acmak kibar + yasal olan — docs/product-review-legal.md'ye bakiniz."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": False,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.parser_chain_order": {
        "group": "product_review",
        "type": "string",
        "label": "Parser zincir sirasi",
        "help_text": (
            "Virgul ile ayrilmis parser adlari. Ornek: 'jsonld,og,site_specific'. "
            "Ilk geri doneni kazanir; hepsi bos → scrape_confidence 0.0."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": "jsonld,og,site_specific",
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B)",
    },
    "product_review.scrape.min_confidence_for_full_auto": {
        "group": "product_review",
        "type": "float",
        "label": "Full-auto icin minimum scrape guveni",
        "help_text": (
            "Full-auto mode'da bu esigi gecemeyen job'lar semi_auto'ya dusurulur. "
            "Publish review gate KORUNUR — bu sadece pipeline otomasyonunu etkiler."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 0.7,
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor + full_auto gate (Faz B / E)",
    },

    # Ingestion — site allowlist
    "product_review.sites.allowlist": {
        "group": "product_review",
        "type": "string",
        "label": "Desteklenen siteler (allowlist)",
        "help_text": (
            "Virgul ile ayrilmis host listesi. v1: amazon,trendyol,hepsiburada,n11,"
            "shopify,woocommerce. Bu listenin disindaki host'lar generic parser "
            "ile islenir (sadece jsonld + og; site_specific devre disi)."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": "amazon,trendyol,hepsiburada,n11,shopify,woocommerce",
        "wired": False,
        "wired_to": "product_review.executors.ProductScrapeStepExecutor (Faz B/G)",
    },

    # Creative / pipeline
    "product_review.config.default_language": {
        "group": "product_review",
        "type": "string",
        "label": "Varsayilan dil",
        "help_text": "Senaryo ve metadata icin varsayilan dil (ISO 639-1).",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": "tr",
        "wired": False,
        "wired_to": "product_review.executors.ScriptStepExecutor (Faz B)",
    },
    "product_review.config.default_orientation": {
        "group": "product_review",
        "type": "string",
        "label": "Varsayilan video yonu",
        "help_text": "'vertical' veya 'horizontal'. v1 vertical ile baslar.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": "vertical",
        "wired": False,
        "wired_to": "product_review.executors.CompositionStepExecutor (Faz B)",
    },
    "product_review.config.default_duration_seconds": {
        "group": "product_review",
        "type": "integer",
        "label": "Varsayilan video suresi (saniye)",
        "help_text": "Hedef sure — senaryo buna gore planlanir.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 60,
        "wired": False,
        "wired_to": "product_review.executors.ScriptStepExecutor (Faz B)",
    },
    "product_review.config.render_fps": {
        "group": "product_review",
        "type": "integer",
        "label": "Render FPS",
        "help_text": "Remotion render kare hizi.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 30,
        "wired": False,
        "wired_to": "product_review.executors.RenderStepExecutor (Faz B)",
    },

    # Preview-first
    "product_review.preview.level1_enabled": {
        "group": "product_review",
        "type": "boolean",
        "label": "Level 1 preview (renderStill) etkin",
        "help_text": "Kapatilirsa preview_frame adimi atlanir — user kararina karsin onerilmiyor.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": True,
        "wired": False,
        "wired_to": "product_review.executors.PreviewFrameExecutor (Faz C)",
    },
    "product_review.preview.level2_enabled": {
        "group": "product_review",
        "type": "boolean",
        "label": "Level 2 preview (mini MP4) etkin",
        "help_text": "Kapatilirsa preview_mini adimi atlanir — kullanici kararina karsi onerilmiyor.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": True,
        "wired": False,
        "wired_to": "product_review.executors.PreviewMiniExecutor (Faz C)",
    },
    "product_review.preview.mini_seconds": {
        "group": "product_review",
        "type": "integer",
        "label": "Mini MP4 suresi (saniye)",
        "help_text": "Level 2 preview MP4'un sure uzunlugu.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": 3,
        "wired": False,
        "wired_to": "product_review.executors.PreviewMiniExecutor (Faz C)",
    },

    # Legal / disclosure
    "product_review.legal.affiliate_disclosure_text": {
        "group": "product_review",
        "type": "string",
        "label": "Affiliate disclosure metni",
        "help_text": (
            "Affiliate URL'li jobs icin metadata + video sonuna eklenen yasal metin. "
            "BU METIN KALDIRILAMAZ — affiliate_enabled=True iken eklenmesi zorunlu."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Bu videodaki baglantilar affiliate link icerebilir. Satin alma "
            "yaparsaniz kanalin kucuk bir komisyon kazanmasi mumkundur; size ek "
            "maliyeti yoktur."
        ),
        "wired": False,
        "wired_to": "product_review.executors.MetadataStepExecutor (Faz B)",
    },
    "product_review.legal.price_disclaimer_text": {
        "group": "product_review",
        "type": "string",
        "label": "Fiyat disclaimer metni",
        "help_text": (
            "Metadata + on-screen'de gosterilen fiyat disclaimer'i. Fiyatlar "
            "snapshot tabanli, degisebilir uyarisi. KALDIRILAMAZ."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Fiyatlar video cekim anindaki duruma gore alinmistir; guncel fiyat "
            "icin ilgili satici sayfasina bakiniz."
        ),
        "wired": False,
        "wired_to": "product_review.executors.MetadataStepExecutor (Faz B)",
    },
    "product_review.legal.tos_checkbox_required": {
        "group": "product_review",
        "type": "boolean",
        "label": "Is olusturulurken ToS onayi zorunlu",
        "help_text": (
            "Kullanici urun incelemesi job'i baslatirken 'affiliate disclosure + "
            "fiyat disclaimer eklenecek' onayini vermeden job olusamaz (wizard)."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": True,
        "wired": False,
        "wired_to": "product_review.router (Faz B wizard) + audit",
    },

    # Prompts
    "product_review.prompt.single_script_system": {
        "group": "product_review",
        "type": "prompt",
        "label": "Tek urun senaryo sistem promptu",
        "help_text": (
            "Tek urun incelemesi icin senaryo uretimi sistem promptu. "
            "{brand}, {name}, {price}, {currency}, {rating}, {features} "
            "placeholder'lari desteklenir."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Sen urun inceleme videolari icin profesyonel bir senaristsin. "
            "Turkce, samimi ama bilgilendirici bir tonla yaz. Urunun faydalarina "
            "ve gercek kullanim senaryolarina odaklan. Abartili ifadelerden kacin. "
            "Affiliate disclosure + fiyat disclaimer senaryo sonuna KESIN eklenmeli."
        ),
        "wired": False,
        "wired_to": "product_review.executors.ScriptStepExecutor (Faz B)",
    },
    "product_review.prompt.comparison_script_system": {
        "group": "product_review",
        "type": "prompt",
        "label": "Karsilastirma senaryo sistem promptu",
        "help_text": (
            "Urun karsilastirma (2+ urun) senaryo sistem promptu. "
            "{primary}, {secondaries} placeholder'lari."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Sen urun karsilastirma videolari icin objektif bir senaristsin. "
            "Turkce yaz. Her urunun artisi ve eksisi esit mesafeden degerlendir. "
            "Sonuc tavsiyesi ver ama okur karar versin. Affiliate disclosure + "
            "fiyat disclaimer senaryo sonuna KESIN eklenmeli."
        ),
        "wired": False,
        "wired_to": "product_review.executors.ScriptStepExecutor (Faz D)",
    },
    "product_review.prompt.alternatives_script_system": {
        "group": "product_review",
        "type": "prompt",
        "label": "Alternatif oneri senaryo sistem promptu",
        "help_text": "Bir ana urune alternatif urun onerileri senaryo sistem promptu.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Sen urun oneri videolari icin tecrubeli bir senaristsin. Turkce yaz. "
            "Ana urunu tanit, butce / ozellik / hedef kitleye gore 3 alternatif "
            "oner. Her alternatifi kisa gerekce ile sun. Affiliate disclosure + "
            "fiyat disclaimer senaryo sonuna KESIN eklenmeli."
        ),
        "wired": False,
        "wired_to": "product_review.executors.ScriptStepExecutor (Faz D)",
    },
    "product_review.prompt.metadata_system": {
        "group": "product_review",
        "type": "prompt",
        "label": "Metadata sistem promptu",
        "help_text": "Basiklik, aciklama, etiketler uretimi icin prompt.",
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": (
            "Sen YouTube/TikTok icerik optimizasyonu konusunda uzman bir "
            "editorsen. Turkce yaz. Clickbait'ten kacin; basligi dogru ve cekici "
            "yap. Aciklamaya affiliate disclosure + fiyat disclaimer'i MUTLAKA "
            "ekle. Etiketler urunun marka, kategori ve kullanim alanina odakli olsun."
        ),
        "wired": False,
        "wired_to": "product_review.executors.MetadataStepExecutor (Faz B)",
    },

    # Full-auto / audit
    "product_review.full_auto.allow_publish_without_review": {
        "group": "product_review",
        "type": "boolean",
        "label": "Full-auto: review GATE'i atla (TEHLIKELI)",
        "help_text": (
            "Varsayilan KAPALI. Acildiginda full_auto mode'da publish review "
            "atlanir ve otomatik yayinlanir. Her kullanim audit_logs'a yazilir. "
            "Yasal disclosure + disclaimer her iki durumda da ZORUNLU kalir."
        ),
        "module_scope": "product_review",
        "env_var": None,
        "builtin_default": False,
        "wired": False,
        "wired_to": "product_review.executors.PublishStepExecutor + audit (Faz F)",
    },
}

# Group labels for UI
GROUP_LABELS: Dict[str, str] = {
    "credentials": "Kimlik Bilgileri",
    "providers": "Provider Ayarlari",
    "execution": "Calisma Ortami",
    "source_scans": "Kaynak Tarama",
    "publish": "Yayin Ayarlari",
    "ui": "Arayuz Ayarlari",
    "jobs": "Is Motoru Ayarlari",
    "news_bulletin": "Haber Bulteni",
    "standard_video": "Standart Video",
    "product_review": "Urun Incelemesi",
    "modules": "Moduller",
    "wizard": "Wizard Yonetimi",
    "system": "Sistem",
    "automation": "Otomasyon",
}

GROUP_ORDER = ["credentials", "providers", "execution", "source_scans", "publish", "ui", "jobs", "automation", "wizard", "standard_video", "news_bulletin", "product_review", "modules", "system"]


# ---------------------------------------------------------------------------
# Known Validation Rules — companion dict for KNOWN_SETTINGS
# ---------------------------------------------------------------------------

KNOWN_VALIDATION_RULES: Dict[str, str] = {
    "execution.render_still_timeout_seconds": '{"type": "integer", "min": 10, "max": 600}',
    "provider.llm.timeout_seconds": '{"type": "float", "min": 5, "max": 3600}',
    "provider.llm.kie_temperature": '{"type": "float", "min": 0.0, "max": 2.0}',
    "provider.llm.openai_temperature": '{"type": "float", "min": 0.0, "max": 2.0}',
    "provider.tts.edge_default_voice": '{"type": "string", "required": true}',
    "provider.visuals.pexels_default_count": '{"type": "integer", "min": 1, "max": 50}',
    "provider.visuals.pixabay_default_count": '{"type": "integer", "min": 1, "max": 50}',
    "provider.visuals.search_timeout_seconds": '{"type": "float", "min": 5, "max": 300}',
    "source_scans.auto_scan_interval_seconds": '{"type": "integer", "min": 60, "max": 86400}',
    "source_scans.soft_dedupe_threshold": '{"type": "float", "min": 0.0, "max": 1.0}',
    "news_items.soft_dedupe_window_days": '{"type": "integer", "min": 1, "max": 365}',
    "news_items.retention.days": '{"type": "integer", "min": 7, "max": 3650}',
    "source_scans.retention.days": '{"type": "integer", "min": 1, "max": 3650}',
    "source_scans.retention.poll_interval_seconds": '{"type": "integer", "min": 300, "max": 86400}',
    "source_scans.og_scrape_min_interval_seconds": '{"type": "integer", "min": 1, "max": 60}',
    "publish.youtube.upload_timeout_seconds": '{"type": "float", "min": 10, "max": 600}',
    "publish.youtube.default_category_id": '{"type": "string", "required": true}',
    "jobs.max_auto_retries": '{"type": "integer", "min": 1, "max": 10}',
    "jobs.retry_base_delay_seconds": '{"type": "integer", "min": 10, "max": 3600}',
    # News Bulletin (M28)
    "news_bulletin.prompt.narration_system": '{"type": "string", "required": true, "min_length": 10}',
    "news_bulletin.prompt.narration_style_rules": '{"type": "string", "required": true, "min_length": 10}',
    "news_bulletin.prompt.anti_clickbait_rules": '{"type": "string", "required": true, "min_length": 10}',
    "news_bulletin.prompt.metadata_title_rules": '{"type": "string", "required": true, "min_length": 10}',
    "news_bulletin.config.default_duration_seconds": '{"type": "integer", "min": 30, "max": 600}',
    "news_bulletin.config.max_items_per_bulletin": '{"type": "integer", "min": 1, "max": 50}',
    "news_bulletin.config.narration_word_limit_per_item": '{"type": "integer", "min": 20, "max": 200}',
    "news_bulletin.config.render_fps": '{"type": "integer", "min": 15, "max": 60}',
    # M30
    "news_bulletin.config.default_subtitle_style": '{"type": "string", "required": false}',
    "news_bulletin.config.default_lower_third_style": '{"type": "string", "required": false}',
    "news_bulletin.config.trust_enforcement_level": '{"type": "string", "required": false, "enum": ["none", "warn", "block"]}',
    "news_bulletin.config.category_style_mapping_enabled": '{"type": "boolean"}',
    "news_bulletin.config.normalize_enabled": '{"type": "boolean"}',
    "news_bulletin.config.humanize_enabled": '{"type": "boolean"}',
    "news_bulletin.config.tts_enhance_enabled": '{"type": "boolean"}',
    "news_bulletin.config.anti_clickbait_enabled": '{"type": "boolean"}',
    # M43: Yeni parametreler
    "news_bulletin.config.ticker_speed": '{"type": "integer", "min": 1, "max": 20}',
    "news_bulletin.config.category_flash_duration": '{"type": "float", "min": 0.5, "max": 5.0}',
    "news_bulletin.config.item_intro_duration": '{"type": "float", "min": 0.5, "max": 5.0}',
    "news_bulletin.config.lower_third_font_size": '{"type": "integer", "min": 10, "max": 60}',
    "news_bulletin.config.subtitle_font_size": '{"type": "integer", "min": 12, "max": 80}',
    "news_bulletin.config.subtitle_stroke_width": '{"type": "integer", "min": 0, "max": 10}',
    "news_bulletin.config.subtitle_animation": '{"type": "string", "enum": ["karaoke", "fade", "none"]}',
    "news_bulletin.config.image_transition": '{"type": "string", "enum": ["crossfade", "slide", "zoom", "cut"]}',
    "news_bulletin.config.show_category_flash": '{"type": "boolean"}',
    "news_bulletin.config.show_item_intro": '{"type": "boolean"}',
    "news_bulletin.config.show_live_badge": '{"type": "boolean"}',
    "news_bulletin.config.image_ken_burns": '{"type": "boolean"}',
    "news_bulletin.config.auto_layout_selection": '{"type": "boolean"}',
    # M44: Standard Video yeni parametreler
    "standard_video.config.karaoke_anim_preset": '{"type": "string", "enum": ["hype", "explosive", "vibrant", "minimal"]}',
    "standard_video.config.render_fps": '{"type": "integer", "min": 15, "max": 60}',
    "standard_video.config.subtitle_font_size": '{"type": "integer", "min": 0, "max": 80}',
    "standard_video.config.subtitle_stroke_width": '{"type": "integer", "min": -1, "max": 10}',
    "standard_video.config.scene_transition_duration": '{"type": "float", "min": 0.0, "max": 3.0}',
    "standard_video.config.gradient_intensity": '{"type": "float", "min": 0.0, "max": 1.0}',
    "standard_video.config.title_font_size": '{"type": "integer", "min": 12, "max": 80}',
    "standard_video.config.image_transition": '{"type": "string", "enum": ["crossfade", "cut", "slide", "zoom"]}',
    "standard_video.config.watermark_opacity": '{"type": "float", "min": 0.0, "max": 1.0}',
    "standard_video.config.watermark_position": '{"type": "string", "enum": ["top-left", "top-right", "bottom-left", "bottom-right"]}',
    # Product Review (Faz A)
    "product_review.scrape.timeout_seconds": '{"type": "integer", "min": 3, "max": 120}',
    "product_review.scrape.max_body_bytes": '{"type": "integer", "min": 10000, "max": 50000000}',
    "product_review.scrape.min_interval_seconds_per_host": '{"type": "integer", "min": 1, "max": 300}',
    "product_review.scrape.parser_chain_order": '{"type": "string", "required": true}',
    "product_review.scrape.min_confidence_for_full_auto": '{"type": "float", "min": 0.0, "max": 1.0}',
    "product_review.sites.allowlist": '{"type": "string", "required": true}',
    "product_review.config.default_language": '{"type": "string", "required": true}',
    "product_review.config.default_orientation": '{"type": "string", "enum": ["vertical", "horizontal"]}',
    "product_review.config.default_duration_seconds": '{"type": "integer", "min": 30, "max": 600}',
    "product_review.config.render_fps": '{"type": "integer", "min": 15, "max": 60}',
    "product_review.preview.mini_seconds": '{"type": "integer", "min": 1, "max": 15}',
    "product_review.legal.affiliate_disclosure_text": '{"type": "string", "required": true, "min_length": 10}',
    "product_review.legal.price_disclaimer_text": '{"type": "string", "required": true, "min_length": 10}',
    "product_review.prompt.single_script_system": '{"type": "string", "required": true, "min_length": 10}',
    "product_review.prompt.comparison_script_system": '{"type": "string", "required": true, "min_length": 10}',
    "product_review.prompt.alternatives_script_system": '{"type": "string", "required": true, "min_length": 10}',
    "product_review.prompt.metadata_system": '{"type": "string", "required": true, "min_length": 10}',
}


# ---------------------------------------------------------------------------
# Resolver functions
# ---------------------------------------------------------------------------

async def resolve(key: str, db: AsyncSession, user_id: Optional[str] = None) -> Any:
    """
    Ayar degerini cozer.

    Oncelik (M40 user override eklendi):
      1. User override (user_id varsa VE setting user_override_allowed ise)
      2. DB admin_value
      3. DB default_value
      4. .env
      5. builtin_default
      6. None

    user_id=None ise eski davranis korunur (backward compatible).
    """
    meta = KNOWN_SETTINGS.get(key)
    expected_type = meta["type"] if meta else "string"

    # DB row for governance flags and admin/default values
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()

    # 1) User override (M40)
    if user_id and row and row.user_override_allowed:
        override_stmt = select(UserSettingOverride).where(
            UserSettingOverride.user_id == user_id,
            UserSettingOverride.setting_key == key,
        )
        override = (await db.execute(override_stmt)).scalar_one_or_none()
        if override:
            user_val = _parse_json_field(override.value_json)
            if user_val is not None:
                coerced = _coerce(user_val, expected_type)
                if coerced is not None:
                    return coerced

    # 2) DB admin_value_json
    if row is not None:
        admin_val = _parse_json_field(row.admin_value_json)
        if admin_val is not None:
            coerced = _coerce(admin_val, expected_type)
            if coerced is not None:
                return coerced

    # 3) DB default_value_json
    if row is not None:
        default_val = _parse_json_field(row.default_value_json)
        if default_val is not None:
            coerced = _coerce(default_val, expected_type)
            if coerced is not None:
                return coerced

    # 4) .env / ortam degiskeni
    if meta and meta.get("env_var"):
        env_val = os.environ.get(meta["env_var"])
        if env_val:
            coerced = _coerce(env_val, expected_type)
            if coerced is not None:
                return coerced

    # 5) builtin default
    if meta and meta.get("builtin_default") is not None:
        return meta["builtin_default"]

    return None


async def explain(key: str, db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Ayar icin tam aciklama doner.

    Effective value + source + metadata + validation durumu.
    M40: user_id verilirse user override katmani eklenir.
    """
    meta = KNOWN_SETTINGS.get(key, {})
    expected_type = meta.get("type", "string")
    is_secret = expected_type == "secret"

    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()

    # Determine effective value and source
    effective_value = None
    source = "missing"

    # M40: user override fields
    has_user_override = False
    user_override_value = None

    # 1) User override (M40)
    if user_id and row and row.user_override_allowed:
        override_stmt = select(UserSettingOverride).where(
            UserSettingOverride.user_id == user_id,
            UserSettingOverride.setting_key == key,
        )
        override = (await db.execute(override_stmt)).scalar_one_or_none()
        if override:
            has_user_override = True
            user_val = _parse_json_field(override.value_json)
            user_override_value = user_val
            if user_val is not None:
                coerced = _coerce(user_val, expected_type)
                if coerced is not None:
                    effective_value = coerced
                    source = "user_override"

    # 2) admin_value
    if effective_value is None and row is not None:
        admin_val = _parse_json_field(row.admin_value_json)
        if admin_val is not None:
            coerced = _coerce(admin_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "admin"

    # 3) default_value
    if effective_value is None and row is not None:
        default_val = _parse_json_field(row.default_value_json)
        if default_val is not None:
            coerced = _coerce(default_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "default"

    # 4) .env
    if effective_value is None and meta.get("env_var"):
        env_val = os.environ.get(meta["env_var"])
        if env_val:
            coerced = _coerce(env_val, expected_type)
            if coerced is not None:
                effective_value = coerced
                source = "env"

    # 5) builtin
    if effective_value is None and meta.get("builtin_default") is not None:
        effective_value = meta["builtin_default"]
        source = "builtin"

    # Display value — mask secrets
    display_value = effective_value
    if is_secret and isinstance(effective_value, str) and effective_value:
        display_value = _mask_value(effective_value)

    # Governance flags from DB row (M40)
    governance = {}
    if row is not None:
        governance = {
            "user_override_allowed": row.user_override_allowed,
            "visible_to_user": row.visible_to_user,
            "read_only_for_user": row.read_only_for_user,
            "visible_in_wizard": row.visible_in_wizard,
        }

    return {
        "key": key,
        "effective_value": display_value,
        "effective_value_raw": effective_value if not is_secret else None,
        "source": source,
        "type": expected_type,
        "is_secret": is_secret,
        "group": meta.get("group", "general"),
        "label": meta.get("label", key),
        "help_text": meta.get("help_text", ""),
        "module_scope": meta.get("module_scope"),
        "wired": meta.get("wired", False),
        "wired_to": meta.get("wired_to", ""),
        "builtin_default": meta.get("builtin_default"),
        "env_var": meta.get("env_var", ""),
        "has_admin_override": row is not None and _parse_json_field(row.admin_value_json) is not None,
        "has_db_row": row is not None,
        "db_version": row.version if row else None,
        "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
        # M40: user override info
        "has_user_override": has_user_override,
        "user_override_value": user_override_value,
        # M40: governance flags
        **governance,
    }


async def resolve_group(group: str, db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Bir gruptaki tum bilinen ayarlarin effective degerlerini doner."""
    results = {}
    for key, meta in KNOWN_SETTINGS.items():
        if meta.get("group") == group:
            results[key] = await resolve(key, db, user_id=user_id)
    return results


async def list_effective(db: AsyncSession, group: Optional[str] = None,
                         wired_only: bool = False,
                         user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Tum bilinen ayarlar icin explain listesi doner.

    M40: user_id verilirse user override katmani eklenir.
    """
    items = []
    for key, meta in KNOWN_SETTINGS.items():
        if group and meta.get("group") != group:
            continue
        if wired_only and not meta.get("wired", False):
            continue
        explanation = await explain(key, db, user_id=user_id)
        items.append(explanation)
    return items


async def list_groups(db: AsyncSession) -> List[Dict[str, Any]]:
    """Grup bazli ozet bilgi doner."""
    groups = {}
    for key, meta in KNOWN_SETTINGS.items():
        g = meta.get("group", "general")
        if g not in groups:
            groups[g] = {"group": g, "label": GROUP_LABELS.get(g, g),
                         "total": 0, "wired": 0, "secret": 0, "missing": 0}
        groups[g]["total"] += 1
        if meta.get("wired"):
            groups[g]["wired"] += 1
        if meta.get("type") == "secret":
            groups[g]["secret"] += 1

    # Resolve missing counts
    for key, meta in KNOWN_SETTINGS.items():
        g = meta.get("group", "general")
        result = await db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        admin_val = _parse_json_field(row.admin_value_json) if row else None
        env_val = os.environ.get(meta.get("env_var", "")) if meta.get("env_var") else None
        builtin = meta.get("builtin_default")
        if admin_val is None and env_val is None and builtin is None:
            groups[g]["missing"] += 1

    ordered = []
    for g in GROUP_ORDER:
        if g in groups:
            ordered.append(groups[g])
    # Add any unlisted groups
    for g, data in groups.items():
        if g not in GROUP_ORDER:
            ordered.append(data)
    return ordered


async def resolve_for_runtime(key: str, db: AsyncSession, user_id: Optional[str] = None) -> Any:
    """
    Runtime bilesenler icin kisayol. Credential key'leri icin
    credential_resolver'a devreder.
    M40: user_id destegi eklendi.
    """
    if key.startswith("credential."):
        from app.settings.credential_resolver import resolve_credential
        return await resolve_credential(key, db)
    return await resolve(key, db, user_id=user_id)
