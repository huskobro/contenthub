"""
Altyazı stil preset tanımları — M4-C2.

Karaoke rendering için kullanılacak kontrollü stil listesi.
Yeni preset eklemek için bu dosyayı güncelle ve kod incelemesinden geçir.
AI tarafından dinamik stil üretilemez (CLAUDE.md C-07).

Preset'ler composition_props.json içinde subtitle_style alanına yazılır.
Remotion component bu string'i okuyarak doğru stil uygular.

Timing modları ve stil uyumluluğu:
  - whisper_word  : Karaoke highlight tam kelime-düzeyi zamanlama ile çalışır.
  - whisper_segment: Segment highlight — kelime vurgusu sınırlıdır.
  - cursor        : Tam zamanlaması yok; highlight görseli degrade modda
                    çalışır (satır highlight kullanılır, kelime highlight değil).

Bu ayrım operatöre ve kullanıcıya yansıtılmalıdır.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# Geçerli preset kimlik listesi — tip olarak da kullanılır
SubtitleStyleId = Literal[
    "clean_white",
    "bold_yellow",
    "minimal_dark",
    "gradient_glow",
    "outline_only",
]

VALID_PRESET_IDS: tuple[str, ...] = (
    "clean_white",
    "bold_yellow",
    "minimal_dark",
    "gradient_glow",
    "outline_only",
)

# Varsayılan preset — belirtilmezse kullanılır
DEFAULT_PRESET_ID: str = "clean_white"


@dataclass(frozen=True)
class SubtitlePreset:
    """
    Altyazı stil preset tanımı.

    Tüm alanlar Remotion component tarafından okunur.
    Rendering davranışını yalnızca bu yapı belirler — component içinde magic string yoktur.
    """

    preset_id: str
    label: str
    font_size: int           # px
    font_weight: str         # "400", "600", "700" vb.
    text_color: str          # hex veya rgba
    active_color: str        # aktif kelime rengi (karaoke highlight)
    background: str          # "none", hex, rgba
    outline_width: int       # px — 0 = outline yok
    outline_color: str       # hex
    line_height: float       # em


# Kontrollü preset kataloğu — string key → SubtitlePreset
SUBTITLE_PRESETS: dict[str, SubtitlePreset] = {
    "clean_white": SubtitlePreset(
        preset_id="clean_white",
        label="Temiz Beyaz",
        font_size=36,
        font_weight="600",
        text_color="#FFFFFF",
        active_color="#FFD700",
        background="rgba(0,0,0,0.35)",
        outline_width=2,
        outline_color="#000000",
        line_height=1.4,
    ),
    "bold_yellow": SubtitlePreset(
        preset_id="bold_yellow",
        label="Kalın Sarı",
        font_size=40,
        font_weight="700",
        text_color="#FFE600",
        active_color="#FF4500",
        background="rgba(0,0,0,0.5)",
        outline_width=3,
        outline_color="#000000",
        line_height=1.3,
    ),
    "minimal_dark": SubtitlePreset(
        preset_id="minimal_dark",
        label="Minimal Koyu",
        font_size=32,
        font_weight="400",
        text_color="#E0E0E0",
        active_color="#FFFFFF",
        background="rgba(0,0,0,0.7)",
        outline_width=0,
        outline_color="#000000",
        line_height=1.5,
    ),
    "gradient_glow": SubtitlePreset(
        preset_id="gradient_glow",
        label="Işıltılı Geçiş",
        font_size=38,
        font_weight="700",
        text_color="#FFFFFF",
        active_color="#00E5FF",
        background="rgba(0,0,0,0.4)",
        outline_width=2,
        outline_color="#001A2C",
        line_height=1.4,
    ),
    "outline_only": SubtitlePreset(
        preset_id="outline_only",
        label="Yalnızca Kontur",
        font_size=36,
        font_weight="600",
        text_color="#FFFFFF",
        active_color="#FF6B00",
        background="none",
        outline_width=3,
        outline_color="#000000",
        line_height=1.4,
    ),
}


def get_preset(preset_id: str) -> SubtitlePreset:
    """
    preset_id için SubtitlePreset döner.

    Bilinmeyen preset_id → ValueError.

    Args:
        preset_id: Preset kimliği.

    Returns:
        SubtitlePreset nesnesi.

    Raises:
        ValueError: preset_id SUBTITLE_PRESETS içinde değilse.
    """
    if preset_id not in SUBTITLE_PRESETS:
        raise ValueError(
            f"Bilinmeyen altyazı stili: {preset_id!r}. "
            f"Geçerli stiller: {list(SUBTITLE_PRESETS.keys())}"
        )
    return SUBTITLE_PRESETS[preset_id]


def get_preset_for_composition(preset_id: str | None) -> dict:
    """
    composition_props.json'a yazılacak subtitle_style dict'ini döner.

    preset_id None veya bilinmiyorsa varsayılan preset kullanılır.

    Returns:
        dict: preset_id ve tüm stil alanları.
    """
    resolved = preset_id if preset_id in SUBTITLE_PRESETS else DEFAULT_PRESET_ID
    preset = SUBTITLE_PRESETS[resolved]
    return {
        "preset_id": preset.preset_id,
        "label": preset.label,
        "font_size": preset.font_size,
        "font_weight": preset.font_weight,
        "text_color": preset.text_color,
        "active_color": preset.active_color,
        "background": preset.background,
        "outline_width": preset.outline_width,
        "outline_color": preset.outline_color,
        "line_height": preset.line_height,
    }
