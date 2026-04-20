"""
Product Review Module — Faz A Foundation Tests.

Faz A'nin proof testleri:

  A) Migration fresh-DB: alembic upgrade head → products + product_snapshots +
     product_reviews tablolari var, ux_products_canonical_url partial UNIQUE
     index var.

  B) Partial UNIQUE canonical_url: NULL'lar cakismaz, dolu URL cakisirsa
     IntegrityError (SQLite UNIQUE constraint).

  C) ModuleRegistry: PRODUCT_REVIEW_MODULE kayitli, get('product_review')
     modulu dondurur, tum step_key'ler benzersiz, step_order monotonik.

  D) Composition map: 'product_review' → 'ProductReview', preview + mini
     kayitli ve get_composition_id bilinmeyen modul icin ValueError.

  E) KNOWN_SETTINGS: 8 'product_review.*' anahtar var (M10 registry
     sadelestirmesinde 15 kayitsiz stub kaldirildi — kalan 8 ayar gercekten
     product_review pipeline'inda okunuyor: 4 scrape + 3 legal + 1 full_auto).
     Hepsi module_scope='product_review', group='product_review'.
     GROUP_LABELS + GROUP_ORDER'da 'product_review' var.

  F) Settings seed: seed_known_settings() product_review ayarlarini DB'ye
     yazar; idempotent (ikinci kez cagrildiginda yeni kayit acmaz).

  G) Model CRUD roundtrip: Product create → ProductSnapshot create →
     ProductReview create. FK + default'lar dogru.

  H) Stub executor: ProductScrapeStepExecutor.execute(...) cagrildiginda
     StepExecutionError firlatir (yarim kalmadigina dair guvence — iskeleti
     pipeline yanlislikla calistirmaya calisirsa acik hata verir).
"""

from __future__ import annotations

import json
import os
import tempfile
import uuid

import pytest
import sqlalchemy as sa
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError

from app.db.models import Product, ProductReview, ProductSnapshot
from app.modules.product_review.definition import PRODUCT_REVIEW_MODULE
from app.modules.product_review.executors import ProductScrapeStepExecutor
from app.modules.registry import module_registry
from app.modules.standard_video.composition_map import (
    COMPOSITION_MAP,
    PREVIEW_COMPOSITION_MAP,
    get_composition_id,
    get_preview_composition_id,
)
from app.settings.settings_resolver import (
    GROUP_LABELS,
    GROUP_ORDER,
    KNOWN_SETTINGS,
    KNOWN_VALIDATION_RULES,
)


# ---------------------------------------------------------------------------
# A + B) Migration fresh-DB + partial UNIQUE canonical_url
# ---------------------------------------------------------------------------


def _run_alembic_on_fresh_db() -> str:
    """
    Bir tempdir altinda fresh DB + alembic upgrade head calistirir.
    Alt process kullanir cunku app.core.config.Settings() modul import'unda
    yuklendigi icin test runner process'te CONTENTHUB_DATA_DIR
    override'i sonradan yapilamaz.
    """
    import subprocess
    import sys

    tmpdir = tempfile.mkdtemp()
    env = os.environ.copy()
    env["CONTENTHUB_DATA_DIR"] = tmpdir
    r = subprocess.run(
        [
            sys.executable, "-c",
            "from alembic.config import Config; from alembic import command; "
            "cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')",
        ],
        env=env,
        capture_output=True,
        text=True,
        cwd=os.getcwd(),
    )
    assert r.returncode == 0, f"alembic upgrade failed: stdout={r.stdout!r} stderr={r.stderr!r}"
    return os.path.join(tmpdir, "contenthub.db")


def test_migration_fresh_db_creates_product_tables():
    dbpath = _run_alembic_on_fresh_db()
    engine = sa.create_engine(f"sqlite:///{dbpath}")
    with engine.connect() as conn:
        tables = set(inspect(conn).get_table_names())
    assert "products" in tables
    assert "product_snapshots" in tables
    assert "product_reviews" in tables


def test_migration_fresh_db_creates_partial_unique_canonical_url():
    dbpath = _run_alembic_on_fresh_db()
    engine = sa.create_engine(f"sqlite:///{dbpath}")
    with engine.connect() as conn:
        rows = conn.execute(
            sa.text(
                "SELECT name, sql FROM sqlite_master "
                "WHERE type='index' AND name='ux_products_canonical_url'"
            )
        ).fetchall()
    assert len(rows) == 1
    assert "canonical_url IS NOT NULL" in rows[0][1]


def test_products_partial_unique_blocks_duplicate_canonical_url():
    """Dolu canonical_url cakisirsa IntegrityError; NULL'lar cakismaz."""
    dbpath = _run_alembic_on_fresh_db()
    engine = sa.create_engine(f"sqlite:///{dbpath}")
    with engine.begin() as conn:
        # Iki NULL canonical — cakismamali
        conn.execute(
            sa.text(
                "INSERT INTO products (id, name, source_url, canonical_url, "
                "created_at, updated_at) VALUES "
                "('p1', 'P1', 'https://x.com/1', NULL, datetime('now'), datetime('now'))"
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO products (id, name, source_url, canonical_url, "
                "created_at, updated_at) VALUES "
                "('p2', 'P2', 'https://x.com/2', NULL, datetime('now'), datetime('now'))"
            )
        )
        # Dolu unique — birinci OK
        conn.execute(
            sa.text(
                "INSERT INTO products (id, name, source_url, canonical_url, "
                "created_at, updated_at) VALUES "
                "('p3', 'P3', 'https://x.com/3', 'https://x.com/canonical-a', "
                "datetime('now'), datetime('now'))"
            )
        )
    # Ikinci dolu = cakisma → IntegrityError
    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    "INSERT INTO products (id, name, source_url, canonical_url, "
                    "created_at, updated_at) VALUES "
                    "('p4', 'P4', 'https://x.com/4', 'https://x.com/canonical-a', "
                    "datetime('now'), datetime('now'))"
                )
            )


# ---------------------------------------------------------------------------
# C) ModuleRegistry lookup
# ---------------------------------------------------------------------------


def test_module_registry_has_product_review():
    mod = module_registry.get("product_review")
    assert mod is not None
    assert mod.module_id == "product_review"
    assert mod.display_name


def test_module_definition_step_order_and_unique_keys():
    steps = PRODUCT_REVIEW_MODULE.steps
    # Step order 1..N monotonik artar
    for i, s in enumerate(steps, start=1):
        assert s.step_order == i, f"step_order mismatch at index {i-1}: {s.step_key}"
    # step_key benzersiz
    keys = [s.step_key for s in steps]
    assert len(keys) == len(set(keys)), f"duplicate step_key in product_review: {keys}"
    # 11 adim (Faz A plani)
    assert len(steps) == 11
    # Zorunlu adimlar
    required = {
        "product_scrape", "script", "metadata", "visuals", "tts",
        "subtitle", "preview_frame", "preview_mini", "composition", "render",
        "publish",
    }
    assert set(keys) == required


# ---------------------------------------------------------------------------
# D) Composition map
# ---------------------------------------------------------------------------


def test_composition_map_has_product_review():
    assert COMPOSITION_MAP.get("product_review") == "ProductReview"
    assert get_composition_id("product_review") == "ProductReview"


def test_preview_composition_map_has_product_review_entries():
    assert PREVIEW_COMPOSITION_MAP.get("product_review_preview") == "ProductReviewPreviewFrame"
    assert PREVIEW_COMPOSITION_MAP.get("product_review_mini") == "ProductReviewMini"
    assert get_preview_composition_id("product_review_preview") == "ProductReviewPreviewFrame"


def test_composition_map_rejects_unknown_module():
    with pytest.raises(ValueError):
        get_composition_id("non_existent_module_42")


# ---------------------------------------------------------------------------
# E) KNOWN_SETTINGS
# ---------------------------------------------------------------------------


def test_known_settings_has_wired_product_review_entries():
    """
    Registry kontrati: kayitsiz ayar yok. M10 sadelestirmesi sonrasi
    product_review.* anahtarlarinin tamami pipeline icinde okunuyor (8 ayar:
    4 scrape + 3 legal + 1 full_auto). Hepsi module_scope='product_review',
    group='product_review'.
    """
    pr_keys = [k for k in KNOWN_SETTINGS if k.startswith("product_review.")]
    assert len(pr_keys) == 8, f"expected 8 wired product_review settings, got {len(pr_keys)}: {pr_keys}"
    # Hepsi module_scope='product_review', group='product_review'
    for k in pr_keys:
        s = KNOWN_SETTINGS[k]
        assert s["module_scope"] == "product_review", f"{k} module_scope: {s['module_scope']!r}"
        assert s["group"] == "product_review", f"{k} group: {s['group']!r}"
        # wired_to izi olmali (registry kontrati)
        assert s.get("wired_to"), f"{k} wired_to bos: registry kontrati ihlali"


def test_product_review_in_group_labels_and_order():
    assert "product_review" in GROUP_LABELS
    assert "product_review" in GROUP_ORDER


def test_product_review_legal_settings_present_and_required():
    # Hukuki ayarlar — kaldirilamayacak olanlar
    legal_keys = [
        "product_review.legal.affiliate_disclosure_text",
        "product_review.legal.price_disclaimer_text",
        "product_review.legal.tos_checkbox_required",
    ]
    for k in legal_keys:
        assert k in KNOWN_SETTINGS, f"missing legal setting: {k}"
    # Disclosure + disclaimer default dolu olmali
    assert len(KNOWN_SETTINGS["product_review.legal.affiliate_disclosure_text"]["builtin_default"]) > 20
    assert len(KNOWN_SETTINGS["product_review.legal.price_disclaimer_text"]["builtin_default"]) > 20
    # tos_checkbox_required default True
    assert KNOWN_SETTINGS["product_review.legal.tos_checkbox_required"]["builtin_default"] is True


def test_full_auto_publish_bypass_default_false():
    """Publish review GATE bypass default KAPALI (user karari)."""
    k = "product_review.full_auto.allow_publish_without_review"
    assert k in KNOWN_SETTINGS
    assert KNOWN_SETTINGS[k]["builtin_default"] is False


def test_robots_txt_default_false():
    """robots.txt default kapali (user karari) — setting var, docs warns."""
    k = "product_review.scrape.respect_robots_txt"
    assert k in KNOWN_SETTINGS
    assert KNOWN_SETTINGS[k]["builtin_default"] is False
    # Help text'te uyari olmali
    assert "UYARI" in KNOWN_SETTINGS[k]["help_text"] or "docs" in KNOWN_SETTINGS[k]["help_text"].lower()


# ---------------------------------------------------------------------------
# F) Settings seed (idempotent)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_settings_seed_creates_product_review_rows():
    from app.db.session import AsyncSessionLocal
    from app.settings.settings_seed import seed_known_settings
    from app.db.models import Setting

    async with AsyncSessionLocal() as db:
        count_before = len(
            (
                await db.execute(
                    select(Setting).where(Setting.key.like("product_review.%"))
                )
            )
            .scalars()
            .all()
        )
        await seed_known_settings(db)
        count_after = len(
            (
                await db.execute(
                    select(Setting).where(Setting.key.like("product_review.%"))
                )
            )
            .scalars()
            .all()
        )

    assert count_after >= 8, (
        f"seed did not reach 8 product_review rows: before={count_before}, after={count_after}"
    )


@pytest.mark.asyncio
async def test_settings_seed_idempotent():
    from app.db.session import AsyncSessionLocal
    from app.settings.settings_seed import seed_known_settings
    from app.db.models import Setting

    async with AsyncSessionLocal() as db:
        await seed_known_settings(db)
        count_first = len(
            (await db.execute(select(Setting).where(Setting.key.like("product_review.%"))))
            .scalars()
            .all()
        )
        await seed_known_settings(db)
        count_second = len(
            (await db.execute(select(Setting).where(Setting.key.like("product_review.%"))))
            .scalars()
            .all()
        )
    assert count_first == count_second, "seed is not idempotent — second call created new rows"


# ---------------------------------------------------------------------------
# G) Model CRUD roundtrip (in-memory test DB)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_product_snapshot_review_crud_roundtrip():
    from app.db.session import AsyncSessionLocal

    pid = uuid.uuid4().hex
    sid = uuid.uuid4().hex
    rid = uuid.uuid4().hex

    async with AsyncSessionLocal() as db:
        p = Product(
            id=pid,
            name="Acme XL",
            source_url="https://example.com/acme-xl",
            canonical_url=f"https://example.com/canonical-{pid}",
            parser_source="jsonld",
            scrape_confidence=0.9,
            is_test_data=True,
        )
        db.add(p)
        await db.flush()

        snap = ProductSnapshot(
            id=sid,
            product_id=pid,
            price=199.90,
            currency="TRY",
            availability="in_stock",
            rating_value=4.6,
            rating_count=812,
            parser_source="jsonld",
            confidence=0.9,
            is_test_data=True,
        )
        db.add(snap)
        await db.flush()

        rev = ProductReview(
            id=rid,
            topic="Acme XL incelemesi",
            template_type="single",
            primary_product_id=pid,
            secondary_product_ids_json=json.dumps([]),
            language="tr",
            orientation="vertical",
            duration_seconds=60,
            run_mode="semi_auto",
            is_test_data=True,
        )
        db.add(rev)
        await db.commit()

        fetched = (await db.execute(select(ProductReview).where(ProductReview.id == rid))).scalar_one()
        assert fetched.primary_product_id == pid
        assert fetched.template_type == "single"
        assert fetched.orientation == "vertical"
        assert fetched.run_mode == "semi_auto"
        assert fetched.affiliate_enabled is False


# ---------------------------------------------------------------------------
# H) Stub executor fails fast
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_product_scrape_stub_raises_step_execution_error():
    from app.jobs.exceptions import StepExecutionError

    executor = ProductScrapeStepExecutor()
    with pytest.raises(StepExecutionError) as excinfo:
        await executor.execute(job=None, step=None)  # type: ignore[arg-type]
    assert "henuz implement edilmedi" in str(excinfo.value)
    assert "Faz B" in str(excinfo.value)


def test_stub_step_keys_match_definition():
    """Her StepDefinition.executor_class().step_key() StepDefinition.step_key'e esit.

    Faz F: TTS/Subtitle adapter'lari registry, Publish adapter db session
    parametreleri bekler. Test `inspect.signature` ile kwargs'lari None ile
    doldurur — step_key() metadata ve state tasimadan cagrilir.
    """
    import inspect

    for sd in PRODUCT_REVIEW_MODULE.steps:
        cls = sd.executor_class
        try:
            inst = cls()  # type: ignore[call-arg]
        except TypeError:
            # Faz F: registry / db gerektirenler icin None ile cagir.
            sig = inspect.signature(cls.__init__)
            kwargs: dict = {}
            for pname, param in sig.parameters.items():
                if pname == "self":
                    continue
                if param.default is inspect.Parameter.empty:
                    kwargs[pname] = None
            inst = cls(**kwargs)
        assert inst.step_key() == sd.step_key, (
            f"executor_class.step_key() mismatch: {inst.step_key()} != {sd.step_key}"
        )
