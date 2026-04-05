"""
M13 Template Runtime Integration Tests.

Test kapsamı:
  Part A — Resolver Unit Tests (real DB):
    1.  resolve_template_context(db, None) → None döner
    2.  resolve_template_context(db, "missing-id") → None döner
    3.  resolve_template_context(db, valid_id) → tam context dict döner
    4.  Context dict yapısı doğru alanları içeriyor — style_blueprint bağlantılı
    5.  Template ile content_rules_json = '{"tone": "formal"}' → context.content_rules.tone == "formal"
    6.  Template ile geçersiz JSON content_rules_json → graceful handle (None)

  Part B — Executor Template Context Tests:
    7.  ScriptStepExecutor: template context tone="formal" → result template_info içerir
    8.  ScriptStepExecutor: template context yok → template_info result'ta yok (backward compat)
    9.  MetadataStepExecutor: template context → result template_info içerir
    10. VisualsStepExecutor: template context image_style → result image_style_applied içerir
    11. CompositionStepExecutor: template context → result template ve style_blueprint anahtarları

  Part C — Prompt Builder Template Tests:
    12. build_script_prompt template_tone="formal" → prompt "formal" içerir
    13. build_script_prompt template_tone yok → prompt template tone referansı yok
    14. build_metadata_prompt template_seo_keywords=["AI","tech"] → prompt keywords içerir
"""

from __future__ import annotations

import json
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Template, StyleBlueprint, TemplateStyleLink
from app.db.session import AsyncSessionLocal, create_tables
from app.modules.templates.resolver import resolve_template_context
from app.modules.prompt_builder import build_script_prompt, build_metadata_prompt
from app.modules.language import SupportedLanguage
from app.modules.standard_video.executors import (
    ScriptStepExecutor,
    MetadataStepExecutor,
)
from app.modules.standard_video.executors.visuals import VisualsStepExecutor
from app.modules.standard_video.executors.composition import CompositionStepExecutor
from app.providers.base import ProviderOutput
from app.providers.registry import ProviderRegistry


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db():
    """Real async DB session — create_tables ile tablolar oluşturulur."""
    await create_tables()
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Yardımcı fabrika fonksiyonları
# ---------------------------------------------------------------------------

def _make_template(
    template_id: str = "tpl-test-001",
    name: str = "Test Template",
    template_type: str = "content",
    owner_scope: str = "admin",
    version: int = 1,
    content_rules_json: Optional[str] = None,
    style_profile_json: Optional[str] = None,
    publish_profile_json: Optional[str] = None,
    status: str = "active",
) -> Template:
    """Template ORM nesnesi oluşturur."""
    tpl = Template()
    tpl.id = template_id
    tpl.name = name
    tpl.template_type = template_type
    tpl.owner_scope = owner_scope
    tpl.version = version
    tpl.content_rules_json = content_rules_json
    tpl.style_profile_json = style_profile_json
    tpl.publish_profile_json = publish_profile_json
    tpl.status = status
    return tpl


def _make_blueprint(
    blueprint_id: str = "bp-test-001",
    name: str = "Test Blueprint",
    version: int = 1,
    visual_rules_json: Optional[str] = None,
    motion_rules_json: Optional[str] = None,
    layout_rules_json: Optional[str] = None,
    subtitle_rules_json: Optional[str] = None,
    thumbnail_rules_json: Optional[str] = None,
    status: str = "active",
) -> StyleBlueprint:
    """StyleBlueprint ORM nesnesi oluşturur."""
    bp = StyleBlueprint()
    bp.id = blueprint_id
    bp.name = name
    bp.version = version
    bp.visual_rules_json = visual_rules_json
    bp.motion_rules_json = motion_rules_json
    bp.layout_rules_json = layout_rules_json
    bp.subtitle_rules_json = subtitle_rules_json
    bp.thumbnail_rules_json = thumbnail_rules_json
    bp.status = status
    return bp


def _make_link(
    link_id: str = "link-test-001",
    template_id: str = "tpl-test-001",
    blueprint_id: str = "bp-test-001",
    link_role: str = "primary",
    status: str = "active",
) -> TemplateStyleLink:
    """TemplateStyleLink ORM nesnesi oluşturur."""
    link = TemplateStyleLink()
    link.id = link_id
    link.template_id = template_id
    link.style_blueprint_id = blueprint_id
    link.link_role = link_role
    link.status = status
    return link


def _make_resolve_output(response_dict: dict) -> ProviderOutput:
    """resolve_and_invoke patch'i için ProviderOutput döndürür."""
    return ProviderOutput(
        result={"content": json.dumps(response_dict), "finish_reason": "stop"},
        trace={
            "provider_id": "mock_llm",
            "model": "mock-model",
            "input_tokens": 100,
            "output_tokens": 200,
            "latency_ms": 50,
            "resolution_role": "primary",
            "resolved_by": "provider_registry",
        },
        provider_id="mock_llm",
    )


def _make_mock_registry() -> MagicMock:
    """ProviderRegistry mock'u oluşturur."""
    return MagicMock(spec=ProviderRegistry)


def _make_mock_job(
    job_id: str,
    workspace_root: str,
    input_data: dict,
    template_context: Optional[dict] = None,
) -> MagicMock:
    """Job ORM mock'u oluşturur — opsiyonel template_context ile."""
    job = MagicMock()
    job.id = job_id
    job.input_data_json = json.dumps(input_data)
    job.workspace_path = workspace_root
    # _template_context'i MagicMock yerine gerçek dict olarak ayarla
    if template_context is not None:
        object.__setattr__(job, '_template_context', template_context)
    else:
        # MagicMock varsayılan getattr'ı döndürmesin — None dönsün
        job.configure_mock(**{'_template_context': None})
    return job


def _make_mock_step(step_key: str = "script") -> MagicMock:
    """JobStep ORM mock'u oluşturur."""
    step = MagicMock()
    step.id = "test-step-m13"
    step.step_key = step_key
    return step


def _write_json(path: Path, data: dict) -> None:
    """Belirtilen path'e JSON yazar, dizini oluşturur."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# Standart template context dict'i
SAMPLE_TEMPLATE_CONTEXT = {
    "template_id": "tpl-1",
    "template_name": "Formal News Template",
    "template_type": "content",
    "template_version": 2,
    "style_profile": None,
    "content_rules": {"tone": "formal", "language_rules": "Use formal Turkish"},
    "publish_profile": {"seo_keywords": ["AI", "tech"]},
    "style_blueprint": {
        "id": "bp-1",
        "name": "Clean Blueprint",
        "version": 1,
        "visual_rules": {"image_style": "cinematic"},
        "motion_rules": {"speed": "slow"},
        "layout_rules": None,
        "subtitle_rules": {"fontSize": 24},
        "thumbnail_rules": None,
    },
    "link_role": "primary",
}


# ===========================================================================
# Part A: Resolver Unit Tests (real DB)
# ===========================================================================

class TestResolverPartA:
    """resolve_template_context resolver testleri."""

    @pytest.mark.asyncio
    async def test_resolve_none_returns_none(self, db: AsyncSession):
        """Test 1: resolve_template_context(db, None) → None döner."""
        result = await resolve_template_context(db, None)
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_missing_id_returns_none(self, db: AsyncSession):
        """Test 2: resolve_template_context(db, "nonexistent-uuid") → None döner."""
        result = await resolve_template_context(db, "nonexistent-uuid-12345")
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_valid_template_returns_context(self, db: AsyncSession):
        """Test 3: DB'de Template var → dict döner, template_id ve template_name doğru."""
        tid = f"tpl-resolve-3-{uuid.uuid4().hex[:8]}"
        tpl = _make_template(
            template_id=tid,
            name="Resolve Test Template",
            content_rules_json='{"tone": "casual"}',
        )
        db.add(tpl)
        await db.commit()

        ctx = await resolve_template_context(db, tid)
        assert ctx is not None
        assert ctx["template_id"] == tid
        assert ctx["template_name"] == "Resolve Test Template"
        assert ctx["template_type"] == "content"
        assert ctx["template_version"] == 1
        assert ctx["content_rules"] == {"tone": "casual"}
        # Blueprint bağlantısı yok
        assert ctx["style_blueprint"] is None
        assert ctx["link_role"] is None

    @pytest.mark.asyncio
    async def test_resolve_with_blueprint_link(self, db: AsyncSession):
        """Test 4: Template + StyleBlueprint + Link → full context, blueprint alanları dolu."""
        suffix = uuid.uuid4().hex[:8]
        tid = f"tpl-resolve-4-{suffix}"
        bid = f"bp-resolve-4-{suffix}"
        lid = f"link-resolve-4-{suffix}"

        tpl = _make_template(
            template_id=tid,
            name="Linked Template",
            style_profile_json='{"color_scheme": "dark"}',
        )
        bp = _make_blueprint(
            blueprint_id=bid,
            name="Linked Blueprint",
            version=3,
            visual_rules_json='{"image_style": "cinematic"}',
            motion_rules_json='{"speed": "fast"}',
            subtitle_rules_json='{"fontSize": 28}',
        )
        link = _make_link(
            link_id=lid,
            template_id=tid,
            blueprint_id=bid,
            link_role="primary",
        )
        db.add_all([tpl, bp, link])
        await db.commit()

        ctx = await resolve_template_context(db, tid)
        assert ctx is not None
        assert ctx["template_id"] == tid
        assert ctx["style_profile"] == {"color_scheme": "dark"}
        assert ctx["link_role"] == "primary"

        sb = ctx["style_blueprint"]
        assert sb is not None
        assert sb["id"] == bid
        assert sb["name"] == "Linked Blueprint"
        assert sb["version"] == 3
        assert sb["visual_rules"] == {"image_style": "cinematic"}
        assert sb["motion_rules"] == {"speed": "fast"}
        assert sb["subtitle_rules"] == {"fontSize": 28}
        assert sb["layout_rules"] is None
        assert sb["thumbnail_rules"] is None

    @pytest.mark.asyncio
    async def test_resolve_content_rules_parsed(self, db: AsyncSession):
        """Test 5: content_rules_json parse ediliyor — tone alanı erişilebilir."""
        tid = f"tpl-resolve-5-{uuid.uuid4().hex[:8]}"
        tpl = _make_template(
            template_id=tid,
            name="Content Rules Template",
            content_rules_json='{"tone": "formal", "max_length": 500}',
        )
        db.add(tpl)
        await db.commit()

        ctx = await resolve_template_context(db, tid)
        assert ctx is not None
        assert ctx["content_rules"]["tone"] == "formal"
        assert ctx["content_rules"]["max_length"] == 500

    @pytest.mark.asyncio
    async def test_resolve_invalid_json_handled_gracefully(self, db: AsyncSession):
        """Test 6: Geçersiz JSON content_rules_json → None olarak döner (hata fırlatmaz)."""
        tid = f"tpl-resolve-6-{uuid.uuid4().hex[:8]}"
        tpl = _make_template(
            template_id=tid,
            name="Bad JSON Template",
            content_rules_json='{invalid json!!!}',
        )
        db.add(tpl)
        await db.commit()

        ctx = await resolve_template_context(db, tid)
        assert ctx is not None
        assert ctx["content_rules"] is None
        # Diğer alanlar hala çalışır
        assert ctx["template_id"] == tid
        assert ctx["template_name"] == "Bad JSON Template"


# ===========================================================================
# Part B: Executor Template Context Tests
# ===========================================================================

class TestExecutorTemplateContextPartB:
    """Executor'ların template context okuyuşunu test eder."""

    @pytest.mark.asyncio
    async def test_script_executor_with_template_context(self):
        """Test 7: ScriptStepExecutor template context tone='formal' → result template_info içerir."""
        script_response = {
            "title": "Formal Script",
            "scenes": [
                {"scene_number": 1, "narration": "Formal anlatım.", "visual_cue": "office", "duration_seconds": 30}
            ],
            "total_duration_seconds": 60,
            "language": "tr",
        }
        resolve_output = _make_resolve_output(script_response)

        with tempfile.TemporaryDirectory() as tmp_dir:
            workspace_root = str(Path(tmp_dir) / "test_job_7")
            (Path(workspace_root) / "artifacts").mkdir(parents=True)

            job = _make_mock_job(
                job_id="job-m13-007",
                workspace_root=workspace_root,
                input_data={"topic": "Formal Konu", "language": "tr", "duration_seconds": 60},
                template_context=SAMPLE_TEMPLATE_CONTEXT,
            )
            step = _make_mock_step("script")

            with patch(
                "app.modules.standard_video.executors.script.resolve_and_invoke",
                new=AsyncMock(return_value=resolve_output),
            ):
                executor = ScriptStepExecutor(registry=_make_mock_registry())
                result = await executor.execute(job, step)

            assert "template_info" in result
            assert result["template_info"]["template_id"] == "tpl-1"
            assert result["template_info"]["template_name"] == "Formal News Template"
            assert result["template_info"]["template_version"] == 2
            assert result["template_info"]["link_role"] == "primary"
            assert result["step"] == "script"

    @pytest.mark.asyncio
    async def test_script_executor_without_template_context(self):
        """Test 8: ScriptStepExecutor template context yok → template_info result'ta yok."""
        script_response = {
            "title": "Plain Script",
            "scenes": [
                {"scene_number": 1, "narration": "Basit anlatım.", "visual_cue": "sky", "duration_seconds": 30}
            ],
            "total_duration_seconds": 60,
            "language": "tr",
        }
        resolve_output = _make_resolve_output(script_response)

        with tempfile.TemporaryDirectory() as tmp_dir:
            workspace_root = str(Path(tmp_dir) / "test_job_8")
            (Path(workspace_root) / "artifacts").mkdir(parents=True)

            job = _make_mock_job(
                job_id="job-m13-008",
                workspace_root=workspace_root,
                input_data={"topic": "Basit Konu", "language": "tr", "duration_seconds": 60},
                template_context=None,
            )
            step = _make_mock_step("script")

            with patch(
                "app.modules.standard_video.executors.script.resolve_and_invoke",
                new=AsyncMock(return_value=resolve_output),
            ):
                executor = ScriptStepExecutor(registry=_make_mock_registry())
                result = await executor.execute(job, step)

            assert "template_info" not in result
            assert result["step"] == "script"

    @pytest.mark.asyncio
    async def test_metadata_executor_with_template_context(self):
        """Test 9: MetadataStepExecutor template context → result template_info içerir."""
        metadata_response = {
            "title": "Formal Başlık",
            "description": "Formal açıklama.",
            "tags": ["formal", "test"],
            "hashtags": ["#formal"],
            "language": "tr",
        }
        resolve_output = _make_resolve_output(metadata_response)

        with tempfile.TemporaryDirectory() as tmp_dir:
            workspace_root = str(Path(tmp_dir) / "test_job_9")
            artifacts_dir = Path(workspace_root) / "artifacts"
            artifacts_dir.mkdir(parents=True)

            # Script artifact oluştur (metadata executor bunu okur)
            _write_json(artifacts_dir / "script.json", {
                "title": "Script Title",
                "scenes": [
                    {"scene_number": 1, "narration": "Test anlatım.", "visual_cue": "city", "duration_seconds": 20}
                ],
                "total_duration_seconds": 60,
                "language": "tr",
            })

            job = _make_mock_job(
                job_id="job-m13-009",
                workspace_root=workspace_root,
                input_data={"topic": "Metadata Konu", "language": "tr", "duration_seconds": 60},
                template_context=SAMPLE_TEMPLATE_CONTEXT,
            )
            step = _make_mock_step("metadata")

            with patch(
                "app.modules.standard_video.executors.metadata.resolve_and_invoke",
                new=AsyncMock(return_value=resolve_output),
            ):
                executor = MetadataStepExecutor(registry=_make_mock_registry())
                result = await executor.execute(job, step)

            assert "template_info" in result
            assert result["template_info"]["template_id"] == "tpl-1"
            assert result["template_info"]["template_name"] == "Formal News Template"
            assert result["step"] == "metadata"

    @pytest.mark.asyncio
    async def test_visuals_executor_with_template_image_style(self):
        """Test 10: VisualsStepExecutor template context image_style → result'ta image_style_applied."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            workspace_root = str(Path(tmp_dir) / "test_job_10")
            artifacts_dir = Path(workspace_root) / "artifacts"
            artifacts_dir.mkdir(parents=True)

            # Script artifact
            _write_json(artifacts_dir / "script.json", {
                "title": "Visuals Test",
                "scenes": [
                    {"scene_number": 1, "narration": "Sahne 1.", "visual_cue": "mountain landscape", "duration_seconds": 10}
                ],
                "total_duration_seconds": 10,
                "language": "tr",
            })

            job = _make_mock_job(
                job_id="job-m13-010",
                workspace_root=workspace_root,
                input_data={"topic": "Visuals Konu", "language": "tr", "duration_seconds": 60},
                template_context=SAMPLE_TEMPLATE_CONTEXT,
            )
            step = _make_mock_step("visuals")

            # Mock provider that returns a fake asset
            mock_provider = AsyncMock()
            # provider_id() is sync — use MagicMock to avoid coroutine warnings
            mock_provider.provider_id = MagicMock(return_value="mock_pexels")

            # Create a fake image file for the provider to "return"
            visuals_dir = artifacts_dir / "visuals"
            visuals_dir.mkdir(parents=True, exist_ok=True)
            fake_img = visuals_dir / "temp_1.jpg"
            fake_img.write_bytes(b"\xff\xd8\xff\xe0fake-jpg")

            mock_provider.invoke = AsyncMock(return_value=ProviderOutput(
                result={
                    "assets": [{
                        "local_path": str(fake_img),
                        "photographer": "Test Author",
                        "url": "https://example.com/img.jpg",
                    }]
                },
                trace={"provider_id": "mock_pexels", "latency_ms": 10},
                provider_id="mock_pexels",
            ))

            executor = VisualsStepExecutor(providers=[mock_provider])
            result = await executor.execute(job, step)

            assert result["step"] == "visuals"
            assert "template_info" in result
            assert result["template_info"]["template_id"] == "tpl-1"
            # image_style_applied in provider trace
            assert result["provider"]["image_style_applied"] == "cinematic"

    @pytest.mark.asyncio
    async def test_composition_executor_with_template_context(self):
        """Test 11: CompositionStepExecutor template context → result template ve style_blueprint anahtarları."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            workspace_root = str(Path(tmp_dir) / "test_job_11")
            artifacts_dir = Path(workspace_root) / "artifacts"
            artifacts_dir.mkdir(parents=True)

            # Zorunlu artifact'lar
            _write_json(artifacts_dir / "script.json", {
                "title": "Composition Test",
                "scenes": [
                    {"scene_number": 1, "narration": "Sahne 1.", "visual_cue": "city", "duration_seconds": 10}
                ],
                "total_duration_seconds": 10,
                "language": "tr",
            })
            _write_json(artifacts_dir / "audio_manifest.json", {
                "scenes": [
                    {"scene_number": 1, "audio_path": "artifacts/audio/scene_1.mp3", "duration_seconds": 10.0}
                ],
                "language": "tr",
            })
            _write_json(artifacts_dir / "visuals_manifest.json", {
                "scenes": [
                    {"scene_number": 1, "image_path": "artifacts/visuals/scene_1.jpg", "query": "city", "source": "pexels"}
                ],
                "total_downloaded": 1,
                "language": "tr",
            })
            _write_json(artifacts_dir / "subtitle_metadata.json", {
                "srt_path": "artifacts/subtitles.srt",
                "word_timing_path": None,
                "timing_mode": "cursor",
                "language": "tr",
            })
            _write_json(artifacts_dir / "metadata.json", {
                "title": "Test Başlık",
                "description": "Test açıklama.",
                "tags": ["test"],
                "hashtags": ["#test"],
                "language": "tr",
            })

            job = _make_mock_job(
                job_id="job-m13-011",
                workspace_root=workspace_root,
                input_data={
                    "topic": "Composition Konu",
                    "language": "tr",
                    "duration_seconds": 60,
                    "workspace_root": workspace_root,
                },
                template_context=SAMPLE_TEMPLATE_CONTEXT,
            )
            step = _make_mock_step("composition")

            executor = CompositionStepExecutor()
            result = await executor.execute(job, step)

            assert result["step"] == "composition"
            assert result["render_status"] == "props_ready"

            # Template info anahtarı mevcut
            assert result["template"] is not None
            assert result["template"]["template_id"] == "tpl-1"
            assert result["template"]["template_name"] == "Formal News Template"

            # Style blueprint anahtarı mevcut
            assert result["style_blueprint"] is not None
            assert result["style_blueprint"]["blueprint_id"] == "bp-1"
            assert result["style_blueprint"]["blueprint_name"] == "Clean Blueprint"
            assert result["style_blueprint"]["visual_rules"] == {"image_style": "cinematic"}


# ===========================================================================
# Part C: Prompt Builder Template Tests
# ===========================================================================

class TestPromptBuilderPartC:
    """build_script_prompt ve build_metadata_prompt template parametreleri testleri."""

    def test_build_script_prompt_with_template_tone(self):
        """Test 12: build_script_prompt template_tone='formal' → prompt 'formal' içerir."""
        messages = build_script_prompt(
            topic="Yapay Zeka",
            duration_seconds=60,
            language=SupportedLanguage.TR,
            template_tone="formal",
        )
        full_text = " ".join(m["content"] for m in messages)
        assert "formal" in full_text

    def test_build_script_prompt_without_template_tone(self):
        """Test 13: build_script_prompt template_tone yok → prompt template tone referansı yok."""
        messages = build_script_prompt(
            topic="Yapay Zeka",
            duration_seconds=60,
            language=SupportedLanguage.TR,
        )
        full_text = " ".join(m["content"] for m in messages)
        # "Şablon ton" ifadesi olmamalı (template tone eklenmemişse)
        assert "Şablon ton" not in full_text

    def test_build_script_prompt_with_template_language_rules(self):
        """build_script_prompt template_language_rules varsa prompt'a eklenir."""
        messages = build_script_prompt(
            topic="Test",
            duration_seconds=60,
            language=SupportedLanguage.TR,
            template_tone="neutral",
            template_language_rules="Kısa cümleler kullan",
        )
        full_text = " ".join(m["content"] for m in messages)
        assert "Kısa cümleler kullan" in full_text

    def test_build_metadata_prompt_with_seo_keywords(self):
        """Test 14: build_metadata_prompt template_seo_keywords=["AI","tech"] → prompt keywords içerir."""
        script = {
            "title": "AI Geleceği",
            "scenes": [
                {"scene_number": 1, "narration": "Yapay zeka büyüyor.", "visual_cue": "tech", "duration_seconds": 20}
            ],
            "total_duration_seconds": 60,
            "language": "tr",
        }
        messages = build_metadata_prompt(
            script=script,
            language=SupportedLanguage.TR,
            template_seo_keywords=["AI", "tech"],
        )
        full_text = " ".join(m["content"] for m in messages)
        assert "AI" in full_text
        assert "tech" in full_text

    def test_build_metadata_prompt_with_template_tone(self):
        """build_metadata_prompt template_tone varsa prompt'a eklenir."""
        script = {
            "title": "Test",
            "scenes": [{"scene_number": 1, "narration": "Test.", "visual_cue": "x", "duration_seconds": 10}],
            "language": "tr",
        }
        messages = build_metadata_prompt(
            script=script,
            language=SupportedLanguage.TR,
            template_tone="professional",
        )
        full_text = " ".join(m["content"] for m in messages)
        assert "professional" in full_text

    def test_build_metadata_prompt_without_keywords(self):
        """build_metadata_prompt seo_keywords yok → SEO anahtar kelime satırı yok."""
        script = {
            "title": "Test",
            "scenes": [{"scene_number": 1, "narration": "Test.", "visual_cue": "x", "duration_seconds": 10}],
            "language": "tr",
        }
        messages = build_metadata_prompt(
            script=script,
            language=SupportedLanguage.TR,
        )
        full_text = " ".join(m["content"] for m in messages)
        assert "SEO anahtar kelime" not in full_text
