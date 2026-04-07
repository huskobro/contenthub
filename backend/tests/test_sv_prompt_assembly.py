"""Tests for Standard Video Prompt Assembly Engine wiring.

Tests:
1. test_sv_script_blocks_seeded        -- sv script blocks exist after seed
2. test_sv_metadata_blocks_seeded      -- sv metadata blocks exist after seed
3. test_sv_step_scope_isolation        -- script/metadata blocks don't bleed into each other
4. test_sv_script_assembly_basic       -- assemble() for script step produces non-empty text
5. test_sv_metadata_assembly_basic     -- assemble() for metadata step produces non-empty text
6. test_sv_protected_blocks            -- core_system + output_contract blocks are in PROTECTED_KINDS
7. test_sv_determinism                 -- same snapshots produce same final_prompt_text (3x)
8. test_sv_settings_behavior_flags     -- opening_hooks_enabled=False skips sv.opening_hooks
"""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.prompt_assembly.block_seed import seed_prompt_blocks, BUILTIN_BLOCKS
from app.prompt_assembly.assembly_service import PromptAssemblyService, AssemblyResult
from app.prompt_assembly.service import PROTECTED_KINDS


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_trace_service():
    """Prevent DB writes during unit tests."""
    mock_run = AsyncMock()
    mock_run.return_value = type("FakeRun", (), {"id": "sv-test-run-id"})()
    with patch("app.prompt_assembly.assembly_service.trace_service.create_assembly_run", mock_run):
        yield mock_run


@pytest.fixture
async def seeded_db(db_session):
    """Seed prompt blocks into in-memory DB, return session."""
    await seed_prompt_blocks(db_session)
    return db_session


@pytest.fixture
def assembly_service():
    return PromptAssemblyService()


# ---------------------------------------------------------------------------
# Helper: build block snapshot from BUILTIN_BLOCKS filtered by module/step
# ---------------------------------------------------------------------------

def _sv_block_snapshot(step_scope=None):
    """Return block snapshot dicts for standard_video, optionally filtered by step_scope."""
    result = []
    for b in BUILTIN_BLOCKS:
        if b.get("module_scope") != "standard_video":
            continue
        if step_scope is not None and b.get("step_scope") != step_scope:
            continue
        result.append({
            "key": b["key"],
            "title": b["title"],
            "kind": b["kind"],
            "order_index": b.get("order_index", 0),
            "enabled_by_default": b.get("enabled_by_default", True),
            "condition_type": b.get("condition_type", "always"),
            "condition_config_json": b.get("condition_config_json"),
            "content_template": b["content_template"],
            "admin_override_template": None,
            "status": "active",
            "module_scope": b.get("module_scope"),
            "step_scope": b.get("step_scope"),
            "provider_scope": b.get("provider_scope"),
            "version": 1,
            "source_kind": "seeded_system",
        })
    return result


def _default_settings():
    """Default settings snapshot with all sv boolean flags enabled."""
    return {
        "standard_video.config.opening_hooks_enabled": True,
        "standard_video.config.humanize_enabled": False,
        "standard_video.config.tts_enhance_enabled": True,
        "standard_video.config.seo_rules_enabled": True,
        "standard_video.config.category_guidance_enabled": True,
    }


# ---------------------------------------------------------------------------
# Test 1: sv script blocks seeded
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_script_blocks_seeded(seeded_db):
    """After seed, standard_video script blocks exist including sv.script_system and sv.output_contract."""
    from sqlalchemy import select
    from app.prompt_assembly.models import PromptBlock

    stmt = select(PromptBlock).where(
        PromptBlock.module_scope == "standard_video",
        PromptBlock.step_scope == "script",
    )
    result = await seeded_db.execute(stmt)
    blocks = list(result.scalars().all())

    keys = {b.key for b in blocks}
    assert len(blocks) > 0, "No standard_video script blocks found after seed"
    assert "sv.script_system" in keys
    assert "sv.output_contract" in keys


# ---------------------------------------------------------------------------
# Test 2: sv metadata blocks seeded
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_metadata_blocks_seeded(seeded_db):
    """After seed, standard_video metadata blocks exist including sv.metadata_system."""
    from sqlalchemy import select
    from app.prompt_assembly.models import PromptBlock

    stmt = select(PromptBlock).where(
        PromptBlock.module_scope == "standard_video",
        PromptBlock.step_scope == "metadata",
    )
    result = await seeded_db.execute(stmt)
    blocks = list(result.scalars().all())

    keys = {b.key for b in blocks}
    assert len(blocks) > 0, "No standard_video metadata blocks found after seed"
    assert "sv.metadata_system" in keys
    assert "sv.metadata_output_contract" in keys


# ---------------------------------------------------------------------------
# Test 3: step scope isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_step_scope_isolation(assembly_service):
    """assemble with step_key='script' excludes sv.metadata_system; metadata excludes sv.script_system."""
    # Script assembly should NOT include metadata blocks
    script_snapshot = _sv_block_snapshot()  # all sv blocks
    settings = _default_settings()

    script_result = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="script",
        provider_name="llm",
        settings_snapshot=settings,
        block_snapshot=script_snapshot,
        data_snapshot={"duration_seconds": 60, "language": "tr"},
        user_content="Test topic",
    )
    included_script_keys = {b.block_key for b in script_result.included_blocks}
    skipped_script_keys = {b.block_key for b in script_result.skipped_blocks}

    assert "sv.script_system" in included_script_keys
    assert "sv.metadata_system" not in included_script_keys
    assert "sv.metadata_system" not in skipped_script_keys  # filtered entirely by step scope

    # Metadata assembly should NOT include script blocks
    metadata_result = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="metadata",
        provider_name="llm",
        settings_snapshot=settings,
        block_snapshot=script_snapshot,
        data_snapshot={"language": "tr"},
        user_content="Test metadata",
    )
    included_meta_keys = {b.block_key for b in metadata_result.included_blocks}

    assert "sv.metadata_system" in included_meta_keys
    assert "sv.script_system" not in included_meta_keys


# ---------------------------------------------------------------------------
# Test 4: sv script assembly basic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_script_assembly_basic(assembly_service):
    """PromptAssemblyService.assemble() for standard_video/script produces non-empty final_prompt_text."""
    block_snapshot = _sv_block_snapshot(step_scope="script")
    settings = _default_settings()
    data_snapshot = {
        "duration_seconds": 60,
        "language": "tr",
        "topic": "Yapay zeka ve gelecek",
    }

    result = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="script",
        provider_name="llm",
        settings_snapshot=settings,
        block_snapshot=block_snapshot,
        data_snapshot=data_snapshot,
        user_content="Konu: Yapay zeka ve gelecek",
    )

    assert isinstance(result, AssemblyResult)
    assert len(result.final_prompt_text) > 0
    assert len(result.included_blocks) > 0
    # core_system must be included
    included_keys = {b.block_key for b in result.included_blocks}
    assert "sv.script_system" in included_keys
    assert "sv.output_contract" in included_keys


# ---------------------------------------------------------------------------
# Test 5: sv metadata assembly basic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_metadata_assembly_basic(assembly_service):
    """PromptAssemblyService.assemble() for standard_video/metadata produces non-empty final_prompt_text."""
    block_snapshot = _sv_block_snapshot(step_scope="metadata")
    settings = _default_settings()
    data_snapshot = {
        "script_title": "Yapay Zeka ve Gelecek",
        "script_summary": "Bu video yapay zekanin geleceğini ele aliyor.",
        "language": "tr",
        "seo_keywords": "yapay zeka, gelecek, teknoloji",
    }

    result = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="metadata",
        provider_name="llm",
        settings_snapshot=settings,
        block_snapshot=block_snapshot,
        data_snapshot=data_snapshot,
        user_content="Script basligi: Yapay Zeka ve Gelecek",
    )

    assert isinstance(result, AssemblyResult)
    assert len(result.final_prompt_text) > 0
    included_keys = {b.block_key for b in result.included_blocks}
    assert "sv.metadata_system" in included_keys
    assert "sv.metadata_output_contract" in included_keys


# ---------------------------------------------------------------------------
# Test 6: protected blocks
# ---------------------------------------------------------------------------

def test_sv_protected_blocks():
    """sv.script_system, sv.output_contract, sv.metadata_output_contract use protected kinds."""
    protected_blocks = {
        b["key"]: b for b in BUILTIN_BLOCKS
        if b.get("key") in ("sv.script_system", "sv.output_contract", "sv.metadata_system", "sv.metadata_output_contract")
    }

    for key, block in protected_blocks.items():
        assert block["kind"] in PROTECTED_KINDS, (
            f"Block '{key}' has kind '{block['kind']}' which is not in PROTECTED_KINDS {PROTECTED_KINDS}"
        )


# ---------------------------------------------------------------------------
# Test 7: determinism
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_determinism(assembly_service):
    """Same snapshots produce same final_prompt_text across 3 invocations."""
    block_snapshot = _sv_block_snapshot(step_scope="script")
    settings = _default_settings()
    data_snapshot = {
        "duration_seconds": 90,
        "language": "tr",
        "topic": "Iklim degisikligi",
    }

    results = []
    for _ in range(3):
        r = await assembly_service.assemble(
            AsyncMock(),
            module_scope="standard_video",
            step_key="script",
            provider_name="llm",
            settings_snapshot=settings,
            block_snapshot=block_snapshot,
            data_snapshot=data_snapshot,
            user_content="Konu: Iklim degisikligi",
        )
        results.append(r.final_prompt_text)

    assert results[0] == results[1] == results[2], "Assembly is not deterministic!"


# ---------------------------------------------------------------------------
# Test 8: settings behavior flags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sv_settings_behavior_flags(assembly_service):
    """When opening_hooks_enabled=False, sv.opening_hooks block is skipped."""
    block_snapshot = _sv_block_snapshot(step_scope="script")

    # Disable opening hooks
    settings_no_hooks = {
        **_default_settings(),
        "standard_video.config.opening_hooks_enabled": False,
    }

    result_no_hooks = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="script",
        provider_name="llm",
        settings_snapshot=settings_no_hooks,
        block_snapshot=block_snapshot,
        data_snapshot={"duration_seconds": 60, "language": "tr"},
        user_content="Test",
    )

    included_keys = {b.block_key for b in result_no_hooks.included_blocks}
    skipped_keys = {b.block_key for b in result_no_hooks.skipped_blocks}

    assert "sv.opening_hooks" not in included_keys, "sv.opening_hooks should be skipped when disabled"
    assert "sv.opening_hooks" in skipped_keys, "sv.opening_hooks should appear in skipped_blocks"

    # Verify it IS included when enabled
    settings_with_hooks = {
        **_default_settings(),
        "standard_video.config.opening_hooks_enabled": True,
    }

    result_with_hooks = await assembly_service.assemble(
        AsyncMock(),
        module_scope="standard_video",
        step_key="script",
        provider_name="llm",
        settings_snapshot=settings_with_hooks,
        block_snapshot=block_snapshot,
        data_snapshot={"duration_seconds": 60, "language": "tr"},
        user_content="Test",
    )

    included_keys_enabled = {b.block_key for b in result_with_hooks.included_blocks}
    assert "sv.opening_hooks" in included_keys_enabled, "sv.opening_hooks should be included when enabled"
