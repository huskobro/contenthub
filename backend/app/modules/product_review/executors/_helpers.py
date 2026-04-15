"""
Product Review executor yardimcilari (Faz B).

news_bulletin/executors/_helpers.py pattern'inin product_review versiyonu —
artifact read/write ayni mantik. Parallel pattern yasagina uymak icin
shared modul yerine modul-local tutuyoruz (her modul bagimsiz).
"""

from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _artifact_dir(workspace_root: str, job_id: str) -> Path:
    if workspace_root:
        return Path(workspace_root) / "artifacts"
    return (
        Path(tempfile.gettempdir())
        / "contenthub_workspace"
        / job_id
        / "artifacts"
    )


def _write_artifact(workspace_root: str, job_id: str, filename: str, data: dict) -> str:
    d = _artifact_dir(workspace_root, job_id)
    d.mkdir(parents=True, exist_ok=True)
    path = d / filename
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path)


def _read_artifact(workspace_root: str, job_id: str, filename: str) -> Optional[dict]:
    d = _artifact_dir(workspace_root, job_id)
    path = d / filename
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "product_review _read_artifact basarisiz %s: %s",
            path,
            exc,
        )
        return None
