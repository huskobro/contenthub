"""
Dil-bilinçli prompt oluşturucu.

Her dil için ayrı talimat bloğu tanımlanmıştır.
'Write in Turkish' gibi tek satır ekleme yeterli değil;
doğal dil üretimi için her dilin kendi talimat bloğu burada merkezi olarak tutulur.
"""

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
) -> list[dict]:
    """
    Script adımı için LLM mesaj listesi oluşturur.

    Döndürülen liste doğrudan KieAiProvider.invoke({"messages": ...}) çağrısına
    geçirilebilir (OpenAI format).

    Args:
        topic           : Video konusu.
        duration_seconds: Hedef video süresi (saniye).
        language        : Üretim dili.

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]
    tone = lang_config["script_tone"]

    system_content = (
        f"Sen bir video script yazarısın. "
        f"{locale} dilinde, {duration_seconds} saniyelik kısa bir video için "
        f"sahne sahne senaryo üreteceksin.\n\n"
        f"Dil ve ton kuralları: {tone}\n\n"
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
) -> list[dict]:
    """
    Metadata adımı için LLM mesaj listesi oluşturur.

    Script artifact dict'ini alır, platform için optimize edilmiş metadata üretir.

    Args:
        script  : Script adımından gelen artifact dict (title, scenes içerir).
        language: Üretim dili.

    Returns:
        [{"role": "system", ...}, {"role": "user", ...}] formatında mesaj listesi.
    """
    lang_config = LANGUAGE_INSTRUCTIONS[language]
    locale = lang_config["locale_name"]
    metadata_tone = lang_config["metadata_tone"]
    tag_style = lang_config["tag_style"]
    hashtag_style = lang_config["hashtag_style"]

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
        f"Hashtag stili: {hashtag_style}\n\n"
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
