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


def _resolve_npx() -> str:
    """
    npx binary'sini sırayla arar:
    1. nvm'deki en yeni Node sürümünün bin/ dizini
    2. Homebrew /opt/homebrew/bin/npx
    3. /usr/local/bin/npx
    4. Sistem PATH'indeki npx (shutil.which)
    Bulunamazsa "npx" döner (FileNotFoundError zaten yakalanıyor).
    """
    import shutil
    import os

    nvm_dir = Path(os.environ.get("NVM_DIR", Path.home() / ".nvm"))
    nvm_versions = nvm_dir / "versions" / "node"
    if nvm_versions.exists():
        candidates = sorted(nvm_versions.iterdir(), key=lambda p: p.name)
        if candidates:
            npx_candidate = candidates[-1] / "bin" / "npx"
            if npx_candidate.exists():
                return str(npx_candidate)

    for p in ["/opt/homebrew/bin/npx", "/usr/local/bin/npx"]:
        if Path(p).exists():
            return p

    found = shutil.which("npx")
    if found:
        return found

    return "npx"


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


def _build_render_props_from_output(output_entry: dict) -> dict:
    """
    render_outputs[] içindeki tek bir output entry'sinden render props oluşturur.

    Her output entry kendi props dict'ini taşır (bulletinTitle, items, subtitlesSrt, vb.).
    word_timing_path → wordTimings dönüşümü burada da uygulanır.

    Returns:
        dict: Renderer'a geçirilecek props dict.
    """
    props = dict(output_entry.get("props", {}))

    # wordTimingPath (camelCase — composition tarafı) → wordTimings inline
    word_timing_path: str | None = props.pop("wordTimingPath", None)
    # Ayrıca snake_case fallback
    if not word_timing_path:
        word_timing_path = props.pop("word_timing_path", None)
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

        Multi-output desteği (M34 — Faz A):
          - composition_props.json içinde render_outputs[] varsa her output için
            ayrı Remotion render çağrısı yapılır.
          - render_outputs[] yoksa veya tek elemanlıysa mevcut combined davranış korunur.

        Adımlar:
          1. composition_props.json'u oku.
          2. render_status kontrol et (props_ready gerekli).
          3. render_outputs[] varsa → multi-output render (_execute_multi_output).
          4. Yoksa → tek output render (geriye uyumluluk).
          5. Tamamlanınca composition_props.json'u rendered olarak güncelle.
          6. Sonuç döndür.

        Args:
            job : Job ORM nesnesi.
            step: JobStep ORM nesnesi.

        Returns:
            dict: output_path(s), composition_id, render_status,
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

        # Multi-output render: render_outputs[] listesi varsa ve >1 ise
        render_outputs: list[dict] = composition_props.get("render_outputs", [])
        if len(render_outputs) > 1:
            return await self._execute_multi_output(
                job, composition_props, composition_id, workspace_root, render_outputs,
            )

        # --- Tek output (combined / standard_video geriye uyumluluk) ---

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

        # M23-C: Degrade durumlarını açıkça kaydet
        degradation_warnings = []
        if timing_mode == "cursor" and word_timings_count == 0:
            degradation_warnings.append(
                "word_timing verisi yok veya okunamadı — cursor modda render edildi"
            )
        if duration_fallback_used:
            degradation_warnings.append(
                f"total_duration_seconds geçersiz — fallback ({_DURATION_FALLBACK_SECONDS}s) kullanıldı"
            )

        if degradation_warnings:
            logger.warning(
                "RenderStepExecutor: degrade uyarıları — job=%s warnings=%s",
                job.id, degradation_warnings,
            )

        return {
            "output_path": str(output_path),
            "composition_id": composition_id,
            "render_status": "rendered",
            "timing_mode": timing_mode,
            "word_timings_count": word_timings_count,
            "duration_fallback_used": duration_fallback_used,
            "degradation_warnings": degradation_warnings,
            "provider": {
                "provider_id": "remotion_cli",
                "composition_id": composition_id,
                "render_status": "rendered",
                "output_path": str(output_path),
                "timing_mode": timing_mode,
                "word_timings_count": word_timings_count,
                "duration_fallback_used": duration_fallback_used,
                "degradation_warnings": degradation_warnings,
                "latency_ms": elapsed_ms,
                "returncode": render_result.get("returncode", 0),
            },
            "step": self.step_key(),
        }

    async def _execute_multi_output(
        self,
        job: Job,
        composition_props: dict,
        composition_id: str,
        workspace_root: str,
        render_outputs: list[dict],
    ) -> dict:
        """
        Multi-output render — render_outputs[] listesindeki her çıktı için
        ayrı Remotion CLI çağrısı yaparak birden fazla video artifact üretir.

        per_category: her kategori için ayrı video
        per_item: her haber için ayrı video

        Her output kendi props'unu taşır (composition executor'den gelir).
        Tüm çıktılar başarılı olmalı — biri fail ederse job fail olur.

        Returns:
            dict: output_paths listesi, her output'un sonucu, provider trace.
        """
        total_outputs = len(render_outputs)
        render_mode = composition_props.get("render_mode", "combined")

        logger.info(
            "RenderStepExecutor: multi-output render başlatılıyor. "
            "job=%s render_mode=%s output_count=%d",
            job.id, render_mode, total_outputs,
        )

        # Idempotency: tüm output dosyaları zaten varsa atla
        all_exist = True
        for entry in render_outputs:
            fname = entry.get("suggested_filename", "output.mp4")
            fpath = _resolve_artifact_path(workspace_root, job.id, fname)
            if not fpath.exists():
                all_exist = False
                break

        if all_exist:
            output_paths = [
                str(_resolve_artifact_path(workspace_root, job.id, e.get("suggested_filename", "output.mp4")))
                for e in render_outputs
            ]
            logger.info(
                "RenderStepExecutor: tüm %d output mevcut, adım atlanıyor. job=%s",
                total_outputs, job.id,
            )
            return {
                "output_paths": output_paths,
                "output_count": total_outputs,
                "render_mode": render_mode,
                "composition_id": composition_id,
                "render_status": "rendered",
                "skipped": True,
                "step": self.step_key(),
            }

        start_time = time.monotonic()
        completed_outputs: list[dict] = []
        all_degradation_warnings: list[str] = []
        _DURATION_FALLBACK_SECONDS = 60.0

        for idx, entry in enumerate(render_outputs):
            output_key = entry.get("output_key", f"output_{idx}")
            suggested_filename = entry.get("suggested_filename", f"output_{idx}.mp4")
            output_path = _resolve_artifact_path(workspace_root, job.id, suggested_filename)

            # Bu output zaten varsa atla (kısmi idempotency)
            if output_path.exists():
                logger.info(
                    "RenderStepExecutor: output %d/%d zaten mevcut, atlanıyor. "
                    "key=%s file=%s job=%s",
                    idx + 1, total_outputs, output_key, suggested_filename, job.id,
                )
                completed_outputs.append({
                    "output_key": output_key,
                    "output_path": str(output_path),
                    "skipped": True,
                })
                continue

            # Output-specific render props oluştur
            render_props = _build_render_props_from_output(entry)

            # Duration fallback
            duration_fallback_used = False
            raw_duration = render_props.get("totalDurationSeconds") or render_props.get("total_duration_seconds")
            if not isinstance(raw_duration, (int, float)) or raw_duration <= 0:
                logger.warning(
                    "RenderStepExecutor: output %d/%d duration geçersiz (değer=%r). "
                    "Fallback=%ss. key=%s job=%s",
                    idx + 1, total_outputs, raw_duration,
                    _DURATION_FALLBACK_SECONDS, output_key, job.id,
                )
                render_props["totalDurationSeconds"] = _DURATION_FALLBACK_SECONDS
                duration_fallback_used = True

            # Output'a özel render_props dosyası yaz
            props_filename = f"render_props_{output_key}.json"
            render_props_path = _resolve_artifact_path(workspace_root, job.id, props_filename)
            render_props_path.parent.mkdir(parents=True, exist_ok=True)
            render_props_path.write_text(
                json.dumps(render_props, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # Render composition_id — output entry'den veya global
            out_composition_id = entry.get("composition_id", composition_id)

            logger.info(
                "RenderStepExecutor: output %d/%d render başlatılıyor. "
                "key=%s file=%s composition_id=%s job=%s",
                idx + 1, total_outputs, output_key, suggested_filename,
                out_composition_id, job.id,
            )

            render_result = await self._run_remotion_render(
                composition_id=out_composition_id,
                props_path=str(render_props_path),
                output_path=str(output_path),
                job_id=job.id,
            )

            if not render_result["success"]:
                # Bir output fail ederse tüm job fail
                composition_props["render_status"] = "failed"
                composition_props["render_error"] = (
                    f"Output {idx + 1}/{total_outputs} ({output_key}) başarısız: "
                    f"{render_result.get('error', 'Bilinmeyen hata')}"
                )
                composition_props["updated_at"] = datetime.now(timezone.utc).isoformat()
                _write_artifact(workspace_root, job.id, "composition_props.json", composition_props)

                raise StepExecutionError(
                    self.step_key(),
                    f"Multi-output render başarısız: output {output_key} — "
                    f"{render_result.get('error', 'Bilinmeyen hata')}",
                )

            if duration_fallback_used:
                all_degradation_warnings.append(
                    f"output {output_key}: duration fallback ({_DURATION_FALLBACK_SECONDS}s) kullanıldı"
                )

            completed_outputs.append({
                "output_key": output_key,
                "output_path": str(output_path),
                "skipped": False,
                "returncode": render_result.get("returncode", 0),
            })

            logger.info(
                "RenderStepExecutor: output %d/%d tamamlandı. key=%s file=%s job=%s",
                idx + 1, total_outputs, output_key, suggested_filename, job.id,
            )

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        # composition_props.json güncelle
        output_paths = [o["output_path"] for o in completed_outputs]
        composition_props["render_status"] = "rendered"
        composition_props["output_paths"] = output_paths
        composition_props["output_count"] = total_outputs
        composition_props["render_mode"] = render_mode
        composition_props["updated_at"] = datetime.now(timezone.utc).isoformat()
        _write_artifact(workspace_root, job.id, "composition_props.json", composition_props)

        logger.info(
            "RenderStepExecutor: multi-output render tamamlandı. "
            "job=%s render_mode=%s output_count=%d elapsed_ms=%d",
            job.id, render_mode, total_outputs, elapsed_ms,
        )

        if all_degradation_warnings:
            logger.warning(
                "RenderStepExecutor: multi-output degrade uyarıları — job=%s warnings=%s",
                job.id, all_degradation_warnings,
            )

        return {
            "output_paths": output_paths,
            "output_count": total_outputs,
            "render_mode": render_mode,
            "completed_outputs": completed_outputs,
            "composition_id": composition_id,
            "render_status": "rendered",
            "degradation_warnings": all_degradation_warnings,
            "provider": {
                "provider_id": "remotion_cli",
                "composition_id": composition_id,
                "render_status": "rendered",
                "render_mode": render_mode,
                "output_count": total_outputs,
                "output_paths": output_paths,
                "degradation_warnings": all_degradation_warnings,
                "latency_ms": elapsed_ms,
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
            _resolve_npx(),
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
