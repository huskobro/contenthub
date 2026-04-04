"""
M3-C1 Provider Registry testleri.

Test kapsamı:
  1.  ProviderCapability enum değerleri doğru mu
  2.  register() + get_primary() doğru provider döner
  3.  get_chain() öncelik sırasına göre sıralı mı
  4.  get_primary() kayıtlı değilse ProviderNotFoundError
  5.  register() iki kez aynı capability, farklı priority → zincir doğru
  6.  set_default() + get_default_provider_id() çalışıyor
  7.  resolve_and_invoke() primary başarılı → trace'de resolution_role: "primary"
  8.  resolve_and_invoke() primary fail → fallback denenir, trace'de resolution_role: "fallback"
  9.  resolve_and_invoke() tüm zincir fail → ProviderInvokeError
  10. VisualsStepExecutor providers: list ile çalışıyor, ilk = primary
  11. Dispatcher get_primary(ProviderCapability.LLM) ile ScriptStepExecutor oluşturuyor
  12. _build_executor modül seviyesinde artık yok (import edilemiyor)
"""

import pytest

from app.providers.capability import ProviderCapability
from app.providers.base import BaseProvider, ProviderOutput
from app.providers.registry import ProviderRegistry, ProviderEntry
from app.providers.resolution import resolve_and_invoke
from app.providers.exceptions import ProviderInvokeError, ProviderNotFoundError
from app.modules.standard_video.executors.visuals import VisualsStepExecutor
from app.jobs.dispatcher import _build_executor_from_registry


# ---------------------------------------------------------------------------
# Test yardımcıları — sahte provider'lar
# ---------------------------------------------------------------------------

class _FakeProvider(BaseProvider):
    """Test için sahte provider. İstendiğinde başarısız olabilir."""

    def __init__(self, pid: str, cap: ProviderCapability, fail: bool = False) -> None:
        self._pid = pid
        self._cap = cap
        self._fail = fail

    def provider_id(self) -> str:
        return self._pid

    def capability(self) -> ProviderCapability:
        return self._cap

    async def invoke(self, input_data: dict) -> ProviderOutput:
        if self._fail:
            raise ProviderInvokeError(self._pid, "Sahte hata — test amaçlı")
        return ProviderOutput(
            result={"ok": True, "by": self._pid},
            trace={"provider_id": self._pid},
            provider_id=self._pid,
        )


# ---------------------------------------------------------------------------
# Test 1: ProviderCapability enum değerleri
# ---------------------------------------------------------------------------

def test_capability_enum_degerler():
    """ProviderCapability enum değerleri beklenen string'lerle eşleşmeli."""
    assert ProviderCapability.LLM == "llm"
    assert ProviderCapability.TTS == "tts"
    assert ProviderCapability.VISUALS == "visuals"


def test_capability_enum_str_karsilastirma():
    """ProviderCapability, str karşılaştırmasında geriye dönük uyumlu olmalı."""
    assert ProviderCapability.LLM == "llm"
    assert "llm" == ProviderCapability.LLM


# ---------------------------------------------------------------------------
# Test 2: register() + get_primary()
# ---------------------------------------------------------------------------

def test_register_ve_get_primary():
    """register() sonrası get_primary() kayıtlı provider'ı döner."""
    registry = ProviderRegistry()
    provider = _FakeProvider("llm_test", ProviderCapability.LLM)
    registry.register(provider, ProviderCapability.LLM, is_primary=True)
    result = registry.get_primary(ProviderCapability.LLM)
    assert result is provider


# ---------------------------------------------------------------------------
# Test 3: get_chain() öncelik sırasına göre sıralı
# ---------------------------------------------------------------------------

def test_get_chain_oncelik_sirasi():
    """get_chain() primary'leri önce, fallback'leri sonra öncelik sırasıyla döner."""
    registry = ProviderRegistry()
    p1 = _FakeProvider("primary_1", ProviderCapability.VISUALS)
    p2 = _FakeProvider("fallback_1", ProviderCapability.VISUALS)
    p3 = _FakeProvider("fallback_2", ProviderCapability.VISUALS)

    registry.register(p1, ProviderCapability.VISUALS, is_primary=True, priority=0)
    registry.register(p3, ProviderCapability.VISUALS, is_primary=False, priority=5)
    registry.register(p2, ProviderCapability.VISUALS, is_primary=False, priority=1)

    chain = registry.get_chain(ProviderCapability.VISUALS)
    assert chain[0] is p1, "İlk eleman primary olmalı"
    assert chain[1] is p2, "İkinci eleman düşük öncelikli fallback olmalı"
    assert chain[2] is p3, "Üçüncü eleman yüksek öncelikli fallback olmalı"


# ---------------------------------------------------------------------------
# Test 4: get_primary() kayıtlı değilse ProviderNotFoundError
# ---------------------------------------------------------------------------

def test_get_primary_kayitli_degil():
    """Kayıtlı provider yoksa ProviderNotFoundError fırlatılmalı."""
    registry = ProviderRegistry()
    with pytest.raises(ProviderNotFoundError):
        registry.get_primary(ProviderCapability.TTS)


def test_get_chain_kayitli_degil():
    """Zincirde provider yoksa ProviderNotFoundError fırlatılmalı."""
    registry = ProviderRegistry()
    with pytest.raises(ProviderNotFoundError):
        registry.get_chain(ProviderCapability.LLM)


# ---------------------------------------------------------------------------
# Test 5: Aynı capability, farklı priority → zincir doğru
# ---------------------------------------------------------------------------

def test_ayni_capability_farkli_priority():
    """Aynı capability için iki kayıt yapıldığında zincir öncelik sırasında döner."""
    registry = ProviderRegistry()
    yuksek = _FakeProvider("llm_hiz_1", ProviderCapability.LLM)
    dusuk = _FakeProvider("llm_hiz_0", ProviderCapability.LLM)

    registry.register(yuksek, ProviderCapability.LLM, is_primary=True, priority=10)
    registry.register(dusuk, ProviderCapability.LLM, is_primary=True, priority=0)

    chain = registry.get_chain(ProviderCapability.LLM)
    # priority=0 daha önce gelir
    assert chain[0] is dusuk
    assert chain[1] is yuksek


# ---------------------------------------------------------------------------
# Test 6: set_default() + get_default_provider_id()
# ---------------------------------------------------------------------------

def test_set_default_ve_get_default():
    """set_default() sonrası get_default_provider_id() doğru ID'yi döner."""
    registry = ProviderRegistry()
    p1 = _FakeProvider("llm_a", ProviderCapability.LLM)
    p2 = _FakeProvider("llm_b", ProviderCapability.LLM)
    registry.register(p1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(p2, ProviderCapability.LLM, is_primary=True, priority=1)

    assert registry.get_default_provider_id(ProviderCapability.LLM) is None

    registry.set_default(ProviderCapability.LLM, "llm_b")
    assert registry.get_default_provider_id(ProviderCapability.LLM) == "llm_b"

    # Admin default kayıtlı provider'a işaret ediyorsa get_primary() onu döner
    result = registry.get_primary(ProviderCapability.LLM)
    assert result is p2


# ---------------------------------------------------------------------------
# Test 7: resolve_and_invoke() primary başarılı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_primary_basarili():
    """Primary başarılıysa trace'de resolution_role='primary' olmalı."""
    registry = ProviderRegistry()
    provider = _FakeProvider("llm_ok", ProviderCapability.LLM)
    registry.register(provider, ProviderCapability.LLM, is_primary=True)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})
    assert output.trace["resolution_role"] == "primary"
    assert output.trace["resolved_by"] == "provider_registry"
    assert output.result["by"] == "llm_ok"


# ---------------------------------------------------------------------------
# Test 8: resolve_and_invoke() primary fail → fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_fallback():
    """Primary hatalıysa fallback denenmeli, trace'de resolution_role='fallback' olmalı."""
    registry = ProviderRegistry()
    primary = _FakeProvider("llm_fail", ProviderCapability.LLM, fail=True)
    fallback = _FakeProvider("llm_fallback", ProviderCapability.LLM, fail=False)
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})
    assert output.trace["resolution_role"] == "fallback"
    assert output.result["by"] == "llm_fallback"


# ---------------------------------------------------------------------------
# Test 9: resolve_and_invoke() tüm zincir fail → ProviderInvokeError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_tum_zincir_basarisiz():
    """Tüm provider'lar başarısızsa ProviderInvokeError fırlatılmalı."""
    registry = ProviderRegistry()
    p1 = _FakeProvider("llm_fail_1", ProviderCapability.LLM, fail=True)
    p2 = _FakeProvider("llm_fail_2", ProviderCapability.LLM, fail=True)
    registry.register(p1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(p2, ProviderCapability.LLM, is_primary=False, priority=1)

    with pytest.raises(ProviderInvokeError):
        await resolve_and_invoke(registry, ProviderCapability.LLM, {})


# ---------------------------------------------------------------------------
# Test 10: VisualsStepExecutor providers: list ile çalışıyor
# ---------------------------------------------------------------------------

def test_visuals_executor_providers_list():
    """VisualsStepExecutor providers list ile oluşturulabilmeli."""
    p1 = _FakeProvider("pexels_mock", ProviderCapability.VISUALS)
    p2 = _FakeProvider("pixabay_mock", ProviderCapability.VISUALS)
    executor = VisualsStepExecutor(providers=[p1, p2])
    assert executor._providers[0] is p1
    assert executor._providers[1] is p2


def test_visuals_executor_bos_providers():
    """VisualsStepExecutor boş liste ile oluşturulunca ValueError fırlatmalı."""
    with pytest.raises(ValueError):
        VisualsStepExecutor(providers=[])


# ---------------------------------------------------------------------------
# Test 11: Dispatcher get_primary(LLM) ile ScriptStepExecutor oluşturuyor
# ---------------------------------------------------------------------------

def test_dispatcher_script_executor_registry_uzerinden():
    """_build_executor_from_registry ScriptStepExecutor için LLM provider inject eder."""
    from app.modules.standard_video.executors import ScriptStepExecutor

    registry = ProviderRegistry()
    llm = _FakeProvider("llm_test", ProviderCapability.LLM)
    registry.register(llm, ProviderCapability.LLM, is_primary=True)

    executor = _build_executor_from_registry(ScriptStepExecutor, registry)
    assert isinstance(executor, ScriptStepExecutor)
    # M3-C2: executor artık _llm değil _registry tutuyor
    assert executor._registry is registry


# ---------------------------------------------------------------------------
# Test 12: _build_executor modül seviyesinde artık yok
# ---------------------------------------------------------------------------

def test_build_executor_kaldirildi():
    """Eski _build_executor fonksiyonu dispatcher'dan kaldırılmış olmalı."""
    import app.jobs.dispatcher as dispatcher_module
    assert not hasattr(dispatcher_module, "_build_executor"), (
        "_build_executor hâlâ dispatcher.py'de mevcut — M3-C1 hedefi bu fonksiyonu kaldırmaktı."
    )
