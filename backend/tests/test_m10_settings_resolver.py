"""
M10 Settings Resolver tests.

Tests for:
  - settings_resolver: resolve, explain, list_effective, list_groups, type coercion
  - settings_seed: seed_known_settings idempotency
  - effective API endpoints: /settings/effective, /groups, PUT /effective/{key}
"""

import json
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting
from app.main import create_app
from app.db.session import AsyncSessionLocal, create_tables

# Sprint 1 hardening: default caller role is "user"; admin role needed for full access
ADMIN_ROLE = {"X-ContentHub-Role": "admin"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db():
    await create_tables()
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
def app():
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Type coercion unit tests
# ---------------------------------------------------------------------------

class TestTypeCoercion:
    def test_coerce_string(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("hello", "string") == "hello"
        assert _coerce(42, "string") == "42"

    def test_coerce_secret(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("sk-123", "secret") == "sk-123"

    def test_coerce_boolean_true(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("true", "boolean") is True
        assert _coerce("1", "boolean") is True
        assert _coerce("yes", "boolean") is True
        assert _coerce(True, "boolean") is True

    def test_coerce_boolean_false(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("false", "boolean") is False
        assert _coerce("0", "boolean") is False
        assert _coerce("no", "boolean") is False
        assert _coerce(False, "boolean") is False

    def test_coerce_integer(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("42", "integer") == 42
        assert _coerce(42.7, "integer") == 42
        assert _coerce("3.9", "integer") == 3

    def test_coerce_float(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("0.7", "float") == 0.7
        assert _coerce(42, "float") == 42.0

    def test_coerce_json(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce('{"a": 1}', "json") == {"a": 1}
        assert _coerce([1, 2], "json") == [1, 2]

    def test_coerce_none(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce(None, "string") is None
        assert _coerce(None, "integer") is None

    def test_coerce_invalid_returns_none(self):
        from app.settings.settings_resolver import _coerce
        assert _coerce("not-a-number", "integer") is None
        assert _coerce("bad-json{", "json") is None


# ---------------------------------------------------------------------------
# Masking unit tests
# ---------------------------------------------------------------------------

class TestMasking:
    def test_mask_long_value(self):
        from app.settings.settings_resolver import _mask_value
        val = "sk-abc123456"  # 12 chars
        masked = _mask_value(val)
        assert masked.endswith("3456")
        assert "\u25cf" in masked
        assert len(masked) == len(val)

    def test_mask_short_value(self):
        from app.settings.settings_resolver import _mask_value
        assert _mask_value("abc") == "\u25cf\u25cf\u25cf"

    def test_mask_exactly_5(self):
        from app.settings.settings_resolver import _mask_value
        result = _mask_value("abcde")
        assert result.endswith("bcde")
        assert result[0] == "\u25cf"


# ---------------------------------------------------------------------------
# Resolver integration tests
# ---------------------------------------------------------------------------

class TestResolve:
    @pytest.mark.asyncio
    async def test_resolve_builtin_or_default(self, db: AsyncSession):
        from app.settings.settings_resolver import resolve
        # provider.whisper.model_size has builtin_default = "base"
        # No other test modifies this key
        val = await resolve("provider.whisper.model_size", db)
        assert val == "base"

    @pytest.mark.asyncio
    async def test_resolve_admin_value_overrides(self, db: AsyncSession):
        from app.settings.settings_resolver import resolve
        # Upsert — row may already exist from seed
        result = await db.execute(select(Setting).where(Setting.key == "provider.llm.kie_model"))
        existing = result.scalar_one_or_none()
        if existing:
            existing.admin_value_json = json.dumps("gemini-2.0-pro")
            existing.version = existing.version + 1
        else:
            row = Setting(
                key="provider.llm.kie_model",
                group_name="providers",
                type="string",
                default_value_json="null",
                admin_value_json=json.dumps("gemini-2.0-pro"),
            )
            db.add(row)
        await db.commit()

        val = await resolve("provider.llm.kie_model", db)
        assert val == "gemini-2.0-pro"

    @pytest.mark.asyncio
    async def test_resolve_default_value_overrides_builtin(self, db: AsyncSession):
        from app.settings.settings_resolver import resolve
        result = await db.execute(select(Setting).where(Setting.key == "provider.llm.openai_model"))
        existing = result.scalar_one_or_none()
        if existing:
            existing.default_value_json = json.dumps("gpt-4")
            existing.admin_value_json = "null"
            existing.version = existing.version + 1
        else:
            row = Setting(
                key="provider.llm.openai_model",
                group_name="providers",
                type="string",
                default_value_json=json.dumps("gpt-4"),
                admin_value_json="null",
            )
            db.add(row)
        await db.commit()

        val = await resolve("provider.llm.openai_model", db)
        assert val == "gpt-4"

    @pytest.mark.asyncio
    async def test_resolve_unknown_key(self, db: AsyncSession):
        from app.settings.settings_resolver import resolve
        val = await resolve("nonexistent.key", db)
        assert val is None


class TestExplain:
    @pytest.mark.asyncio
    async def test_explain_returns_all_fields(self, db: AsyncSession):
        from app.settings.settings_resolver import explain
        result = await explain("provider.llm.kie_temperature", db)
        assert result["key"] == "provider.llm.kie_temperature"
        assert result["effective_value"] == 0.7
        # Source can be "builtin" (no DB row) or "default" (seed created row with default_value_json)
        assert result["source"] in ("builtin", "default")
        assert result["type"] == "float"
        # kie_temperature is wired (M11: main.py resolves and passes to KieAiProvider)
        assert result["wired"] is True
        assert result["wired_to"] != ""
        assert result["label"] != ""

    @pytest.mark.asyncio
    async def test_explain_secret_masks_value(self, db: AsyncSession):
        from app.settings.settings_resolver import explain
        # Upsert — may already exist from seed/lifespan
        result = await db.execute(select(Setting).where(Setting.key == "credential.kie_ai_api_key"))
        existing = result.scalar_one_or_none()
        if existing:
            existing.admin_value_json = json.dumps("sk-test-very-long-key")
            existing.version = existing.version + 1
        else:
            row = Setting(
                key="credential.kie_ai_api_key",
                group_name="credentials",
                type="secret",
                admin_value_json=json.dumps("sk-test-very-long-key"),
            )
            db.add(row)
        await db.commit()

        result = await explain("credential.kie_ai_api_key", db)
        assert result["source"] == "admin"
        assert result["is_secret"] is True
        # effective_value should be masked
        assert "\u25cf" in str(result["effective_value"])
        # raw should not be exposed for secrets
        assert result["effective_value_raw"] is None


class TestListEffective:
    @pytest.mark.asyncio
    async def test_list_all(self, db: AsyncSession):
        from app.settings.settings_resolver import list_effective, KNOWN_SETTINGS
        items = await list_effective(db)
        assert len(items) == len(KNOWN_SETTINGS)

    @pytest.mark.asyncio
    async def test_filter_by_group(self, db: AsyncSession):
        from app.settings.settings_resolver import list_effective, KNOWN_SETTINGS
        provider_items = await list_effective(db, group="providers")
        expected = sum(1 for m in KNOWN_SETTINGS.values() if m.get("group") == "providers")
        assert len(provider_items) == expected
        for item in provider_items:
            assert item["group"] == "providers"

    @pytest.mark.asyncio
    async def test_filter_wired_only(self, db: AsyncSession):
        from app.settings.settings_resolver import list_effective
        items = await list_effective(db, wired_only=True)
        for item in items:
            assert item["wired"] is True


class TestListGroups:
    @pytest.mark.asyncio
    async def test_groups_returned(self, db: AsyncSession):
        from app.settings.settings_resolver import list_groups
        groups = await list_groups(db)
        assert len(groups) > 0
        group_names = [g["group"] for g in groups]
        assert "credentials" in group_names
        assert "providers" in group_names

    @pytest.mark.asyncio
    async def test_group_counts(self, db: AsyncSession):
        from app.settings.settings_resolver import list_groups
        groups = await list_groups(db)
        for g in groups:
            assert g["total"] > 0
            assert g["wired"] >= 0
            assert g["missing"] >= 0


# ---------------------------------------------------------------------------
# Seed tests
# ---------------------------------------------------------------------------

class TestSeed:
    @pytest.mark.asyncio
    async def test_seed_creates_rows(self, db: AsyncSession):
        from app.settings.settings_seed import seed_known_settings
        from app.settings.settings_resolver import KNOWN_SETTINGS

        count = await seed_known_settings(db)
        # Should create rows for settings not already in DB
        assert count >= 0

        # Verify rows exist
        for key in list(KNOWN_SETTINGS.keys())[:3]:
            result = await db.execute(select(Setting).where(Setting.key == key))
            row = result.scalar_one_or_none()
            assert row is not None, f"Seed should have created row for {key}"

    @pytest.mark.asyncio
    async def test_seed_idempotent(self, db: AsyncSession):
        from app.settings.settings_seed import seed_known_settings

        count1 = await seed_known_settings(db)
        count2 = await seed_known_settings(db)
        # Second run should create 0 — all already exist
        assert count2 == 0

    @pytest.mark.asyncio
    async def test_seed_preserves_admin_value(self, db: AsyncSession):
        from app.settings.settings_seed import seed_known_settings

        # Upsert — may already exist from seed/lifespan
        result = await db.execute(select(Setting).where(Setting.key == "provider.llm.kie_model"))
        existing = result.scalar_one_or_none()
        if existing:
            existing.admin_value_json = json.dumps("custom-model")
            existing.version = existing.version + 1
        else:
            row = Setting(
                key="provider.llm.kie_model",
                group_name="providers",
                type="string",
                admin_value_json=json.dumps("custom-model"),
            )
            db.add(row)
        await db.commit()

        await seed_known_settings(db)

        result = await db.execute(select(Setting).where(Setting.key == "provider.llm.kie_model"))
        row = result.scalar_one()
        assert json.loads(row.admin_value_json) == "custom-model"


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestEffectiveAPI:
    @pytest.mark.asyncio
    async def test_list_effective_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings/effective", headers=ADMIN_ROLE)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check structure
        item = data[0]
        assert "key" in item
        assert "effective_value" in item
        assert "source" in item
        assert "wired" in item
        assert "group" in item

    @pytest.mark.asyncio
    async def test_list_effective_filter_group(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings/effective?group=providers", headers=ADMIN_ROLE)
        assert resp.status_code == 200
        data = resp.json()
        for item in data:
            assert item["group"] == "providers"

    @pytest.mark.asyncio
    async def test_list_effective_wired_only(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings/effective?wired_only=true", headers=ADMIN_ROLE)
        assert resp.status_code == 200
        data = resp.json()
        for item in data:
            assert item["wired"] is True

    @pytest.mark.asyncio
    async def test_get_effective_single(self, client: AsyncClient):
        # Use a key that other tests don't modify
        resp = await client.get("/api/v1/settings/effective/provider.llm.kie_temperature", headers=ADMIN_ROLE)
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "provider.llm.kie_temperature"
        assert data["source"] in ("builtin", "default", "admin")
        assert data["type"] == "float"
        # kie_temperature is wired (M11: main.py resolves and passes to KieAiProvider)
        assert data["wired"] is True

    @pytest.mark.asyncio
    async def test_get_effective_unknown_key(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings/effective/nonexistent.key", headers=ADMIN_ROLE)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_groups_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v1/settings/groups", headers=ADMIN_ROLE)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        group_names = [g["group"] for g in data]
        assert "credentials" in group_names
        assert "providers" in group_names
        for g in data:
            assert "total" in g
            assert "wired" in g
            assert "missing" in g

    @pytest.mark.asyncio
    async def test_put_effective_updates_admin_value(self, client: AsyncClient):
        # Update a non-credential setting
        resp = await client.put(
            "/api/v1/settings/effective/provider.llm.kie_model",
            json={"value": "gemini-3.0-ultra"},
            headers=ADMIN_ROLE,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "provider.llm.kie_model"
        assert data["source"] == "admin"
        assert data["has_admin_override"] is True

        # Verify it persisted
        resp2 = await client.get("/api/v1/settings/effective/provider.llm.kie_model", headers=ADMIN_ROLE)
        assert resp2.json()["effective_value"] == "gemini-3.0-ultra"

    @pytest.mark.asyncio
    async def test_put_effective_unknown_key(self, client: AsyncClient):
        resp = await client.put(
            "/api/v1/settings/effective/nonexistent.key",
            json={"value": "test"},
            headers=ADMIN_ROLE,
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_put_effective_credential_delegates(self, client: AsyncClient):
        # Updating a credential key should delegate to credential resolver
        resp = await client.put(
            "/api/v1/settings/effective/credential.pexels_api_key",
            json={"value": "test-pexels-key-12345"},
            headers=ADMIN_ROLE,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "credential.pexels_api_key"
        assert "wiring" in data
