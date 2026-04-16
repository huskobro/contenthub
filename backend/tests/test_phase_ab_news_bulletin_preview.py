"""
PHASE AB — news_bulletin real preview pack tests.

Kapsam:
  A. Classifier coverage (news_bulletin preview keys)
  B. _write_preview_artifact helper unit tests
  C. BulletinScriptExecutor preview writes (integration, LLM mocked)
  D. BulletinMetadataExecutor preview write (integration, LLM mocked)
  E. Existing /api/v1/jobs/{id}/previews endpoint surfaces news_bulletin previews

Kurallar:
  - preview_news_selected.json yalniz selected_items non-empty oldugunda yazilir
    (guard onceden fail eder, dolayisiyla yalniz happy-path).
  - preview_script.json yalniz final bulletin_script.json yazildiktan SONRA.
  - preview_metadata.json yalniz final metadata.json yazildiktan SONRA.
  - Honest state: placeholder / fake preview YOK.
  - Preview yazim hatasi ASLA step'i durdurmaz (best-effort).

Design:
  Patterns mirror backend/tests/modules/news_bulletin/test_composition_executor.py
  (job/step mock + tempdir workspace) ve backend/tests/test_phase_aa_preview_router.py
  (router test for /previews endpoint).
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.enums import ArtifactKind, ArtifactScope
from app.db.models import Job, User
from app.jobs.exceptions import StepExecutionError
from app.modules.news_bulletin.executors._helpers import _write_preview_artifact
from app.modules.news_bulletin.executors.metadata import BulletinMetadataExecutor
from app.modules.news_bulletin.executors.script import BulletinScriptExecutor
from app.previews.classifier import classify_filename
from app.providers.base import ProviderOutput


# ===========================================================================
# Shared test helpers
# ===========================================================================


def _make_job(
    input_data: dict,
    workspace_root: str = "",
    job_id: str = "phase-ab-job-001",
) -> MagicMock:
    """Mock Job — mirrors test_composition_executor.py pattern."""
    job = MagicMock()
    job.id = job_id
    merged = dict(input_data)
    merged.setdefault("workspace_root", workspace_root)
    job.input_data_json = json.dumps(merged, ensure_ascii=False)
    job.workspace_path = workspace_root or None
    return job


def _make_step(step_id: str = "phase-ab-step-001") -> MagicMock:
    step = MagicMock()
    step.id = step_id
    return step


def _make_registry() -> MagicMock:
    """Minimal ProviderRegistry stand-in (executors never touch real providers)."""
    return MagicMock()


def _make_provider_output(payload_dict: dict) -> ProviderOutput:
    """Build a ProviderOutput whose .result['content'] is JSON of payload_dict."""
    return ProviderOutput(
        result={"content": json.dumps(payload_dict, ensure_ascii=False)},
        trace={
            "provider_id": "mock_llm",
            "model": "mock-model",
            "input_tokens": 10,
            "output_tokens": 20,
            "latency_ms": 1,
            "resolution_role": "primary",
        },
        provider_id="mock_llm",
    )


def _minimal_script_settings_snapshot() -> dict:
    """Settings snapshot with non-empty narration_system so fallback path can run."""
    return {
        "news_bulletin.prompt.narration_system": "SPIKER: Haberleri ciddi tonda oku.",
        "news_bulletin.prompt.narration_style_rules": "Ton: resmi.",
        "news_bulletin.prompt.anti_clickbait_rules": "Clickbait YOK.",
        "news_bulletin.config.narration_word_limit_per_item": 80,
        "news_bulletin.config.default_tone": "formal",
        "news_bulletin.config.default_language": "tr",
        "news_bulletin.config.default_duration_seconds": 120,
    }


def _minimal_metadata_settings_snapshot() -> dict:
    return {
        "news_bulletin.prompt.metadata_title_rules": (
            "BASLIK: 100 karakter ici, sansasyonel olmayan."
        ),
        "news_bulletin.config.default_language": "tr",
    }


def _sample_selected_items() -> list[dict]:
    return [
        {
            "headline": "Ekonomi gundemi",
            "summary": "Merkez bankasi karari bekleniyor, piyasalar tedbirli.",
            "category": "ekonomi",
            "source_name": "ExampleHaber",
            "source_id": "src-01",
            "published_at": "2026-04-16T10:00:00+00:00",
            "url": "https://example.test/ekonomi-1",
            "edited_narration": None,
            "image_url": None,
            "image_urls": [],
        },
        {
            "headline": "Spor manseti",
            "summary": "Derbi oncesi son gelismeler.",
            "category": "spor",
            "source_name": "ExampleSpor",
            "source_id": "src-02",
            "published_at": "2026-04-16T11:00:00+00:00",
            "url": "https://example.test/spor-1",
            "edited_narration": "Editor tarafindan yazilan narration.",
            "image_url": None,
            "image_urls": [],
        },
    ]


def _sample_script_output(bulletin_id: str = "b-ab-001") -> dict:
    return {
        "title": "16 Nisan Bulteni",
        "bulletin_title": "16 Nisan Bulteni",
        "items": [
            {
                "item_number": 1,
                "headline": "Ekonomi gundemi",
                "narration": "Merkez bankasi karari bekleniyor.",
                "duration_seconds": 60,
                "category": "ekonomi",
            },
            {
                "item_number": 2,
                "headline": "Spor manseti",
                "narration": "Derbi oncesi son gelismeler.",
                "duration_seconds": 60,
                "category": "spor",
            },
        ],
        "language": "tr",
        "bulletin_id": bulletin_id,
    }


def _sample_metadata_output() -> dict:
    return {
        "title": "Gunun Haber Bulteni — 16 Nisan",
        "description": (
            "16 Nisan bulteninde ekonomi ve spor gundeminden ozetler. "
            "Merkez bankasi ve derbi gelismeleri."
        ),
        "tags": ["haber", "bulten", "ekonomi", "spor"],
        "category": "haber",
    }


# ===========================================================================
# A. Classifier coverage for news_bulletin preview filenames
# ===========================================================================


class TestClassifierCoverage:
    def test_classify_preview_news_selected_json(self) -> None:
        c = classify_filename("preview_news_selected.json")
        assert c.scope == ArtifactScope.PREVIEW
        assert c.kind == ArtifactKind.METADATA
        assert c.source_step == "news_selected"
        assert c.label == "Selected items preview"

    def test_classify_preview_script_json(self) -> None:
        c = classify_filename("preview_script.json")
        assert c.scope == ArtifactScope.PREVIEW
        assert c.kind == ArtifactKind.METADATA
        assert c.source_step == "script"
        assert c.label == "Script preview"

    def test_classify_preview_metadata_json(self) -> None:
        c = classify_filename("preview_metadata.json")
        assert c.scope == ArtifactScope.PREVIEW
        assert c.kind == ArtifactKind.METADATA
        assert c.source_step == "metadata"
        assert c.label == "Metadata preview"

    def test_preview_news_keys_never_final_scope(self) -> None:
        """Honest invariant: the three news_bulletin preview keys
        may never be classified as FINAL."""
        for name in (
            "preview_news_selected.json",
            "preview_script.json",
            "preview_metadata.json",
        ):
            c = classify_filename(name)
            assert c.scope != ArtifactScope.FINAL, (
                f"{name} leaked into FINAL scope — contract broken"
            )
            assert c.scope == ArtifactScope.PREVIEW


# ===========================================================================
# B. _write_preview_artifact unit tests
# ===========================================================================


class TestWritePreviewArtifactHelper:
    def test_write_preview_artifact_injects_generated_at(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _write_preview_artifact(
                workspace_root=tmpdir,
                job_id="job-1",
                filename="preview_script.json",
                data={"step": "script", "value": 42},
            )
            assert path is not None
            written = json.loads(Path(path).read_text(encoding="utf-8"))
            assert "generated_at" in written
            # ISO-8601-ish with timezone
            assert isinstance(written["generated_at"], str)
            assert "T" in written["generated_at"]
            # Original fields preserved
            assert written["step"] == "script"
            assert written["value"] == 42

    def test_write_preview_artifact_preserves_existing_generated_at(self) -> None:
        """If caller provides generated_at explicitly, helper must not overwrite it."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fixed = "2001-01-01T00:00:00+00:00"
            path = _write_preview_artifact(
                workspace_root=tmpdir,
                job_id="job-1",
                filename="preview_metadata.json",
                data={"step": "metadata", "generated_at": fixed},
            )
            assert path is not None
            written = json.loads(Path(path).read_text(encoding="utf-8"))
            assert written["generated_at"] == fixed

    def test_write_preview_artifact_rejects_non_preview_prefix(self) -> None:
        """Guard: filename must start with 'preview_'. Otherwise returns None
        and does NOT write the file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _write_preview_artifact(
                workspace_root=tmpdir,
                job_id="job-1",
                filename="foo.json",
                data={"step": "foo"},
            )
            assert result is None
            # Also: directory may not even contain 'artifacts/foo.json'
            assert not (Path(tmpdir) / "artifacts" / "foo.json").exists()
            # And nothing else bearing that name
            for candidate in Path(tmpdir).rglob("foo.json"):
                raise AssertionError(
                    f"Unexpected file written despite invalid prefix: {candidate}"
                )

    def test_write_preview_artifact_writes_under_artifacts_dir(self) -> None:
        """File must land at workspace/artifacts/preview_*.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = _write_preview_artifact(
                workspace_root=tmpdir,
                job_id="job-1",
                filename="preview_news_selected.json",
                data={"step": "news_selected"},
            )
            assert path is not None
            p = Path(path)
            assert p.name == "preview_news_selected.json"
            assert p.parent.name == "artifacts"
            assert p.parent.parent == Path(tmpdir)
            assert p.exists()


# ===========================================================================
# C. BulletinScriptExecutor preview writes
# ===========================================================================


def _patch_script_executor_common(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply mocks common to all script-executor tests:
      - Force assembly engine to fail (fallback path used).
      - persist_script_row returns True, no DB writes.
    """
    monkeypatch.setattr(
        BulletinScriptExecutor,
        "_assemble_prompt",
        AsyncMock(side_effect=RuntimeError("force fallback")),
    )
    monkeypatch.setattr(
        "app.modules.news_bulletin.executors.script.persist_script_row",
        AsyncMock(return_value=True),
    )


class TestScriptExecutorPreviews:
    @pytest.mark.asyncio
    async def test_script_executor_writes_preview_news_selected(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_script_executor_common(monkeypatch)
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.script.resolve_and_invoke",
            AsyncMock(
                return_value=_make_provider_output(_sample_script_output("b-ab-001"))
            ),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "artifacts").mkdir(parents=True, exist_ok=True)
            job = _make_job(
                {
                    "bulletin_id": "b-ab-001",
                    "language": "tr",
                    "selected_items": _sample_selected_items(),
                    "_settings_snapshot": _minimal_script_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinScriptExecutor(registry=_make_registry())
            await executor.execute(job, step)

            preview_path = Path(tmpdir) / "artifacts" / "preview_news_selected.json"
            assert preview_path.exists(), "preview_news_selected.json not written"
            data = json.loads(preview_path.read_text(encoding="utf-8"))
            assert data["step"] == "news_selected"
            assert data["bulletin_id"] == "b-ab-001"
            assert data["language"] == "tr"
            assert data["item_count"] == 2
            assert isinstance(data["items"], list)
            assert len(data["items"]) == 2
            first = data["items"][0]
            assert first["item_number"] == 1
            assert first["headline"] == "Ekonomi gundemi"
            assert first["has_edited_narration"] is False
            second = data["items"][1]
            assert second["has_edited_narration"] is True
            assert "generated_at" in data

            # And classifier still labels it correctly
            c = classify_filename(preview_path.name)
            assert c.scope == ArtifactScope.PREVIEW
            assert c.source_step == "news_selected"

    @pytest.mark.asyncio
    async def test_script_executor_writes_preview_script_json(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_script_executor_common(monkeypatch)
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.script.resolve_and_invoke",
            AsyncMock(
                return_value=_make_provider_output(_sample_script_output("b-ab-002"))
            ),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "artifacts").mkdir(parents=True, exist_ok=True)
            job = _make_job(
                {
                    "bulletin_id": "b-ab-002",
                    "language": "tr",
                    "selected_items": _sample_selected_items(),
                    "_settings_snapshot": _minimal_script_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinScriptExecutor(registry=_make_registry())
            await executor.execute(job, step)

            # Final script must exist
            final_path = Path(tmpdir) / "artifacts" / "bulletin_script.json"
            assert final_path.exists(), "bulletin_script.json missing (FINAL write)"

            preview_path = Path(tmpdir) / "artifacts" / "preview_script.json"
            assert preview_path.exists(), "preview_script.json not written"
            data = json.loads(preview_path.read_text(encoding="utf-8"))
            assert data["step"] == "script"
            assert data["bulletin_id"] == "b-ab-002"
            assert data["language"] == "tr"
            assert data["item_count"] == 2
            assert len(data["headlines"]) == 2
            assert data["headlines"][0]["item_number"] == 1
            assert data["headlines"][0]["headline"] == "Ekonomi gundemi"
            assert data["headlines"][0]["duration_seconds"] == 60
            assert data["headlines"][0]["category"] == "ekonomi"
            assert "warnings" in data
            assert isinstance(data["warnings"], list)
            assert data["used_assembly_engine"] is False  # fallback path
            assert "generated_at" in data

    @pytest.mark.asyncio
    async def test_script_executor_preview_script_not_written_on_llm_failure(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """LLM failure: preview_script.json must NOT exist. But preview_news_selected.json
        MAY exist (the selection really happened — honest)."""
        _patch_script_executor_common(monkeypatch)
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.script.resolve_and_invoke",
            AsyncMock(side_effect=RuntimeError("LLM exploded")),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "artifacts").mkdir(parents=True, exist_ok=True)
            job = _make_job(
                {
                    "bulletin_id": "b-ab-003",
                    "language": "tr",
                    "selected_items": _sample_selected_items(),
                    "_settings_snapshot": _minimal_script_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinScriptExecutor(registry=_make_registry())
            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)

            # preview_script.json MUST NOT exist
            assert not (
                Path(tmpdir) / "artifacts" / "preview_script.json"
            ).exists()
            # bulletin_script.json MUST NOT exist (final write happens after LLM)
            assert not (
                Path(tmpdir) / "artifacts" / "bulletin_script.json"
            ).exists()
            # preview_news_selected.json MAY exist — selection truly happened
            # before LLM call. We only assert that IF it exists, the shape is sane.
            sel_path = Path(tmpdir) / "artifacts" / "preview_news_selected.json"
            if sel_path.exists():
                data = json.loads(sel_path.read_text(encoding="utf-8"))
                assert data["step"] == "news_selected"
                assert data["item_count"] == 2

    @pytest.mark.asyncio
    async def test_script_executor_no_preview_when_selected_items_empty(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """selected_items=[] → StepExecutionError BEFORE any preview write.
        No preview files may be produced (honest state: no selection happened)."""
        _patch_script_executor_common(monkeypatch)
        # Even if LLM were available, we must not reach it. Use a strict mock
        # that fails the test if invoked.
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.script.resolve_and_invoke",
            AsyncMock(side_effect=AssertionError("LLM should not be called")),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "artifacts").mkdir(parents=True, exist_ok=True)
            job = _make_job(
                {
                    "bulletin_id": "b-ab-004",
                    "language": "tr",
                    "selected_items": [],  # HONEST: no selection
                    "_settings_snapshot": _minimal_script_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinScriptExecutor(registry=_make_registry())
            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)

            artifacts_dir = Path(tmpdir) / "artifacts"
            preview_files = list(artifacts_dir.glob("preview_*.json"))
            assert preview_files == [], (
                f"Preview files must not exist when guard fires: {preview_files}"
            )
            # Final script also absent
            assert not (artifacts_dir / "bulletin_script.json").exists()


# ===========================================================================
# D. BulletinMetadataExecutor preview write
# ===========================================================================


def _write_final_script_for_metadata(workspace: str, bulletin_id: str) -> None:
    """Metadata executor reads bulletin_script.json — prime it on disk."""
    script_data = _sample_script_output(bulletin_id)
    # Enrich items with source_name/url so description formatter has material.
    for i, it in enumerate(script_data["items"]):
        sel = _sample_selected_items()[i]
        it["source_name"] = sel["source_name"]
        it["url"] = sel["url"]
        it["source_id"] = sel["source_id"]
        it["published_at"] = sel["published_at"]
    artifacts_dir = Path(workspace) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "bulletin_script.json").write_text(
        json.dumps(script_data, ensure_ascii=False), encoding="utf-8"
    )


def _patch_metadata_executor_common(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.modules.news_bulletin.executors.metadata.persist_metadata_row",
        AsyncMock(return_value=True),
    )
    # _load_news_items_map opens a DB session — short-circuit to empty dict.
    monkeypatch.setattr(
        "app.modules.news_bulletin.executors.metadata._load_news_items_map",
        AsyncMock(return_value={}),
    )


class TestMetadataExecutorPreview:
    @pytest.mark.asyncio
    async def test_metadata_executor_writes_preview_metadata(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_metadata_executor_common(monkeypatch)
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.metadata.resolve_and_invoke",
            AsyncMock(return_value=_make_provider_output(_sample_metadata_output())),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            _write_final_script_for_metadata(tmpdir, "b-ab-005")
            job = _make_job(
                {
                    "bulletin_id": "b-ab-005",
                    "language": "tr",
                    "tone": "formal",
                    "selected_items": _sample_selected_items(),
                    "_settings_snapshot": _minimal_metadata_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinMetadataExecutor(registry=_make_registry())
            await executor.execute(job, step)

            # FINAL metadata.json first
            final_path = Path(tmpdir) / "artifacts" / "metadata.json"
            assert final_path.exists(), "metadata.json missing (FINAL write)"

            preview_path = Path(tmpdir) / "artifacts" / "preview_metadata.json"
            assert preview_path.exists(), "preview_metadata.json not written"
            data = json.loads(preview_path.read_text(encoding="utf-8"))
            assert data["step"] == "metadata"
            assert data["bulletin_id"] == "b-ab-005"
            assert data["language"] == "tr"
            assert data["title"] == "Gunun Haber Bulteni — 16 Nisan"
            assert "description_preview" in data
            assert isinstance(data["description_preview"], str)
            assert len(data["description_preview"]) <= 500
            assert "description_truncated" in data
            assert isinstance(data["description_truncated"], bool)
            assert isinstance(data["tags"], list)
            assert len(data["tags"]) <= 20
            assert data["tone"] == "formal"
            assert "publish_description_meta" in data
            assert "generated_at" in data

    @pytest.mark.asyncio
    async def test_metadata_executor_preview_metadata_not_written_on_llm_failure(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _patch_metadata_executor_common(monkeypatch)
        monkeypatch.setattr(
            "app.modules.news_bulletin.executors.metadata.resolve_and_invoke",
            AsyncMock(side_effect=RuntimeError("LLM exploded")),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            _write_final_script_for_metadata(tmpdir, "b-ab-006")
            job = _make_job(
                {
                    "bulletin_id": "b-ab-006",
                    "language": "tr",
                    "tone": "formal",
                    "selected_items": _sample_selected_items(),
                    "_settings_snapshot": _minimal_metadata_settings_snapshot(),
                },
                tmpdir,
            )
            step = _make_step()

            executor = BulletinMetadataExecutor(registry=_make_registry())
            with pytest.raises(StepExecutionError):
                await executor.execute(job, step)

            # No preview, no final metadata
            assert not (
                Path(tmpdir) / "artifacts" / "preview_metadata.json"
            ).exists()
            assert not (Path(tmpdir) / "artifacts" / "metadata.json").exists()


# ===========================================================================
# E. Preview artifacts surfaced via existing /previews endpoint
# ===========================================================================


async def _make_db_job(
    db: AsyncSession, owner: User, workspace: Path
) -> Job:
    job = Job(
        owner_id=owner.id,
        module_type="news_bulletin",
        status="running",
        input_data_json="{}",
        workspace_path=str(workspace),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


def _write_preview_fixture(workspace: Path, name: str, payload: dict) -> None:
    art = workspace / "artifacts"
    art.mkdir(parents=True, exist_ok=True)
    (art / name).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


@pytest.mark.asyncio
async def test_news_bulletin_previews_listed_via_existing_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
    tmp_path: Path,
) -> None:
    """PHASE AB: No parallel endpoint — the existing
    GET /api/v1/jobs/{id}/previews?scope=preview surfaces the three
    news_bulletin preview keys with correct name + source_step."""
    job = await _make_db_job(db_session, regular_user, tmp_path)

    # Three previews
    _write_preview_fixture(
        tmp_path,
        "preview_news_selected.json",
        {"step": "news_selected", "item_count": 2, "generated_at": "x"},
    )
    _write_preview_fixture(
        tmp_path,
        "preview_script.json",
        {"step": "script", "item_count": 2, "generated_at": "x"},
    )
    _write_preview_fixture(
        tmp_path,
        "preview_metadata.json",
        {"step": "metadata", "title": "T", "generated_at": "x"},
    )
    # Plus two FINAL artifacts
    _write_preview_fixture(
        tmp_path,
        "bulletin_script.json",
        {"items": [], "language": "tr"},
    )
    _write_preview_fixture(
        tmp_path,
        "metadata.json",
        {"title": "t", "description": "d", "tags": []},
    )

    resp = await client.get(
        f"/api/v1/jobs/{job.id}/previews?scope=preview",
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["job_id"] == job.id
    assert body["preview_count"] == 3
    assert body["total"] == 3

    names = {e["name"] for e in body["entries"]}
    assert names == {
        "preview_news_selected.json",
        "preview_script.json",
        "preview_metadata.json",
    }

    by_name = {e["name"]: e for e in body["entries"]}
    assert by_name["preview_news_selected.json"]["scope"] == "preview"
    assert by_name["preview_news_selected.json"]["source_step"] == "news_selected"
    assert by_name["preview_script.json"]["source_step"] == "script"
    assert by_name["preview_metadata.json"]["source_step"] == "metadata"

    # Sanity: bulletin_script.json / metadata.json are NOT surfaced in preview scope.
    for e in body["entries"]:
        assert e["scope"] == "preview"
        assert e["name"] not in ("bulletin_script.json", "metadata.json")
