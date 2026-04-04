"""
Standard Video Executor'ları (M2-C4)

Script ve Metadata adımları gerçek LLM implementasyonuyla dolduruldu (M2-C3).
TTS ve Visuals adımları gerçek implementasyonla dolduruldu (M2-C4).
Subtitle ve Composition stub olarak kalmaktadır (M2-C5, M2-C6).

Pipeline adım sırası: script → metadata → tts → visuals → subtitle → composition
"""

from __future__ import annotations

import json
import logging
import shutil
import time
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

def _resolve_artifact_path(workspace_root: str, job_id: str, filename: str) -> Path:
    """
    Artifact dosyasının tam Path nesnesini döner.

    workspace_root boşsa geçici dizin kullanır.
    Dosyayı oluşturmaz — yalnızca yolu hesaplar.
    """
    if workspace_root:
        return Path(workspace_root) / "artifacts" / filename
    else:
        import tempfile
        return (
            Path(tempfile.gettempdir())
            / "contenthub_workspace"
            / job_id
            / "artifacts"
            / filename
        )


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
    Ses üretimi (TTS) adımı executor'ı (M2-C4).

    Her sahne için narration metni → EdgeTTS → ses dosyası üretir.
    artifact_check idempotency tipi: audio_manifest.json varsa adımı atlar.

    Ses süresi: karakter sayısı / 15 yaklaşımı (gerçek ölçüm M4'te Whisper ile).
    """

    def __init__(self, tts_provider) -> None:
        """
        Args:
            tts_provider: EdgeTTSProvider (veya test mock'u).
        """
        self._tts = tts_provider

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "tts"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        TTS adımını çalıştırır.

        Adımlar:
          1. artifact_check — audio_manifest.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur, dili çöz.
          3. script.json artifact'ını oku.
          4. Her sahne için narration metni → EdgeTTS → scene_N.mp3 yaz.
          5. audio_manifest.json artifact'ını yaz.
          6. Provider trace ile sonuç dön.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, voice, scene_count, provider trace.

        Raises:
            StepExecutionError: Script artifact eksikse veya TTS hatası oluştuğunda.
        """
        from app.modules.step_context import StepExecutionContext
        from app.providers.tts.voice_map import get_voice
        import app.jobs.workspace as workspace

        # Job input'u oku
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        # Context oluştur — dil ve workspace_root için
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

        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if getattr(job, "workspace_path", None) else ""
        )

        # artifact_check: manifest zaten varsa adımı atla
        manifest_path = _resolve_artifact_path(workspace_root, job.id, "audio_manifest.json")
        if manifest_path.exists():
            logger.info(
                "TTSStepExecutor: audio_manifest.json mevcut, adım atlanıyor. job=%s", job.id
            )
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(manifest_path),
                "language": existing.get("language"),
                "voice": existing.get("voice"),
                "scene_count": len(existing.get("scenes", [])),
                "skipped": True,
                "step": self.step_key(),
            }

        # Script artifact'ını oku
        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"Script artifact bulunamadı: job={job.id}. Script adımı önce tamamlanmış olmalı.",
            )

        scenes: list[dict] = script_data.get("scenes", [])
        if not scenes:
            raise StepExecutionError(
                self.step_key(),
                "Script artifact'ında sahne bulunamadı.",
            )

        voice = get_voice(ctx.language)

        # Ses çıktı dizini hazırla
        audio_dir = _resolve_artifact_path(workspace_root, job.id, "audio").parent / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        total_chars = 0
        total_duration = 0.0
        start_time = time.monotonic()

        for i, scene in enumerate(scenes, start=1):
            narration: str = scene.get("narration", "").strip()
            if not narration:
                # Narration yoksa bu sahneyi boş kaydet
                manifest_scenes.append({
                    "scene_number": i,
                    "audio_path": None,
                    "narration": "",
                    "duration_seconds": 0.0,
                })
                continue

            audio_filename = f"scene_{i}.mp3"
            audio_path = audio_dir / audio_filename
            relative_path = f"artifacts/audio/{audio_filename}"

            try:
                output = await self._tts.invoke({
                    "text": narration,
                    "voice": voice,
                    "output_path": str(audio_path),
                })
            except Exception as err:
                raise StepExecutionError(
                    self.step_key(),
                    f"Sahne {i} için TTS başarısız: {err}",
                )

            duration = output.result.get("duration_seconds", round(len(narration) / 15.0, 2))
            total_chars += len(narration)
            total_duration += duration

            manifest_scenes.append({
                "scene_number": i,
                "audio_path": relative_path,
                "narration": narration,
                "duration_seconds": duration,
            })

        latency_ms = int((time.monotonic() - start_time) * 1000)

        manifest_data = {
            "scenes": manifest_scenes,
            "total_duration_seconds": round(total_duration, 2),
            "voice": voice,
            "language": ctx.language.value,
        }

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="audio_manifest.json",
            data=manifest_data,
        )

        logger.info(
            "TTSStepExecutor: job=%s dil=%s ses=%s sahne=%d toplam_sure=%.1fs artifact=%s",
            job.id,
            ctx.language.value,
            voice,
            len(scenes),
            total_duration,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "voice": voice,
            "scene_count": len(scenes),
            "provider": {
                "provider_id": "edge_tts",
                "voice": voice,
                "language": ctx.language.value,
                "scene_count": len(scenes),
                "total_chars": total_chars,
                "estimated_duration_seconds": round(total_duration, 2),
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }


class VisualsStepExecutor(StepExecutor):
    """
    Görsel toplama adımı executor'ı (M2-C4).

    Her sahne için visual_cue → Pexels araması yapar.
    Pexels boş veya hatalıysa Pixabay'e fallback yapar.
    artifact_check idempotency tipi: visuals_manifest.json varsa adımı atlar.

    Kısmi başarı kabul edilir: bazı sahneler null olabilir.
    Tüm sahneler başarısızsa StepExecutionError fırlatılır.
    """

    def __init__(self, pexels_provider, pixabay_provider) -> None:
        """
        Args:
            pexels_provider : PexelsProvider (veya test mock'u).
            pixabay_provider: PixabayProvider (veya test mock'u).
        """
        self._pexels = pexels_provider
        self._pixabay = pixabay_provider

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "visuals"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Visuals adımını çalıştırır.

        Adımlar:
          1. artifact_check — visuals_manifest.json varsa erken dön.
          2. Job input'undan StepExecutionContext oluştur.
          3. script.json artifact'ından visual_cue alanlarını oku.
          4. Her sahne için Pexels ara → bulamazsa Pixabay fallback.
          5. Görseli scene_N.jpg olarak kaydet.
          6. visuals_manifest.json artifact'ını yaz.
          7. Tüm sahneler başarısızsa StepExecutionError fırlat.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: artifact_path, language, scene_count, provider trace.

        Raises:
            StepExecutionError: Script artifact eksikse veya tüm sahneler başarısızsa.
        """
        from app.modules.step_context import StepExecutionContext

        # Job input'u oku
        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        # Context oluştur
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

        workspace_root = ctx.workspace_root or (
            str(job.workspace_path) if getattr(job, "workspace_path", None) else ""
        )

        # artifact_check: manifest zaten varsa adımı atla
        manifest_path = _resolve_artifact_path(workspace_root, job.id, "visuals_manifest.json")
        if manifest_path.exists():
            logger.info(
                "VisualsStepExecutor: visuals_manifest.json mevcut, adım atlanıyor. job=%s", job.id
            )
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            return {
                "artifact_path": str(manifest_path),
                "language": existing.get("language"),
                "scene_count": len(existing.get("scenes", [])),
                "skipped": True,
                "step": self.step_key(),
            }

        # Script artifact'ını oku
        script_data = _read_artifact(workspace_root, job.id, "script.json")
        if script_data is None:
            raise StepExecutionError(
                self.step_key(),
                f"Script artifact bulunamadı: job={job.id}. Script adımı önce tamamlanmış olmalı.",
            )

        scenes: list[dict] = script_data.get("scenes", [])
        if not scenes:
            raise StepExecutionError(
                self.step_key(),
                "Script artifact'ında sahne bulunamadı.",
            )

        # Görsel çıktı dizini
        visuals_dir = _resolve_artifact_path(workspace_root, job.id, "visuals").parent / "visuals"
        visuals_dir.mkdir(parents=True, exist_ok=True)

        manifest_scenes: list[dict] = []
        pexels_hits = 0
        pixabay_hits = 0
        not_found = 0
        start_time = time.monotonic()

        for i, scene in enumerate(scenes, start=1):
            visual_cue: str = scene.get("visual_cue", "").strip()
            if not visual_cue:
                # visual_cue yoksa bu sahneyi boş kaydet
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": None,
                    "query": "",
                    "source": "no_cue",
                    "photographer": None,
                    "original_url": None,
                })
                not_found += 1
                continue

            image_filename = f"scene_{i}.jpg"
            image_path = visuals_dir / image_filename
            relative_path = f"artifacts/visuals/{image_filename}"

            # Pexels'i önce dene
            found = False
            source = "not_found"
            photographer = None
            original_url = None

            try:
                pexels_output = await self._pexels.invoke({
                    "query": visual_cue,
                    "count": 1,
                    "output_dir": str(visuals_dir),
                })
                pexels_assets: list[dict] = pexels_output.result.get("assets", [])
                if pexels_assets:
                    # Provider kendi dizinine kaydetti, scene_N.jpg olarak yeniden adlandır
                    src_path = Path(pexels_assets[0]["local_path"])
                    if src_path.exists() and src_path != image_path:
                        shutil.move(str(src_path), str(image_path))
                    photographer = pexels_assets[0].get("photographer", "")
                    original_url = pexels_assets[0].get("url", "")
                    source = "pexels"
                    pexels_hits += 1
                    found = True
            except Exception as pexels_err:
                logger.warning(
                    "VisualsStepExecutor: Sahne %d Pexels hatası: %s", i, pexels_err
                )

            # Pexels başarısızsa Pixabay fallback
            if not found:
                try:
                    pixabay_output = await self._pixabay.invoke({
                        "query": visual_cue,
                        "count": 1,
                        "output_dir": str(visuals_dir),
                    })
                    pixabay_assets: list[dict] = pixabay_output.result.get("assets", [])
                    if pixabay_assets:
                        src_path = Path(pixabay_assets[0]["local_path"])
                        if src_path.exists() and src_path != image_path:
                            shutil.move(str(src_path), str(image_path))
                        photographer = pixabay_assets[0].get("author", "")
                        original_url = pixabay_assets[0].get("url", "")
                        source = "pixabay"
                        pixabay_hits += 1
                        found = True
                except Exception as pixabay_err:
                    logger.warning(
                        "VisualsStepExecutor: Sahne %d Pixabay hatası: %s", i, pixabay_err
                    )

            if not found:
                not_found += 1
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": None,
                    "query": visual_cue,
                    "source": "not_found",
                    "photographer": None,
                    "original_url": None,
                })
            else:
                manifest_scenes.append({
                    "scene_number": i,
                    "image_path": relative_path,
                    "query": visual_cue,
                    "source": source,
                    "photographer": photographer,
                    "original_url": original_url,
                })

        latency_ms = int((time.monotonic() - start_time) * 1000)
        total_downloaded = pexels_hits + pixabay_hits

        # Tüm sahneler başarısızsa hata fırlat
        if total_downloaded == 0:
            raise StepExecutionError(
                self.step_key(),
                f"Tüm sahneler için görsel bulunamadı: job={job.id}, "
                f"sahne_sayısı={len(scenes)}",
            )

        manifest_data = {
            "scenes": manifest_scenes,
            "total_downloaded": total_downloaded,
            "language": ctx.language.value,
        }

        artifact_path = _write_artifact(
            workspace_root=workspace_root,
            job_id=job.id,
            filename="visuals_manifest.json",
            data=manifest_data,
        )

        logger.info(
            "VisualsStepExecutor: job=%s dil=%s sahne=%d indirilen=%d (pexels=%d pixabay=%d) "
            "bulunamayan=%d artifact=%s",
            job.id,
            ctx.language.value,
            len(scenes),
            total_downloaded,
            pexels_hits,
            pixabay_hits,
            not_found,
            artifact_path,
        )

        return {
            "artifact_path": artifact_path,
            "language": ctx.language.value,
            "scene_count": len(scenes),
            "provider": {
                "provider_id": "pexels+pixabay_fallback",
                "language": ctx.language.value,
                "scenes_requested": len(scenes),
                "scenes_found": total_downloaded,
                "scenes_not_found": not_found,
                "pexels_hits": pexels_hits,
                "pixabay_hits": pixabay_hits,
                "latency_ms": latency_ms,
            },
            "step": self.step_key(),
        }


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
