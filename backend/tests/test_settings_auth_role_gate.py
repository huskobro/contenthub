"""
Settings router auth role gate — regression tests.

Bu testler Pass-6 sırasında yakalanan bug'ı sabitler:

    "Yetki hatasi: Bu ayar kullanici tarafindan degistirilemez:
     wizard.news_bulletin.entry_mode"

Kök sebep: settings router ``Depends(get_caller_role)`` kullaniyordu.
``get_caller_role`` yalnizca ``X-ContentHub-Role`` header'ina bakiyor,
frontend hicbir yerde bu header'i gondermedigi icin admin'ler "user"
olarak islenyordu. Cozum: ``get_effective_role`` yeni dependency'si
JWT-authenticated user.role'u birincil kaynak olarak kullaniyor.

Bu dosya asagidaki invariantlari kalici olarak dogrular:

  1. Admin JWT ile ``wizard.news_bulletin.entry_mode`` (eskiden patlayan
     spesifik key) ``form`` olarak kaydedilebilir.
  2. Admin JWT ile KNOWN_SETTINGS altindaki baska bir locked key de
     yazilabilir — kural key-spesifik degil, auth-spesifik.
  3. Admin JWT PATCH /settings/{id} uzerinden locked setting'in
     help_text'ini guncelleyebilir.
  4. Token olmadan ayni PUT 403 doner (user_override_allowed=False
     enforcement korundu).
  5. User JWT ile locked key PUT 403 doner (gercek user_override
     kontrolu calisiyor, admin'e yanlis uygulanmiyor).
  6. Admin GET /settings ve GET /settings/effective listeleri user
     listelerinden daha genistir (visibility filtresi ters yone
     donmemis).
  7. ``get_effective_role`` helper fonksiyonu tek basina yeni bir
     cagri senaryosu altinda da dogru role'u uretir — JWT > header >
     default.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


WIZARD_ENTRY_MODE_KEY = "wizard.news_bulletin.entry_mode"


# ---------------------------------------------------------------------------
# Pozitif yollar — admin JWT ile yazabilmeli
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_jwt_can_write_wizard_entry_mode(
    client: AsyncClient, admin_headers: dict
):
    """Asıl bug'ın kesin regression guard'ı.

    Pass-6 oncesi: admin JWT ile bu PUT 403 donuyordu (caller_role "user"
    olarak tespit ediliyordu). Pass-6 fix sonrasi 200 donmeli ve deger
    kalici olarak admin_value_json'a kaydedilmeli.
    """
    # Pre-read
    r_pre = await client.get(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        headers=admin_headers,
    )
    assert r_pre.status_code == 200, r_pre.text

    # Write "form"
    r_put = await client.put(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        json={"value": "form"},
        headers=admin_headers,
    )
    assert r_put.status_code == 200, (
        f"admin JWT ile locked key yazilamiyor — auth regresyonu! "
        f"status={r_put.status_code} body={r_put.text!r}"
    )
    assert r_put.json()["effective_value"] == "form"

    # Refresh-after-write — deger gercekten kaldi mi?
    r_after = await client.get(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        headers=admin_headers,
    )
    assert r_after.status_code == 200
    assert r_after.json()["effective_value"] == "form"

    # Revert (DB'yi temiz tut) — admin_value silmek yerine default'a cevir
    await client.put(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        json={"value": "wizard"},
        headers=admin_headers,
    )


@pytest.mark.asyncio
async def test_admin_jwt_can_write_any_locked_known_setting(
    client: AsyncClient, admin_headers: dict, db_session
):
    """Bug key-spesifik degil, auth-spesifik. KNOWN_SETTINGS altindaki
    herhangi bir locked (user_override_allowed=False) non-credential
    key admin icin yazilabilmeli.
    """
    from sqlalchemy import select
    from app.db.models import Setting
    from app.settings.settings_resolver import KNOWN_SETTINGS

    # Once bilinen 1-2 locked key seed et ki test fresh DB'de de calissin
    # (gercekte seed_known_settings sayesinde olur ama bagimsizlik icin direkt).
    target_key = "provider.llm.kie_model"
    if target_key not in KNOWN_SETTINGS:
        pytest.skip("Known setting not present in this registry version")

    # Locked mi? Settings tablosunda row yoksa once yaz, sonra kilitle.
    existing = (
        await db_session.execute(select(Setting).where(Setting.key == target_key))
    ).scalar_one_or_none()
    if existing is None:
        # Registry default'i ile seed et
        meta = KNOWN_SETTINGS[target_key]
        existing = Setting(
            key=target_key,
            group_name=meta.get("group", "providers"),
            type=meta.get("type", "string"),
            default_value_json="null",
            admin_value_json="null",
            user_override_allowed=False,
        )
        db_session.add(existing)
        await db_session.commit()
    else:
        existing.user_override_allowed = False
        await db_session.commit()

    r = await client.put(
        f"/api/v1/settings/effective/{target_key}",
        json={"value": "sweep-test"},
        headers=admin_headers,
    )
    assert r.status_code == 200, (
        f"admin locked non-credential key yazamiyor: {target_key} "
        f"status={r.status_code} body={r.text!r}"
    )


@pytest.mark.asyncio
async def test_admin_jwt_can_patch_locked_setting_registry_row(
    client: AsyncClient, admin_headers: dict, db_session
):
    """PATCH /settings/{id} path'i de get_effective_role kullaniyor.
    user_override_allowed=False olan bir registry row'una admin
    help_text guncelleyebilmeli.
    """
    from sqlalchemy import select
    from app.db.models import Setting

    row = (
        await db_session.execute(
            select(Setting).where(Setting.user_override_allowed == False).limit(1)
        )
    ).scalar_one_or_none()
    if row is None:
        pytest.skip("no locked setting in DB")

    r = await client.patch(
        f"/api/v1/settings/{row.id}",
        json={"help_text": "auth-gate-regression-marker"},
        headers=admin_headers,
    )
    assert r.status_code == 200, (
        f"admin PATCH locked setting basarisiz: {r.status_code} {r.text!r}"
    )

    # Revert
    await client.patch(
        f"/api/v1/settings/{row.id}",
        json={"help_text": ""},
        headers=admin_headers,
    )


# ---------------------------------------------------------------------------
# Negatif yollar — korunan davranış aynı kalmalı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_auth_put_locked_key_is_403(client: AsyncClient):
    """Authorization header yoksa locked key yine 403 donmeli.

    Fix otorizasyonu admin'e acti ama anonim kullaniciyi hala
    engelliyor olmali.
    """
    r = await client.put(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        json={"value": "form"},
    )
    assert r.status_code == 403
    assert "degistirilemez" in r.text


@pytest.mark.asyncio
async def test_regular_user_jwt_put_locked_key_is_403(
    client: AsyncClient, user_headers: dict
):
    """Regular user JWT ile locked key 403 donmeli.

    user_override_allowed=False kurali JWT role "user" icin dogru
    calisiyor — admin'e yanlislikla uygulanmiyor.
    """
    r = await client.put(
        f"/api/v1/settings/effective/{WIZARD_ENTRY_MODE_KEY}",
        json={"value": "form"},
        headers=user_headers,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_regular_user_cannot_bulk_update(
    client: AsyncClient, user_headers: dict
):
    """Bulk-update require_admin ile korunmali — user 403."""
    r = await client.post(
        "/api/v1/settings/bulk-update",
        json={"updates": []},
        headers=user_headers,
    )
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Read visibility — admin > user
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_list_is_wider_than_user_list(
    client: AsyncClient, admin_headers: dict, user_headers: dict
):
    """GET /settings admin'e tum setting'leri, user'a sadece
    visible_to_user=True olanlari donmeli.
    """
    r_admin = await client.get("/api/v1/settings", headers=admin_headers)
    r_user = await client.get("/api/v1/settings", headers=user_headers)
    assert r_admin.status_code == 200
    assert r_user.status_code == 200
    assert len(r_admin.json()) >= len(r_user.json()), (
        "admin listesi user listesinden kucuk — visibility filtresi ters donmus"
    )


@pytest.mark.asyncio
async def test_admin_effective_is_wider_than_user_effective(
    client: AsyncClient, admin_headers: dict, user_headers: dict
):
    """GET /settings/effective admin'e tum KNOWN_SETTINGS'i donmeli,
    user'a sadece visible_to_user=True olanlari.
    """
    r_admin = await client.get("/api/v1/settings/effective", headers=admin_headers)
    r_user = await client.get("/api/v1/settings/effective", headers=user_headers)
    assert r_admin.status_code == 200
    assert r_user.status_code == 200
    assert len(r_admin.json()) >= len(r_user.json())


# ---------------------------------------------------------------------------
# Helper dependency — get_effective_role birim testi
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_effective_role_prefers_jwt_user_over_header(admin_user):
    """get_effective_role: JWT user.role > header > default.

    Admin user + header=None → "admin" (JWT'den geldi).
    """
    from app.visibility.dependencies import get_effective_role

    role = await get_effective_role(user=admin_user, x_contenthub_role=None)
    assert role == "admin"


@pytest.mark.asyncio
async def test_get_effective_role_falls_back_to_header_without_user():
    """get_effective_role: JWT user yoksa header fallback calismali.

    dev/curl flow'lari ve legacy test fixture'lari icin sart.
    """
    from app.visibility.dependencies import get_effective_role

    role = await get_effective_role(user=None, x_contenthub_role="admin")
    assert role == "admin"

    role_user = await get_effective_role(user=None, x_contenthub_role="user")
    assert role_user == "user"


@pytest.mark.asyncio
async def test_get_effective_role_defaults_to_user():
    """get_effective_role: JWT yok + header yok → "user" (guvenli default)."""
    from app.visibility.dependencies import get_effective_role

    role = await get_effective_role(user=None, x_contenthub_role=None)
    assert role == "user"


@pytest.mark.asyncio
async def test_get_effective_role_ignores_garbage_header():
    """Bilinmeyen header degerleri guvenli default'a dusmeli."""
    from app.visibility.dependencies import get_effective_role

    role = await get_effective_role(user=None, x_contenthub_role="superadmin")
    assert role == "user"
