"""Builtin prompt block definitions and seed function.

Seeds blocks idempotently -- existing blocks are not overwritten.
Admin overrides are preserved.
"""

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.prompt_assembly.models import PromptBlock

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# NEWS BULLETIN — SCRIPT STEP
# ═══════════════════════════════════════════

BUILTIN_BLOCKS: list[dict] = [
    {
        "key": "nb.narration_system",
        "title": "Narration System Prompt",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen profesyonel bir TV haber spikerisin. Sana verilen haber ozetlerini kisa, net, resmi ve "
            "konusulabilir bir dilde yeniden yaz. Her haber 40-80 kelime arasinda olmali. Turkce formal "
            "broadcast dilini kullan. Cevrilmis metin hissi verme."
        ),
        "help_text": "Ana sistem talimati -- her zaman dahil edilir, devre disi birakilamaz.",
    },
    {
        "key": "nb.narration_style",
        "title": "Narration Stil Kurallari",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "core",
        "kind": "module_instruction",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Kurallar:\n"
            "- Kisa cumleler kullan, max 15 kelime per cumle\n"
            "- Aktif cumle yapisi tercih et\n"
            "- Teknik jargon kullanma\n"
            "- Resmi ama soguk olmayan ton\n"
            "- Her haberi bagimsiz anlat, onceki habere referans verme\n"
            "- Kapanisi temiz bitir, 'devam edecek' gibi ifadeler kullanma"
        ),
        "help_text": "Narration stil ve dil kurallari.",
    },
    {
        "key": "nb.anti_clickbait",
        "title": "Anti-Clickbait Kurallari",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 20,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.anti_clickbait_enabled"}),
        "content_template": (
            "Yasaklar:\n"
            "- Clickbait basliklar kullanma\n"
            "- 'Inanilmaz', 'sok edici', 'merak edilen' gibi abartili ifadeler yasak\n"
            "- Kaynak adini, muhabir adini, byline bilgisini tekrarlama\n"
            "- 'According to' kaliplarini kullanma\n"
            "- Soru formunda baslik kullanma"
        ),
        "help_text": "Clickbait engelleme kurallari. anti_clickbait_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.normalize",
        "title": "Normalizasyon Blogu",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 30,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.normalize_enabled"}),
        "content_template": (
            "Haber basliklarini ve iceriklerini normalize et:\n"
            "- Tamamen buyuk harf yazilmis basiklari normal hale getir\n"
            "- Gereksiz noktalama isaretlerini temizle\n"
            "- Abartili vurgu kaliplarini duzenle"
        ),
        "help_text": "Baslik/icerik normalizasyon kurallari. normalize_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.humanizer",
        "title": "Humanizer Blogu",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 40,
        "enabled_by_default": False,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.humanize_enabled"}),
        "content_template": (
            "Metni daha insansi ve dogal hale getir:\n"
            "- Mekanik cumle yapilarindan kacin\n"
            "- Dogal gecisler kullan\n"
            "- Dinleyiciye hitap eden ton ekle"
        ),
        "help_text": "Insansi dil zenginlestirme. humanize_enabled ayariyla kontrol edilir. Varsayilan kapali.",
    },
    {
        "key": "nb.tts_enhance",
        "title": "TTS Uyumluluk Blogu",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 50,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "news_bulletin.config.tts_enhance_enabled"}),
        "content_template": (
            "TTS (text-to-speech) uyumluluk kurallari:\n"
            "- Kisaltma kullanma, tam yaz\n"
            "- Rakamlar varsa yazi ile yaz (orn: '3 kisi' yerine 'uc kisi')\n"
            "- Parantez icinde aciklama yapma\n"
            "- Okunabilir, dogal konusma ritmine uygun cumleler kur"
        ),
        "help_text": "TTS uyumluluk talimatlari. tts_enhance_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "nb.category_guidance",
        "title": "Kategori Yonlendirme",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "context",
        "kind": "context_block",
        "order_index": 60,
        "enabled_by_default": True,
        "condition_type": "data_presence",
        "condition_config_json": json.dumps({"data_key": "dominant_category"}),
        "content_template": "Bu bultendeki baskin kategori: {{dominant_category}}. Ton ve terminolojiyi buna gore ayarla.",
        "help_text": "Baskin haber kategorisine gore ton ayarlama. Kategori verisi varsa otomatik eklenir.",
    },
    {
        "key": "nb.selected_news_summary",
        "title": "Secilen Haberler",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "context",
        "kind": "context_block",
        "order_index": 70,
        "enabled_by_default": True,
        "condition_type": "data_presence",
        "condition_config_json": json.dumps({"data_key": "selected_news_items"}),
        "content_template": "{{selected_news_items}}",
        "help_text": "Secilen haber listesi. Haberler secilmisse otomatik eklenir.",
    },
    {
        "key": "nb.output_contract",
        "title": "Cikti Format Sozlesmesi",
        "module_scope": "news_bulletin",
        "step_scope": "script",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "CIKTI FORMATI (JSON):\n"
            '{"items": [{"item_number": 1, "headline": "...", "narration": "...", "duration_seconds": N}], '
            '"transitions": ["..."], "total_duration_seconds": N}\n\n'
            "YALNIZCA gecerli JSON don. Baska aciklama ekleme."
        ),
        "help_text": "JSON cikti format sozlesmesi -- her zaman dahil edilir, devre disi birakilamaz.",
    },
    # ═══════════════════════════════════════════
    # NEWS BULLETIN — METADATA STEP
    # ═══════════════════════════════════════════
    {
        "key": "nb.metadata_system",
        "title": "Metadata System Prompt",
        "module_scope": "news_bulletin",
        "step_scope": "metadata",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen bir YouTube icerik uzmanisin. Verilen haber bulteni icin YouTube metadata uret."
        ),
        "help_text": "Metadata uretimi icin ana sistem talimati.",
    },
    {
        "key": "nb.metadata_title_rules",
        "title": "Metadata Baslik Kurallari",
        "module_scope": "news_bulletin",
        "step_scope": "metadata",
        "group_name": "core",
        "kind": "module_instruction",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Bulten icin YouTube metadata uret:\n"
            "- Baslik: max 60 karakter, bilgilendirici, clickbait degil\n"
            "- Aciklama: 2-3 cumle, bultendeki haberlerin ozeti\n"
            "- Etiketler: 5-10 adet, Turkce, hem genel hem habere ozel\n"
            "- Hashtag: 3-5 adet, #haber #gundem formatinda"
        ),
        "help_text": "YouTube metadata uretim kurallari.",
    },
    {
        "key": "nb.metadata_output_contract",
        "title": "Metadata Cikti Sozlesmesi",
        "module_scope": "news_bulletin",
        "step_scope": "metadata",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "CIKTI FORMATI (JSON):\n"
            '{"title": "...", "description": "...", "tags": ["..."], "hashtags": ["..."], "language": "tr"}\n\n'
            "YALNIZCA gecerli JSON don."
        ),
        "help_text": "Metadata JSON cikti format sozlesmesi.",
    },
    # ═══════════════════════════════════════════
    # STANDARD VIDEO — SCRIPT STEP
    # ═══════════════════════════════════════════
    {
        "key": "sv.script_system",
        "title": "Video Script System Prompt",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen bir video script yazarisin. Verilen konuyu {{duration_seconds}} saniyelik, "
            "sahne sahne bir video senaryosuna donustureceksin. "
            "Her sahne icin: narration (spikerlik metni), visual_cue (gorsel talimat), duration_seconds. "
            "Dil: {{language}}. Ton: dogal, akici, cevrilmis metin hissi verme."
        ),
        "help_text": "Video script uretimi icin ana sistem talimati. Her zaman dahil edilir.",
    },
    {
        "key": "sv.opening_hooks",
        "title": "Acilis Hook Kurallari",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "standard_video.config.opening_hooks_enabled"}),
        "content_template": (
            "Ilk sahne guclu bir hook ile baslamali:\n"
            "- Izleyiciyi ilk 5 saniyede yakalamali\n"
            "- Soru, sasirtici gercek veya ilgi cekici ifade kullan\n"
            "- Dogal bir gecisle konuya gir"
        ),
        "help_text": "Acilis hook kurallari. opening_hooks_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "sv.narrative_arc",
        "title": "Anlatim Arki",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "core",
        "kind": "module_instruction",
        "order_index": 20,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Senaryo yapisi:\n"
            "- Giris: konuyu ve iddiasini kur\n"
            "- Gelisim: ana noktalar, ornekler, kanitlar\n"
            "- Sonuc: ozet ve harekete gecirici mesaj\n"
            "Her sahne onceki sahneden dogal bicimde akmali."
        ),
        "help_text": "Anlatim arki ve sahne yapisina dair kurallar.",
    },
    {
        "key": "sv.humanizer",
        "title": "Humanizer",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 30,
        "enabled_by_default": False,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "standard_video.config.humanize_enabled"}),
        "content_template": (
            "Metni daha insansi ve dogal hale getir:\n"
            "- Mekanik cumle yapilarindan kacin\n"
            "- Dogal gecisler kullan\n"
            "- Izleyiciye dogrudan hitap et"
        ),
        "help_text": "Insansi dil zenginlestirme. humanize_enabled ayariyla kontrol edilir. Varsayilan kapali.",
    },
    {
        "key": "sv.category_guidance",
        "title": "Kategori Yonlendirme",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "context",
        "kind": "context_block",
        "order_index": 40,
        "enabled_by_default": True,
        "condition_type": "data_presence",
        "condition_config_json": json.dumps({"data_key": "category"}),
        "content_template": "Video kategorisi: {{category}}. Ton ve terminolojiyi kategoriye gore ayarla.",
        "help_text": "Kategori varsa otomatik eklenir, ton uyarlamasi saglar.",
    },
    {
        "key": "sv.tts_enhance",
        "title": "TTS Uyumluluk",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 50,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "standard_video.config.tts_enhance_enabled"}),
        "content_template": (
            "TTS (text-to-speech) uyumluluk kurallari:\n"
            "- Kisaltma kullanma, tam yaz\n"
            "- Rakamlar varsa yazi ile yaz\n"
            "- Parantez icinde aciklama yapma\n"
            "- Dogal konusma ritmine uygun cumleler kur"
        ),
        "help_text": "TTS uyumluluk talimatlari. tts_enhance_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "sv.output_contract",
        "title": "Script Cikti Format Sozlesmesi",
        "module_scope": "standard_video",
        "step_scope": "script",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            'CIKTI FORMATI (JSON):\n'
            '{"title": "...", "scenes": [{"scene_number": 1, "narration": "...", "visual_cue": "...", "duration_seconds": 10}], '
            '"total_duration_seconds": 60, "language": "tr"}\n\n'
            "YALNIZCA gecerli JSON don. Baska aciklama ekleme."
        ),
        "help_text": "Script JSON cikti format sozlesmesi. Her zaman dahil edilir, devre disi birakilamaz.",
    },
    # ═══════════════════════════════════════════
    # STANDARD VIDEO — METADATA STEP
    # ═══════════════════════════════════════════
    {
        "key": "sv.metadata_system",
        "title": "Video Metadata System Prompt",
        "module_scope": "standard_video",
        "step_scope": "metadata",
        "group_name": "core",
        "kind": "core_system",
        "order_index": 0,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            "Sen bir YouTube icerik uzmanisin. Verilen video script'i icin YouTube metadata uret."
        ),
        "help_text": "Metadata uretimi icin ana sistem talimati.",
    },
    {
        "key": "sv.metadata_seo_rules",
        "title": "SEO Kurallari",
        "module_scope": "standard_video",
        "step_scope": "metadata",
        "group_name": "behavior",
        "kind": "behavior_block",
        "order_index": 10,
        "enabled_by_default": True,
        "condition_type": "settings_boolean",
        "condition_config_json": json.dumps({"settings_key": "standard_video.config.seo_rules_enabled"}),
        "content_template": (
            "SEO kurallari:\n"
            "- Baslik: max 70 karakter, anahtar kelime icerecek sekilde\n"
            "- Aciklama: 2-3 cumle, ilk cumlede anahtar kelime olsun\n"
            "- Etiketler: 5-15 adet, hem genel hem ozele ozel\n"
            "- Hashtag: 3-5 adet"
        ),
        "help_text": "SEO optimizasyon kurallari. seo_rules_enabled ayariyla kontrol edilir.",
    },
    {
        "key": "sv.metadata_output_contract",
        "title": "Metadata Cikti Sozlesmesi",
        "module_scope": "standard_video",
        "step_scope": "metadata",
        "group_name": "output",
        "kind": "output_contract",
        "order_index": 100,
        "enabled_by_default": True,
        "condition_type": "always",
        "content_template": (
            'CIKTI FORMATI (JSON):\n'
            '{"title": "...", "description": "...", "tags": ["..."], "hashtags": ["..."], "language": "tr"}\n\n'
            "YALNIZCA gecerli JSON don."
        ),
        "help_text": "Metadata JSON cikti format sozlesmesi.",
    },
]


async def seed_prompt_blocks(db: AsyncSession) -> int:
    """Seed all builtin prompt blocks. Idempotent -- skips existing keys.

    Returns:
        Count of newly created blocks.
    """
    created = 0

    for block_def in BUILTIN_BLOCKS:
        key = block_def["key"]
        result = await db.execute(select(PromptBlock).where(PromptBlock.key == key))
        existing = result.scalar_one_or_none()

        if existing is not None:
            continue

        row = PromptBlock(
            key=key,
            title=block_def["title"],
            module_scope=block_def.get("module_scope"),
            step_scope=block_def.get("step_scope"),
            provider_scope=block_def.get("provider_scope"),
            group_name=block_def.get("group_name", "core"),
            kind=block_def["kind"],
            order_index=block_def.get("order_index", 0),
            enabled_by_default=block_def.get("enabled_by_default", True),
            condition_type=block_def.get("condition_type", "always"),
            condition_config_json=block_def.get("condition_config_json"),
            content_template=block_def["content_template"],
            help_text=block_def.get("help_text"),
            visible_in_admin=True,
            status="active",
            source_kind="seeded_system",
        )
        db.add(row)
        created += 1
        logger.debug("PromptBlock seed: new block -- %s", key)

    if created > 0:
        await db.commit()

    logger.info("PromptBlock seed: %d new blocks created", created)
    return created
