"""Tests for PromptAssemblyService -- determinism and block processing."""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.prompt_assembly.assembly_service import PromptAssemblyService, AssemblyResult


def _block(key, kind="behavior_block", order=0, condition_type="always",
           condition_config=None, content="Static text", enabled=True, status="active",
           module_scope=None, provider_scope=None, admin_override=None):
    return {
        "key": key,
        "title": key.replace(".", " ").title(),
        "kind": kind,
        "order_index": order,
        "enabled_by_default": enabled,
        "condition_type": condition_type,
        "condition_config_json": json.dumps(condition_config) if condition_config else None,
        "content_template": content,
        "admin_override_template": admin_override,
        "status": status,
        "module_scope": module_scope,
        "provider_scope": provider_scope,
        "version": 1,
        "source_kind": "builtin_default",
    }


@pytest.fixture(autouse=True)
def mock_trace_service():
    """Prevent DB writes during unit tests."""
    mock_run = AsyncMock()
    mock_run.return_value = type("FakeRun", (), {"id": "test-run-id"})()
    with patch("app.prompt_assembly.assembly_service.trace_service.create_assembly_run", mock_run):
        yield mock_run


@pytest.fixture
def service():
    return PromptAssemblyService()


@pytest.mark.asyncio
async def test_basic_assembly(service):
    blocks = [
        _block("system", kind="core_system", order=0, content="You are a helper."),
        _block("contract", kind="output_contract", order=100, content="Output JSON."),
    ]
    result = await service.assemble(
        db=AsyncMock(), module_scope="news_bulletin", step_key="script",
        provider_name="kie_ai", settings_snapshot={}, block_snapshot=blocks, data_snapshot={},
        user_content="Test input",
    )
    assert isinstance(result, AssemblyResult)
    assert "You are a helper." in result.final_prompt_text
    assert "Output JSON." in result.final_prompt_text
    assert len(result.included_blocks) == 2
    assert len(result.skipped_blocks) == 0


@pytest.mark.asyncio
async def test_condition_skips_block(service):
    blocks = [
        _block("system", kind="core_system", order=0, content="System."),
        _block("normalize", order=10, condition_type="settings_boolean",
               condition_config={"settings_key": "normalize_enabled"}, content="Normalize rules."),
    ]
    result = await service.assemble(
        db=AsyncMock(), module_scope="news_bulletin", step_key="script",
        provider_name="kie_ai", settings_snapshot={"normalize_enabled": False},
        block_snapshot=blocks, data_snapshot={},
    )
    assert len(result.included_blocks) == 1
    assert len(result.skipped_blocks) == 1
    assert result.skipped_blocks[0].block_key == "normalize"
    assert result.skipped_blocks[0].reason_code == "skipped_by_setting"


@pytest.mark.asyncio
async def test_template_rendering_with_data(service):
    blocks = [
        _block("context", kind="context_block", order=0,
               condition_type="data_presence",
               condition_config={"data_key": "category"},
               content="Kategori: {{category}}"),
    ]
    result = await service.assemble(
        db=AsyncMock(), module_scope="news_bulletin", step_key="script",
        provider_name="kie_ai", settings_snapshot={}, block_snapshot=blocks,
        data_snapshot={"category": "gundem"},
    )
    assert len(result.included_blocks) == 1
    assert result.included_blocks[0].rendered_text == "Kategori: gundem"


@pytest.mark.asyncio
async def test_determinism(service):
    """Same snapshots must produce same final prompt -- 3 times."""
    blocks = [
        _block("a", order=0, content="First."),
        _block("b", order=10, content="Second."),
        _block("c", order=20, condition_type="settings_boolean",
               condition_config={"settings_key": "c_enabled"}, content="Third."),
    ]
    settings = {"c_enabled": True}
    results = []
    for _ in range(3):
        r = await service.assemble(
            db=AsyncMock(), module_scope="test", step_key="script",
            provider_name="kie_ai", settings_snapshot=settings,
            block_snapshot=blocks, data_snapshot={},
        )
        results.append(r.final_prompt_text)
    assert results[0] == results[1] == results[2]


@pytest.mark.asyncio
async def test_order_stability(service):
    blocks = [
        _block("c", order=20, content="C."),
        _block("a", order=0, content="A."),
        _block("b", order=10, content="B."),
    ]
    result = await service.assemble(
        db=AsyncMock(), module_scope="test", step_key="script",
        provider_name="kie_ai", settings_snapshot={}, block_snapshot=blocks, data_snapshot={},
    )
    assert result.final_prompt_text == "A.\n\nB.\n\nC."


@pytest.mark.asyncio
async def test_module_scope_filtering(service):
    blocks = [
        _block("global", order=0, content="Global.", module_scope=None),
        _block("nb_only", order=10, content="NB.", module_scope="news_bulletin"),
        _block("sv_only", order=20, content="SV.", module_scope="standard_video"),
    ]
    result = await service.assemble(
        db=AsyncMock(), module_scope="news_bulletin", step_key="script",
        provider_name="kie_ai", settings_snapshot={}, block_snapshot=blocks, data_snapshot={},
    )
    keys = [b.block_key for b in result.included_blocks]
    assert "global" in keys
    assert "nb_only" in keys
    assert "sv_only" not in keys


@pytest.mark.asyncio
async def test_payload_has_messages(service):
    blocks = [_block("sys", order=0, content="System prompt.")]
    result = await service.assemble(
        db=AsyncMock(), module_scope="test", step_key="script",
        provider_name="kie_ai", settings_snapshot={}, block_snapshot=blocks,
        data_snapshot={}, user_content="User input here", model="gemini-2.5-flash",
    )
    payload = result.final_payload
    assert payload["messages"][0]["role"] == "system"
    assert "System prompt." in payload["messages"][0]["content"]
    assert payload["messages"][1]["role"] == "user"
    assert payload["messages"][1]["content"] == "User input here"
    assert payload["model"] == "gemini-2.5-flash"
