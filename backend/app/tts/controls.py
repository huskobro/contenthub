"""
TTS fine controls — Faz 4.

Bu modul kullanici-yonlu kontrol alanlarini provider-spesifik payload'a cevirir:

  - speed         : 0.5-1.5 (1.0 = normal)
  - pitch         : -1.0..+1.0 (0 = normal) — provider desteklemiyorsa silinir
  - emphasis      : 0.0-1.0   (vurgu yogunlugu) — ElevenLabs 'style' + speaker_boost'a map
  - scene_energy  : 'calm' | 'neutral' | 'energetic' — per-scene style override
  - pauses        : dict — {
                       'sentence_break_ms': 200,
                       'paragraph_break_ms': 500,
                       'scene_break_ms': 800,
                     }  (SSML '<break>' tagi destekleyen provider icin; degilse ignored)
  - glossary      : dict — {'brand': {'iPhone': 'aay fon', ...}, 'product': {...}}
                    TTS'den once metin uzerinde uygulanan pronunciation mapping.
  - pronunciation : dict — tam eslesen kelime → fonetik yazim.

SABIT: Glossary/pronunciation degisimi SADECE TTS'e giden metinde uygulanir.
SUBTITLE metni hala SCRIPT CANONICAL'dir (Faz 3 kurali gecerli).

Bu modul DB bagimsizdir; executor settings'ten degerleri okuyup buraya verir.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data sinflari
# ---------------------------------------------------------------------------


@dataclass
class TTSFineControls:
    """TTS step icin normalize edilmis fine-control paketi."""

    # Voice dinamik kontroller
    speed: float = 1.0
    pitch: float = 0.0  # -1..+1; 0 = normal
    emphasis: float = 0.5  # 0..1; provider 'style'ine map
    use_speaker_boost: bool = True

    # Backward compat (ElevenLabs spesifik)
    stability: float = 0.5
    similarity_boost: float = 0.75

    # Sahne bazli enerji override — 'calm' | 'neutral' | 'energetic'
    scene_energy: Optional[str] = None

    # Duraklama kontrolleri (ms)
    sentence_break_ms: int = 0
    paragraph_break_ms: int = 0
    scene_break_ms: int = 0

    # Pronunciation + glossary — TTS metin preprocess
    glossary_brand: dict = field(default_factory=dict)
    glossary_product: dict = field(default_factory=dict)
    pronunciation_overrides: dict = field(default_factory=dict)

    def clamped(self) -> "TTSFineControls":
        """Deger araliklarini guvenli araliga daralt."""
        return TTSFineControls(
            speed=_clamp(self.speed, 0.5, 1.5),
            pitch=_clamp(self.pitch, -1.0, 1.0),
            emphasis=_clamp(self.emphasis, 0.0, 1.0),
            use_speaker_boost=self.use_speaker_boost,
            stability=_clamp(self.stability, 0.0, 1.0),
            similarity_boost=_clamp(self.similarity_boost, 0.0, 1.0),
            scene_energy=self.scene_energy,
            sentence_break_ms=max(0, int(self.sentence_break_ms)),
            paragraph_break_ms=max(0, int(self.paragraph_break_ms)),
            scene_break_ms=max(0, int(self.scene_break_ms)),
            glossary_brand=dict(self.glossary_brand),
            glossary_product=dict(self.glossary_product),
            pronunciation_overrides=dict(self.pronunciation_overrides),
        )


def _clamp(value: float, lo: float, hi: float) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return (lo + hi) / 2.0
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


# ---------------------------------------------------------------------------
# Scene energy preset
# ---------------------------------------------------------------------------


_SCENE_ENERGY_PRESETS = {
    "calm": {
        "stability": 0.75,
        "style": 0.1,
        "emphasis": 0.2,
        "speed_multiplier": 0.95,
    },
    "neutral": {
        "stability": 0.5,
        "style": 0.3,
        "emphasis": 0.5,
        "speed_multiplier": 1.0,
    },
    "energetic": {
        "stability": 0.35,
        "style": 0.65,
        "emphasis": 0.85,
        "speed_multiplier": 1.05,
    },
}


def apply_scene_energy(controls: TTSFineControls, energy: Optional[str]) -> TTSFineControls:
    """
    Scene-energy preset'ini controls uzerine uygular. Bilinmeyen energy → no-op.
    """
    if not energy:
        return controls
    preset = _SCENE_ENERGY_PRESETS.get(energy.lower())
    if not preset:
        logger.debug("apply_scene_energy: bilinmeyen energy=%r, ignored", energy)
        return controls

    # Mevcut controls'i tuketmeyi korumak icin yeni instance
    new = TTSFineControls(
        speed=controls.speed * preset["speed_multiplier"],
        pitch=controls.pitch,
        emphasis=preset["emphasis"],
        use_speaker_boost=controls.use_speaker_boost,
        stability=preset["stability"],
        similarity_boost=controls.similarity_boost,
        scene_energy=energy,
        sentence_break_ms=controls.sentence_break_ms,
        paragraph_break_ms=controls.paragraph_break_ms,
        scene_break_ms=controls.scene_break_ms,
        glossary_brand=controls.glossary_brand,
        glossary_product=controls.glossary_product,
        pronunciation_overrides=controls.pronunciation_overrides,
    )
    return new.clamped()


# ---------------------------------------------------------------------------
# Text preprocessing — glossary + pronunciation
# ---------------------------------------------------------------------------


def apply_glossary_and_pronunciation(
    text: str,
    *,
    glossary_brand: Optional[dict] = None,
    glossary_product: Optional[dict] = None,
    pronunciation_overrides: Optional[dict] = None,
) -> tuple[str, list[dict]]:
    """
    Metni TTS'e gondermeden once, glossary + pronunciation degisimlerini uygular.

    Oncelik:
      1. pronunciation_overrides (en spesifik — tam kelime eslesimi)
      2. glossary_brand           (marka isimleri)
      3. glossary_product         (urun isimleri)

    SABIT: Bu metin YALNIZCA TTS'e gider. Subtitle metni SCRIPT CANONICAL'den
    alinir — bu preprocess subtitle metnini degistirmez.

    Args:
        text: Ham script narration.
        glossary_brand: {'ContentHub': 'kontent hab', ...}
        glossary_product: {'Remotion': 'remoşın', ...}
        pronunciation_overrides: {'çünkü': 'çünki', ...}

    Returns:
        (transformed_text, replacements)
        replacements: [{'from': 'ContentHub', 'to': 'kontent hab', 'source': 'brand'}]
    """
    if not text:
        return text, []

    replacements: list[dict] = []
    result = text

    # Pronunciation ozel — tam kelime eslesimi (boundary); case-sensitive
    for source_name, mapping in (
        ("pronunciation", pronunciation_overrides or {}),
        ("brand", glossary_brand or {}),
        ("product", glossary_product or {}),
    ):
        if not mapping:
            continue
        for original, replacement in mapping.items():
            if not original or not isinstance(replacement, str):
                continue
            pattern = r"(?<!\w)" + re.escape(original) + r"(?!\w)"
            new_result, count = re.subn(
                pattern, replacement, result, flags=re.UNICODE
            )
            if count > 0:
                result = new_result
                replacements.append({
                    "from": original,
                    "to": replacement,
                    "source": source_name,
                    "count": count,
                })

    return result, replacements


# ---------------------------------------------------------------------------
# Pauses — SSML break insertion (destekleyen provider icin)
# ---------------------------------------------------------------------------


def insert_ssml_pauses(
    text: str,
    *,
    sentence_break_ms: int = 0,
    paragraph_break_ms: int = 0,
) -> str:
    """
    Metne SSML <break time="Xms"/> tag'leri ekler.

    Kurallar:
      - Tek yeni satir → paragraph sinirina bakmaz; her (.|!|?) sonrasi
        sentence_break uygulanir.
      - Cift yeni satir (\\n\\n) → paragraph_break.
      - Mevcut SSML tag'leri dokunulmaz.

    Provider SSML'i desteklemiyorsa cagri alaninda bu donusum yapilmamalidir.
    """
    if not text:
        return text

    if paragraph_break_ms > 0:
        text = re.sub(
            r"\n\s*\n",
            f' <break time="{int(paragraph_break_ms)}ms"/> ',
            text,
            flags=re.UNICODE,
        )

    if sentence_break_ms > 0:
        # Cumle sonu noktalama + takip eden bosluk/satir basi
        text = re.sub(
            r"([.!?…])(\s+)",
            lambda m: (
                m.group(1)
                + f' <break time="{int(sentence_break_ms)}ms"/>'
                + m.group(2)
            ),
            text,
            flags=re.UNICODE,
        )

    # Cok'lu boşluklari sadelestir
    text = re.sub(r" {2,}", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Provider-specific payload builder
# ---------------------------------------------------------------------------


def build_provider_voice_settings(
    controls: TTSFineControls, *, provider_id: str
) -> dict:
    """
    Normalize controls → provider-native voice_settings.

    - dubvoice (ElevenLabs): {stability, similarity_boost, speed, style, use_speaker_boost}
    - edge_tts              : {rate: '+10%', pitch: '+0Hz'}
    - system_tts            : {speed: 1.0}  — pitch/emphasis ignored
    """
    c = controls.clamped()

    if provider_id == "dubvoice":
        return {
            "stability": c.stability,
            "similarity_boost": c.similarity_boost,
            "speed": c.speed,
            # Emphasis 0..1 → ElevenLabs style 0..1 (yuksek emphasis = daha dramatik)
            "style": c.emphasis,
            "use_speaker_boost": c.use_speaker_boost,
        }

    if provider_id == "edge_tts":
        # Edge TTS SSML rate/pitch bekler (+XX%, +XXHz format).
        rate_pct = int(round((c.speed - 1.0) * 100))
        rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
        pitch_hz = int(round(c.pitch * 20))  # -1..+1 → -20..+20 Hz
        pitch_str = f"+{pitch_hz}Hz" if pitch_hz >= 0 else f"{pitch_hz}Hz"
        return {"rate": rate_str, "pitch": pitch_str}

    if provider_id == "system_tts":
        return {"speed": c.speed}

    # Bilinmeyen provider — generic payload
    return {"speed": c.speed, "pitch": c.pitch, "emphasis": c.emphasis}


# ---------------------------------------------------------------------------
# End-to-end: scene icin TTS input payload hazirla
# ---------------------------------------------------------------------------


@dataclass
class SceneTTSPlan:
    """Per-scene TTS plan: provider-ready input + audit trail."""

    tts_text: str
    voice_settings: dict
    replacements: list[dict] = field(default_factory=list)
    controls_snapshot: dict = field(default_factory=dict)
    provider_id: str = ""
    scene_energy: Optional[str] = None

    def as_audit_entry(self, scene_number: int) -> dict:
        return {
            "scene_number": scene_number,
            "provider_id": self.provider_id,
            "scene_energy": self.scene_energy,
            "replacements": list(self.replacements),
            "voice_settings": dict(self.voice_settings),
            "controls_snapshot": dict(self.controls_snapshot),
            "tts_text_char_count": len(self.tts_text or ""),
        }


def plan_scene_tts(
    *,
    script_narration: str,
    base_controls: TTSFineControls,
    scene_energy: Optional[str] = None,
    provider_id: str,
    apply_ssml_pauses: bool = False,
) -> SceneTTSPlan:
    """
    Bir sahne icin TTS plani olustur:

      1. scene_energy varsa base_controls'u override et.
      2. glossary + pronunciation uygula (tts_text degisir; script ayni kalir).
      3. apply_ssml_pauses=True ise <break> tag'lerini ekle.
      4. Provider'a uygun voice_settings uret.

    Donus: SceneTTSPlan (tts_text + voice_settings + audit).
    """
    effective = apply_scene_energy(base_controls, scene_energy).clamped()

    tts_text, replacements = apply_glossary_and_pronunciation(
        script_narration,
        glossary_brand=effective.glossary_brand,
        glossary_product=effective.glossary_product,
        pronunciation_overrides=effective.pronunciation_overrides,
    )

    if apply_ssml_pauses and (
        effective.sentence_break_ms > 0 or effective.paragraph_break_ms > 0
    ):
        tts_text = insert_ssml_pauses(
            tts_text,
            sentence_break_ms=effective.sentence_break_ms,
            paragraph_break_ms=effective.paragraph_break_ms,
        )

    voice_settings = build_provider_voice_settings(
        effective, provider_id=provider_id
    )

    return SceneTTSPlan(
        tts_text=tts_text,
        voice_settings=voice_settings,
        replacements=replacements,
        controls_snapshot={
            "speed": effective.speed,
            "pitch": effective.pitch,
            "emphasis": effective.emphasis,
            "stability": effective.stability,
            "similarity_boost": effective.similarity_boost,
            "use_speaker_boost": effective.use_speaker_boost,
            "scene_energy": effective.scene_energy,
            "sentence_break_ms": effective.sentence_break_ms,
            "paragraph_break_ms": effective.paragraph_break_ms,
            "scene_break_ms": effective.scene_break_ms,
        },
        provider_id=provider_id,
        scene_energy=scene_energy,
    )
