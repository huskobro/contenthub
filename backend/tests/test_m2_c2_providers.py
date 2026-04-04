"""
M2-C2 Provider Unit Testleri

KieAiProvider, EdgeTTSProvider, PexelsProvider ve PixabayProvider için
birim testleri. Gerçek API çağrısı YAPILMAZ — tüm dış bağımlılıklar
mock ile simüle edilir.

Test kategorileri:
  - Doğru endpoint / header / parametre kullanımı
  - Başarılı yanıt → ProviderOutput dönüşümü
  - Hata durumlarında ProviderInvokeError fırlatılması
  - Zorunlu alan eksikliğinde ProviderInvokeError fırlatılması
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.providers.base import ProviderOutput
from app.providers.exceptions import ProviderInvokeError
from app.providers.llm.kie_ai_provider import KieAiProvider
from app.providers.tts.edge_tts_provider import EdgeTTSProvider
from app.providers.visuals.pexels_provider import PexelsProvider
from app.providers.visuals.pixabay_provider import PixabayProvider


# ─────────────────────────────────────────────────────────────
# KieAiProvider Testleri
# ─────────────────────────────────────────────────────────────

class TestKieAiProvider:
    """kie.ai LLM provider testleri."""

    def test_provider_id_dogru_deger_dondurur(self):
        """provider_id() doğru sabit değeri döndürmelidir."""
        provider = KieAiProvider(api_key="test-key")
        assert provider.provider_id() == "kie_ai_gemini_flash"

    def test_capability_llm_dondurur(self):
        """capability() 'llm' döndürmelidir."""
        provider = KieAiProvider(api_key="test-key")
        assert provider.capability() == "llm"

    @pytest.mark.asyncio
    async def test_basarili_llm_cagrisi_provider_output_dondurur(self):
        """Başarılı API yanıtı ProviderOutput olarak dönüştürülmelidir."""
        provider = KieAiProvider(api_key="test-key")

        # OpenAI uyumlu yanıt simüle et
        mock_json_verisi = {
            "choices": [
                {
                    "message": {"content": "Test yanıtı metni."},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
            },
        }

        mock_yanit = MagicMock()
        mock_yanit.status_code = 200
        mock_yanit.json.return_value = mock_json_verisi

        mock_istemci = AsyncMock()
        mock_istemci.post = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.llm._openai_compat_base.httpx.AsyncClient", return_value=mock_istemci):
            cikti = await provider.invoke({
                "messages": [{"role": "user", "content": "Merhaba"}],
            })

        assert isinstance(cikti, ProviderOutput)
        assert cikti.result["content"] == "Test yanıtı metni."
        assert cikti.result["finish_reason"] == "stop"
        assert cikti.provider_id == "kie_ai_gemini_flash"
        assert cikti.trace["input_tokens"] == 10
        assert cikti.trace["output_tokens"] == 20

    @pytest.mark.asyncio
    async def test_dogru_endpoint_e_istek_gonder(self):
        """Provider /v1/chat/completions endpoint'ine POST isteği göndermelidir."""
        provider = KieAiProvider(api_key="test-key")

        mock_json_verisi = {
            "choices": [{"message": {"content": "yanıt"}, "finish_reason": "stop"}],
            "usage": {},
        }

        mock_yanit = MagicMock()
        mock_yanit.status_code = 200
        mock_yanit.json.return_value = mock_json_verisi

        mock_istemci = AsyncMock()
        mock_istemci.post = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.llm._openai_compat_base.httpx.AsyncClient", return_value=mock_istemci):
            await provider.invoke({"messages": [{"role": "user", "content": "test"}]})

        # Çağrı yapılan URL kontrol edilir
        gonderilen_url = mock_istemci.post.call_args[0][0]
        assert "/v1/chat/completions" in gonderilen_url

    @pytest.mark.asyncio
    async def test_dogru_authorization_basligi_kullanilir(self):
        """API key, Bearer token olarak Authorization başlığına eklenmeli."""
        provider = KieAiProvider(api_key="gizli-anahtar-123")

        mock_json_verisi = {
            "choices": [{"message": {"content": "y"}, "finish_reason": "stop"}],
            "usage": {},
        }

        mock_yanit = MagicMock()
        mock_yanit.status_code = 200
        mock_yanit.json.return_value = mock_json_verisi

        mock_istemci = AsyncMock()
        mock_istemci.post = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.llm._openai_compat_base.httpx.AsyncClient", return_value=mock_istemci):
            await provider.invoke({"messages": [{"role": "user", "content": "t"}]})

        gonderilen_basliklar = mock_istemci.post.call_args[1]["headers"]
        assert gonderilen_basliklar["Authorization"] == "Bearer gizli-anahtar-123"

    @pytest.mark.asyncio
    async def test_http_hata_kodu_provider_invoke_error_firlatir(self):
        """HTTP 4xx/5xx yanıtı ProviderInvokeError fırlatmalıdır."""
        provider = KieAiProvider(api_key="test-key")

        mock_yanit = MagicMock()
        mock_yanit.status_code = 401
        mock_yanit.text = "Yetkisiz erişim"

        mock_istemci = AsyncMock()
        mock_istemci.post = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.llm._openai_compat_base.httpx.AsyncClient", return_value=mock_istemci):
            with pytest.raises(ProviderInvokeError) as exc_info:
                await provider.invoke({"messages": [{"role": "user", "content": "t"}]})

        assert exc_info.value.provider_id == "kie_ai_gemini_flash"
        assert "401" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bos_girdi_provider_invoke_error_firlatir(self):
        """Mesaj ve system_prompt olmadan çağrı ProviderInvokeError fırlatmalıdır."""
        provider = KieAiProvider(api_key="test-key")

        with pytest.raises(ProviderInvokeError) as exc_info:
            await provider.invoke({})

        assert exc_info.value.provider_id == "kie_ai_gemini_flash"

    @pytest.mark.asyncio
    async def test_system_prompt_messages_listesine_eklenir(self):
        """system_prompt varsa mesaj listesinin başına system rolüyle eklenmeli."""
        provider = KieAiProvider(api_key="test-key")

        mock_json_verisi = {
            "choices": [{"message": {"content": "y"}, "finish_reason": "stop"}],
            "usage": {},
        }

        mock_yanit = MagicMock()
        mock_yanit.status_code = 200
        mock_yanit.json.return_value = mock_json_verisi

        mock_istemci = AsyncMock()
        mock_istemci.post = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.llm._openai_compat_base.httpx.AsyncClient", return_value=mock_istemci):
            await provider.invoke({
                "system_prompt": "Sen bir yardımcısın.",
                "messages": [{"role": "user", "content": "Merhaba"}],
            })

        gonderilen_payload = mock_istemci.post.call_args[1]["json"]
        ilk_mesaj = gonderilen_payload["messages"][0]
        assert ilk_mesaj["role"] == "system"
        assert ilk_mesaj["content"] == "Sen bir yardımcısın."


# ─────────────────────────────────────────────────────────────
# EdgeTTSProvider Testleri
# ─────────────────────────────────────────────────────────────

class TestEdgeTTSProvider:
    """Microsoft Edge TTS provider testleri."""

    def test_provider_id_dogru_deger_dondurur(self):
        """provider_id() 'edge_tts' döndürmelidir."""
        provider = EdgeTTSProvider()
        assert provider.provider_id() == "edge_tts"

    def test_capability_tts_dondurur(self):
        """capability() 'tts' döndürmelidir."""
        provider = EdgeTTSProvider()
        assert provider.capability() == "tts"

    @pytest.mark.asyncio
    async def test_basarili_tts_cagrisi_provider_output_dondurur(self):
        """Başarılı TTS çağrısı ProviderOutput olarak dönüştürülmelidir."""
        provider = EdgeTTSProvider()

        mock_communicate = AsyncMock()
        mock_communicate.save = AsyncMock()

        mock_edge_tts = MagicMock()
        mock_edge_tts.Communicate = MagicMock(return_value=mock_communicate)

        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            cikti = await provider.invoke({
                "text": "Merhaba dünya",
                "voice": "tr-TR-AhmetNeural",
                "output_path": "/tmp/test_ses.mp3",
            })

        assert isinstance(cikti, ProviderOutput)
        assert cikti.result["output_path"] == "/tmp/test_ses.mp3"
        assert cikti.provider_id == "edge_tts"

    @pytest.mark.asyncio
    async def test_dogru_ses_parametresi_kullanilir(self):
        """edge_tts.Communicate doğru metin ve ses parametresiyle çağrılmalıdır."""
        provider = EdgeTTSProvider()

        mock_communicate = AsyncMock()
        mock_communicate.save = AsyncMock()

        mock_edge_tts = MagicMock()
        mock_edge_tts.Communicate = MagicMock(return_value=mock_communicate)

        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            await provider.invoke({
                "text": "Test metni",
                "voice": "tr-TR-EmelNeural",
                "output_path": "/tmp/cikis.mp3",
            })

        mock_edge_tts.Communicate.assert_called_once_with("Test metni", "tr-TR-EmelNeural")

    @pytest.mark.asyncio
    async def test_varsayilan_ses_kullanilir(self):
        """Ses belirtilmezse varsayılan Türkçe ses kullanılmalıdır."""
        provider = EdgeTTSProvider()

        mock_communicate = AsyncMock()
        mock_communicate.save = AsyncMock()

        mock_edge_tts = MagicMock()
        mock_edge_tts.Communicate = MagicMock(return_value=mock_communicate)

        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            await provider.invoke({
                "text": "Merhaba",
                "output_path": "/tmp/test.mp3",
            })

        # Varsayılan ses: tr-TR-AhmetNeural
        _, kullanilan_ses = mock_edge_tts.Communicate.call_args[0]
        assert kullanilan_ses == "tr-TR-AhmetNeural"

    @pytest.mark.asyncio
    async def test_bos_metin_provider_invoke_error_firlatir(self):
        """Boş metin ProviderInvokeError fırlatmalıdır."""
        provider = EdgeTTSProvider()

        mock_edge_tts = MagicMock()
        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            with pytest.raises(ProviderInvokeError) as exc_info:
                await provider.invoke({
                    "text": "",
                    "output_path": "/tmp/test.mp3",
                })

        assert exc_info.value.provider_id == "edge_tts"

    @pytest.mark.asyncio
    async def test_cikis_yolu_eksik_provider_invoke_error_firlatir(self):
        """output_path belirtilmezse ProviderInvokeError fırlatmalıdır."""
        provider = EdgeTTSProvider()

        mock_edge_tts = MagicMock()
        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            with pytest.raises(ProviderInvokeError) as exc_info:
                await provider.invoke({
                    "text": "Test",
                })

        assert exc_info.value.provider_id == "edge_tts"

    @pytest.mark.asyncio
    async def test_save_dogru_yola_cagirilir(self):
        """Communicate.save() doğru output_path ile çağrılmalıdır."""
        provider = EdgeTTSProvider()

        mock_communicate = AsyncMock()
        mock_communicate.save = AsyncMock()

        mock_edge_tts = MagicMock()
        mock_edge_tts.Communicate = MagicMock(return_value=mock_communicate)

        with patch.dict("sys.modules", {"edge_tts": mock_edge_tts}):
            await provider.invoke({
                "text": "Test",
                "output_path": "/tmp/beklenen_yol.mp3",
            })

        mock_communicate.save.assert_called_once_with("/tmp/beklenen_yol.mp3")


# ─────────────────────────────────────────────────────────────
# PexelsProvider Testleri
# ─────────────────────────────────────────────────────────────

class TestPexelsProvider:
    """Pexels görsel provider testleri."""

    def test_provider_id_dogru_deger_dondurur(self):
        """provider_id() 'pexels' döndürmelidir."""
        provider = PexelsProvider(api_key="test-key")
        assert provider.provider_id() == "pexels"

    def test_capability_visuals_dondurur(self):
        """capability() 'visuals' döndürmelidir."""
        provider = PexelsProvider(api_key="test-key")
        assert provider.capability() == "visuals"

    @pytest.mark.asyncio
    async def test_dogru_authorization_basligi_kullanilir(self):
        """Pexels API, Authorization başlığıyla çağrılmalıdır (Bearer değil, direkt key)."""
        provider = PexelsProvider(api_key="pexels-test-key")

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = {"photos": []}

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_arama_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pexels_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                await provider.invoke({
                    "query": "dağ manzarası",
                    "output_dir": "/tmp/gorseller",
                })

        gonderilen_basliklar = mock_istemci.get.call_args[1]["headers"]
        assert gonderilen_basliklar["Authorization"] == "pexels-test-key"

    @pytest.mark.asyncio
    async def test_dogru_pexels_endpoint_kullanilir(self):
        """Pexels arama isteği doğru endpoint'e gönderilmelidir."""
        provider = PexelsProvider(api_key="test-key")

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = {"photos": []}

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_arama_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pexels_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                await provider.invoke({
                    "query": "test",
                    "output_dir": "/tmp/test",
                })

        gonderilen_url = mock_istemci.get.call_args[0][0]
        assert "pexels.com/v1/search" in gonderilen_url

    @pytest.mark.asyncio
    async def test_bos_sorgu_provider_invoke_error_firlatir(self):
        """Boş query alanı ProviderInvokeError fırlatmalıdır."""
        provider = PexelsProvider(api_key="test-key")

        with pytest.raises(ProviderInvokeError) as exc_info:
            await provider.invoke({
                "query": "",
                "output_dir": "/tmp/test",
            })

        assert exc_info.value.provider_id == "pexels"

    @pytest.mark.asyncio
    async def test_http_hata_kodu_provider_invoke_error_firlatir(self):
        """Pexels HTTP 403 yanıtı ProviderInvokeError fırlatmalıdır."""
        provider = PexelsProvider(api_key="gecersiz-anahtar")

        mock_yanit = MagicMock()
        mock_yanit.status_code = 403
        mock_yanit.text = "Erişim reddedildi"

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pexels_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                with pytest.raises(ProviderInvokeError) as exc_info:
                    await provider.invoke({
                        "query": "test",
                        "output_dir": "/tmp/test",
                    })

        assert exc_info.value.provider_id == "pexels"
        assert "403" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_basarili_yanit_assets_listesi_dondurur(self):
        """Başarılı Pexels yanıtı assets listesi içeren ProviderOutput döndürmelidir."""
        provider = PexelsProvider(api_key="test-key")

        pexels_yanit_verisi = {
            "photos": [
                {
                    "id": 1001,
                    "width": 1920,
                    "height": 1080,
                    "photographer": "Test Fotoğrafçı",
                    "src": {"original": "https://example.com/foto1.jpg"},
                }
            ]
        }

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = pexels_yanit_verisi

        # Görsel indirme yanıtı
        mock_gorsel_yanit = MagicMock()
        mock_gorsel_yanit.content = b"sahte gorsel verisi"
        mock_gorsel_yanit.raise_for_status = MagicMock()

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(side_effect=[mock_arama_yanit, mock_gorsel_yanit])
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pexels_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                with patch("builtins.open", MagicMock()):
                    cikti = await provider.invoke({
                        "query": "dağ",
                        "output_dir": "/tmp/test",
                    })

        assert isinstance(cikti, ProviderOutput)
        assert cikti.trace["results_found"] == 1
        assert cikti.trace["query"] == "dağ"


# ─────────────────────────────────────────────────────────────
# PixabayProvider Testleri
# ─────────────────────────────────────────────────────────────

class TestPixabayProvider:
    """Pixabay görsel provider testleri."""

    def test_provider_id_dogru_deger_dondurur(self):
        """provider_id() 'pixabay' döndürmelidir."""
        provider = PixabayProvider(api_key="test-key")
        assert provider.provider_id() == "pixabay"

    def test_capability_visuals_dondurur(self):
        """capability() 'visuals' döndürmelidir."""
        provider = PixabayProvider(api_key="test-key")
        assert provider.capability() == "visuals"

    @pytest.mark.asyncio
    async def test_dogru_sorgu_parametreleri_kullanilir(self):
        """Pixabay API isteğinde key, q ve image_type parametreleri olmalıdır."""
        provider = PixabayProvider(api_key="pixabay-test-key")

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = {"hits": []}

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_arama_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pixabay_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                await provider.invoke({
                    "query": "şehir",
                    "output_dir": "/tmp/test",
                })

        gonderilen_parametreler = mock_istemci.get.call_args[1]["params"]
        assert gonderilen_parametreler["key"] == "pixabay-test-key"
        assert gonderilen_parametreler["q"] == "şehir"
        assert gonderilen_parametreler["image_type"] == "photo"

    @pytest.mark.asyncio
    async def test_dogru_pixabay_endpoint_kullanilir(self):
        """Pixabay arama isteği pixabay.com/api/ endpoint'ine gönderilmelidir."""
        provider = PixabayProvider(api_key="test-key")

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = {"hits": []}

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_arama_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pixabay_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                await provider.invoke({
                    "query": "test",
                    "output_dir": "/tmp/test",
                })

        gonderilen_url = mock_istemci.get.call_args[0][0]
        assert "pixabay.com/api" in gonderilen_url

    @pytest.mark.asyncio
    async def test_bos_sorgu_provider_invoke_error_firlatir(self):
        """Boş query alanı ProviderInvokeError fırlatmalıdır."""
        provider = PixabayProvider(api_key="test-key")

        with pytest.raises(ProviderInvokeError) as exc_info:
            await provider.invoke({
                "query": "",
                "output_dir": "/tmp/test",
            })

        assert exc_info.value.provider_id == "pixabay"

    @pytest.mark.asyncio
    async def test_http_hata_kodu_provider_invoke_error_firlatir(self):
        """Pixabay HTTP 400 yanıtı ProviderInvokeError fırlatmalıdır."""
        provider = PixabayProvider(api_key="gecersiz-anahtar")

        mock_yanit = MagicMock()
        mock_yanit.status_code = 400
        mock_yanit.text = "Geçersiz API anahtarı"

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pixabay_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                with pytest.raises(ProviderInvokeError) as exc_info:
                    await provider.invoke({
                        "query": "test",
                        "output_dir": "/tmp/test",
                    })

        assert exc_info.value.provider_id == "pixabay"

    @pytest.mark.asyncio
    async def test_count_parametresi_per_page_olarak_iletilir(self):
        """count değeri Pixabay per_page parametresi olarak iletilmelidir."""
        provider = PixabayProvider(api_key="test-key")

        mock_arama_yanit = MagicMock()
        mock_arama_yanit.status_code = 200
        mock_arama_yanit.json.return_value = {"hits": []}

        mock_istemci = AsyncMock()
        mock_istemci.get = AsyncMock(return_value=mock_arama_yanit)
        mock_istemci.__aenter__ = AsyncMock(return_value=mock_istemci)
        mock_istemci.__aexit__ = AsyncMock(return_value=False)

        with patch("app.providers.visuals.pixabay_provider.httpx.AsyncClient", return_value=mock_istemci):
            with patch("os.makedirs"):
                await provider.invoke({
                    "query": "araba",
                    "count": 3,
                    "output_dir": "/tmp/test",
                })

        gonderilen_parametreler = mock_istemci.get.call_args[1]["params"]
        assert gonderilen_parametreler["per_page"] == 3
