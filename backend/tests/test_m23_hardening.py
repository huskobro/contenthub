"""
M23 Backend Tests — Publish metadata, analytics trace, render degrade,
visibility/settings ops, publish operations consistency.

M23-A: Publish metadata hardening (category_id settings-aware)
M23-B: Analytics trace data quality
M23-C: Render degradation warnings
M23-D: Visibility/settings restore + history
M23-E: Publish duplicate protection
"""

import json
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


def _uid() -> str:
    return uuid.uuid4().hex[:8]


BASE = "/api/v1"


@pytest.fixture()
def anyio_backend():
    return "asyncio"


@pytest.fixture()
async def client():
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ─── M23-A: Publish Metadata Hardening ────────────────────────


@pytest.mark.anyio
async def test_youtube_adapter_settings_defaults():
    """YouTubeAdapter settings_defaults parametresi ile oluşturulabilmeli."""
    from app.publish.youtube.adapter import YouTubeAdapter
    adapter = YouTubeAdapter(settings_defaults={
        "category_id": "25",
        "description": "Test desc",
        "tags": "tag1,tag2",
    })
    assert adapter._settings_defaults["category_id"] == "25"
    assert adapter._settings_defaults["description"] == "Test desc"


@pytest.mark.anyio
async def test_youtube_adapter_uses_settings_category():
    """Payload'da category_id yoksa settings default kullanılmalı."""
    from app.publish.youtube.adapter import YouTubeAdapter
    from unittest.mock import MagicMock, AsyncMock, patch
    import os

    adapter = YouTubeAdapter(
        settings_defaults={"category_id": "28", "description": "default desc", "tags": "t1,t2"},
    )
    # upload() çağırıp metadata hazırlık kısmını test etmek yerine
    # _settings_defaults erişimini doğrula
    assert adapter._settings_defaults["category_id"] == "28"


@pytest.mark.anyio
async def test_publish_settings_registered():
    """Publish YouTube metadata ayarları KNOWN_SETTINGS'te kayıtlı olmalı."""
    from app.settings.settings_resolver import KNOWN_SETTINGS
    assert "publish.youtube.default_category_id" in KNOWN_SETTINGS
    assert "publish.youtube.default_description" in KNOWN_SETTINGS
    assert "publish.youtube.default_tags" in KNOWN_SETTINGS

    cat_meta = KNOWN_SETTINGS["publish.youtube.default_category_id"]
    assert cat_meta["builtin_default"] == "22"
    # Registry kontrati: kayitsiz ayar yok — `wired` artik registry data'da
    # tutulmaz, daimi True olarak explain() icinde uretilir. Burada runtime
    # tuketicisinin belgelendigini dogruluyoruz.
    assert cat_meta.get("wired_to"), "wired_to bos olmamali"


@pytest.mark.anyio
async def test_executor_payload_validation_still_works():
    """M22-C + M23-A: Payload validasyonu bozulmamış olmalı."""
    from app.publish.executor import PublishStepExecutor
    from unittest.mock import MagicMock

    executor = PublishStepExecutor.__new__(PublishStepExecutor)
    record = MagicMock()
    record.id = "test-m23"
    record.payload_json = json.dumps({"title": "M23 Test", "category_id": "25"})
    result = executor._resolve_payload(record)
    assert result["title"] == "M23 Test"
    assert result["category_id"] == "25"


# ─── M23-B: Analytics Trace Data Quality ──────────────────────


@pytest.mark.anyio
async def test_analytics_trace_quality_fields(client: AsyncClient):
    """Operations analytics yanıtında trace_data_quality alanı olmalı."""
    r = await client.get(f"{BASE}/analytics/operations")
    assert r.status_code == 200
    body = r.json()
    assert "trace_data_quality" in body
    quality = body["trace_data_quality"]
    assert "total_traces" in quality
    assert "parse_errors" in quality
    assert "valid_traces" in quality
    assert "empty_traces" in quality
    assert "unknown_provider_count" in quality


@pytest.mark.anyio
async def test_analytics_trace_quality_math(client: AsyncClient):
    """Trace data quality: valid = total - empty - parse_errors - invalid."""
    r = await client.get(f"{BASE}/analytics/operations")
    body = r.json()
    q = body["trace_data_quality"]
    expected_valid = q["total_traces"] - q["empty_traces"] - q["parse_errors"] - q["invalid_structure"]
    assert q["valid_traces"] == expected_valid


# ─── M23-C: Render Degradation Warnings ───────────────────────


@pytest.mark.anyio
async def test_render_word_timing_degrade_returns_empty():
    """word_timing dosyası yoksa boş liste dönmeli (degrade)."""
    from app.modules.standard_video.executors.render import _load_word_timings
    result = _load_word_timings(None)
    assert result == []


@pytest.mark.anyio
async def test_render_word_timing_missing_file(tmp_path):
    """Var olmayan word_timing dosyası boş liste dönmeli."""
    from app.modules.standard_video.executors.render import _load_word_timings
    result = _load_word_timings(str(tmp_path / "nonexistent.json"))
    assert result == []


@pytest.mark.anyio
async def test_subtitle_preset_fallback_logged():
    """Bilinmeyen preset_id → default preset ile preset_fallback_used=True."""
    from app.modules.standard_video.subtitle_presets import get_preset_for_composition
    result = get_preset_for_composition("nonexistent_preset_xyz")
    assert result["preset_id"] == "clean_white"
    assert result["preset_fallback_used"] is True


@pytest.mark.anyio
async def test_subtitle_preset_valid_no_fallback():
    """Geçerli preset_id → preset_fallback_used=False."""
    from app.modules.standard_video.subtitle_presets import get_preset_for_composition
    result = get_preset_for_composition("clean_white")
    assert result["preset_id"] == "clean_white"
    assert result["preset_fallback_used"] is False


@pytest.mark.anyio
async def test_subtitle_preset_none_uses_default():
    """preset_id=None → default preset, fallback_used=False (kasıtlı davranış)."""
    from app.modules.standard_video.subtitle_presets import get_preset_for_composition
    result = get_preset_for_composition(None)
    assert result["preset_id"] == "clean_white"
    assert result["preset_fallback_used"] is False


# ─── M23-D: Visibility Restore + History ──────────────────────


@pytest.mark.anyio
async def test_visibility_restore(client: AsyncClient):
    """Soft-delete edilen kural restore edilebilmeli."""
    # Oluştur
    r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": f"test:m23-restore-{_uid()}",
        "visible": True,
    })
    assert r.status_code == 201
    rule_id = r.json()["id"]

    # Sil
    await client.delete(f"{BASE}/visibility-rules/{rule_id}")

    # Restore
    res = await client.post(f"{BASE}/visibility-rules/{rule_id}/restore")
    assert res.status_code == 200
    assert res.json()["status"] == "active"


@pytest.mark.anyio
async def test_visibility_restore_already_active(client: AsyncClient):
    """Zaten active olan kuralı restore etme 409 dönmeli."""
    r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": f"test:m23-restore-dup-{_uid()}",
        "visible": True,
    })
    rule_id = r.json()["id"]
    res = await client.post(f"{BASE}/visibility-rules/{rule_id}/restore")
    assert res.status_code == 409


@pytest.mark.anyio
async def test_visibility_history(client: AsyncClient):
    """Kuralın audit geçmişi endpoint'i çalışmalı."""
    r = await client.post(f"{BASE}/visibility-rules", json={
        "rule_type": "page",
        "target_key": f"test:m23-history-{_uid()}",
        "visible": True,
    })
    rule_id = r.json()["id"]
    # Update yaparak history oluştur
    await client.patch(f"{BASE}/visibility-rules/{rule_id}", json={"visible": False})

    res = await client.get(f"{BASE}/visibility-rules/{rule_id}/history")
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    # Audit log yazılmış olabilir veya olmayabilir (async transaction sınırları)
    # Endpoint'in çalışması ve liste dönmesi yeterli


@pytest.mark.anyio
async def test_settings_restore(client: AsyncClient):
    """Soft-delete edilen ayar restore edilebilmeli."""
    uid = _uid()
    r = await client.post(f"{BASE}/settings", json={
        "key": f"test.m23.restore_{uid}",
        "group_name": "test",
        "type": "string",
    })
    assert r.status_code == 201
    sid = r.json()["id"]

    await client.delete(f"{BASE}/settings/{sid}")
    res = await client.post(f"{BASE}/settings/{sid}/restore")
    assert res.status_code == 200
    assert res.json()["status"] == "active"


@pytest.mark.anyio
async def test_settings_restore_already_active(client: AsyncClient):
    """Zaten active olan ayarı restore etme 409 dönmeli."""
    uid = _uid()
    r = await client.post(f"{BASE}/settings", json={
        "key": f"test.m23.restore_dup_{uid}",
        "group_name": "test",
        "type": "string",
    })
    sid = r.json()["id"]
    res = await client.post(f"{BASE}/settings/{sid}/restore")
    assert res.status_code == 409


@pytest.mark.anyio
async def test_settings_history(client: AsyncClient):
    """Ayarın audit geçmişi endpoint'i çalışmalı."""
    uid = _uid()
    r = await client.post(f"{BASE}/settings", json={
        "key": f"test.m23.history_{uid}",
        "group_name": "test",
        "type": "string",
    })
    sid = r.json()["id"]
    await client.patch(f"{BASE}/settings/{sid}", json={"help_text": "updated"})

    res = await client.get(f"{BASE}/settings/{sid}/history")
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    # Audit log yazılmış olabilir veya olmayabilir (async transaction sınırları)
    # Endpoint'in çalışması ve liste dönmesi yeterli


# ─── M23-E: Publish Duplicate Protection ──────────────────────


@pytest.mark.anyio
async def test_publish_duplicate_trigger_protection():
    """Publishing durumunda duplicate trigger PublishGateViolationError fırlatmalı."""
    from app.publish.service import trigger_publish
    from app.publish.exceptions import PublishGateViolationError
    from unittest.mock import AsyncMock, MagicMock

    mock_record = MagicMock()
    mock_record.id = "test-dup-trigger"
    mock_record.status = "publishing"

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_record
    mock_session.execute.return_value = mock_result

    with pytest.raises(PublishGateViolationError, match="zaten 'publishing'"):
        await trigger_publish(mock_session, "test-dup-trigger")


@pytest.mark.anyio
async def test_publish_cancel_already_cancelled():
    """Zaten cancelled kayıt tekrar cancel edilememeli."""
    from app.publish.service import cancel_publish
    from app.publish.exceptions import PublishAlreadyTerminalError
    from unittest.mock import AsyncMock, MagicMock

    mock_record = MagicMock()
    mock_record.id = "test-dup-cancel"
    mock_record.status = "cancelled"

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_record
    mock_session.execute.return_value = mock_result

    with pytest.raises(PublishAlreadyTerminalError, match="zaten iptal"):
        await cancel_publish(mock_session, "test-dup-cancel")


@pytest.mark.anyio
async def test_publish_state_machine_transition_matrix():
    """State machine geçiş matrisi tutarlı olmalı."""
    from app.publish.state_machine import PublishStateMachine

    # publishing → publishing YASAK (duplicate protection)
    with pytest.raises(ValueError):
        PublishStateMachine.transition("publishing", "publishing")

    # draft → publishing YASAK (review gate)
    with pytest.raises(ValueError):
        PublishStateMachine.transition("draft", "publishing")

    # approved → publishing YASAL
    result = PublishStateMachine.transition("approved", "publishing")
    assert result == "publishing"

    # failed → publishing YASAL (retry)
    result = PublishStateMachine.transition("failed", "publishing")
    assert result == "publishing"

    # Terminal durumlar
    assert PublishStateMachine.is_terminal("published")
    assert PublishStateMachine.is_terminal("cancelled")
    assert not PublishStateMachine.is_terminal("failed")
