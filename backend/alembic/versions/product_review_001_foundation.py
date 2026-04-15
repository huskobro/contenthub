"""product_review_001: Product Review Module Foundation

Faz A: Product Review modulu temel tablolari.

Yeni tablolar:
  1. products
     - Kaynak URL'den cikarilan urun ana kaydi (name, brand, category, canonical_url,
       current_price, currency, vendor gibi alanlar).
     - canonical_url uzerinde partial UNIQUE index (ux_products_canonical_url) —
       ayni urunun iki kez kaydedilmesini onler. NULL canonical_url'e izin verir.
  2. product_snapshots
     - products.id'ye bagli, her scrape sonucunda yazilan anlik fotograf.
     - v1 sadece snapshot tutar (price history tablosu YOK — kullanici karari).
     - raw_html_sha1 alani deduplikasyon icin.
  3. product_reviews
     - Job engine'in product_review modulu icin girdi kaydi (news_bulletins'e paralel).
     - Tek urun / karsilastirma / alternatif onerisi template tiplerini destekler.
     - primary_product_id + secondary_product_ids_json (JSON array) ile 1-N urun
       referansi tutar.

Idempotent: _index_exists + _table_exists guard'lari fresh-DB + existing-DB
  ikisinde de guvenli.

Revision ID: product_review_001
Revises: gate_sources_001
Create Date: 2026-04-15
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "product_review_001"
down_revision: Union[str, Sequence[str], None] = "gate_sources_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"),
        {"n": table_name},
    )
    return result.fetchone() is not None


def _index_exists(index_name: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='index' AND name=:n"),
        {"n": index_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    # ---------------------------------------------------------------
    # 1. products
    # ---------------------------------------------------------------
    if not _table_exists("products"):
        op.create_table(
            "products",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("name", sa.String(500), nullable=False),
            sa.Column("brand", sa.String(255), nullable=True),
            sa.Column("category", sa.String(255), nullable=True),
            sa.Column("vendor", sa.String(255), nullable=True),
            # source_url: operatorun girdigi orijinal link (tracking param'li olabilir)
            sa.Column("source_url", sa.Text, nullable=False),
            # canonical_url: normalize edilmis, affiliate/tracking temizlenmis url
            sa.Column("canonical_url", sa.Text, nullable=True),
            sa.Column("affiliate_url", sa.Text, nullable=True),
            # current_price snapshot'i referansi
            sa.Column("current_price", sa.Float, nullable=True),
            sa.Column("currency", sa.String(10), nullable=True, server_default="TRY"),
            sa.Column("description", sa.Text, nullable=True),
            sa.Column("primary_image_url", sa.Text, nullable=True),
            # ingestion parser_chain'den hangi adim urun bilgisini cozdu
            sa.Column("parser_source", sa.String(50), nullable=True),
            # parser_source: 'jsonld', 'og', 'site_specific', 'manual'
            sa.Column("scrape_confidence", sa.Float, nullable=True),
            # scrape_confidence: 0.0-1.0 arasi, full-auto gate kullanir
            sa.Column("robots_txt_allowed", sa.Boolean, nullable=True),
            sa.Column("is_test_data", sa.Boolean, nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_products_created_at", "products", ["created_at"])
        op.create_index("ix_products_brand", "products", ["brand"])

    # Partial UNIQUE index on canonical_url (NULLs allowed, duplicates blocked)
    if not _index_exists("ux_products_canonical_url"):
        op.execute(
            "CREATE UNIQUE INDEX ux_products_canonical_url "
            "ON products(canonical_url) WHERE canonical_url IS NOT NULL"
        )

    # ---------------------------------------------------------------
    # 2. product_snapshots
    # ---------------------------------------------------------------
    if not _table_exists("product_snapshots"):
        op.create_table(
            "product_snapshots",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "product_id",
                sa.String(36),
                sa.ForeignKey("products.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("http_status", sa.Integer, nullable=True),
            sa.Column("price", sa.Float, nullable=True),
            sa.Column("currency", sa.String(10), nullable=True),
            sa.Column("availability", sa.String(50), nullable=True),
            # availability: 'in_stock', 'out_of_stock', 'preorder', 'unknown'
            sa.Column("rating_value", sa.Float, nullable=True),
            sa.Column("rating_count", sa.Integer, nullable=True),
            sa.Column("raw_html_sha1", sa.String(40), nullable=True, index=True),
            sa.Column("parsed_json", sa.Text, nullable=True),
            # parsed_json: tum JSON-LD / OG / site-specific parse sonucu (debug icin)
            sa.Column("parser_source", sa.String(50), nullable=True),
            sa.Column("confidence", sa.Float, nullable=True),
            sa.Column("error_message", sa.Text, nullable=True),
            sa.Column("is_test_data", sa.Boolean, nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(
            "ix_product_snapshots_product_fetched",
            "product_snapshots",
            ["product_id", "fetched_at"],
        )

    # ---------------------------------------------------------------
    # 3. product_reviews
    # ---------------------------------------------------------------
    if not _table_exists("product_reviews"):
        op.create_table(
            "product_reviews",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("topic", sa.String(500), nullable=False),
            # template_type: 'single', 'comparison', 'alternatives'
            sa.Column("template_type", sa.String(50), nullable=False),
            sa.Column(
                "primary_product_id",
                sa.String(36),
                sa.ForeignKey("products.id", ondelete="RESTRICT"),
                nullable=False,
                index=True,
            ),
            # secondary_product_ids_json: JSON array of product ids
            sa.Column("secondary_product_ids_json", sa.Text, nullable=False, server_default="[]"),
            sa.Column("language", sa.String(10), nullable=False, server_default="tr"),
            sa.Column("orientation", sa.String(20), nullable=False, server_default="vertical"),
            # orientation: 'vertical', 'horizontal'
            sa.Column("duration_seconds", sa.Integer, nullable=False, server_default="60"),
            sa.Column("run_mode", sa.String(20), nullable=False, server_default="semi_auto"),
            # run_mode: 'semi_auto', 'full_auto'
            sa.Column("affiliate_enabled", sa.Boolean, nullable=False, server_default=sa.text("0")),
            sa.Column("disclosure_text", sa.Text, nullable=True),
            sa.Column(
                "job_id",
                sa.String(36),
                sa.ForeignKey("jobs.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column(
                "owner_user_id",
                sa.String(36),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("is_test_data", sa.Boolean, nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(
            "ix_product_reviews_created_template",
            "product_reviews",
            ["created_at", "template_type"],
        )


def downgrade() -> None:
    """Drop in reverse order (child → parent). Partial index dropped explicitly."""
    if _index_exists("ix_product_reviews_created_template"):
        op.drop_index("ix_product_reviews_created_template", table_name="product_reviews")
    if _table_exists("product_reviews"):
        op.drop_table("product_reviews")

    if _index_exists("ix_product_snapshots_product_fetched"):
        op.drop_index("ix_product_snapshots_product_fetched", table_name="product_snapshots")
    if _table_exists("product_snapshots"):
        op.drop_table("product_snapshots")

    if _index_exists("ux_products_canonical_url"):
        op.execute("DROP INDEX ux_products_canonical_url")
    if _index_exists("ix_products_brand"):
        op.drop_index("ix_products_brand", table_name="products")
    if _index_exists("ix_products_created_at"):
        op.drop_index("ix_products_created_at", table_name="products")
    if _table_exists("products"):
        op.drop_table("products")
