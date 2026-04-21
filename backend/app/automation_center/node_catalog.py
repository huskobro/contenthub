"""
Automation Center — node catalog.

The canvas is NOT a free DAG builder. For each module_type we publish a
fixed-shape node graph; the inspector lets the user adjust per-node
config and operation_mode but cannot add or remove nodes.

Why fixed-shape:
  - Determinism — the same module always produces the same canvas; UI is
    predictable and screenshots are comparable across users.
  - Auditability — every flow change writes a small, named diff; we
    don't have to compare arbitrary graph topologies.
  - Safety — there's no way to introduce an ungoverned execution path
    by inventing a node.

How to extend:
  - Add a new entry to MODULE_CATALOG keyed by module_type.
  - Mirror the same NodeSpec contract.
  - The frontend canvas reads node titles/scopes from the API response,
    so adding a node here makes it appear automatically.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class NodeSpec:
    """Canonical spec for a node. The catalog returns these in execution
    order; the canvas draws them top-to-bottom (or left-to-right)."""

    id: str
    title: str
    description: str
    scope: str  # source | brief | script | media | render | publish | report
    default_operation_mode: str = "manual"  # manual | ai_assist | automatic
    critical: bool = True  # if True, missing required config is a hard blocker
    # Each tuple is (config_key, human-readable label) — the label appears
    # verbatim in blocker / warning messages.
    required_config: Tuple[Tuple[str, str], ...] = field(default_factory=tuple)


# The standard_video module — the canonical 7-node pipeline. Used as a
# fallback for "mixed" projects until a richer catalog is wired in.
_STANDARD_VIDEO_NODES: List[NodeSpec] = [
    NodeSpec(
        id="brief",
        title="Brief & Konu",
        description="Konu, hedef, anahtar mesaj — pipeline'in giris fisi.",
        scope="brief",
        default_operation_mode="manual",
        required_config=(("topic", "Konu metni"),),
    ),
    NodeSpec(
        id="script",
        title="Senaryo",
        description="Senaryo uretim adimi. AI Destekli'de LLM'le taslak yazar.",
        scope="script",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="metadata",
        title="Meta & Baslik",
        description="Baslik, aciklama, etiket onerileri.",
        scope="brief",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="tts",
        title="Seslendirme",
        description="TTS uretimi. Ses sablonu ve dil zorunlu.",
        scope="media",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="visuals",
        title="Gorsel Plani",
        description="Stok gorsel/video toplama.",
        scope="media",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="render",
        title="Komposit & Render",
        description="Remotion bileseni ile final video uretimi.",
        scope="render",
        default_operation_mode="automatic",
        critical=True,
        required_config=(),
    ),
    NodeSpec(
        id="publish",
        title="Yayin",
        description="Yayin politikasina gore drafte birak / inceleme bekle / yayinla.",
        scope="publish",
        default_operation_mode="manual",
        required_config=(),
    ),
]


# News bulletin — separate flow has source-scan + dedupe up front.
_NEWS_BULLETIN_NODES: List[NodeSpec] = [
    NodeSpec(
        id="source_scan",
        title="Kaynak Tarama",
        description="Kayitli RSS / API kaynaklarindan haber toplar.",
        scope="source",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="dedupe",
        title="Tekrar Filtresi",
        description="Kullanilmis-haber sicili ile cakisanlar elenir.",
        scope="source",
        default_operation_mode="automatic",
        critical=True,
        required_config=(),
    ),
    NodeSpec(
        id="brief",
        title="Bulletin Brief",
        description="Secilen haberlerden bulten taslagi.",
        scope="brief",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="script",
        title="Senaryo",
        description="Bulten metni — segment basina anlatim.",
        scope="script",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="tts",
        title="Seslendirme",
        description="Bulletin VO uretimi.",
        scope="media",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="render",
        title="Komposit & Render",
        description="News bulletin Remotion bileseni.",
        scope="render",
        default_operation_mode="automatic",
        critical=True,
        required_config=(),
    ),
    NodeSpec(
        id="publish",
        title="Yayin",
        description="Yayin politikasi gore yayinla / inceleme bekle.",
        scope="publish",
        default_operation_mode="manual",
        required_config=(),
    ),
]


# Product review — short pipeline, source = product URL.
_PRODUCT_REVIEW_NODES: List[NodeSpec] = [
    NodeSpec(
        id="source",
        title="Urun Kaynagi",
        description="Urun URL'i ve veri cekme.",
        scope="source",
        default_operation_mode="manual",
        critical=True,
        required_config=(("product_url", "Urun URL"),),
    ),
    NodeSpec(
        id="brief",
        title="Inceleme Brief",
        description="Inceleme acisi ve oneri yapisi.",
        scope="brief",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="script",
        title="Senaryo",
        description="Inceleme metni.",
        scope="script",
        default_operation_mode="ai_assist",
        required_config=(),
    ),
    NodeSpec(
        id="tts",
        title="Seslendirme",
        description="Inceleme VO.",
        scope="media",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="render",
        title="Render",
        description="Final video.",
        scope="render",
        default_operation_mode="automatic",
        required_config=(),
    ),
    NodeSpec(
        id="publish",
        title="Yayin",
        description="Yayin politikasi.",
        scope="publish",
        default_operation_mode="manual",
        required_config=(),
    ),
]


MODULE_CATALOG: Dict[str, List[NodeSpec]] = {
    "standard_video": _STANDARD_VIDEO_NODES,
    "news_bulletin": _NEWS_BULLETIN_NODES,
    "product_review": _PRODUCT_REVIEW_NODES,
    # Mixed projects are presented with the standard pipeline by default.
    "mixed": _STANDARD_VIDEO_NODES,
}


def list_node_specs(module_type: Optional[str]) -> List[NodeSpec]:
    """Return the canonical node order for the project's module type.
    Unknown / None module type falls back to standard_video."""
    if module_type and module_type in MODULE_CATALOG:
        return MODULE_CATALOG[module_type]
    return MODULE_CATALOG["standard_video"]


def get_node_catalog(module_type: Optional[str]) -> Dict[str, NodeSpec]:
    return {spec.id: spec for spec in list_node_specs(module_type)}
