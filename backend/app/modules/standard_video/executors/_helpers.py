"""
Ortak yardımcı fonksiyonlar — tüm executor modülleri tarafından paylaşılır.

Bu modül dışa aktarılmaz; yalnızca executor paketinin iç kullanımına yöneliktir.
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _export_to_output_dir(
    source_path: Path,
    output_dir: str,
    job_id: str,
    suggested_filename: Optional[str] = None,
) -> Optional[str]:
    """
    M40b: Render tamamlandığında final artifact'ı system.output_dir'e kopyalar.

    output_dir boşsa veya source dosyası yoksa no-op (uyarı loglar).
    Kopyalama başarısızlığı render'ı durdurmaz — sadece loglanır.

    Returns:
        Kopyalanan dosyanın yolu (str) veya None.
    """
    if not output_dir or not str(output_dir).strip():
        return None
    if not source_path.exists():
        logger.warning(
            "_export_to_output_dir: kaynak dosya bulunamadı: %s job=%s",
            source_path, job_id,
        )
        return None
    try:
        dest_dir = Path(str(output_dir).strip()).expanduser() / job_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        fname = suggested_filename or source_path.name
        dest_path = dest_dir / fname
        shutil.copy2(str(source_path), str(dest_path))
        logger.info(
            "_export_to_output_dir: %s → %s job=%s",
            source_path.name, dest_path, job_id,
        )
        return str(dest_path)
    except Exception as exc:
        logger.warning(
            "_export_to_output_dir: kopyalama başarısız — %s job=%s",
            exc, job_id,
        )
        return None


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
        lines = stripped.split("\n")
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
        import tempfile
        artifacts_dir = (
            Path(tempfile.gettempdir()) / "contenthub_workspace" / job_id / "artifacts"
        )

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    artifact_file = artifacts_dir / filename
    artifact_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(artifact_file)


def _write_text_artifact(
    workspace_root: str,
    job_id: str,
    filename: str,
    content: str,
) -> str:
    """
    Workspace artifacts dizinine düz metin artifact yazar.

    Returns:
        Yazılan dosyanın string yolu.
    """
    if workspace_root:
        artifacts_dir = Path(workspace_root) / "artifacts"
    else:
        import tempfile
        artifacts_dir = (
            Path(tempfile.gettempdir()) / "contenthub_workspace" / job_id / "artifacts"
        )

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    artifact_file = artifacts_dir / filename
    artifact_file.write_text(content, encoding="utf-8")
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
