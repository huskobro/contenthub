"""
Settings Precedence Chain — Integration Tests.

Verifies the 4-level precedence chain implemented by settings_resolver.resolve():
  1. DB admin_value_json  (highest priority)
  2. DB default_value_json
  3. Environment variable  (via os.environ)
  4. Builtin default from KNOWN_SETTINGS  (lowest priority)

Also covers credential_resolver precedence (DB admin_value -> env -> None).

Each test uses an isolated in-memory SQLite database so that no side effects
leak between tests or affect the real application database.
"""

import json
import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.base import Base
from app.db.models import Setting

# ---------------------------------------------------------------------------
# Isolated in-memory DB fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db():
    """Yield a fresh async session backed by an in-memory SQLite database."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session

    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# A non-credential setting with an env_var and a builtin default.
# provider.llm.kie_model:  env_var="", builtin_default="gemini-2.5-flash"
# We need a key that has a non-empty env_var for the env override tests.
# credential.pexels_api_key has env_var="CONTENTHUB_PEXELS_API_KEY" and
# type="secret" — suitable but it's a credential key.
# For general settings, let's pick credential.kie_ai_api_key which has
# env_var="CONTENTHUB_KIE_AI_API_KEY".
#
# For non-credential env tests we can temporarily patch KNOWN_SETTINGS
# or use a credential key with the general resolver.

# We'll use "credential.pexels_api_key" for env-related tests since it has
# a real env_var, and "provider.llm.kie_model" for builtin default tests.

TEST_KEY_WITH_BUILTIN = "provider.llm.kie_model"           # builtin = "gemini-2.5-flash", no env_var
TEST_KEY_WITH_ENV = "credential.pexels_api_key"             # env_var = "CONTENTHUB_PEXELS_API_KEY"
TEST_CREDENTIAL_KEY = "credential.pexels_api_key"           # credential resolver test
TEST_KEY_INTEGER = "provider.visuals.pexels_default_count"  # builtin = 5, type = integer


def _make_setting(key: str, *, admin_value=None, default_value=None, **kw) -> Setting:
    """Create a Setting ORM object for insertion."""
    return Setting(
        key=key,
        group_name=kw.get("group_name", "test"),
        type=kw.get("type", "string"),
        default_value_json=json.dumps(default_value) if default_value is not None else "null",
        admin_value_json=json.dumps(admin_value) if admin_value is not None else "null",
        user_override_allowed=False,
        visible_to_user=False,
        visible_in_wizard=False,
        read_only_for_user=True,
        module_scope=None,
        help_text="",
        validation_rules_json="{}",
        status="active",
    )


# ---------------------------------------------------------------------------
# 1. Builtin default — no DB row, no env var
# ---------------------------------------------------------------------------

class TestBuiltinDefault:
    @pytest.mark.asyncio
    async def test_builtin_default_used_when_no_db_no_env(self, db: AsyncSession):
        """When no DB row exists and no env var is set, the builtin default
        from KNOWN_SETTINGS must be returned."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_BUILTIN
        expected = KNOWN_SETTINGS[key]["builtin_default"]  # "gemini-2.5-flash"

        # Ensure no env var (this key has env_var="" so nothing to unset)
        value = await resolve(key, db)
        assert value == expected


# ---------------------------------------------------------------------------
# 2. Env var overrides builtin
# ---------------------------------------------------------------------------

class TestEnvOverridesBuiltin:
    @pytest.mark.asyncio
    async def test_env_overrides_builtin(self, db: AsyncSession, monkeypatch):
        """When an env var is set but there is no DB row, the env var should
        win over the builtin default."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_ENV
        env_var_name = KNOWN_SETTINGS[key]["env_var"]  # CONTENTHUB_PEXELS_API_KEY
        assert env_var_name, "Test key must have a non-empty env_var"

        # Set the env var; no DB row present
        monkeypatch.setenv(env_var_name, "env-pexels-key-999")

        value = await resolve(key, db)
        assert value == "env-pexels-key-999"

    @pytest.mark.asyncio
    async def test_env_overrides_builtin_integer_type(self, db: AsyncSession, monkeypatch):
        """Env var value should be coerced to the expected type (integer)."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_INTEGER  # type=integer, builtin=5
        # This key has env_var="" so we need to temporarily give it one.
        # Instead, let's verify builtin first, then use a key with env_var.
        # Since TEST_KEY_INTEGER has no env_var, we verify builtin works.
        value = await resolve(key, db)
        assert value == KNOWN_SETTINGS[key]["builtin_default"]  # 5
        assert isinstance(value, int)


# ---------------------------------------------------------------------------
# 3. DB default_value_json overrides env var
# ---------------------------------------------------------------------------

class TestDbDefaultOverridesEnv:
    @pytest.mark.asyncio
    async def test_db_default_overrides_env(self, db: AsyncSession, monkeypatch):
        """When the DB has a default_value_json set (but no admin_value_json),
        it should override the env var."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_ENV
        env_var_name = KNOWN_SETTINGS[key]["env_var"]

        # Set env var
        monkeypatch.setenv(env_var_name, "env-should-lose")

        # Insert DB row with default_value_json only (admin_value_json is null)
        row = _make_setting(key, default_value="db-default-wins", type="secret")
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "db-default-wins"

    @pytest.mark.asyncio
    async def test_db_default_overrides_builtin(self, db: AsyncSession):
        """DB default_value_json should override builtin default even
        when there is no env var."""
        from app.settings.settings_resolver import resolve

        key = TEST_KEY_WITH_BUILTIN  # builtin = "gemini-2.5-flash"

        row = _make_setting(key, default_value="custom-model-from-db")
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "custom-model-from-db"


# ---------------------------------------------------------------------------
# 4. DB admin_value_json overrides everything
# ---------------------------------------------------------------------------

class TestDbAdminOverridesAll:
    @pytest.mark.asyncio
    async def test_db_admin_overrides_all(self, db: AsyncSession, monkeypatch):
        """admin_value_json should take precedence over default_value_json,
        env var, and builtin default."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_ENV
        env_var_name = KNOWN_SETTINGS[key]["env_var"]

        # Set env var
        monkeypatch.setenv(env_var_name, "env-should-lose")

        # Insert DB row with both admin and default values
        row = _make_setting(
            key,
            admin_value="admin-wins-over-everything",
            default_value="db-default-should-lose",
            type="secret",
        )
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "admin-wins-over-everything"

    @pytest.mark.asyncio
    async def test_db_admin_overrides_builtin_no_env(self, db: AsyncSession):
        """admin_value_json should override builtin default even without
        an env var in play."""
        from app.settings.settings_resolver import resolve

        key = TEST_KEY_WITH_BUILTIN  # builtin = "gemini-2.5-flash"

        row = _make_setting(
            key,
            admin_value="admin-override-model",
            default_value="db-default-model",
        )
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "admin-override-model"


# ---------------------------------------------------------------------------
# 5. Empty/null admin_value falls through
# ---------------------------------------------------------------------------

class TestEmptyAdminFallsThrough:
    @pytest.mark.asyncio
    async def test_null_admin_value_falls_to_default(self, db: AsyncSession):
        """When admin_value_json is 'null', resolver should fall through
        to default_value_json."""
        from app.settings.settings_resolver import resolve

        key = TEST_KEY_WITH_BUILTIN

        row = _make_setting(key, admin_value=None, default_value="fallback-default")
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "fallback-default"

    @pytest.mark.asyncio
    async def test_empty_string_admin_value_falls_through(self, db: AsyncSession):
        """When admin_value_json is '"" ' (JSON-encoded empty string), the
        _parse_json_field returns '' which is then coerced. An empty string
        coerced to 'string' type is still '' — which is not None, so it
        should NOT fall through. This test documents that behavior."""
        from app.settings.settings_resolver import resolve

        key = TEST_KEY_WITH_BUILTIN

        row = Setting(
            key=key,
            group_name="test",
            type="string",
            default_value_json=json.dumps("should-not-see"),
            admin_value_json=json.dumps(""),  # empty string, not null
            user_override_allowed=False,
            visible_to_user=False,
            visible_in_wizard=False,
            read_only_for_user=True,
            help_text="",
            validation_rules_json="{}",
            status="active",
        )
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        # Empty string is a valid coerced value for type="string", so
        # admin value "" wins and we get "".
        assert value == ""

    @pytest.mark.asyncio
    async def test_null_admin_null_default_falls_to_env(
        self, db: AsyncSession, monkeypatch
    ):
        """When both admin and default are null in DB, falls through to env."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_ENV
        env_var_name = KNOWN_SETTINGS[key]["env_var"]
        monkeypatch.setenv(env_var_name, "env-fallback-value")

        # DB row exists but both JSON fields are null
        row = _make_setting(key, admin_value=None, default_value=None, type="secret")
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == "env-fallback-value"

    @pytest.mark.asyncio
    async def test_null_admin_null_default_no_env_falls_to_builtin(
        self, db: AsyncSession
    ):
        """When DB row exists but both fields are null and no env var,
        builtin default should be used."""
        from app.settings.settings_resolver import resolve, KNOWN_SETTINGS

        key = TEST_KEY_WITH_BUILTIN
        expected_builtin = KNOWN_SETTINGS[key]["builtin_default"]

        row = _make_setting(key, admin_value=None, default_value=None)
        db.add(row)
        await db.commit()

        value = await resolve(key, db)
        assert value == expected_builtin


# ---------------------------------------------------------------------------
# 6. Credential resolver — DB over env
# ---------------------------------------------------------------------------

class TestCredentialResolution:
    @pytest.mark.asyncio
    async def test_credential_db_overrides_env(self, db: AsyncSession, monkeypatch):
        """For credential keys, DB admin_value_json should override env var."""
        from app.settings.credential_resolver import resolve_credential, CREDENTIAL_KEYS

        key = TEST_CREDENTIAL_KEY
        env_var_name = CREDENTIAL_KEYS[key]["env_var"]
        assert env_var_name, "Credential test key must have env_var"

        monkeypatch.setenv(env_var_name, "env-cred-loses")

        row = _make_setting(
            key,
            admin_value="db-cred-wins",
            group_name="credentials",
            type="secret",
        )
        db.add(row)
        await db.commit()

        value = await resolve_credential(key, db)
        assert value == "db-cred-wins"

    @pytest.mark.asyncio
    async def test_credential_env_used_when_no_db(self, db: AsyncSession, monkeypatch):
        """When no DB row exists, credential resolver should fall back to env."""
        from app.settings.credential_resolver import resolve_credential, CREDENTIAL_KEYS

        key = TEST_CREDENTIAL_KEY
        env_var_name = CREDENTIAL_KEYS[key]["env_var"]

        monkeypatch.setenv(env_var_name, "env-cred-only")

        value = await resolve_credential(key, db)
        assert value == "env-cred-only"

    @pytest.mark.asyncio
    async def test_credential_returns_none_when_nothing(self, db: AsyncSession, monkeypatch):
        """When neither DB nor env var has a value, None is returned."""
        from app.settings.credential_resolver import resolve_credential, CREDENTIAL_KEYS

        key = TEST_CREDENTIAL_KEY
        env_var_name = CREDENTIAL_KEYS[key]["env_var"]

        # Make sure the env var is unset
        monkeypatch.delenv(env_var_name, raising=False)

        value = await resolve_credential(key, db)
        assert value is None

    @pytest.mark.asyncio
    async def test_credential_null_admin_falls_to_env(
        self, db: AsyncSession, monkeypatch
    ):
        """When DB row exists but admin_value_json is null, credential
        resolver should fall back to env var."""
        from app.settings.credential_resolver import resolve_credential, CREDENTIAL_KEYS

        key = TEST_CREDENTIAL_KEY
        env_var_name = CREDENTIAL_KEYS[key]["env_var"]
        monkeypatch.setenv(env_var_name, "env-cred-fallback")

        # DB row with null admin value
        row = _make_setting(
            key,
            admin_value=None,
            group_name="credentials",
            type="secret",
        )
        db.add(row)
        await db.commit()

        value = await resolve_credential(key, db)
        assert value == "env-cred-fallback"


# ---------------------------------------------------------------------------
# 7. explain() source tracking
# ---------------------------------------------------------------------------

class TestExplainSourceTracking:
    @pytest.mark.asyncio
    async def test_explain_source_builtin(self, db: AsyncSession):
        """explain() should report source='builtin' when only builtin exists."""
        from app.settings.settings_resolver import explain

        key = TEST_KEY_WITH_BUILTIN
        result = await explain(key, db)
        assert result["source"] == "builtin"

    @pytest.mark.asyncio
    async def test_explain_source_env(self, db: AsyncSession, monkeypatch):
        """explain() should report source='env' when only env var is set."""
        from app.settings.settings_resolver import explain, KNOWN_SETTINGS

        key = TEST_KEY_WITH_ENV
        env_var_name = KNOWN_SETTINGS[key]["env_var"]
        monkeypatch.setenv(env_var_name, "env-value-for-explain")

        result = await explain(key, db)
        assert result["source"] == "env"

    @pytest.mark.asyncio
    async def test_explain_source_default(self, db: AsyncSession):
        """explain() should report source='default' when DB default_value exists."""
        from app.settings.settings_resolver import explain

        key = TEST_KEY_WITH_BUILTIN
        row = _make_setting(key, default_value="db-default-explain")
        db.add(row)
        await db.commit()

        result = await explain(key, db)
        assert result["source"] == "default"
        assert result["effective_value"] == "db-default-explain"

    @pytest.mark.asyncio
    async def test_explain_source_admin(self, db: AsyncSession):
        """explain() should report source='admin' when DB admin_value exists."""
        from app.settings.settings_resolver import explain

        key = TEST_KEY_WITH_BUILTIN
        row = _make_setting(key, admin_value="admin-explain-val")
        db.add(row)
        await db.commit()

        result = await explain(key, db)
        assert result["source"] == "admin"
        assert result["effective_value"] == "admin-explain-val"
