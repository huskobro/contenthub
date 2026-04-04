"""
Job Workspace Manager (Phase M1-C2)

Manages per-job directory structure under a configurable workspace root.
Default root: ./workspace relative to this file's package root.

Directory layout per job:
    workspace/{job_id}/artifacts/   — final durable artifacts
    workspace/{job_id}/preview/     — preview artifacts
    workspace/{job_id}/tmp/         — disposable intermediates (safe to delete)

All functions are pure pathlib — no external dependencies.
"""

import shutil
from pathlib import Path

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
