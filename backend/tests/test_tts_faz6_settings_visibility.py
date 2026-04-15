"""
Faz 6 — Settings Registry admin/user surfaces testleri.

Kapsam:
  - KNOWN_SETTINGS icindeki TTS keylerinin visibility metadatalari,
    Faz 6 politikasina uygun (user-facing vs admin-only).
  - seed_known_settings yeni key'i olustururken meta'daki bayraklari uygular.
  - sync_visibility_flags_from_registry mevcut satirlari senkronize eder;
    admin_value_json'i DEGISTIRMEZ.
  - SABIT: tts.allow_auto_fallback ve tts.fallback_providers admin-only
    kalir (user panelde ASLA gozukmemeli).
"""

from __future__ import annotations

import json

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.models import Base, Setting
from app.settings.settings_resolver import KNOWN_SETTINGS
from app.settings.settings_seed import (
    seed_known_settings,
    sync_visibility_flags_from_registry,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


# ---------------------------------------------------------------------------
# Visibility policy (KNOWN_SETTINGS meta)
# ---------------------------------------------------------------------------


USER_VISIBLE_TTS_KEYS = {
    "tts.default_voice.tr",
    "tts.default_voice.en",
    "tts.voice_settings.speed",
    "tts.voice_settings.pitch",
    "tts.voice_settings.emphasis",
    "tts.voice_settings.use_speaker_boost",
    "tts.pauses.sentence_break_ms",
    "tts.pauses.paragraph_break_ms",
    "tts.pauses.scene_break_ms",
    "tts.glossary.brand",
    "tts.glossary.product",
    "tts.pronunciation.overrides",
    "tts.controls.default_scene_energy",
    "tts.preview.voice_sample_text",
}

ADMIN_ONLY_TTS_KEYS = {
    "tts.allow_auto_fallback",
    "tts.fallback_providers",
    "tts.dubvoice.default_model_id",
    "tts.dubvoice.poll_interval_seconds",
    "tts.dubvoice.poll_timeout_seconds",
    "tts.dubvoice.http_timeout_seconds",
    "tts.voice_settings.stability",
    "tts.voice_settings.similarity_boost",
    "tts.voice_settings.style",
    "tts.controls.ssml_pauses_enabled",
    "tts.preview.max_characters_draft",
    "tts.preview.workspace_dir",
}


def test_user_visible_tts_keys_meta_dogru():
    for key in USER_VISIBLE_TTS_KEYS:
        assert key in KNOWN_SETTINGS, f"{key} KNOWN_SETTINGS'de yok"
        meta = KNOWN_SETTINGS[key]
        assert meta.get("visible_to_user") is True, f"{key} visible_to_user True olmali"
        assert meta.get("user_override_allowed") is True, f"{key} user_override_allowed True olmali"
        assert meta.get("read_only_for_user") is False, f"{key} read_only_for_user False olmali"


def test_admin_only_tts_keys_meta_dogru():
    for key in ADMIN_ONLY_TTS_KEYS:
        assert key in KNOWN_SETTINGS, f"{key} KNOWN_SETTINGS'de yok"
        meta = KNOWN_SETTINGS[key]
        # Admin-only: visible_to_user default False olmali (meta'da yok ya da False)
        assert meta.get("visible_to_user", False) is False, f"{key} user'a gozukmemeli"
        assert meta.get("user_override_allowed", False) is False


def test_sabit_fallback_infra_keys_admin_only():
    """SABIT: fallback policy + auto-fallback flag ASLA user'a gozukmemeli."""
    for key in ("tts.fallback_providers", "tts.allow_auto_fallback"):
        meta = KNOWN_SETTINGS[key]
        assert not meta.get("visible_to_user", False)
        assert not meta.get("user_override_allowed", False)


def test_wizard_visible_tts_keys_listesi():
    """Wizard'da gozukecek user-facing TTS keys — guided mode icin."""
    expected = {
        "tts.default_voice.tr",
        "tts.default_voice.en",
        "tts.voice_settings.speed",
        "tts.voice_settings.emphasis",
        "tts.controls.default_scene_energy",
    }
    for key in expected:
        meta = KNOWN_SETTINGS[key]
        assert meta.get("visible_in_wizard") is True, f"{key} wizard'a gozukmeli"


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_yeni_key_visibility_meta_uygular(db_session: AsyncSession):
    created = await seed_known_settings(db_session)
    assert created > 0

    # User-facing bir anahtar
    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.controls.default_scene_energy")
    )
    row = result.scalar_one()
    assert row.visible_to_user is True
    assert row.user_override_allowed is True
    assert row.visible_in_wizard is True
    assert row.read_only_for_user is False

    # Admin-only bir anahtar
    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.fallback_providers")
    )
    row = result.scalar_one()
    assert row.visible_to_user is False
    assert row.user_override_allowed is False
    assert row.read_only_for_user is True


@pytest.mark.asyncio
async def test_seed_idempotent(db_session: AsyncSession):
    c1 = await seed_known_settings(db_session)
    c2 = await seed_known_settings(db_session)
    assert c2 == 0  # Ikinci seed hic satir eklemiyor


# ---------------------------------------------------------------------------
# Sync — mevcut satirlari gunceller ama admin_value_json'a dokunmaz
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sync_eski_satirdaki_visibility_flagleri_guncellenir(db_session: AsyncSession):
    """Eski seed (visible_to_user=False her anahtar icin) sonrasi sync
    user-facing anahtarlari True yapmali."""
    # 1. Seed — yeni policy'ye gore yazilir
    await seed_known_settings(db_session)

    # 2. Manuel olarak bir user-facing satiri "eski" duruma dondur
    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.controls.default_scene_energy")
    )
    row = result.scalar_one()
    row.visible_to_user = False
    row.user_override_allowed = False
    row.visible_in_wizard = False
    row.read_only_for_user = True
    row.admin_value_json = json.dumps("calm")  # sync bunu korumali
    await db_session.commit()

    # 3. Sync cagir
    updated = await sync_visibility_flags_from_registry(db_session)
    assert updated >= 1

    # 4. Kontrol: visibility bayraklari meta'ya uyacak sekilde guncellenmis
    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.controls.default_scene_energy")
    )
    row = result.scalar_one()
    assert row.visible_to_user is True
    assert row.user_override_allowed is True
    assert row.visible_in_wizard is True
    assert row.read_only_for_user is False
    # Admin override KORUNDU
    assert json.loads(row.admin_value_json) == "calm"


@pytest.mark.asyncio
async def test_sync_idempotent(db_session: AsyncSession):
    await seed_known_settings(db_session)
    u1 = await sync_visibility_flags_from_registry(db_session)
    u2 = await sync_visibility_flags_from_registry(db_session)
    # Seed zaten yeni policy'yle yazdi; ikinci sync hicbir seyi guncellememeli
    assert u1 == 0
    assert u2 == 0


@pytest.mark.asyncio
async def test_sync_admin_value_korunur(db_session: AsyncSession):
    await seed_known_settings(db_session)
    # Admin speed override et
    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.voice_settings.speed")
    )
    row = result.scalar_one()
    row.admin_value_json = json.dumps(1.2)
    await db_session.commit()

    await sync_visibility_flags_from_registry(db_session)

    result = await db_session.execute(
        select(Setting).where(Setting.key == "tts.voice_settings.speed")
    )
    row = result.scalar_one()
    assert json.loads(row.admin_value_json) == 1.2  # deger korundu
