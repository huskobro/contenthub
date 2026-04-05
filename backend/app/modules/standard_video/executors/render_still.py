"""
renderStill executor'ı (RenderStillExecutor) — M6-C3.

Tek kare JPEG önizleme üretir — "PreviewFrame" composition kullanılır.
Final render'dan TAMAMEN AYRI bir yol — composition ID, çıktı formatı ve amaç farklı.

Preview scope ayrımı (değişmez):
  M4-C3 CSS preview → frontend stil kartları (browser CSS, metin tabanlı)
  M6-C2 renderStill  → Remotion single frame (JPEG, pixel output)
  Bu iki yüzey birbirinin yerini almaz.

Render sözleşmesi:
  Giriş  : subtitle_style + sample_text + scene_number + image_path (opsiyonel)
  Çıktı  : workspace/{job_id}/artifacts/preview_frame.jpg
  Durum  : composition_props.json güncellenmez — bağımsız preview akışı

composition ID kaynağı (M6-C3):
  PREVIEW_COMPOSITION_ID artık bu dosyada string sabit olarak tanımlanmaz.
  composition_map.get_preview_composition_id("standard_video_preview") → "PreviewFrame".
  Bu, Root.tsx kayıt tablosu ile backend'in tek noktada senkron kalmasını sağlar.
  Modül seviyesinde import edilen sabit (PREVIEW_COMPOSITION_ID), map'ten türetilir.

Subprocess güvenliği:
  shell=False, args liste olarak geçirilir.
  Zaman aşımı: RENDER_STILL_TIMEOUT_SECONDS (varsayılan 120 saniye).
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional

from app.jobs.executor import StepExecutor
from app.jobs.exceptions import StepExecutionError
from app.db.models import Job, JobStep
from app.modules.standard_video.composition_map import get_preview_composition_id

from ._helpers import _resolve_artifact_path

logger = logging.getLogger(__name__)

# renderStill subprocess zaman aşımı (saniye).
RENDER_STILL_TIMEOUT_SECONDS: int = 120

# renderer/ dizini
_BACKEND_DIR = Path(__file__).resolve().parents[5]
_RENDERER_DIR = _BACKEND_DIR / "renderer"

# Preview composition ID — composition_map.py üzerinden türetilir.
# String sabit bu dosyada tanımlanmaz; tek otorite composition_map.py.
PREVIEW_COMPOSITION_ID: str = get_preview_composition_id("standard_video_preview")


class RenderStillExecutor(StepExecutor):
    """
    renderStill executor'ı — M6-C2.

    step_key = "render_still"
    PreviewFrame composition ile tek kare JPEG üretir.
    Final render (RenderStepExecutor) ile sözleşme çakışmaz:
      - Farklı composition ID (PreviewFrame)
      - Farklı çıktı dosyası (preview_frame.jpg)
      - composition_props.json güncellenmez
    """

    def step_key(self) -> str:
        """Bu executor'ın sorumlu olduğu adım anahtarı."""
        return "render_still"

    async def execute(self, job: Job, step: JobStep) -> dict:
        """
        renderStill adımını çalıştırır.

        Adımlar:
          1. Job input'tan preview parametrelerini al.
          2. preview_frame.jpg zaten varsa idempotent dön.
          3. preview_props.json'u yaz.
          4. Remotion renderStill subprocess'i başlat.
          5. Sonuç döndür.

        Job input'tan beklenen alanlar (opsiyonel):
          preview_scene_number  : int, default 1
          preview_image_path    : str | null
          preview_sample_text   : str, default "Önizleme"
          subtitle_style_preset : str, default "clean_white"

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: preview_path, composition_id, step

        Raises:
            StepExecutionError: Parametreler geçersizse veya render başarısız olursa.
        """
        from app.modules.standard_video.subtitle_presets import get_preset_for_composition

        raw_input_str = getattr(job, "input_data_json", None) or "{}"
        try:
            raw_input: dict = json.loads(raw_input_str)
        except (json.JSONDecodeError, TypeError) as err:
            raise StepExecutionError(
                self.step_key(),
                f"Job input_data_json geçersiz JSON: {err}",
            )

        workspace_root: str = raw_input.get("workspace_root", "") or (
            str(job.workspace_path) if getattr(job, "workspace_path", None) else ""
        )

        # Çıktı yolu — idempotency
        preview_path = _resolve_artifact_path(workspace_root, job.id, "preview_frame.jpg")
        if preview_path.exists():
            logger.info(
                "RenderStillExecutor: preview_frame.jpg mevcut, adım atlanıyor. job=%s",
                job.id,
            )
            return {
                "preview_path": str(preview_path),
                "composition_id": PREVIEW_COMPOSITION_ID,
                "skipped": True,
                "step": self.step_key(),
            }

        # Preview parametrelerini oluştur
        subtitle_style_preset_id: str | None = raw_input.get("subtitle_style_preset")
        subtitle_style = get_preset_for_composition(subtitle_style_preset_id)

        preview_props = {
            "scene_number": raw_input.get("preview_scene_number", 1),
            "image_path": raw_input.get("preview_image_path", None),
            "subtitle_style": subtitle_style,
            "sample_text": raw_input.get("preview_sample_text", "Önizleme"),
        }

        # preview_props.json'u artifacts/ altına yaz
        preview_props_path = _resolve_artifact_path(
            workspace_root, job.id, "preview_props.json"
        )
        preview_props_path.parent.mkdir(parents=True, exist_ok=True)
        preview_props_path.write_text(
            json.dumps(preview_props, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        start_time = time.monotonic()

        render_result = await self._run_remotion_still(
            props_path=str(preview_props_path),
            output_path=str(preview_path),
            job_id=job.id,
        )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        if not render_result["success"]:
            raise StepExecutionError(
                self.step_key(),
                f"renderStill başarısız: {render_result.get('error', 'Bilinmeyen hata')}",
            )

        logger.info(
            "RenderStillExecutor: preview tamamlandı. job=%s output=%s elapsed_ms=%d",
            job.id,
            preview_path,
            elapsed_ms,
        )

        return {
            "preview_path": str(preview_path),
            "composition_id": PREVIEW_COMPOSITION_ID,
            "provider": {
                "provider_id": "remotion_still",
                "composition_id": PREVIEW_COMPOSITION_ID,
                "output_path": str(preview_path),
                "latency_ms": elapsed_ms,
                "returncode": render_result.get("returncode", 0),
            },
            "step": self.step_key(),
        }

    async def _resolve_timeout(self) -> int:
        """
        Resolve render still timeout from settings registry.

        Oncelik: DB admin_value -> DB default_value -> .env -> builtin -> constant.
        Hata durumunda modul-seviyesi RENDER_STILL_TIMEOUT_SECONDS sabiti kullanilir.
        """
        try:
            from app.db.session import AsyncSessionLocal
            from app.settings.settings_resolver import resolve

            async with AsyncSessionLocal() as db:
                value = await resolve("execution.render_still_timeout_seconds", db)
                if value is not None:
                    return int(value)
        except Exception as exc:
            logger.warning(
                "RenderStillExecutor: timeout ayari cozumlenemedi, "
                "varsayilan kullaniliyor (%d): %s",
                RENDER_STILL_TIMEOUT_SECONDS,
                exc,
            )
        return RENDER_STILL_TIMEOUT_SECONDS

    async def _run_remotion_still(
        self,
        props_path: str,
        output_path: str,
        job_id: str,
    ) -> dict:
        """
        Remotion renderStill subprocess'i çalıştırır.

        Güvenlik:
          - args listesi, shell=False.
          - frame=0 — tek kare.

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

        args = [
            "npx",
            "remotion",
            "still",
            "src/Root.tsx",
            PREVIEW_COMPOSITION_ID,
            output_path,
            "--props",
            props_path,
            "--frame",
            "0",
            "--log",
            "info",
        ]

        # Resolve timeout from settings registry (fallback: module constant)
        timeout_seconds = await self._resolve_timeout()

        logger.info(
            "RenderStillExecutor: subprocess başlatılıyor. job=%s timeout=%ds",
            job_id, timeout_seconds,
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
                    timeout=timeout_seconds,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "success": False,
                    "error": (
                        f"renderStill zaman aşımı ({timeout_seconds}s). "
                        f"job={job_id}"
                    ),
                }

            stdout_text = stdout.decode("utf-8", errors="replace") if stdout else ""
            stderr_text = stderr.decode("utf-8", errors="replace") if stderr else ""

            if proc.returncode != 0:
                logger.error(
                    "RenderStillExecutor: subprocess başarısız. job=%s returncode=%d\n"
                    "STDOUT: %s\nSTDERR: %s",
                    job_id,
                    proc.returncode,
                    stdout_text[:2000],
                    stderr_text[:2000],
                )
                return {
                    "success": False,
                    "returncode": proc.returncode,
                    "error": f"npx remotion still hata kodu {proc.returncode}. "
                             f"Detay: {stderr_text[:500]}",
                }

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
