"""
M9-A Credential Resolver + Settings Wiring API tests.

Covers:
  A) GET /settings/credentials — list all credential statuses
  B) GET /settings/credentials/{key} — single credential status
  C) PUT /settings/credentials/{key} — save credential
  D) POST /settings/credentials/{key}/validate — basic validation
  E) Unknown key → 404
  F) Credential precedence: DB > .env > None
  G) Masking logic
  H) Save + re-read round-trip
"""

import pytest
from httpx import AsyncClient

CREDS_BASE = "/api/v1/settings/credentials"

KNOWN_KEYS = [
    "credential.kie_ai_api_key",
    "credential.openai_api_key",
    "credential.pexels_api_key",
    "credential.pixabay_api_key",
    "credential.dubvoice_api_key",  # Phase AI — DubVoice write path eklendi
    "credential.youtube_client_id",
    "credential.youtube_client_secret",
]


# ---------------------------------------------------------------------------
# A) List credentials
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_credentials_returns_all_known(client: AsyncClient):
    resp = await client.get(CREDS_BASE)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    keys_returned = [c["key"] for c in body]
    for key in KNOWN_KEYS:
        assert key in keys_returned, f"{key} missing from credential list"


@pytest.mark.asyncio
async def test_list_credentials_fields(client: AsyncClient):
    resp = await client.get(CREDS_BASE)
    assert resp.status_code == 200
    for cred in resp.json():
        assert "key" in cred
        assert "status" in cred
        assert cred["status"] in ("configured", "env_only", "missing", "invalid")
        assert "source" in cred
        assert "label" in cred
        assert "help_text" in cred
        assert "group" in cred
        assert "capability" in cred


# ---------------------------------------------------------------------------
# B) Single credential status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_single_credential_status(client: AsyncClient):
    resp = await client.get(f"{CREDS_BASE}/credential.kie_ai_api_key")
    assert resp.status_code == 200
    body = resp.json()
    assert body["key"] == "credential.kie_ai_api_key"
    assert body["label"] == "Kie.ai API Key"
    assert body["group"] == "ai_providers"
    assert body["capability"] == "llm"


# ---------------------------------------------------------------------------
# C) Save credential
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_credential_new(client: AsyncClient):
    resp = await client.put(
        f"{CREDS_BASE}/credential.pixabay_api_key",
        json={"value": "test-pixabay-key-12345"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["key"] == "credential.pixabay_api_key"
    assert body["status"] == "configured"
    assert body["source"] == "db"
    # Masked value should end with "2345"
    assert body["masked_value"] is not None
    assert body["masked_value"].endswith("2345")


@pytest.mark.asyncio
async def test_save_credential_updates_existing(client: AsyncClient):
    key = "credential.pexels_api_key"
    # First save
    await client.put(f"{CREDS_BASE}/{key}", json={"value": "first-value-abcd"})
    # Second save
    resp = await client.put(f"{CREDS_BASE}/{key}", json={"value": "second-value-wxyz"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["masked_value"].endswith("wxyz")


@pytest.mark.asyncio
async def test_save_credential_returns_wiring_info(client: AsyncClient):
    resp = await client.put(
        f"{CREDS_BASE}/credential.kie_ai_api_key",
        json={"value": "test-kie-key-99999"},
    )
    assert resp.status_code == 200
    body = resp.json()
    # wiring field should be present
    assert "wiring" in body
    assert body["wiring"]["key"] == "credential.kie_ai_api_key"
    assert body["wiring"]["action"] in ("replaced", "registered", "no_provider", "skipped")


# ---------------------------------------------------------------------------
# D) Validate credential
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_validate_credential_missing(client: AsyncClient):
    # Use a key that likely has no value in test env
    resp = await client.post(f"{CREDS_BASE}/credential.youtube_client_secret/validate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["key"] == "credential.youtube_client_secret"
    assert isinstance(body["valid"], bool)
    assert "message" in body


@pytest.mark.asyncio
async def test_validate_credential_after_save(client: AsyncClient):
    key = "credential.youtube_client_id"
    # Save a value first
    await client.put(f"{CREDS_BASE}/{key}", json={"value": "test-client-id-123"})
    # Now validate
    resp = await client.post(f"{CREDS_BASE}/{key}/validate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True


# ---------------------------------------------------------------------------
# E) Unknown key → 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_unknown_credential_returns_404(client: AsyncClient):
    resp = await client.get(f"{CREDS_BASE}/credential.nonexistent_key")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_save_unknown_credential_returns_404(client: AsyncClient):
    resp = await client.put(
        f"{CREDS_BASE}/credential.nonexistent_key",
        json={"value": "abc"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_validate_unknown_credential_returns_404(client: AsyncClient):
    resp = await client.post(f"{CREDS_BASE}/credential.nonexistent_key/validate")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# F) Masking logic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_masking_shows_last_4(client: AsyncClient):
    await client.put(
        f"{CREDS_BASE}/credential.openai_api_key",
        json={"value": "sk-abcdefghij1234"},
    )
    resp = await client.get(f"{CREDS_BASE}/credential.openai_api_key")
    assert resp.status_code == 200
    masked = resp.json()["masked_value"]
    assert masked.endswith("1234")
    assert "\u25cf" in masked  # contains mask chars


@pytest.mark.asyncio
async def test_masking_short_value_all_masked(client: AsyncClient):
    # Phase AI — "abc" artik placeholder olarak reddediliyor, bu yuzden 4 karakterlik
    # bir kisa-ama-placeholder-olmayan deger kullanilir. 5'ten kisa oldugu icin
    # hepsi hala maskelenir.
    await client.put(
        f"{CREDS_BASE}/credential.openai_api_key",
        json={"value": "zxcv"},
    )
    resp = await client.get(f"{CREDS_BASE}/credential.openai_api_key")
    assert resp.status_code == 200
    masked = resp.json()["masked_value"]
    # 4 chars → all masked
    assert masked == "\u25cf\u25cf\u25cf\u25cf"


# ---------------------------------------------------------------------------
# G) Save + re-read round-trip (DB persistence)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_save_then_list_shows_configured(client: AsyncClient):
    key = "credential.pixabay_api_key"
    await client.put(f"{CREDS_BASE}/{key}", json={"value": "round-trip-test-5678"})

    resp = await client.get(CREDS_BASE)
    assert resp.status_code == 200
    found = [c for c in resp.json() if c["key"] == key]
    assert len(found) == 1
    assert found[0]["status"] == "configured"
    assert found[0]["source"] == "db"


# ---------------------------------------------------------------------------
# Phase AI — Silent Truth Fix Pack tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase_ai_dubvoice_key_is_savable(client: AsyncClient):
    """DubVoice write path — Phase AI'dan once CREDENTIAL_KEYS'de yoktu, 400 atiyordu."""
    key = "credential.dubvoice_api_key"
    resp = await client.put(
        f"{CREDS_BASE}/{key}",
        json={"value": "dubvoice-live-key-xyz789"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["key"] == key
    assert body["status"] == "configured"
    assert body["source"] == "db"
    assert body["masked_value"].endswith("z789")


@pytest.mark.asyncio
async def test_phase_ai_dubvoice_in_list(client: AsyncClient):
    """DubVoice liste endpoint'inde de gorulmeli (read path symmetry)."""
    resp = await client.get(CREDS_BASE)
    assert resp.status_code == 200
    keys = [c["key"] for c in resp.json()]
    assert "credential.dubvoice_api_key" in keys
    dub = next(c for c in resp.json() if c["key"] == "credential.dubvoice_api_key")
    assert dub["label"] == "DubVoice API Key"
    assert dub["group"] == "ai_providers"
    assert dub["capability"] == "tts"


@pytest.mark.parametrize("placeholder", ["abc", "sk-test-key-123", "placeholder", "", "   "])
@pytest.mark.asyncio
async def test_phase_ai_placeholder_rejected_with_400(
    client: AsyncClient, placeholder: str,
):
    """Placeholder credential degerleri 400 ile reddedilmeli, sessizce kaydedilmemeli."""
    resp = await client.put(
        f"{CREDS_BASE}/credential.openai_api_key",
        json={"value": placeholder},
    )
    assert resp.status_code == 400, (
        f"Placeholder {placeholder!r} kabul edildi — sessiz truth bug!"
    )
    detail = resp.json().get("detail", "")
    assert "placeholder" in detail.lower() or "bos" in detail.lower()


@pytest.mark.asyncio
async def test_phase_ai_validate_honest_response_shape(client: AsyncClient):
    """validate endpoint artik live_tested=False ve acik mesaj donmeli."""
    key = "credential.pexels_api_key"
    await client.put(f"{CREDS_BASE}/{key}", json={"value": "real-looking-pexels-key-1234"})

    resp = await client.post(f"{CREDS_BASE}/{key}/validate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    # Phase AI — honesty gate
    assert body["live_tested"] is False, (
        "validate endpoint live_tested field'i yok — kullaniciya 'gercek test yapildi' yanilgisi dogabilir."
    )
    assert "canli" in body["message"].lower() or "live" in body["message"].lower()


@pytest.mark.asyncio
async def test_phase_ai_validate_missing_credential_is_honest(client: AsyncClient):
    """Kayitsiz credential icin validate False + live_tested False + aciklayici mesaj."""
    # DubVoice key'i test baslangicinda temiz (her test fresh DB'de).
    # Once silinmis / hic yazilmamis durumunu simule etmek icin baska bir key kullanalim:
    # credential.youtube_client_secret test env'da tipik olarak bos.
    resp = await client.post(f"{CREDS_BASE}/credential.youtube_client_secret/validate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["live_tested"] is False
    assert "valid" in body
    assert "message" in body


# --- KNOWN_SETTINGS / resolver tests ---

@pytest.mark.asyncio
async def test_phase_ai_product_review_module_toggle_resolvable(client: AsyncClient):
    """module.product_review.enabled KNOWN_SETTINGS'e eklendi — effective endpoint'inde olmali."""
    resp = await client.get("/api/v1/settings/effective/module.product_review.enabled")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["key"] == "module.product_review.enabled"
    # builtin_default: True — EffectiveSettingResponse alan adi 'effective_value'
    assert body["effective_value"] is True
    assert body["builtin_default"] is True
    assert body["module_scope"] == "product_review"


@pytest.mark.asyncio
async def test_phase_ai_publish_scheduler_interval_setting_exists(client: AsyncClient):
    """publish.scheduler.interval_seconds KNOWN_SETTINGS'e eklendi."""
    resp = await client.get("/api/v1/settings/effective/publish.scheduler.interval_seconds")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["key"] == "publish.scheduler.interval_seconds"
    assert float(body["effective_value"]) == 60.0
    assert float(body["builtin_default"]) == 60.0
