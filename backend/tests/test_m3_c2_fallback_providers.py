"""
M3-C2 Fallback Provider testleri.

Test kapsamı:
  1.  OpenAICompatProvider — doğru endpoint, capability=LLM, provider_id formatı
  2.  İkinci TTS provider (SystemTTSProvider) — capability=TTS, başarılı dosya yazma
  3.  SystemTTSProvider — output_path eksikse ProviderInvokeError
  4.  resolve_and_invoke — primary fail → fallback denenir, trace'de resolution_role="fallback"
  5.  resolve_and_invoke — trace'de fallback_from primary provider_id'yi içeriyor
  6.  NonRetryableProviderError → fallback yapılmıyor, direkt fırlatılıyor
  7.  InputValidationError → fallback yapılmıyor (NonRetryableProviderError alt sınıfı)
  8.  Registry'ye iki LLM kaydedilince get_chain(LLM) ikisini de priority sırasında döndürüyor
  9.  Primary LLM fail → Fallback LLM kullanılıyor, executor çalışmaya devam ediyor
  10. _build_executor_from_registry hâlâ registry üzerinden çalışıyor (ikinci provider varken)
  11. Yeni provider eklemek sadece provider dosyası + register() ile çözülebiliyor
      (dispatcher kaynak kodu değişmiyor)
  12. OpenAICompatProvider — provider_id model adını içeriyor
  13. OpenAICompatProvider — farklı model için farklı provider_id
  14. SystemTTSProvider — noop=True işareti result ve trace'de var
  15. resolve_and_invoke — primary başarılı → trace'de fallback_from YOK
"""
from __future__ import annotations

import os
import tempfile

import pytest

from app.providers.capability import ProviderCapability
from app.providers.base import BaseProvider, ProviderOutput
from app.providers.registry import ProviderRegistry
from app.providers.resolution import resolve_and_invoke
from app.providers.exceptions import (
    ProviderInvokeError,
    ProviderNotFoundError,
    NonRetryableProviderError,
    InputValidationError,
    ConfigurationError,
)
from app.providers.llm.openai_compat_provider import OpenAICompatProvider
from app.providers.tts.system_tts_provider import SystemTTSProvider
from app.jobs.dispatcher import _build_executor_from_registry


# ---------------------------------------------------------------------------
# Test yardımcıları — sahte provider'lar
# ---------------------------------------------------------------------------

class _FakeProvider(BaseProvider):
    """Test için sahte provider. İstendiğinde başarısız olabilir."""

    def __init__(
        self,
        pid: str,
        cap: ProviderCapability,
        fail: bool = False,
        fail_with: Exception | None = None,
    ) -> None:
        self._pid = pid
        self._cap = cap
        self._fail = fail
        self._fail_with = fail_with

    def provider_id(self) -> str:
        return self._pid

    def capability(self) -> ProviderCapability:
        return self._cap

    async def invoke(self, input_data: dict) -> ProviderOutput:
        if self._fail_with is not None:
            raise self._fail_with
        if self._fail:
            raise ProviderInvokeError(self._pid, "Sahte hata — test amaçlı")
        return ProviderOutput(
            result={"ok": True, "by": self._pid},
            trace={"provider_id": self._pid},
            provider_id=self._pid,
        )


# ---------------------------------------------------------------------------
# Test 1: OpenAICompatProvider — capability ve temel özellikler
# ---------------------------------------------------------------------------

def test_openai_compat_provider_capability():
    """OpenAICompatProvider capability=LLM döner."""
    provider = OpenAICompatProvider(api_key="test-key")
    assert provider.capability() == ProviderCapability.LLM


def test_openai_compat_provider_provider_id_format():
    """OpenAICompatProvider provider_id 'openai_compat_<model>' formatında olmalı."""
    provider = OpenAICompatProvider(api_key="test-key", model="gpt-4o-mini")
    assert provider.provider_id() == "openai_compat_gpt-4o-mini"


# ---------------------------------------------------------------------------
# Test 2: SystemTTSProvider — capability=TTS
# ---------------------------------------------------------------------------

def test_system_tts_provider_capability():
    """SystemTTSProvider capability=TTS döner."""
    provider = SystemTTSProvider()
    assert provider.capability() == ProviderCapability.TTS


def test_system_tts_provider_id():
    """SystemTTSProvider provider_id 'noop_tts_fallback' döner."""
    provider = SystemTTSProvider()
    assert provider.provider_id() == "noop_tts_fallback"


@pytest.mark.asyncio
async def test_system_tts_provider_dosya_yazma():
    """SystemTTSProvider başarıyla boş MP3 dosyası yazar."""
    provider = SystemTTSProvider()
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        output = await provider.invoke({
            "text": "Merhaba dünya",
            "output_path": tmp_path,
        })
        assert output.result["output_path"] == tmp_path
        assert os.path.exists(tmp_path)
        assert os.path.getsize(tmp_path) > 0
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Test 3: SystemTTSProvider — hata durumları
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_system_tts_provider_output_path_eksik():
    """SystemTTSProvider output_path eksikse ProviderInvokeError fırlatır."""
    provider = SystemTTSProvider()
    with pytest.raises(ProviderInvokeError):
        await provider.invoke({"text": "Merhaba"})


@pytest.mark.asyncio
async def test_system_tts_provider_text_eksik():
    """SystemTTSProvider text eksikse ProviderInvokeError fırlatır."""
    provider = SystemTTSProvider()
    with pytest.raises(ProviderInvokeError):
        await provider.invoke({"output_path": "/tmp/test.mp3"})


# ---------------------------------------------------------------------------
# Test 4: resolve_and_invoke — primary fail → fallback, resolution_role="fallback"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_primary_fail_fallback_kullanilir():
    """Primary başarısızsa fallback denenmeli, trace'de resolution_role='fallback'."""
    registry = ProviderRegistry()
    primary = _FakeProvider("llm_fail", ProviderCapability.LLM, fail=True)
    fallback = _FakeProvider("llm_fallback", ProviderCapability.LLM, fail=False)
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})

    assert output.trace["resolution_role"] == "fallback"
    assert output.result["by"] == "llm_fallback"


# ---------------------------------------------------------------------------
# Test 5: trace'de fallback_from primary provider_id'yi içeriyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_fallback_from_alani():
    """Fallback başarılı olduğunda trace'de fallback_from primary provider_id'yi içeriyor."""
    registry = ProviderRegistry()
    primary = _FakeProvider("llm_primary_x", ProviderCapability.LLM, fail=True)
    fallback = _FakeProvider("llm_fallback_y", ProviderCapability.LLM, fail=False)
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})

    assert "fallback_from" in output.trace
    assert output.trace["fallback_from"] == "llm_primary_x"


# ---------------------------------------------------------------------------
# Test 6: NonRetryableProviderError → fallback yapılmıyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_non_retryable_error_fallback_yapmaz():
    """NonRetryableProviderError fırlatıldığında fallback denenmemeli."""
    hata = NonRetryableProviderError("llm_nonretry", "Kritik yapılandırma hatası")
    primary = _FakeProvider("llm_nonretry", ProviderCapability.LLM, fail_with=hata)
    fallback = _FakeProvider("llm_fallback_ok", ProviderCapability.LLM, fail=False)

    registry = ProviderRegistry()
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    with pytest.raises(NonRetryableProviderError):
        await resolve_and_invoke(registry, ProviderCapability.LLM, {})


# ---------------------------------------------------------------------------
# Test 7: InputValidationError → fallback yapılmıyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_input_validation_error_fallback_yapmaz():
    """InputValidationError fırlatıldığında fallback denenmemeli."""
    hata = InputValidationError("llm_val_err", "Geçersiz girdi alanı")
    primary = _FakeProvider("llm_val_err", ProviderCapability.LLM, fail_with=hata)
    fallback = _FakeProvider("llm_fallback_ok", ProviderCapability.LLM, fail=False)

    registry = ProviderRegistry()
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    with pytest.raises(InputValidationError):
        await resolve_and_invoke(registry, ProviderCapability.LLM, {})


# ---------------------------------------------------------------------------
# Test 8: Registry'ye iki LLM kaydedilince get_chain ikisini döndürüyor
# ---------------------------------------------------------------------------

def test_iki_llm_kaydi_get_chain_ikisini_doner():
    """İki LLM kaydı yapıldığında get_chain ikisini priority sırasında döner."""
    registry = ProviderRegistry()
    llm1 = _FakeProvider("llm_primary", ProviderCapability.LLM)
    llm2 = _FakeProvider("openai_compat_gpt-4o-mini", ProviderCapability.LLM)

    registry.register(llm1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(llm2, ProviderCapability.LLM, is_primary=False, priority=1)

    chain = registry.get_chain(ProviderCapability.LLM)
    assert len(chain) == 2
    assert chain[0] is llm1
    assert chain[1] is llm2


# ---------------------------------------------------------------------------
# Test 9: Primary LLM fail → Fallback LLM kullanılıyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_primary_llm_fail_fallback_llm_kullaniliyor():
    """Primary LLM başarısız olunca fallback LLM devreye girip sonuç döner."""
    registry = ProviderRegistry()
    primary_llm = _FakeProvider("kie_ai_gemini_flash", ProviderCapability.LLM, fail=True)
    fallback_llm = _FakeProvider("openai_compat_gpt-4o-mini", ProviderCapability.LLM, fail=False)

    registry.register(primary_llm, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback_llm, ProviderCapability.LLM, is_primary=False, priority=1)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})

    assert output.result["by"] == "openai_compat_gpt-4o-mini"
    assert output.trace["resolution_role"] == "fallback"
    assert output.trace["fallback_from"] == "kie_ai_gemini_flash"


# ---------------------------------------------------------------------------
# Test 10: _build_executor_from_registry registry üzerinden çalışıyor
# ---------------------------------------------------------------------------

def test_build_executor_from_registry_iki_llm_varken():
    """_build_executor_from_registry iki LLM kayıtlı iken registry'nin tamamını inject eder.

    M3-C2: executor artık tek provider değil registry'yi tutuyor.
    resolve_and_invoke executor içinden çağrılır ve primary→fallback zincirini yönetir.
    """
    from app.modules.standard_video.executors import ScriptStepExecutor

    registry = ProviderRegistry()
    primary_llm = _FakeProvider("kie_ai_gemini_flash", ProviderCapability.LLM)
    fallback_llm = _FakeProvider("openai_compat_gpt-4o-mini", ProviderCapability.LLM)

    registry.register(primary_llm, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback_llm, ProviderCapability.LLM, is_primary=False, priority=1)

    executor = _build_executor_from_registry(ScriptStepExecutor, registry)
    assert isinstance(executor, ScriptStepExecutor)
    # M3-C2: executor registry'nin tamamını tutuyor — fallback zinciri resolve_and_invoke'a devredildi
    assert executor._registry is registry
    # Registry'de iki LLM provider kayıtlı
    assert len(registry.get_chain(ProviderCapability.LLM)) == 2


# ---------------------------------------------------------------------------
# Test 11: Yeni provider eklemek dispatcher'ı değiştirmiyor
# ---------------------------------------------------------------------------

def test_dispatcher_kodu_degismeden_ucuncu_llm_eklenebilir():
    """
    Yeni bir LLM provider register() ile eklenebilir;
    dispatcher kaynak kodu değişmez.
    """
    registry = ProviderRegistry()
    llm1 = _FakeProvider("llm_a", ProviderCapability.LLM)
    llm2 = _FakeProvider("llm_b", ProviderCapability.LLM)
    llm3 = _FakeProvider("llm_c", ProviderCapability.LLM)

    registry.register(llm1, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(llm2, ProviderCapability.LLM, is_primary=False, priority=1)
    registry.register(llm3, ProviderCapability.LLM, is_primary=False, priority=2)

    chain = registry.get_chain(ProviderCapability.LLM)
    assert len(chain) == 3

    # Dispatcher'da _build_executor diye bir fonksiyon olmamalı (M3-C1 hedefi)
    import app.jobs.dispatcher as dispatcher_module
    assert not hasattr(dispatcher_module, "_build_executor"), (
        "_build_executor hâlâ dispatcher'da — bu M3-C1'de kaldırılmıştı."
    )


# ---------------------------------------------------------------------------
# Test 12: OpenAICompatProvider — provider_id model adını içeriyor
# ---------------------------------------------------------------------------

def test_openai_compat_provider_id_model_iceriyor():
    """OpenAICompatProvider provider_id model adını içeriyor."""
    provider = OpenAICompatProvider(api_key="key", model="llama3-8b")
    assert "llama3-8b" in provider.provider_id()


# ---------------------------------------------------------------------------
# Test 13: OpenAICompatProvider — farklı model için farklı provider_id
# ---------------------------------------------------------------------------

def test_openai_compat_farkli_model_farkli_provider_id():
    """Farklı modeller için OpenAICompatProvider farklı provider_id üretir."""
    p1 = OpenAICompatProvider(api_key="key", model="gpt-4o-mini")
    p2 = OpenAICompatProvider(api_key="key", model="gpt-4o")
    assert p1.provider_id() != p2.provider_id()


# ---------------------------------------------------------------------------
# Test 14: SystemTTSProvider — noop işaretleri result ve trace'de
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_system_tts_noop_isaretleri():
    """SystemTTSProvider result ve trace'de noop=True işaretini taşır."""
    provider = SystemTTSProvider()
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        output = await provider.invoke({
            "text": "Test metni",
            "output_path": tmp_path,
        })
        assert output.result.get("noop") is True
        assert output.trace.get("noop") is True
        assert output.result["duration_seconds"] == 0.0
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Test 15: resolve_and_invoke — primary başarılı → fallback_from YOK
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_and_invoke_primary_basarili_fallback_from_yok():
    """Primary başarılı olduğunda trace'de fallback_from alanı olmamalı."""
    registry = ProviderRegistry()
    primary = _FakeProvider("llm_ok", ProviderCapability.LLM, fail=False)
    fallback = _FakeProvider("llm_fb", ProviderCapability.LLM, fail=False)
    registry.register(primary, ProviderCapability.LLM, is_primary=True, priority=0)
    registry.register(fallback, ProviderCapability.LLM, is_primary=False, priority=1)

    output = await resolve_and_invoke(registry, ProviderCapability.LLM, {})

    assert output.trace["resolution_role"] == "primary"
    assert "fallback_from" not in output.trace


# ---------------------------------------------------------------------------
# Test 16: ConfigurationError alt sınıf hiyerarşisi doğru
# ---------------------------------------------------------------------------

def test_exception_hiyerarsisi():
    """NonRetryableProviderError ve alt sınıflar doğru hiyerarşide olmalı."""
    assert issubclass(NonRetryableProviderError, ProviderInvokeError)
    assert issubclass(InputValidationError, NonRetryableProviderError)
    assert issubclass(ConfigurationError, NonRetryableProviderError)
