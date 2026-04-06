"""
Dil-bilinçli prompt oluşturucu.

Her dil için ayrı talimat bloğu tanımlanmıştır.
'Write in Turkish' gibi tek satır ekleme yeterli değil;
doğal dil üretimi için her dilin kendi talimat bloğu burada merkezi olarak tutulur.
"""

from typing import Optional

from app.modules.language import SupportedLanguage


# Her dil için üretim talimatı bloğu — tek kaynak
LANGUAGE_INSTRUCTIONS: dict[SupportedLanguage, dict] = {
    SupportedLanguage.TR: {
        "locale_name": "Türkçe",
        "script_tone": (
            "Doğal, akıcı Türkçe. Çevrilmiş metin hissi verme. "
            "Cümle yapısı Türkçe dil bilgisine uygun olsun."
        ),
        "metadata_tone": "YouTube için Türkçe optimize edilmiş başlık, açıklama ve etiketler.",
        "tag_style": "Türkçe anahtar kelimeler — hem genel hem içeriğe özgü",
        "hashtag_style": "#türkçe #içerik formatında, Türkçe karakterler kabul edilebilir",
    },
    SupportedLanguage.EN: {
        "locale_name": "English",
        "script_tone": (
            "Natural, flowing English. No translated feel. "
            "Grammar and rhythm native to English."
        ),
        "metadata_tone": "YouTube-optimized English title, description and tags.",
        "tag_style": "English keywords — both general and content-specific",
        "hashtag_style": "#english #content format, standard English hashtags",
    },
}

# Script çıktı formatı — LLM'e gösterilecek JSON şema örneği
_SCRIPT_OUTPUT_EXAMPLE = """{
  "title": "...",
  "scenes": [
    {
      "scene_number": 1,
      "narration": "...",
      "visual_cue": "...",
      "duration_seconds": 10
    }
  ],
  "total_duration_seconds": 60,
  "language": "tr"
}"""

# Metadata çıktı formatı — LLM'e gösterilecek JSON şema örneği
_METADATA_OUTPUT_EXAMPLE = """{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "hashtags": ["#...", "#..."],
  "language": "tr"
}"""


def build_script_prompt(
    topic: str,
    duration_seconds: int,
    language: SupportedLanguage,
    template_tone: Optional[str] = None,
    template_language_rules: Optional[str] = None,
) -> list[dict]:
    """
    Script adımı için LLM mesaj listesi oluşturur.

    Döndürülen liste doğrudan KieAiProvider.invoke({"messages": ...}) çağrısına
    geçirilebilir (OpenAI format).

    Args:
        topic           : Video konusu.
        duration_seconds: Hedef video süresi (saniye).
        language        : Üretim dili.
        template_tone   : Template content_rules'tan gelen ton bilgisi (opsiyonel).
        template_language_rules: Template content_rules'tan gelen dil kuralları (opsiyonel).

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]
    tone = lang_config["script_tone"]

    # Template tone varsa, varsayılan tone'a ek stil yönlendirmesi ekle
    tone_guidance = ""
    if template_tone:
        tone_guidance = f"\nŞablon ton yönlendirmesi: {template_tone}"
    if template_language_rules:
        tone_guidance += f"\nEk dil kuralları: {template_language_rules}"

    system_content = (
        f"Sen bir video script yazarısın. "
        f"{locale} dilinde, {duration_seconds} saniyelik kısa bir video için "
        f"sahne sahne senaryo üreteceksin.\n\n"
        f"Dil ve ton kuralları: {tone}{tone_guidance}\n\n"
        f"ÇIKTI FORMATI: Yalnızca geçerli JSON döndür, başka hiçbir şey ekleme. "
        f"Format:\n{_SCRIPT_OUTPUT_EXAMPLE}"
    )

    user_content = (
        f"Konu: {topic}\n"
        f"Hedef süre: {duration_seconds} saniye\n"
        f"Dil: {locale}\n\n"
        f"Bu konu için video senaryosu üret. "
        f"Sahneler toplamda yaklaşık {duration_seconds} saniye olmalı. "
        f"language alanına '{language.value}' yaz."
    )

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


def build_metadata_prompt(
    script: dict,
    language: SupportedLanguage,
    template_tone: Optional[str] = None,
    template_seo_keywords: Optional[list] = None,
) -> list[dict]:
    """
    Metadata adımı için LLM mesaj listesi oluşturur.

    Script artifact dict'ini alır, platform için optimize edilmiş metadata üretir.

    Args:
        script  : Script adımından gelen artifact dict (title, scenes içerir).
        language: Üretim dili.
        template_tone: Template content_rules'tan gelen ton bilgisi (opsiyonel).
        template_seo_keywords: Template publish_profile'dan gelen SEO anahtar kelimeleri (opsiyonel).

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]
    metadata_tone = lang_config["metadata_tone"]
    tag_style = lang_config["tag_style"]
    hashtag_style = lang_config["hashtag_style"]

    # Template tone varsa, metadata tone'a ek yönlendirme ekle
    extra_guidance = ""
    if template_tone:
        extra_guidance += f"\nŞablon metadata tonu: {template_tone}"
    if template_seo_keywords and isinstance(template_seo_keywords, list):
        keywords_str = ", ".join(str(k) for k in template_seo_keywords)
        extra_guidance += f"\nSEO anahtar kelimeleri (etiketlere dahil et): {keywords_str}"

    # Sahnelerden narration metnini özetle (LLM context'i için)
    scenes = script.get("scenes", [])
    narration_summary = " ".join(
        s.get("narration", "")[:200] for s in scenes[:3]
    )
    script_title = script.get("title", "")

    system_content = (
        f"Sen bir YouTube içerik uzmanısın. "
        f"Verilen script'ten platform için optimize edilmiş metadata üreteceksin.\n\n"
        f"Dil: {locale}\n"
        f"Metadata tonu: {metadata_tone}\n"
        f"Etiket stili: {tag_style}\n"
        f"Hashtag stili: {hashtag_style}{extra_guidance}\n\n"
        f"ÇIKTI FORMATI: Yalnızca geçerli JSON döndür, başka hiçbir şey ekleme. "
        f"Format:\n{_METADATA_OUTPUT_EXAMPLE}"
    )

    user_content = (
        f"Script başlığı: {script_title}\n"
        f"Script özeti (ilk sahnelerden): {narration_summary}\n"
        f"Dil: {locale}\n\n"
        f"Bu script için YouTube metadata üret. "
        f"language alanına '{language.value}' yaz."
    )

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


# ---------------------------------------------------------------------------
# News Bulletin prompts (M28)
# ---------------------------------------------------------------------------

# Bulletin script çıktı formatı — LLM'e gösterilecek JSON şema örneği
_BULLETIN_SCRIPT_OUTPUT_EXAMPLE = """{
  "items": [
    {
      "item_number": 1,
      "headline": "...",
      "narration": "...",
      "duration_seconds": 15
    }
  ],
  "transitions": ["..."],
  "total_duration_seconds": 120,
  "language": "tr"
}"""

# Bulletin metadata çıktı formatı
_BULLETIN_METADATA_OUTPUT_EXAMPLE = """{
  "title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "hashtags": ["#...", "#..."],
  "language": "tr"
}"""


def build_bulletin_script_prompt(
    items: list[dict],
    language: SupportedLanguage,
    narration_system_prompt: str,
    narration_style_rules: str,
    anti_clickbait_rules: str,
    word_limit_per_item: int = 80,
    target_duration_seconds: int = 120,
    tone: str = "formal",
) -> list[dict]:
    """
    Bulletin script adımı için LLM mesaj listesi oluşturur.

    Seçilmiş haber öğelerini spiker tarzında narration metinlerine dönüştürür.
    Admin-managed prompt'lar (settings snapshot'tan) parametre olarak alınır.

    Args:
        items             : Seçilmiş haber listesi (headline, summary, edited_narration).
        language          : Üretim dili.
        narration_system_prompt: Admin-managed system prompt (settings snapshot).
        narration_style_rules  : Admin-managed stil kuralları (settings snapshot).
        anti_clickbait_rules   : Admin-managed anti-clickbait kuralları (settings snapshot).
        word_limit_per_item    : Haber başına max kelime.
        target_duration_seconds: Hedef toplam süre.
        tone                   : Anlatım tonu.

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]

    # Admin-managed prompt'ları birleştir
    system_parts = [narration_system_prompt]
    if narration_style_rules:
        system_parts.append(narration_style_rules)
    if anti_clickbait_rules:
        system_parts.append(anti_clickbait_rules)

    # TEKNIK GUARD — admin tarafından değiştirilemez
    system_parts.append(
        f"ÇIKTI FORMATI: Yanıtını SADECE JSON formatında ver. Başka metin ekleme. "
        f"Format:\n{_BULLETIN_SCRIPT_OUTPUT_EXAMPLE}"
    )

    system_content = "\n\n".join(system_parts)

    # Haber listesini user mesajına yaz
    items_text_parts = []
    for item in items:
        item_num = item.get("item_number", 0)
        headline = item.get("headline", "")
        summary = item.get("summary", "")
        edited = item.get("edited_narration")

        if edited:
            # Düzenlenmiş narration varsa — LLM'e koruma talimatı
            items_text_parts.append(
                f"Haber {item_num}: {headline}\n"
                f"  [DÜZENLENMIŞ NARRATION — AYNEN KORU]: {edited}"
            )
        else:
            items_text_parts.append(
                f"Haber {item_num}: {headline}\n"
                f"  Özet: {summary}"
            )

    items_text = "\n\n".join(items_text_parts)

    user_content = (
        f"Aşağıdaki haberleri spiker tarzında narration metinlerine dönüştür.\n\n"
        f"Dil: {locale}\n"
        f"Ton: {tone}\n"
        f"Hedef toplam süre: {target_duration_seconds} saniye\n"
        f"Haber başına max kelime: {word_limit_per_item}\n\n"
        f"Haberler:\n{items_text}\n\n"
        f"[DÜZENLENMIŞ NARRATION] işaretli haberlerin narration metnini olduğu gibi koru, "
        f"sadece geçiş cümleleri ekle. Diğer haberler için özetten narration üret.\n"
        f"language alanına '{language.value}' yaz."
    )

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


def build_bulletin_metadata_prompt(
    script_data: dict,
    language: SupportedLanguage,
    metadata_title_rules: str,
) -> list[dict]:
    """
    Bulletin metadata adımı için LLM mesaj listesi oluşturur.

    Args:
        script_data         : Bulletin script artifact dict (items listesi içerir).
        language            : Üretim dili.
        metadata_title_rules: Admin-managed metadata kuralları (settings snapshot).

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]
    metadata_tone = lang_config["metadata_tone"]
    tag_style = lang_config["tag_style"]
    hashtag_style = lang_config["hashtag_style"]

    system_parts = [metadata_title_rules]

    # TEKNIK GUARD — admin tarafından değiştirilemez
    system_parts.append(
        f"\nDil: {locale}\n"
        f"Metadata tonu: {metadata_tone}\n"
        f"Etiket stili: {tag_style}\n"
        f"Hashtag stili: {hashtag_style}\n\n"
        f"ÇIKTI FORMATI: Yanıtını SADECE JSON formatında ver. Başka metin ekleme. "
        f"Format:\n{_BULLETIN_METADATA_OUTPUT_EXAMPLE}"
    )

    system_content = "\n\n".join(system_parts)

    # Script'ten narration özetini hazırla
    items = script_data.get("items", [])
    narration_summary = " ".join(
        item.get("narration", "")[:150] for item in items[:5]
    )

    user_content = (
        f"Haber bülteni ({len(items)} haber) için YouTube metadata üret.\n\n"
        f"Bülten narration özeti: {narration_summary}\n"
        f"Dil: {locale}\n\n"
        f"language alanına '{language.value}' yaz."
    )

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]
