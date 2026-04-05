"""
Render adımı executor'ı (RenderStepExecutor) — M6-C3.

composition_props.json'u okur, word_timing.json'u yükler ve
Remotion CLI'ı subprocess olarak çağırarak gerçek video render işlemini gerçekleştirir.

--------------------------------------------------------------------
Artifact rolleri (M6-C3 resmi sınır):

  composition_props.json — KANONİK SÖZLEŞME
    - backend/app/modules/standard_video/executors/composition.py üretir
    - render_status="props_ready" → "rendered" geçişi bu dosyada izlenir
    - word_timing_path ham referans olarak burada yaşar
    - Bu dosya hiçbir zaman render_props.json'un içeriğiyle değiştirilmez
    - Denetim izi, iş durumu ve pipeline input bu dosyadan okunur

  render_props.json — RUNTIME SNAPSHOT (Remotion'a özel)
    - render.py execute() tarafından, her render öncesi üretilir
    - composition_props.json → props alanı + M6-C2 dönüşümleri:
        word_timing_path → wordTimings (inline array)
    - Remotion --props argümanı bu dosyayı gösterir
    - Bu dosya geçici operasyonel snapshot'tır; hiçbir zaman
      composition_props.json yerine kaynakça kullanılmaz
    - Üzerine yazılabilir, silinebilir — canonical değil

Bu iki dosya arasındaki sınır bir kural değil, bir mimari garantidir.
--------------------------------------------------------------------

duration fallback davranışı (M6-C3):
  Authoritative kaynak: composition_props.json → props.total_duration_seconds
  Üretici: CompositionStepExecutor (composition.py)
  Eksik/sıfır: fallback = 60.0 saniye, WARNING log ile açıkça bildirilir
  Bozuk (negatif): fallback = 60.0 saniye, WARNING log
  "Sessiz fallback yok" kuralı: her fallback durumu loglanır ve
  sonuç dict'inde "duration_fallback_used: true" olarak işaretlenir.
  Preview duration: composition_props.json'a bağlı değil — PreviewFrame sabit 1 kare.

word_timing yükleme mimarisi (M6-C2):
  Renderer saf React bileşenleridir — fs okuma yapmaz.
  Backend (bu executor) word_timing_path'ı okur ve WordTiming[] array'ini
  render_props.json içine inline yazarak Remotion'a geçirir.
  Renderer StandardVideoComposition wordTimings prop'unu doğrudan kullanır.

Remotion CLI çağrısı:
  npx remotion render <giriş_noktası> <composition_id> <çıktı_yolu>
  --props '<render_props.json yolu>'

Subprocess güvenliği:
  Shell injection'a karşı: argümanlar liste olarak geçirilir, shell=False.
  Zaman aşımı: RENDER_TIMEOUT_SECONDS (varsayılan 600 saniye).
  stdout/stderr: loglanır.

render_status geçişleri:
  props_ready  → rendered (subprocess başarıyla tamamlandığında)
  props_ready  → failed   (subprocess hata verdiğinde)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.db.models import Job, JobStep
from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError

from ._helpers import (
    _resolve_artifact_path,
    _read_artifact,
    _write_artifact,
)

logger = logging.getLogger(__name__)

# Render subprocess zaman aşımı (saniye).
RENDER_TIMEOUT_SECONDS: int = 600

# renderer/ dizini — bu dosyaya göre göreli yol.
# backend/app/modules/standard_video/executors/render.py → ContentHub/ → renderer/
_BACKEND_DIR = Path(__file__).resolve().parents[5]  # → ContentHub/
_RENDERER_DIR = _BACKEND_DIR / "renderer"


def _load_word_timings(word_timing_path: str | None) -> list[dict]:
    """
    word_timing_path dosyasından WordTiming listesini yükler.

    word_timing_path None veya dosya yoksa boş liste döner.
    Dosya bozuksa (JSON parse hatası) boş liste döner ve loglanır.
    Renderer cursor (degrade) modda devam eder.

    Returns:
        list[dict]: WordTiming dict listesi — Renderer'a inline geçirilir.
    """
    if not word_timing_path:
        return []

    path = Path(word_timing_path)
    if not path.exists():
        logger.warning(
            "RenderStepExecutor: word_timing_path bulunamadı, cursor mod devrede. "
            "path=%s",
            word_timing_path,
        )
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        words = data.get("words", [])
        logger.info(
            "RenderStepExecutor: word_timing yüklendi. kelime_sayısı=%d timing_mode=%s",
            len(words),
            data.get("timing_mode", "?"),
        )
        return words
    except (json.JSONDecodeError, OSError) as err:
        logger.error(
            "RenderStepExecutor: word_timing_path okunamadı, cursor mod devrede. "
            "path=%s err=%s",
            word_timing_path,
            err,
        )
        return []


def _build_render_props(composition_props: dict) -> dict:
    """
    composition_props.json → props alanından Remotion'a geçirilecek render_props oluşturur.

    M6-C2 dönüşümleri:
      - word_timing_path string prop'u kaldırılır.
      - wordTimings: WordTiming[] inline olarak eklenir.

    Bu fonksiyon composition.py çıktısını değiştirmez — sadece render katmanında dönüştürür.
    Sözleşme uyumu: composition_props.json her zaman word_timing_path içerebilir (eski formatlar).

    Returns:
        dict: Renderer'a geçirilecek props dict.
    """
    props = dict(composition_props.get("props", {}))

    # word_timing_path'ı yükle ve inline wordTimings'e dönüştür
    word_timing_path: str | None = props.pop("word_timing_path", None)
    word_timings = _load_word_timings(word_timing_path)
    props["wordTimings"] = word_timings

    return props


class RenderStepExecutor(StepExecutor):
    """
    Render adımı executor'ı — M6-C2.

    composition_props.json (render_status=props_ready) olmalı.
    word_timing_path okunur, wordTimings inline eklenir.
    Remotion CLI subprocess olarak çağrılır.
    Çıktı: output.mp4 (artifacts/ altında).
    """

    # Template Context Decision (M14):
    #   NON-CONSUMER — intentional.
    #   Composition props already incorporate blueprint data via
    #   CompositionStepExecutor. This executor receives the fully-merged
    #   composition_props.json and passes it to Remotion subprocess.
    #   Adding template context here would duplicate what composition already did.

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "render"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        Render adımını çalıştırır.

        Adımlar:
          1. composition_props.json'u oku.
          2. render_status kontrol et (props_ready gerekli).
          3. output.mp4 zaten varsa idempotent dön.
          4. word_timing_path'ı yükle → wordTimings oluştur.
          5. render_props.json'u yaz (Remotion'a geçirilecek props).
          6. Remotion subprocess'i başlat.
          7. Tamamlanınca composition_props.json'u rendered olarak güncelle.
          8. Sonuç döndür.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: output_path, composition_id, render_status,
                  timing_mode, word_timings_count, provider trace.

        Raises:
            StepExecutionError: Zorunlu artifact eksikse veya render başarısız olursa.
        """
        from app.modules.step_context import StepExecutionContext

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

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

        # composition_props.json oku
        composition_props = _read_artifact(workspace_root, job.id, "composition_props.json")
        if composition_props is None:
            raise StepExecutionError(
                self.step_key(),
                f"composition_props.json bulunamadı: job={job.id}. "
                "Composition adımı önce tamamlanmış olmalı.",
            )

        render_status = composition_props.get("render_status")
        if render_status != "props_ready":
            raise StepExecutionError(
                self.step_key(),
                f"Render adımı props_ready gerektiriyor. Mevcut durum: '{render_status}'.",
            )

        composition_id: str = composition_props.get("composition_id", "")
        if not composition_id:
            raise StepExecutionError(
                self.step_key(),
                "composition_id eksik veya boş: composition_props.json bozuk.",
            )

        # Çıktı yolu — idempotency
        output_path = _resolve_artifact_path(workspace_root, job.id, "output.mp4")
        if output_path.exists():
            logger.info(
                "RenderStepExecutor: output.mp4 mevcut, adım atlanıyor. job=%s", job.id
            )
            return {
                "output_path": str(output_path),
                "composition_id": composition_id,
                "render_status": "rendered",
                "skipped": True,
                "step": self.step_key(),
            }

        # word_timing_path → wordTimings dönüşümü + render_props oluştur
        render_props = _build_render_props(composition_props)
        timing_mode = render_props.get("timing_mode", "cursor")
        word_timings_count = len(render_props.get("wordTimings", []))

        # Duration fallback kontrolü — sessiz fallback yok (M6-C3 kuralı).
        # Authoritative kaynak: composition_props.json → props.total_duration_seconds
        # Üretici: CompositionStepExecutor
        duration_fallback_used = False
        raw_duration = render_props.get("total_duration_seconds")
        _DURATION_FALLBACK_SECONDS = 60.0
        if not isinstance(raw_duration, (int, float)) or raw_duration <= 0:
            logger.warning(
                "RenderStepExecutor: total_duration_seconds geçersiz veya eksik "
                "(değer=%r). Fallback=%ss kullanılıyor. job=%s "
                "Bu durum CompositionStepExecutor çıktısında bir soruna işaret edebilir.",
                raw_duration,
                _DURATION_FALLBACK_SECONDS,
                job.id,
            )
            render_props["total_duration_seconds"] = _DURATION_FALLBACK_SECONDS
            duration_fallback_used = True

        logger.info(
            "RenderStepExecutor: render başlatılıyor. job=%s composition_id=%s "
            "timing_mode=%s word_timings_count=%d total_duration_seconds=%.1f "
            "duration_fallback_used=%s",
            job.id,
            composition_id,
            timing_mode,
            word_timings_count,
            render_props.get("total_duration_seconds", 0.0),
            duration_fallback_used,
        )

        # render_props.json'u artifacts/ altına yaz — Remotion'a --props ile geçirilir
        render_props_path = _resolve_artifact_path(workspace_root, job.id, "render_props.json")
        render_props_path.parent.mkdir(parents=True, exist_ok=True)
        render_props_path.write_text(
            json.dumps(render_props, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        start_time = time.monotonic()

        # Remotion render subprocess
        render_result = await self._run_remotion_render(
            composition_id=composition_id,
            props_path=str(render_props_path),
            output_path=str(output_path),
            job_id=job.id,
        )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        if not render_result["success"]:
            # composition_props.json'u failed olarak güncelle
            composition_props["render_status"] = "failed"
            composition_props["render_error"] = render_result.get("error", "Bilinmeyen hata")
            composition_props["updated_at"] = datetime.now(timezone.utc).isoformat()
            _write_artifact(workspace_root, job.id, "composition_props.json", composition_props)

            raise StepExecutionError(
                self.step_key(),
                f"Remotion render başarısız: {render_result.get('error', 'Bilinmeyen hata')}",
            )

        # composition_props.json'u rendered olarak güncelle
        composition_props["render_status"] = "rendered"
        composition_props["output_path"] = str(output_path)
        composition_props["timing_mode_used"] = timing_mode
        composition_props["word_timings_count"] = word_timings_count
        composition_props["duration_fallback_used"] = duration_fallback_used
        composition_props["updated_at"] = datetime.now(timezone.utc).isoformat()
        _write_artifact(workspace_root, job.id, "composition_props.json", composition_props)

        logger.info(
            "RenderStepExecutor: render tamamlandı. job=%s composition_id=%s "
            "output=%s elapsed_ms=%d timing_mode=%s word_timings=%d "
            "duration_fallback_used=%s",
            job.id,
            composition_id,
            output_path,
            elapsed_ms,
            timing_mode,
            word_timings_count,
            duration_fallback_used,
        )

        return {
            "output_path": str(output_path),
            "composition_id": composition_id,
            "render_status": "rendered",
            "timing_mode": timing_mode,
            "word_timings_count": word_timings_count,
            "duration_fallback_used": duration_fallback_used,
            "provider": {
                "provider_id": "remotion_cli",
                "composition_id": composition_id,
                "render_status": "rendered",
                "output_path": str(output_path),
                "timing_mode": timing_mode,
                "word_timings_count": word_timings_count,
                "duration_fallback_used": duration_fallback_used,
                "latency_ms": elapsed_ms,
                "returncode": render_result.get("returncode", 0),
            },
            "step": self.step_key(),
        }

    async def _run_remotion_render(
        self,
        composition_id: str,
        props_path: str,
        output_path: str,
        job_id: str,
    ) -> dict:
        """
        Remotion CLI subprocess'i çalıştırır.

        Güvenlik:
          - args listesi olarak geçirilir, shell=False (injection riski yok).
          - composition_id güvenli mapping'den gelir (composition_map.py).
          - output_path absolute path, renderer/ dışında job workspace'e yazılır.

        Returns:
            dict: success, returncode, stdout, stderr, error
        """
        renderer_dir = _RENDERER_DIR
        if not renderer_dir.exists():
            return {
                "success": False,
                "error": f"renderer/ dizini bulunamadı: {renderer_dir}",
            }

        node_modules = renderer_dir / "node_modules"
        if not node_modules.exists():
            return {
                "success": False,
                "error": (
                    f"renderer/node_modules yok. "
                    f"'npm install' çalıştırılmadı: {renderer_dir}"
                ),
            }

        # Remotion CLI args — shell injection'a karşı liste kullanılır
        args = [
            "npx",
            "remotion",
            "render",
            "src/Root.tsx",
            composition_id,
            output_path,
            "--props",
            props_path,
            "--log",
            "info",
        ]

        logger.info(
            "RenderStepExecutor: subprocess başlatılıyor. job=%s composition_id=%s",
            job_id,
            composition_id,
        )

        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                cwd=str(renderer_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=RENDER_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "success": False,
                    "error": (
                        f"Render zaman aşımı ({RENDER_TIMEOUT_SECONDS}s). "
                        f"job={job_id} composition_id={composition_id}"
                    ),
                }

            stdout_text = stdout.decode("utf-8", errors="replace") if stdout else ""
            stderr_text = stderr.decode("utf-8", errors="replace") if stderr else ""

            if proc.returncode != 0:
                logger.error(
                    "RenderStepExecutor: subprocess başarısız. job=%s returncode=%d\n"
                    "STDOUT: %s\nSTDERR: %s",
                    job_id,
                    proc.returncode,
                    stdout_text[:2000],
                    stderr_text[:2000],
                )
                return {
                    "success": False,
                    "returncode": proc.returncode,
                    "stdout": stdout_text,
                    "stderr": stderr_text,
                    "error": f"npx remotion render hata kodu {proc.returncode}. "
                             f"Detay: {stderr_text[:500]}",
                }

            logger.info(
                "RenderStepExecutor: subprocess başarılı. job=%s returncode=0",
                job_id,
            )
            return {
                "success": True,
                "returncode": 0,
                "stdout": stdout_text,
                "stderr": stderr_text,
            }

        except FileNotFoundError:
            return {
                "success": False,
                "error": (
                    "npx komutu bulunamadı. Node.js kurulu ve PATH'te olmalı. "
                    f"job={job_id}"
                ),
            }
        except OSError as err:
            return {
                "success": False,
                "error": f"Subprocess OS hatası: {err}. job={job_id}",
            }
