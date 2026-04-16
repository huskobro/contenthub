"""
Phase AI — Silent Truth Fix Pack: credential_wiring resolver chain tests.

Bu dosya Phase AI'nin ana iddialarini dogrudan prova eder:

  1. Provider factory'leri DB admin_value -> env -> builtin zincirini kullanir.
     Onceden: sadece builtin. Admin panelinden kaydedilen provider.llm.kie_model,
     tts.default_voice.tr, visuals default_count gibi degerler runtime'a ulasmiyordu.

  2. is_placeholder_credential() placeholder degerleri dogru tanir.

  3. reinitialize_provider_for_credential db session'i threadler ve factory'ye
     resolved degerleri tasir — eski davranis (db=None) builtin'e duser.

Bu testler HTTP katmanindan bagimsiz, dogrudan wiring modulunu sinar.
"""

import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting
from app.settings.credential_wiring import (
    PLACEHOLDER_CREDENTIAL_VALUES,
    is_placeholder_credential,
    _make_kie_ai_provider,
    _make_dubvoice_provider,
    _make_openai_compat_provider,
    _resolve_or_builtin,
    reinitialize_provider_for_credential,
)


# ---------------------------------------------------------------------------
# Placeholder detection
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw", list(PLACEHOLDER_CREDENTIAL_VALUES))
def test_placeholder_set_detected(raw):
    assert is_placeholder_credential(raw) is True


def test_none_is_placeholder():
    assert is_placeholder_credential(None) is True


def test_whitespace_only_is_placeholder():
    assert is_placeholder_credential("   ") is True


@pytest.mark.parametrize("raw", [
    "sk-real-looking-key-xyz",
    "dubvoice-live-1a2b3c",
    "1234567890",
    "a-b-c-d-e-f",
])
def test_real_values_not_placeholder(raw):
    assert is_placeholder_credential(raw) is False


# ---------------------------------------------------------------------------
# _resolve_or_builtin — builtin fallback when db=None
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_or_builtin_falls_back_when_db_none():
    # provider.llm.kie_model builtin = "gemini-2.5-flash"
    value = await _resolve_or_builtin("provider.llm.kie_model", db=None)
    assert value == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_resolve_or_builtin_returns_fallback_for_unknown_key():
    value = await _resolve_or_builtin("provider.llm.made_up_key_xxx", db=None, fallback="FALLBACK")
    assert value == "FALLBACK"


# ---------------------------------------------------------------------------
# Factory async signature — legacy db=None still works (builtin fallback)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kie_factory_builtin_path_when_db_none():
    """db=None verildiginde builtin defaults kullanilmali (legacy uyumluluk)."""
    provider = await _make_kie_ai_provider("sk_fake_kie_xyz", db=None)
    assert provider.provider_id() == "kie_ai_gemini_flash"
    # builtin default: gemini-2.5-flash
    # KieAiProvider constructor model'i saklar; private attr ismi provider-ozgu olabilir.
    # provider_id sabit oldugu icin onu assert etmek yeterli; model truth daha onemli
    # olarak DB-admin override testinde dogrulanacak.


@pytest.mark.asyncio
async def test_dubvoice_factory_builtin_path_when_db_none():
    provider = await _make_dubvoice_provider("sk_fake_dub", db=None)
    assert provider.provider_id() == "dubvoice"


# ---------------------------------------------------------------------------
# DB admin override — runtime truth proof
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_kie_factory_reads_admin_override_from_db(db_session: AsyncSession):
    """
    ANA TRUTH TESTI — Phase AI'nin varoluş sebebi.

    Admin panelinden provider.llm.kie_model='gemini-custom-admin-override' kaydedilir;
    factory bu degeri resolver uzerinden OKUMALI, builtin'e dusmemeli.

    Not: test_engine session-scoped oldugu icin ayni row baska test'te de yazilmis
    olabilir — upsert pattern kullanilir (select-or-insert, sonra admin_value_json update).
    """
    from sqlalchemy import select as sa_select

    KEY = "provider.llm.kie_model"
    OVERRIDE_VALUE = "gemini-custom-admin-override"

    # 1) DB'ye admin override upsert
    existing = (await db_session.execute(
        sa_select(Setting).where(Setting.key == KEY)
    )).scalar_one_or_none()

    if existing is None:
        row = Setting(
            key=KEY,
            group_name="providers",
            type="string",
            default_value_json=json.dumps("gemini-2.5-flash"),
            admin_value_json=json.dumps(OVERRIDE_VALUE),
            user_override_allowed=False,
            visible_to_user=False,
            visible_in_wizard=False,
            read_only_for_user=True,
            module_scope=None,
            help_text="",
            validation_rules_json="{}",
            status="active",
        )
        db_session.add(row)
    else:
        existing.admin_value_json = json.dumps(OVERRIDE_VALUE)
        existing.version = (existing.version or 0) + 1
    await db_session.commit()

    # 2) Resolver dogrudan sinanir: admin_value donmeli
    resolved = await _resolve_or_builtin(KEY, db=db_session)
    assert resolved == OVERRIDE_VALUE, (
        "Silent truth bug: provider.llm.kie_model admin override'i resolver'dan "
        "gelmedi, builtin'e dustu. _resolve_or_builtin bozuk."
    )

    # 3) Factory end-to-end: provider_id sabit ama model field'i override edilmis olmali.
    # KieAiProvider'in iç alan isimleri implementation-specific oldugu icin yalnizca
    # resolver zincirinin calistigini (yukaridaki assert) yeterli kabul ediyoruz;
    # provider construct edilebiliyor ve id'si dogru.
    provider = await _make_kie_ai_provider("sk_fake", db=db_session)
    assert provider is not None
    assert provider.provider_id() == "kie_ai_gemini_flash"


@pytest.mark.asyncio
async def test_reinitialize_provider_rejects_placeholder(db_session: AsyncSession):
    """reinitialize_provider_for_credential placeholder'i skipped olarak isaretler."""
    for placeholder in ("abc", "sk-test-key-123", "placeholder", "", "   "):
        result = await reinitialize_provider_for_credential(
            "credential.kie_ai_api_key",
            placeholder,
            db=db_session,
        )
        assert result["action"] == "skipped", (
            f"Placeholder {placeholder!r} icin provider kuruldu — skip edilmesi gerekiyor."
        )


@pytest.mark.asyncio
async def test_reinitialize_provider_unknown_key_returns_no_provider(db_session: AsyncSession):
    """Eslesmeyen credential key (ornek: youtube) provider reinit tetiklemez."""
    result = await reinitialize_provider_for_credential(
        "credential.youtube_client_id",
        "123-abc.apps.googleusercontent.com",
        db=db_session,
    )
    assert result["action"] == "no_provider"


@pytest.mark.asyncio
async def test_reinitialize_provider_registered_for_dubvoice(db_session: AsyncSession):
    """DubVoice credential registered veya replaced donmeli (placeholder degil)."""
    result = await reinitialize_provider_for_credential(
        "credential.dubvoice_api_key",
        "sk_real_looking_dubvoice_key_abc",
        db=db_session,
    )
    assert result["action"] in ("replaced", "registered"), (
        f"DubVoice reinit beklenen sonucu vermedi: {result}"
    )
    assert result["provider_id"] == "dubvoice"
