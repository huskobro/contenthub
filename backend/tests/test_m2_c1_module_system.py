"""
M2-C1: Modül Sistemi ve Provider Interface Testleri

Bu dosya şunları test eder:
- ModuleRegistry CRUD işlemleri (kayıt, sorgulama, listeleme, adım sorgulama)
- InputNormalizer: geçerli girdi normalizasyonu ve zorunlu alan eksiklik kontrolü
- Stub executor'ların beklenen step_key değerlerini döndürmesi
- Provider exception hiyerarşisi
"""

import pytest

from app.providers.base import BaseProvider, ProviderOutput
from app.providers.exceptions import (
    ProviderError,
    ProviderInvokeError,
    ProviderNotFoundError,
)
from app.modules.base import ModuleDefinition, StepDefinition
from app.modules.registry import ModuleRegistry
from app.modules.exceptions import ModuleNotFoundError, InputValidationError
from app.modules.input_normalizer import InputNormalizer
from app.modules.standard_video.definition import STANDARD_VIDEO_MODULE
from app.modules.standard_video.executors import (
    ScriptStepExecutor,
    MetadataStepExecutor,
    TTSStepExecutor,
    VisualsStepExecutor,
    SubtitleStepExecutor,
    CompositionStepExecutor,
)


# ---------------------------------------------------------------------------
# Provider exception hiyerarşi testleri
# ---------------------------------------------------------------------------

class TestProviderExceptions:
    """Provider exception sınıflarının doğru davranması."""

    def test_provider_error_temel_sinif(self):
        """ProviderError temel exception sınıfından türemiş olmalı."""
        exc = ProviderError("test hatası")
        assert isinstance(exc, Exception)
        assert str(exc) == "test hatası"

    def test_provider_invoke_error_provider_id_ve_reason_icerir(self):
        """ProviderInvokeError, provider_id ve reason alanlarını taşımalı."""
        exc = ProviderInvokeError(provider_id="openai_gpt4o", reason="zaman aşımı")
        assert isinstance(exc, ProviderError)
        assert exc.provider_id == "openai_gpt4o"
        assert exc.reason == "zaman aşımı"
        assert "openai_gpt4o" in str(exc)
        assert "zaman aşımı" in str(exc)

    def test_provider_not_found_error_capability_icerir(self):
        """ProviderNotFoundError, capability alanını taşımalı."""
        exc = ProviderNotFoundError(capability="llm")
        assert isinstance(exc, ProviderError)
        assert exc.capability == "llm"
        assert "llm" in str(exc)


# ---------------------------------------------------------------------------
# ProviderOutput dataclass testleri
# ---------------------------------------------------------------------------

class TestProviderOutput:
    """ProviderOutput dataclass'ının doğru yapılandırılması."""

    def test_provider_output_olusturma(self):
        """ProviderOutput tüm alanlarla oluşturulabilmeli."""
        output = ProviderOutput(
            result={"cevap": "merhaba"},
            trace={"model": "gpt-4o", "latency_ms": 250},
            provider_id="openai_gpt4o",
        )
        assert output.result == {"cevap": "merhaba"}
        assert output.trace["model"] == "gpt-4o"
        assert output.provider_id == "openai_gpt4o"


# ---------------------------------------------------------------------------
# BaseProvider ABC testleri
# ---------------------------------------------------------------------------

class TestBaseProvider:
    """BaseProvider ABC doğrulama: soyut metodlar implementasyon zorunluluğu."""

    def test_base_provider_somut_sinif_olmadan_instantiate_edilemez(self):
        """BaseProvider ABC olduğu için doğrudan örneklenememeli."""
        with pytest.raises(TypeError):
            BaseProvider()  # type: ignore

    def test_somut_provider_abc_metodlarini_implement_etmeli(self):
        """Tüm soyut metodları uygulayan somut sınıf örneklenebilmeli."""

        class KonkretProvider(BaseProvider):
            async def invoke(self, input_data: dict) -> ProviderOutput:
                return ProviderOutput(result={}, trace={}, provider_id="test_provider")

            def provider_id(self) -> str:
                return "test_provider"

            def capability(self) -> str:
                return "llm"

        provider = KonkretProvider()
        assert provider.provider_id() == "test_provider"
        assert provider.capability() == "llm"


# ---------------------------------------------------------------------------
# ModuleRegistry CRUD testleri
# ---------------------------------------------------------------------------

class TestModuleRegistry:
    """ModuleRegistry kayıt, sorgulama, listeleme ve adım sorgulama testleri."""

    def _ornek_modul_olustur(self, module_id: str = "test_modul") -> ModuleDefinition:
        """Test için basit bir ModuleDefinition oluşturur."""
        return ModuleDefinition(
            module_id=module_id,
            display_name="Test Modülü",
            steps=[
                StepDefinition(
                    step_key="adim_bir",
                    step_order=1,
                    idempotency_type="re_executable",
                    executor_class=object,  # test amaçlı stub
                    display_name="Birinci Adım",
                ),
            ],
        )

    def test_modul_kaydetme_ve_getirme(self):
        """Kayıt edilen modül get() ile alınabilmeli."""
        registry = ModuleRegistry()
        modul = self._ornek_modul_olustur("kayit_testi")
        registry.register(modul)
        alinan = registry.get("kayit_testi")
        assert alinan is not None
        assert alinan.module_id == "kayit_testi"

    def test_olmayan_modul_none_dondurur(self):
        """Kayıt edilmemiş module_id için get() None döndürmeli."""
        registry = ModuleRegistry()
        assert registry.get("olmayan_modul") is None

    def test_list_all_tum_modulleri_dondurur(self):
        """list_all() tüm kayıtlı modülleri döndürmeli."""
        registry = ModuleRegistry()
        registry.register(self._ornek_modul_olustur("modul_a"))
        registry.register(self._ornek_modul_olustur("modul_b"))
        tum_moduller = registry.list_all()
        module_ids = [m.module_id for m in tum_moduller]
        assert "modul_a" in module_ids
        assert "modul_b" in module_ids
        assert len(tum_moduller) == 2

    def test_bos_registry_bos_liste_dondurur(self):
        """Hiç modül kayıtlı değilse list_all() boş liste döndürmeli."""
        registry = ModuleRegistry()
        assert registry.list_all() == []

    def test_get_steps_adim_listesini_dondurur(self):
        """get_steps() doğru adım listesini step_order'a göre döndürmeli."""
        registry = ModuleRegistry()
        modul = self._ornek_modul_olustur("adim_testi")
        registry.register(modul)
        adimlar = registry.get_steps("adim_testi")
        assert len(adimlar) == 1
        assert adimlar[0].step_key == "adim_bir"

    def test_get_steps_olmayan_modul_bos_liste_dondurur(self):
        """Olmayan modül için get_steps() boş liste döndürmeli."""
        registry = ModuleRegistry()
        assert registry.get_steps("olmayan") == []

    def test_ayni_module_id_ile_kayit_gunceller(self):
        """Aynı module_id ile tekrar kayıt yapılırsa mevcut kayıt güncellenmeli."""
        registry = ModuleRegistry()
        registry.register(ModuleDefinition(module_id="x", display_name="İlk"))
        registry.register(ModuleDefinition(module_id="x", display_name="Güncel"))
        assert registry.get("x").display_name == "Güncel"
        assert len(registry.list_all()) == 1


# ---------------------------------------------------------------------------
# InputNormalizer testleri
# ---------------------------------------------------------------------------

class TestInputNormalizer:
    """InputNormalizer: normalizasyon ve zorunlu alan kontrolü testleri."""

    def _registry_ile_normalizer_olustur(self) -> tuple[ModuleRegistry, InputNormalizer]:
        """standard_video modülü kayıtlı bir registry ve normalizer oluşturur."""
        registry = ModuleRegistry()
        registry.register(STANDARD_VIDEO_MODULE)
        normalizer = InputNormalizer(registry)
        return registry, normalizer

    def test_gecerli_girdi_normalize_edilir(self):
        """Zorunlu alan mevcut olduğunda normalizasyon başarılı olmalı."""
        _, normalizer = self._registry_ile_normalizer_olustur()
        sonuc = normalizer.normalize("standard_video", {"topic": "Yapay Zeka"})
        assert sonuc["topic"] == "Yapay Zeka"

    def test_varsayilan_degerler_eklenir(self):
        """Eksik opsiyonel alanlar varsayılan değerleriyle doldurulmalı."""
        _, normalizer = self._registry_ile_normalizer_olustur()
        sonuc = normalizer.normalize("standard_video", {"topic": "Python"})
        # language ve duration_seconds varsayılan değerlere sahip
        assert "language" in sonuc
        assert sonuc["language"] == "tr"
        assert "duration_seconds" in sonuc
        assert sonuc["duration_seconds"] == 60

    def test_zorunlu_alan_eksikse_hata_firlatilir(self):
        """topic eksik olduğunda InputValidationError fırlatılmalı."""
        _, normalizer = self._registry_ile_normalizer_olustur()
        with pytest.raises(InputValidationError) as exc_info:
            normalizer.normalize("standard_video", {})
        assert exc_info.value.field == "topic"

    def test_olmayan_modul_icin_hata_firlatilir(self):
        """Kayıtlı olmayan modül için ModuleNotFoundError fırlatılmalı."""
        _, normalizer = self._registry_ile_normalizer_olustur()
        with pytest.raises(ModuleNotFoundError):
            normalizer.normalize("olmayan_modul", {"topic": "test"})

    def test_kullanici_degeri_varsayilani_ezer(self):
        """Kullanıcı tarafından sağlanan değer, varsayılanın önüne geçmeli."""
        _, normalizer = self._registry_ile_normalizer_olustur()
        sonuc = normalizer.normalize(
            "standard_video",
            {"topic": "React", "language": "en", "duration_seconds": 120},
        )
        assert sonuc["language"] == "en"
        assert sonuc["duration_seconds"] == 120


# ---------------------------------------------------------------------------
# Standard Video modül tanımı testleri
# ---------------------------------------------------------------------------

class TestStandardVideoModule:
    """standard_video modülünün doğru tanımlanmış olması."""

    def test_module_id_dogru(self):
        """module_id 'standard_video' olmalı."""
        assert STANDARD_VIDEO_MODULE.module_id == "standard_video"

    def test_alti_adim_tanimi(self):
        """standard_video modülünde tam olarak 6 adım tanımlanmış olmalı."""
        assert len(STANDARD_VIDEO_MODULE.steps) == 6

    def test_adim_anahtarlari_dogru(self):
        """Adım anahtarları beklenen sırada tanımlanmış olmalı."""
        step_keys = [s.step_key for s in STANDARD_VIDEO_MODULE.steps]
        assert step_keys == ["script", "metadata", "tts", "visuals", "subtitle", "composition"]

    def test_adim_siralari_dogru(self):
        """step_order değerleri 1'den 6'ya sıralı olmalı."""
        step_orders = sorted([s.step_order for s in STANDARD_VIDEO_MODULE.steps])
        assert step_orders == [1, 2, 3, 4, 5, 6]

    def test_idempotency_tipleri_dogru(self):
        """Her adımın idempotency_type değeri doğru atanmış olmalı."""
        idempotency_map = {s.step_key: s.idempotency_type for s in STANDARD_VIDEO_MODULE.steps}
        assert idempotency_map["script"] == "re_executable"
        assert idempotency_map["metadata"] == "re_executable"
        assert idempotency_map["tts"] == "artifact_check"
        assert idempotency_map["visuals"] == "artifact_check"
        assert idempotency_map["subtitle"] == "re_executable"
        assert idempotency_map["composition"] == "artifact_check"

    def test_input_schema_zorunlu_alan(self):
        """input_schema'da 'topic' zorunlu alan olarak tanımlı olmalı."""
        assert "topic" in STANDARD_VIDEO_MODULE.input_schema.get("required", [])

    def test_template_compat_tanimi(self):
        """template_compat listesi boş olmamalı."""
        assert len(STANDARD_VIDEO_MODULE.template_compat) > 0


# ---------------------------------------------------------------------------
# Stub executor testleri
# ---------------------------------------------------------------------------

class TestStubExecutors:
    """Executor'ların doğru step_key döndürmesi ve stub davranışlarının kontrolü.

    M2-C3 sonrası: ScriptStepExecutor ve MetadataStepExecutor artık llm_provider
    argümanı gerektiriyor. Stub executor'lar (tts, visuals, subtitle, composition)
    argümansız çalışmaya devam ediyor.
    """

    def test_script_executor_step_key(self):
        """ScriptStepExecutor 'script' step_key döndürmeli."""
        from unittest.mock import MagicMock
        executor = ScriptStepExecutor(llm_provider=MagicMock())
        assert executor.step_key() == "script"

    def test_metadata_executor_step_key(self):
        """MetadataStepExecutor 'metadata' step_key döndürmeli."""
        from unittest.mock import MagicMock
        executor = MetadataStepExecutor(llm_provider=MagicMock())
        assert executor.step_key() == "metadata"

    def test_tts_executor_step_key(self):
        """TTSStepExecutor 'tts' step_key döndürmeli."""
        executor = TTSStepExecutor()
        assert executor.step_key() == "tts"

    def test_visuals_executor_step_key(self):
        """VisualsStepExecutor 'visuals' step_key döndürmeli."""
        executor = VisualsStepExecutor()
        assert executor.step_key() == "visuals"

    def test_subtitle_executor_step_key(self):
        """SubtitleStepExecutor 'subtitle' step_key döndürmeli."""
        executor = SubtitleStepExecutor()
        assert executor.step_key() == "subtitle"

    def test_composition_executor_step_key(self):
        """CompositionStepExecutor 'composition' step_key döndürmeli."""
        executor = CompositionStepExecutor()
        assert executor.step_key() == "composition"

    @pytest.mark.asyncio
    async def test_stub_executor_tts_execute_dict_dondurur(self):
        """TTS stub executor, execute() çağrısında dict döndürmeli."""
        executor = TTSStepExecutor()
        sonuc = await executor.execute(job=None, step=None)
        assert isinstance(sonuc, dict)
        assert sonuc.get("status") == "stub"
        assert sonuc.get("step") == "tts"

    @pytest.mark.asyncio
    async def test_tum_stub_executorlar_dogru_step_key_ile_donus_yapar(self):
        """Stub executor'lar (tts, visuals, subtitle, composition) kendi step_key'lerini döndürmeli."""
        executors = [
            TTSStepExecutor(),
            VisualsStepExecutor(),
            SubtitleStepExecutor(),
            CompositionStepExecutor(),
        ]
        for executor in executors:
            sonuc = await executor.execute(job=None, step=None)
            assert sonuc["step"] == executor.step_key(), (
                f"{executor.__class__.__name__} yanlış step döndürdü: {sonuc['step']}"
            )
