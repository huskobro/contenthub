"""
Job Workspace Manager (Phase M1-C2, M40 multi-user)

Manages per-job directory structure under a configurable workspace root.
Default root: ./workspace relative to this file's package root.

Directory layout (global, pre-M40):
    workspace/{job_id}/artifacts/
    workspace/{job_id}/preview/
    workspace/{job_id}/tmp/

Directory layout (user-scoped, M40):
    workspace/users/{user_slug}/jobs/{job_id}/artifacts/
    workspace/users/{user_slug}/jobs/{job_id}/preview/
    workspace/users/{user_slug}/jobs/{job_id}/tmp/
    workspace/users/{user_slug}/exports/

All functions are pure pathlib — no external dependencies.
"""

import shutil
from pathlib import Path
from typing import Optional

# Default workspace root: two levels up from this file (backend/) + "workspace"
_DEFAULT_WORKSPACE_ROOT = Path(__file__).parent.parent.parent / "workspace"

# Configurable at runtime (set from Settings Registry in a later phase)
_workspace_root: Path = _DEFAULT_WORKSPACE_ROOT


def set_workspace_root(path: Path) -> None:
    """Override the workspace root (used for testing or settings integration)."""
    global _workspace_root
    _workspace_root = Path(path)


def get_workspace_root() -> Path:
    """Return the current workspace root."""
    return _workspace_root


def get_workspace_path(job_id: str) -> Path:
    """Return the workspace root path for a job without creating any directories."""
    return _workspace_root / job_id


def create_job_workspace(job_id: str) -> Path:
    """
    Create the per-job directory structure and return the workspace root path.

    Creates (idempotently):
        workspace/{job_id}/
        workspace/{job_id}/artifacts/
        workspace/{job_id}/preview/
        workspace/{job_id}/tmp/
    """
    root = get_workspace_path(job_id)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)
    (root / "preview").mkdir(parents=True, exist_ok=True)
    (root / "tmp").mkdir(parents=True, exist_ok=True)
    return root


# ---------------------------------------------------------------------------
# User-scoped workspace (M40)
# ---------------------------------------------------------------------------

def get_user_workspace_root(user_slug: str) -> Path:
    """Return the workspace root for a specific user."""
    return _workspace_root / "users" / user_slug


def create_user_workspace(user_slug: str) -> Path:
    """Create user workspace directories and return the user root."""
    root = get_user_workspace_root(user_slug)
    (root / "jobs").mkdir(parents=True, exist_ok=True)
    (root / "exports").mkdir(parents=True, exist_ok=True)
    return root


def get_user_job_workspace_path(user_slug: str, job_id: str) -> Path:
    """Return the job workspace path scoped to a user (no mkdir)."""
    return get_user_workspace_root(user_slug) / "jobs" / job_id


def create_user_job_workspace(user_slug: str, job_id: str) -> Path:
    """Create a user-scoped per-job directory structure."""
    root = get_user_job_workspace_path(user_slug, job_id)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)
    (root / "preview").mkdir(parents=True, exist_ok=True)
    (root / "tmp").mkdir(parents=True, exist_ok=True)
    return root


# ---------------------------------------------------------------------------
# Output dir helpers (M40b)
# ---------------------------------------------------------------------------

def get_user_export_dir(user_slug: str) -> Path:
    """Return the exports directory for a specific user (no mkdir)."""
    return _workspace_root / "users" / user_slug / "exports"


def resolve_output_dir(output_dir_setting: str, user_slug: Optional[str] = None) -> Path:
    """
    M40b: Etkili output dizinini çözer.

    Öncelik: settings değeri → user-scoped default → global default.

    Args:
        output_dir_setting: system.output_dir settings değeri (boş olabilir).
        user_slug: Aktif kullanıcı slug'ı (opsiyonel).

    Returns:
        Resolved output directory Path.
    """
    if output_dir_setting and str(output_dir_setting).strip():
        return Path(str(output_dir_setting).strip()).expanduser()
    if user_slug:
        return get_user_export_dir(user_slug)
    return _workspace_root / "exports"


# ---------------------------------------------------------------------------
# Artifact helpers (global — for backward compat)
# ---------------------------------------------------------------------------

def get_artifact_path(job_id: str, filename: str) -> Path:
    """Return the path for a durable artifact file (does not create the file)."""
    return get_workspace_path(job_id) / "artifacts" / filename


def get_preview_path(job_id: str, filename: str) -> Path:
    """Return the path for a preview artifact file (does not create the file)."""
    return get_workspace_path(job_id) / "preview" / filename


def get_tmp_path(job_id: str, filename: str) -> Path:
    """Return the path for a temporary intermediate file (does not create the file)."""
    return get_workspace_path(job_id) / "tmp" / filename


def cleanup_tmp(job_id: str) -> None:
    """
    Remove all contents of the tmp directory for a job.
    The tmp directory itself is preserved (not deleted).
    No-op if the directory does not exist.
    """
    tmp_dir = get_workspace_path(job_id) / "tmp"
    if not tmp_dir.exists():
        return
    for item in tmp_dir.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()
