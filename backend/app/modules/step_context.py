"""
Step çalışma bağlamı — pipeline'ın her adımına taşınan resmi context nesnesi.

Job input'undan türetilir, adım boyunca değişmez (frozen dataclass).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.language import SupportedLanguage, DEFAULT_LANGUAGE


@dataclass(frozen=True)
class StepExecutionContext:
    """
    Bir pipeline adımının çalışma bağlamı.

    Alanlar:
        job_id          : İlgili job'un ID'si.
        module_id       : İçerik modülünün kimliği (örn. 'standard_video').
        language        : Resolve edilmiş dil enum değeri.
        topic           : Video konusu — senaryo üretiminin ana girdisi.
        duration_seconds: Hedef video süresi (saniye).
        workspace_root  : Job workspace kök dizini.
    """

    job_id: str
    module_id: str
    language: SupportedLanguage
    topic: str
    duration_seconds: int
    workspace_root: str

    @classmethod
    def from_job_input(
        cls,
        job_id: str,
        module_id: str,
        raw_input: dict,
    ) -> "StepExecutionContext":
        """
        Job input dict'inden StepExecutionContext oluşturur.

        Dili resolve eder — geçersiz dil kodu → UnsupportedLanguageError.
        'topic' alanı zorunludur; yoksa KeyError fırlatılır.

        Args:
            job_id    : Job ID.
            module_id : Modül kimliği.
            raw_input : Job input sözlüğü (topic, language, duration_seconds, vb.).

        Returns:
            Dondurulmuş StepExecutionContext örneği.
        """
        from app.modules.language import resolve_language

        return cls(
            job_id=job_id,
            module_id=module_id,
            language=resolve_language(raw_input.get("language")),
            topic=raw_input["topic"],
            duration_seconds=int(raw_input.get("duration_seconds", 60)),
            workspace_root=raw_input.get("workspace_root", ""),
        )
