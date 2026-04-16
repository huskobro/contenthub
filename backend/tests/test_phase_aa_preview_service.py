"""
PHASE AA — Preview service tests (workspace-aware, deterministik).

service.list_job_artifacts_classified ve service.latest_preview bir job
workspace'i uzerinde calisir. Bu test dosyasi:
  - artifacts/ dizinindeki dosyalarin siniflandirildigini,
  - tmp_*, ., _ prefix'li dosyalarin listelenmedigini,
  - workspace_path > default resolution hiyerarsisini,
  - scope filter davranisini,
  - latest_preview mtime tabanli secimini

dogrular. Fake preview uretmez — dosyalar gercekten tmp_path'te olusturulur.
"""
from __future__ import annotations

import time
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.contracts.enums import ArtifactScope
from app.previews import service as preview_service


def _touch(p: Path, size: int = 0) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    if size <= 0:
        p.write_bytes(b"")
    else:
        p.write_bytes(b"x" * size)


def _make_job_with_workspace(workspace: Path) -> SimpleNamespace:
    """jobs/router ile uyumlu: workspace_path authoritative."""
    return SimpleNamespace(
        id="job-aa-test",
        workspace_path=str(workspace),
        owner_id=None,
    )


# ---------------------------------------------------------------------------
# Empty / missing workspace — honest state
# ---------------------------------------------------------------------------


def test_missing_workspace_returns_empty_listing(tmp_path: Path) -> None:
    missing = tmp_path / "does_not_exist"
    job = _make_job_with_workspace(missing)
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 0
    assert listing.preview_count == 0
    assert listing.final_count == 0
    assert listing.entries == []


def test_empty_artifacts_dir_returns_empty(tmp_path: Path) -> None:
    (tmp_path / "artifacts").mkdir()
    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 0


def test_workspace_without_artifacts_dir_returns_empty(tmp_path: Path) -> None:
    job = _make_job_with_workspace(tmp_path)  # no artifacts/ dir
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 0


# ---------------------------------------------------------------------------
# Basic listing
# ---------------------------------------------------------------------------


def test_preview_and_final_separated_in_counts(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "preview_mini.mp4", size=100)
    _touch(art / "final.mp4", size=2000)
    _touch(art / "script.json", size=50)
    _touch(art / "preview_frame.jpg", size=300)

    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(job)

    assert listing.total == 4
    assert listing.preview_count == 2
    assert listing.final_count == 2

    by_name = {e.name: e for e in listing.entries}
    assert by_name["preview_mini.mp4"].scope == "preview"
    assert by_name["preview_frame.jpg"].scope == "preview"
    assert by_name["final.mp4"].scope == "final"
    assert by_name["script.json"].scope == "final"


def test_entry_includes_size_and_mtime(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "preview_mini.mp4", size=12345)
    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(job)
    assert len(listing.entries) == 1
    e = listing.entries[0]
    assert e.size_bytes == 12345
    assert e.modified_at_epoch is not None
    assert e.path == "artifacts/preview_mini.mp4"
    assert e.type == "mp4"
    assert e.kind == "video_render"


# ---------------------------------------------------------------------------
# Hidden files — tmp_*, dotfiles, partials
# ---------------------------------------------------------------------------


def test_hidden_files_not_listed(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "tmp_script.json", size=10)
    _touch(art / ".DS_Store", size=5)
    _touch(art / "_partial.mp4", size=0)
    _touch(art / "foo.tmp", size=0)
    _touch(art / "foo.part", size=0)
    _touch(art / "preview_mini.mp4", size=100)  # should survive

    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(job)
    names = {e.name for e in listing.entries}
    assert names == {"preview_mini.mp4"}


# ---------------------------------------------------------------------------
# Scope filter
# ---------------------------------------------------------------------------


def test_scope_filter_preview_only(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "preview_mini.mp4")
    _touch(art / "final.mp4")
    _touch(art / "script.json")

    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(
        job, scope_filter=ArtifactScope.PREVIEW
    )
    assert listing.total == 1
    assert listing.preview_count == 1
    assert listing.final_count == 0
    assert listing.entries[0].name == "preview_mini.mp4"


def test_scope_filter_final_only(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "preview_mini.mp4")
    _touch(art / "final.mp4")
    _touch(art / "metadata.json")

    job = _make_job_with_workspace(tmp_path)
    listing = preview_service.list_job_artifacts_classified(
        job, scope_filter=ArtifactScope.FINAL
    )
    assert listing.total == 2
    assert listing.preview_count == 0
    assert listing.final_count == 2
    names = {e.name for e in listing.entries}
    assert names == {"final.mp4", "metadata.json"}


# ---------------------------------------------------------------------------
# latest_preview
# ---------------------------------------------------------------------------


def test_latest_preview_none_when_no_previews(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "final.mp4")
    _touch(art / "script.json")
    job = _make_job_with_workspace(tmp_path)
    assert preview_service.latest_preview(job) is None


def test_latest_preview_picks_most_recent_by_mtime(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    older = art / "preview_frame.jpg"
    newer = art / "preview_mini.mp4"
    _touch(older)
    time.sleep(0.05)
    _touch(newer)
    # mtime'i explicit yazalim — CI filesystem granulaitesine karsi dayaniklilik.
    import os
    os.utime(older, (time.time() - 60, time.time() - 60))
    os.utime(newer, (time.time(), time.time()))

    job = _make_job_with_workspace(tmp_path)
    latest = preview_service.latest_preview(job)
    assert latest is not None
    assert latest.name == "preview_mini.mp4"


def test_latest_preview_ignores_final_files(tmp_path: Path) -> None:
    art = tmp_path / "artifacts"
    _touch(art / "preview_mini.mp4")
    # final.mp4 daha yeni olsa bile latest_preview icin aday olmamali.
    time.sleep(0.05)
    _touch(art / "final.mp4")
    job = _make_job_with_workspace(tmp_path)
    latest = preview_service.latest_preview(job)
    assert latest is not None
    assert latest.scope == "preview"
    assert latest.name == "preview_mini.mp4"


# ---------------------------------------------------------------------------
# Workspace resolution — jobs/router ile bire bir
# ---------------------------------------------------------------------------


def test_workspace_path_takes_precedence_over_default(tmp_path: Path, monkeypatch) -> None:
    """job.workspace_path set ise default workspace root'a bakmaz."""
    # Default root'u farkli bir yere yonlendir; bu dizin BOS kalmali.
    other_root = tmp_path / "default_root"
    other_root.mkdir()
    from app.jobs import workspace as ws
    monkeypatch.setattr(ws, "_workspace_root", other_root)

    real_ws = tmp_path / "real_workspace"
    _touch(real_ws / "artifacts" / "preview_mini.mp4")

    job = SimpleNamespace(
        id="job-x",
        workspace_path=str(real_ws),
        owner_id=None,
    )
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 1
    assert listing.entries[0].name == "preview_mini.mp4"


def test_default_workspace_used_when_workspace_path_blank(tmp_path: Path, monkeypatch) -> None:
    from app.jobs import workspace as ws
    monkeypatch.setattr(ws, "_workspace_root", tmp_path)

    job_id = "job-default-ws"
    _touch(tmp_path / job_id / "artifacts" / "preview_mini.mp4")

    job = SimpleNamespace(
        id=job_id,
        workspace_path=None,
        owner_id=None,
    )
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 1
    assert listing.entries[0].name == "preview_mini.mp4"


def test_blank_string_workspace_path_falls_back_to_default(tmp_path: Path, monkeypatch) -> None:
    from app.jobs import workspace as ws
    monkeypatch.setattr(ws, "_workspace_root", tmp_path)

    job_id = "job-blank-ws"
    _touch(tmp_path / job_id / "artifacts" / "preview_frame.jpg")

    job = SimpleNamespace(
        id=job_id,
        workspace_path="   ",  # blank
        owner_id=None,
    )
    listing = preview_service.list_job_artifacts_classified(job)
    assert listing.total == 1
    assert listing.entries[0].name == "preview_frame.jpg"
