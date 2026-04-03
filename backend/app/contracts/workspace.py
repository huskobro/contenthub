"""
Execution Contract — Workspace Layout (Phase 1.1)

Defines the canonical directory structure for job workspaces.
Every subsystem that reads or writes job artifacts MUST derive paths
through WorkspaceLayout — never by constructing paths ad-hoc.

Directory contract:

    {workspace_root}/{job_id}/
        final/      — DURABLE final outputs (source of truth for publish/review)
        preview/    — DURABLE preview artifacts (selection UI; never publish source)
        tmp/        — TEMP intermediate files (safe to delete; not source of truth)
        logs/       — DURABLE step log files
        execution/  — DURABLE deterministic helper scripts/configs if needed

Rules:
  - workspace_root is read from Settings Registry key 'execution.workspace_root'
    at executor startup (Phase 1.3+). A default fallback is defined below.
  - tmp/ contents are safe to delete at any time.
  - final/ and preview/ contents must not be deleted without explicit admin action.
  - execution/ is for deterministic, reproducible helper files (e.g. Remotion
    render configs). Not for raw intermediate data.
  - Do NOT write directly to {workspace_root}/{job_id}/ root — always use a subdir.
  - Module-specific subdirs within final/ are allowed:
    e.g. final/audio/, final/subtitles/, final/video/ for clarity.
    But the top-level structure above is fixed.

Cross-module compatibility:
  - Standard Video and News Bulletin use the same WorkspaceLayout.
  - Module identity is encoded in the Job record (module_type), not in the path.
  - Future modules (product_review, educational_video, etc.) use the same layout.

Settings integration notes:
  - execution.workspace_root : base path for all job workspaces
    Default: {project_root}/workspace
  - execution.temp_cleanup_on_complete : if True, executor purges tmp/ on job success
  - execution.artifact_retention_days : cleanup policy for old job workspaces
  These settings are future Settings Registry keys; they are NOT implemented here.

Visibility:
  - WorkspaceLayout paths are [admin-visible].
  - Users see artifact display names, not raw file paths, unless a VisibilityRule
    grants path visibility.
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


# Default workspace root — relative to the backend directory.
# The executor (Phase 1.3) will override this from Settings Registry.
_DEFAULT_WORKSPACE_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "workspace"
)


class WorkspaceLayout(BaseModel):
    """
    Derives canonical workspace paths for a specific job.

    Usage:
        layout = WorkspaceLayout.for_job(job_id="abc-123")
        audio_path = layout.final_dir / "audio" / "narration.mp3"
        tmp_clip = layout.tmp_dir / "raw_clip.mp4"

    All paths are derived from workspace_root + job_id.
    No filesystem operations are performed here — this is a pure path contract.
    The executor is responsible for calling layout.ensure_dirs() before writing.
    """

    model_config = ConfigDict(from_attributes=True)

    job_id: str = Field(..., description="The job ID this layout belongs to.")
    workspace_root: str = Field(
        default=_DEFAULT_WORKSPACE_ROOT,
        description=(
            "Base path for all job workspaces. "
            "Should be read from Settings Registry at executor startup."
        )
    )

    @classmethod
    def for_job(cls, job_id: str, workspace_root: Optional[str] = None) -> "WorkspaceLayout":
        """Factory method — preferred way to create a WorkspaceLayout."""
        return cls(
            job_id=job_id,
            workspace_root=workspace_root or _DEFAULT_WORKSPACE_ROOT,
        )

    @property
    def job_dir(self) -> Path:
        """Root directory for this job: {workspace_root}/{job_id}/"""
        return Path(self.workspace_root) / self.job_id

    @property
    def final_dir(self) -> Path:
        """
        Durable final outputs.
        Source of truth for publish adapters and review gates.
        Contents: video renders, final audio, final subtitles, metadata JSON, thumbnail.
        """
        return self.job_dir / "final"

    @property
    def preview_dir(self) -> Path:
        """
        Durable preview artifacts.
        Used for style selection UI and draft review — NEVER as publish source.
        Contents: preview renders, style card images, subtitle overlay samples.
        """
        return self.job_dir / "preview"

    @property
    def tmp_dir(self) -> Path:
        """
        Temporary intermediate files.
        Safe to delete at any time. MUST NOT be treated as source of truth.
        Contents: raw downloaded stock clips, intermediate audio segments,
        partial render chunks, unmerged subtitle timing files.
        """
        return self.job_dir / "tmp"

    @property
    def logs_dir(self) -> Path:
        """
        Durable step log files.
        Contents: per-step .log files captured during execution.
        """
        return self.job_dir / "logs"

    @property
    def execution_dir(self) -> Path:
        """
        Deterministic helper scripts/configs.
        Contents: Remotion render config JSON, deterministic shell scripts.
        NOT for raw data or intermediate binary files.
        """
        return self.job_dir / "execution"

    def all_dirs(self) -> list:
        """Return all subdirectory paths that should be created for this job."""
        return [
            self.final_dir,
            self.preview_dir,
            self.tmp_dir,
            self.logs_dir,
            self.execution_dir,
        ]

    def ensure_dirs(self) -> None:
        """
        Create all workspace subdirectories if they do not exist.

        Called by the executor when a job transitions to RUNNING.
        Safe to call multiple times (parents=True, exist_ok=True).
        """
        for directory in self.all_dirs():
            directory.mkdir(parents=True, exist_ok=True)

    def artifact_path(self, subdir: str, filename: str) -> Path:
        """
        Convenience helper for constructing a path within a named subdir.

        Args:
            subdir   : one of 'final', 'preview', 'tmp', 'logs', 'execution'
            filename : the filename (may include a sub-subdir prefix)

        Returns:
            Full Path object for the artifact.

        Example:
            layout.artifact_path("final", "audio/narration.mp3")
        """
        subdir_map = {
            "final": self.final_dir,
            "preview": self.preview_dir,
            "tmp": self.tmp_dir,
            "logs": self.logs_dir,
            "execution": self.execution_dir,
        }
        if subdir not in subdir_map:
            raise ValueError(
                f"WorkspaceLayout.artifact_path: unknown subdir '{subdir}'. "
                f"Valid: {list(subdir_map.keys())}"
            )
        return subdir_map[subdir] / filename


