"""
Standard Video Executor'ları (M2-C3)

Script ve Metadata adımları gerçek LLM implementasyonuyla dolduruldu.
Diğer adımlar (tts, visuals, subtitle, composition) stub olarak kalmaktadır.

Pipeline adım sırası: script → metadata → tts → visuals → subtitle → composition
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

logger = logging.getLogger(__name__)


class ScriptStepExecutor(StepExecutor):
    """
    Senaryo adımı executor'ı.

    Konu → StepExecutionContext → LLM prompt → KieAiProvider → script.json artifact.
    """

    def __init__(self, llm_provider) -> None:
        """
        Args:
            llm_provider: BaseProvider instance (KieAiProvider veya mock).
        """
        self._llm = llm_provider

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "script"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Script adımını çalıştırır.

        Adımlar:
          1. Job input_data_json'dan ham input okunur.
          2. StepExecutionContext oluşturulur — dil resolve edilir.
          3. build_script_prompt ile LLM mesajları hazırlanır.
          4. KieAiProvider.invoke() çağrılır.
          5. Yanıt JSON parse edilir.
          6. workspace/artifacts/script.json dosyasına yazılır.
          7. Provider trace ile birlikte sonuç döner.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, scene_count, provider trace.

        Raises:
            StepExecutionError: Herhangi bir adımda hata oluştuğunda.
        """
        from app.modules.step_context import StepExecutionContext
        from app.modules.prompt_builder import build_script_prompt
        from app.providers.base import ProviderOutput

        # Job input_data_json'u oku
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        if not raw_input.get("topic"):
            raise StepExecutionError(
                self.step_key(),
                "Job input_data_json içinde 'topic' alanı eksik veya boş.",
            )

        # StepExecutionContext oluştur
        try:
            ctx = StepExecutionContext.from_job_input(
                job_id=job.id,
                module_id="standard_video",
                raw_input=raw_input,
            )
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"StepExecutionContext oluşturulamadı: {err}",
            )

        # LLM prompt oluştur
        messages = build_script_prompt(
            topic=ctx.topic,
            duration_seconds=ctx.duration_seconds,
            language=ctx.language,
        )

        # LLM çağrısı
        try:
            output: ProviderOutput = await self._llm.invoke({"messages": messages})
        except Exception as err:
            raise StepExecutionError(self.step_key(), f"LLM çağrısı başarısız: {err}")

        raw_content: str = output.result.get("content", "")

        # JSON parse et — markdown code block varsa soy
        cleaned = _strip_markdown_json(raw_content)
        try:
            script_data: dict = json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise StepExecutionError(
                self.step_key(),
                f"LLM yanıtı geçerli JSON değil: {err}. "
                f"Ham yanıt (ilk 300 karakter): {raw_content[:300]}",
            )

        # language alanını doğrula / ekle
        script_data["language"] = ctx.language.value

        # Workspace artifact yolu
        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if job.workspace_path else ""
        )
        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="script.json",
            data=script_data,
        )

        scene_count = len(script_data.get("scenes", []))
        logger.info(
            "ScriptStepExecutor: job=%s dil=%s sahne=%d artifact=%s",
            job.id,
            ctx.language.value,
            scene_count,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": scene_count,
            "provider": output.trace,
            "step": self.step_key(),
        }


class MetadataStepExecutor(StepExecutor):
    """
    Metadata adımı executor'ı.

    Script artifact → LLM prompt → KieAiProvider → metadata.json artifact.
    """

    def __init__(self, llm_provider) -> None:
        """
        Args:
            llm_provider: BaseProvider instance (KieAiProvider veya mock).
        """
        self._llm = llm_provider

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "metadata"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Metadata adımını çalıştırır.

        Adımlar:
          1. Job input_data_json'dan dil resolve edilir.
          2. workspace/artifacts/script.json okunur.
          3. build_metadata_prompt ile LLM mesajları hazırlanır.
          4. KieAiProvider.invoke() çağrılır.
          5. Yanıt JSON parse edilir.
          6. workspace/artifacts/metadata.json dosyasına yazılır.
          7. Provider trace ile birlikte sonuç döner.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, provider trace.

        Raises:
            StepExecutionError: Script artifact eksikse veya LLM hatası oluştuğunda.
        """
        from app.modules.step_context import StepExecutionContext
        from app.modules.prompt_builder import build_metadata_prompt
        from app.providers.base import ProviderOutput

        # Job input_data_json'u oku
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        # StepExecutionContext — dil ve workspace için
        try:
            ctx = StepExecutionContext.from_job_input(
                job_id=job.id,
                module_id="standard_video",
                raw_input=raw_input,
            )
        except Exception as err:
            raise StepExecutionError(
                self.step_key(),
                f"StepExecutionContext oluşturulamadı: {err}",
            )

        # Script artifact'ını oku
        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if job.workspace_path else ""
        )
        script_data = _read_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="script.json",
        )
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"Script artifact bulunamadı: job={job.id}. "
                "Script adımı önce tamamlanmış olmalı.",
            )

        # LLM prompt oluştur
        messages = build_metadata_prompt(
            script=script_data,
            language=ctx.language,
        )

        # LLM çağrısı
        try:
            output: ProviderOutput = await self._llm.invoke({"messages": messages})
        except Exception as err:
            raise StepExecutionError(self.step_key(), f"LLM çağrısı başarısız: {err}")

        raw_content: str = output.result.get("content", "")

        # JSON parse et
        cleaned = _strip_markdown_json(raw_content)
        try:
            metadata_data: dict = json.loads(cleaned)
        except json.JSONDecodeError as err:
            raise StepExecutionError(
                self.step_key(),
                f"LLM yanıtı geçerli JSON değil: {err}. "
                f"Ham yanıt (ilk 300 karakter): {raw_content[:300]}",
            )

        # language alanını doğrula / ekle
        metadata_data["language"] = ctx.language.value

        # Artifact yaz
        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="metadata.json",
            data=metadata_data,
        )

        logger.info(
            "MetadataStepExecutor: job=%s dil=%s artifact=%s",
            job.id,
            ctx.language.value,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "provider": output.trace,
            "step": self.step_key(),
        }


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _strip_markdown_json(content: str) -> str:
    """
    LLM yanıtından markdown code block işaretlerini kaldırır.

    ```json ... ``` veya ``` ... ``` formatını temizler.
    Temiz JSON zaten geliyorsa değiştirmez.
    """
    stripped = content.strip()
    if stripped.startswith("```"):
        # İlk satırı at (```json veya ```)
        lines = stripped.split("\n")
        # Son ``` satırını da çıkar
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        return "\n".join(lines).strip()
    return stripped


def _write_artifact(
    workspace_root: str,
    job_id: str,
    filename: str,
    data: dict,
) -> str:
    """
    Workspace artifacts dizinine JSON artifact yazar.

    workspace_root boşsa geçici dizin kullanır.
    Dizin yoksa oluşturur.

    Returns:
        Yazılan dosyanın string yolu.
    """
    if workspace_root:
        artifacts_dir = Path(workspace_root) / "artifacts"
    else:
        # workspace_root tanımsızsa in-memory benzeri geçici dizin
        import tempfile
        artifacts_dir = Path(tempfile.gettempdir()) / "contenthub_workspace" / job_id / "artifacts"

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    artifact_file = artifacts_dir / filename
    artifact_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(artifact_file)


def _read_artifact(
    workspace_root: str,
    job_id: str,
    filename: str,
) -> Optional[dict]:
    """
    Workspace artifacts dizininden JSON artifact okur.

    Dosya yoksa None döner.
    """
    if workspace_root:
        artifact_file = Path(workspace_root) / "artifacts" / filename
    else:
        import tempfile
        artifact_file = (
            Path(tempfile.gettempdir()) / "contenthub_workspace" / job_id / "artifacts" / filename
        )

    if not artifact_file.exists():
        return None

    try:
        return json.loads(artifact_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as err:
        logger.error("Artifact okunamadı %s: %s", artifact_file, err)
        return None


# ---------------------------------------------------------------------------
# Stub executor'lar — M2-C4+ ile doldurulacak
# ---------------------------------------------------------------------------

class TTSStepExecutor(StepExecutor):
    """
    Ses üretimi (TTS) adımı stub executor'ı.

    Gerçek davranış (M2-C4): Anlatım segmentleri → TTS provider aracılığıyla
    ses dosyaları. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "tts"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek ses üretmez.
        M2-C4'te TTS provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class VisualsStepExecutor(StepExecutor):
    """
    Görsel toplama adımı stub executor'ı.

    Gerçek davranış (M2-C4): Görsel ipuçları → görsel provider aracılığıyla
    medya indirme. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "visuals"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek görsel indirme yapmaz.
        M2-C4'te görsel provider çağrısıyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class SubtitleStepExecutor(StepExecutor):
    """
    Altyazı adımı stub executor'ı.

    Gerçek davranış (M2-C5): Ses dosyası → Whisper aracılığıyla
    SRT / kelime düzeyinde hizalama verisi.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "subtitle"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek altyazı üretmez.
        M2-C5'te Whisper entegrasyonuyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}


class CompositionStepExecutor(StepExecutor):
    """
    Kompozisyon (render) adımı stub executor'ı.

    Gerçek davranış (M2-C6): Tüm üretilen varlıklar → Remotion üzerinden
    video render. artifact_check idempotency tipi geçerlidir.
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "composition"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Stub implementasyon — gerçek video render etmez.
        M2-C6'da Remotion entegrasyonuyla değiştirilecek.
        """
        return {"status": "stub", "step": self.step_key()}
