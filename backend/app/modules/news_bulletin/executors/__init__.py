"""
News Bulletin Executor paketi — M28.

Her executor ayrı modülde tanımlanmıştır.
Reuse edilen executor'lar standard_video paketinden import edilir.

Modüller:
    script.py       — BulletinScriptExecutor
    metadata.py     — BulletinMetadataExecutor
    composition.py  — BulletinCompositionExecutor
    _helpers.py     — Ortak yardımcı fonksiyonlar (dahili)

Reuse edilen executor'lar (standard_video'dan):
    TTSStepExecutor        — Ses üretimi (aynı provider, aynı akış)
    SubtitleStepExecutor   — Altyazı üretimi (aynı provider, aynı akış)
    RenderStepExecutor     — Remotion render (composition_props.json → video.mp4)
    PublishStepExecutor    — Platform yayını (operator_confirm)
"""

from .script import BulletinScriptExecutor
from .metadata import BulletinMetadataExecutor
from .composition import BulletinCompositionExecutor

__all__ = [
    "BulletinScriptExecutor",
    "BulletinMetadataExecutor",
    "BulletinCompositionExecutor",
]
