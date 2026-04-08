"""
M3-C3 Testleri — Provider Health, Admin Surface, Cost Seam

Test kapsamı:
  1.  record_outcome başarılı → invoke_count artar, last_used_at güncellenir
  2.  record_outcome hata → error_count artar, last_error güncellenir
  3.  record_outcome birden fazla provider → doğru entry güncellenir
  4.  get_health_snapshot yapısı doğru
  5.  get_health_snapshot — last_used_at ISO format
  6.  set_default + get_health_snapshot → defaults alanı
  7.  GET /providers endpoint 200 döner
  8.  GET /providers endpoint yapısı doğru (capabilities + defaults)
  9.  POST /providers/default geçerli istek → 200
  10. POST /providers/default geçersiz capability → 422
  11. POST /providers/default bilinmeyen provider_id → 404
  12. POST /providers/{id}/enable → 200
  13. POST /providers/{id}/disable → 200
  14. POST /providers/{id}/disable bilinmeyen id → 404
  15. Devre dışı provider get_chain dışında kalır
  16. KieAiProvider trace'inde cost_estimate_usd alanı var
  17. resolve_and_invoke başarılı sonrası record_outcome çağrılır
  18. resolve_and_invoke hata sonrası record_outcome çağrılır
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.capability import ProviderCapability
from app.providers.exceptions import ProviderInvokeError, ProviderNotFoundError
from app.providers.registry import ProviderRegistry, ProviderEntry
from app.providers.resolution import resolve_and_invoke


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

class _FakeProvider(BaseProvider):
    """Test amaçlı sahte provider."""

    def __init__(self, pid: str, cap: ProviderCapability) -> None:
        self._pid = pid
        self._cap = cap

    def provider_id(self) -> str:
        return self._pid

    def capability(self) -> ProviderCapability:
        return self._cap

    async def invoke(self, input_data: dict) -> ProviderOutput:
        return ProviderOutput(
            result={"ok": True},
            trace={"provider_id": self._pid},
            provider_id=self._pid,
        )


class _FailingProvider(BaseProvider):
    """Her invoke'ta hata fırlatan provider."""

    def __init__(self, pid: str, cap: ProviderCapability) -> None:
        self._pid = pid
        self._cap = cap

    def provider_id(self) -> str:
        return self._pid

    def capability(self) -> ProviderCapability:
        return self._cap

    async def invoke(self, input_data: dict) -> ProviderOutput:
        raise ProviderInvokeError(self._pid, "Kasıtlı test hatası")


# ---------------------------------------------------------------------------
# Test 1-3: record_outcome
# ---------------------------------------------------------------------------

def test_record_outcome_basarili_invoke_count_artar():
    """Test 1: Başarılı invoke sonrası invoke_count artar, last_used_at güncellenir."""
    registry = ProviderRegistry()
    p = _FakeProvider("test_llm", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True)

    registry.record_outcome(ProviderCapability.LLM, "test_llm", True, 100)

    entries = registry.list_by_capability(ProviderCapability.LLM)
    assert len(entries) == 1
    e = entries[0]
    assert e.invoke_count == 1
    assert e.error_count == 0
    assert e.last_error is None
    assert e.last_used_at is not None
    assert e.last_latency_ms == 100


def test_record_outcome_hata_error_count_artar():
    """Test 2: Hatalı invoke sonrası error_count artar, last_error güncellenir."""
    registry = ProviderRegistry()
    p = _FakeProvider("test_llm", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True)

    registry.record_outcome(ProviderCapability.LLM, "test_llm", False, 50, "Bağlantı hatası")

    e = registry.list_by_capability(ProviderCapability.LLM)[0]
    assert e.invoke_count == 1
    assert e.error_count == 1
    assert e.last_error == "Bağlantı hatası"
    assert e.last_used_at is None  # Hata olduğunda güncellenmez


def test_record_outcome_dogru_provider_guncellenir():
    """Test 3: Birden fazla provider varken yalnızca ilgili entry güncellenir."""
    registry = ProviderRegistry()
    p1 = _FakeProvider("primary_llm", ProviderCapability.LLM)
    p2 = _FakeProvider("fallback_llm", ProviderCapability.LLM)
    registry.register(p1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(p2, ProviderCapability.LLM, is_primary=False, priority=1)

    registry.record_outcome(ProviderCapability.LLM, "fallback_llm", True, 200)

    entries = {e.provider.provider_id(): e for e in registry.list_by_capability(ProviderCapability.LLM)}
    assert entries["primary_llm"].invoke_count == 0
    assert entries["fallback_llm"].invoke_count == 1


# ---------------------------------------------------------------------------
# Test 4-5: get_health_snapshot
# ---------------------------------------------------------------------------

def test_get_health_snapshot_yapi_dogru():
    """Test 4: get_health_snapshot doğru alanları içeriyor."""
    registry = ProviderRegistry()
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True, priority=0)

    snapshot = registry.get_health_snapshot()
    assert "llm" in snapshot
    assert len(snapshot["llm"]) == 1

    entry = snapshot["llm"][0]
    assert entry["provider_id"] == "kie_ai"
    assert entry["is_primary"] is True
    assert entry["priority"] == 0
    assert entry["enabled"] is True
    assert entry["invoke_count"] == 0
    assert entry["error_count"] == 0
    assert entry["last_error"] is None
    assert entry["last_used_at"] is None
    assert entry["last_latency_ms"] is None


def test_get_health_snapshot_last_used_at_iso_format():
    """Test 5: last_used_at ISO format string olarak döner."""
    registry = ProviderRegistry()
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True)

    registry.record_outcome(ProviderCapability.LLM, "kie_ai", True, 150)
    snapshot = registry.get_health_snapshot()

    last_used = snapshot["llm"][0]["last_used_at"]
    assert last_used is not None
    # ISO format parse edilebilmeli
    parsed = datetime.fromisoformat(last_used)
    assert parsed.tzinfo is not None  # UTC timezone dahil


# ---------------------------------------------------------------------------
# Test 6: set_default + health snapshot
# ---------------------------------------------------------------------------

def test_set_default_health_snapshot_defaults():
    """Test 6: set_default sonrası get_health_snapshot'tan erişilebilir."""
    registry = ProviderRegistry()
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True)

    registry.set_default(ProviderCapability.LLM, "kie_ai")

    assert registry.get_default_provider_id(ProviderCapability.LLM) == "kie_ai"


# ---------------------------------------------------------------------------
# Test 7-14: Admin endpoint testleri
# ---------------------------------------------------------------------------

def _make_test_app():
    """Test için izole FastAPI app oluşturur."""
    from fastapi import FastAPI
    from app.providers.router import router as providers_router

    app = FastAPI()
    app.include_router(providers_router, prefix="/api/v1")
    return app


@pytest.fixture
def test_registry_clean(monkeypatch):
    """Her test için temiz ProviderRegistry döner."""
    clean = ProviderRegistry()
    monkeypatch.setattr("app.providers.router.provider_registry", clean)
    return clean


def test_get_providers_200(test_registry_clean):
    """Test 7: GET /providers 200 döner."""
    app = _make_test_app()
    client = TestClient(app)

    response = client.get("/api/v1/providers")
    assert response.status_code == 200


def test_get_providers_yapi_dogru(test_registry_clean):
    """Test 8: GET /providers yanıtında capabilities ve defaults alanları var."""
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    test_registry_clean.register(p, ProviderCapability.LLM, is_primary=True)

    app = _make_test_app()
    client = TestClient(app)

    response = client.get("/api/v1/providers")
    data = response.json()

    assert "capabilities" in data
    assert "defaults" in data
    assert "llm" in data["capabilities"]
    assert len(data["capabilities"]["llm"]) == 1
    assert data["capabilities"]["llm"][0]["provider_id"] == "kie_ai"


def test_set_default_gecerli_istek(test_registry_clean):
    """Test 9: POST /providers/default geçerli istek → 200."""
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    test_registry_clean.register(p, ProviderCapability.LLM, is_primary=True)

    app = _make_test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/providers/default",
        json={"capability": "llm", "provider_id": "kie_ai"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    # Registry'de güncellendi mi?
    assert test_registry_clean.get_default_provider_id(ProviderCapability.LLM) == "kie_ai"


def test_set_default_gecersiz_capability(test_registry_clean):
    """Test 10: POST /providers/default geçersiz capability → 422."""
    app = _make_test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/providers/default",
        json={"capability": "bilinmeyen", "provider_id": "some_provider"},
    )
    assert response.status_code == 422


def test_set_default_bilinmeyen_provider_id(test_registry_clean):
    """Test 11: POST /providers/default kayıtlı olmayan provider_id → 404."""
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    test_registry_clean.register(p, ProviderCapability.LLM, is_primary=True)

    app = _make_test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/providers/default",
        json={"capability": "llm", "provider_id": "kayitsiz_provider"},
    )
    assert response.status_code == 404


def test_enable_provider_200(test_registry_clean):
    """Test 12: POST /providers/{id}/enable → 200."""
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    test_registry_clean.register(p, ProviderCapability.LLM, is_primary=True)

    app = _make_test_app()
    client = TestClient(app)

    response = client.post("/api/v1/providers/kie_ai/enable")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_disable_provider_200(test_registry_clean):
    """Test 13: POST /providers/{id}/disable → 200."""
    p = _FakeProvider("kie_ai", ProviderCapability.LLM)
    test_registry_clean.register(p, ProviderCapability.LLM, is_primary=True)

    app = _make_test_app()
    client = TestClient(app)

    response = client.post("/api/v1/providers/kie_ai/disable")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_disable_provider_bilinmeyen_id(test_registry_clean):
    """Test 14: POST /providers/{id}/disable bilinmeyen id → 404."""
    app = _make_test_app()
    client = TestClient(app)

    response = client.post("/api/v1/providers/yok_olan/disable")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test 15: Devre dışı provider get_chain dışında kalır
# ---------------------------------------------------------------------------

def test_disabled_provider_get_chain_disinda_kalir():
    """Test 15: enable=False olan provider get_chain sonucuna dahil edilmez."""
    registry = ProviderRegistry()
    p1 = _FakeProvider("primary", ProviderCapability.LLM)
    p2 = _FakeProvider("fallback", ProviderCapability.LLM)
    registry.register(p1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(p2, ProviderCapability.LLM, is_primary=False, priority=1)

    # p1'i devre dışı bırak
    registry.list_by_capability(ProviderCapability.LLM)[0].enabled = False

    chain = registry.get_chain(ProviderCapability.LLM)
    provider_ids = [p.provider_id() for p in chain]
    assert "primary" not in provider_ids
    assert "fallback" in provider_ids


# ---------------------------------------------------------------------------
# Test 16: KieAiProvider cost_estimate_usd seam
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kie_ai_provider_cost_estimate_usd_trace_alani_var():
    """Test 16: KieAiProvider invoke sonrası trace'de cost_estimate_usd alanı bulunur."""
    from app.providers.llm.kie_ai_provider import KieAiProvider

    provider = KieAiProvider(api_key="test-key")

    mock_result = ("Test yanıt", "stop", {"prompt_tokens": 100, "completion_tokens": 50}, 200)

    with patch(
        "app.providers.llm.kie_ai_provider.openai_compat_chat_completions",
        new=AsyncMock(return_value=mock_result),
    ):
        output = await provider.invoke({"messages": [{"role": "user", "content": "test"}]})

    assert "cost_estimate_usd" in output.trace
    assert isinstance(output.trace["cost_estimate_usd"], float)
    # 100 input * 0.09 + 50 output * 0.75 = 9 + 37.5 = 46.5 / 1M = 0.0000465
    assert output.trace["cost_estimate_usd"] == pytest.approx(0.0000465, rel=1e-4)


# ---------------------------------------------------------------------------
# Test 17-18: resolve_and_invoke record_outcome çağrısı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_basarili_record_outcome_cagirilir():
    """Test 17: resolve_and_invoke başarılı sonrası record_outcome çağrılır."""
    registry = ProviderRegistry()
    p = _FakeProvider("fake_llm", ProviderCapability.LLM)
    registry.register(p, ProviderCapability.LLM, is_primary=True)

    await resolve_and_invoke(registry, ProviderCapability.LLM, {"messages": []})

    entry = registry.list_by_capability(ProviderCapability.LLM)[0]
    assert entry.invoke_count == 1
    assert entry.error_count == 0
    assert entry.last_used_at is not None


@pytest.mark.asyncio
async def test_resolve_and_invoke_hata_record_outcome_cagirilir():
    """Test 18: resolve_and_invoke hata sonrası record_outcome çağrılır, fallback da kaydedilir."""
    registry = ProviderRegistry()
    failing = _FailingProvider("failing_llm", ProviderCapability.LLM)
    fallback = _FakeProvider("fallback_llm", ProviderCapability.LLM)
    registry.register(failing, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    await resolve_and_invoke(registry, ProviderCapability.LLM, {"messages": []})

    entries = {e.provider.provider_id(): e for e in registry.list_by_capability(ProviderCapability.LLM)}
    # Primary başarısız → error_count 1
    assert entries["failing_llm"].error_count == 1
    assert entries["failing_llm"].invoke_count == 1
    # Fallback başarılı → invoke_count 1, error_count 0
    assert entries["fallback_llm"].invoke_count == 1
    assert entries["fallback_llm"].error_count == 0
    assert entries["fallback_llm"].last_used_at is not None
