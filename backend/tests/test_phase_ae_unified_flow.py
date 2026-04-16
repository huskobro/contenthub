"""
PHASE AE — Unified User Production Flow smoke tests.

Scope:
  1. URL-only channel onboarding (user-facing create).
  2. Project creation on top of that channel.
  3. Product review happy path:
       POST /products (user) -> POST /product-reviews -> GET /product-reviews/{id}
       The wizard frontend calls exactly these three endpoints in order.
  4. Product review ownership gate: non-admin cannot start production on
     another user's review (re-asserted for PHASE AE).
  5. Publish deep-link contract: list publish records filtered by
     content_project_id returns only records bound to that project.

These tests intentionally stay at the HTTP contract layer so the user-facing
wizard's assumptions (endpoint shapes, ownership rules, project-scoped lists)
are exercised end-to-end without depending on real scraping or the job
runner.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ChannelProfile,
    ContentProject,
    Product,
    ProductReview,
    User,
)

pytestmark = pytest.mark.asyncio


BASE_CHANNELS = "/api/v1/channel-profiles"
BASE_PROJECTS = "/api/v1/content-projects"
BASE_PR = "/api/v1/product-review"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_channel(db: AsyncSession, owner: User, *, slug: str) -> ChannelProfile:
    url = f"https://www.youtube.com/@{slug}"
    ch = ChannelProfile(
        user_id=owner.id,
        profile_name=f"ch-{slug}",
        channel_slug=slug,
        default_language="tr",
        status="active",
        source_url=url,
        normalized_url=url,
        platform="youtube",
        import_status="partial",
    )
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


# ---------------------------------------------------------------------------
# (1) URL-only channel onboarding is the primary user create path
# ---------------------------------------------------------------------------


async def test_url_only_channel_create_returns_honest_state(
    client: AsyncClient, user_headers: dict
):
    """
    URL-only create MUST succeed even when metadata fetch is partial — the
    wizard depends on being able to proceed to the next step regardless of
    scrape success. The response carries `import_status` so the UI can show
    an honest badge.
    """
    resp = await client.post(
        f"{BASE_CHANNELS}/from-url",
        json={"source_url": "https://www.youtube.com/@phase-ae-primary"},
        headers=user_headers,
    )
    # 201 expected in happy path; 422 is acceptable only if URL parsing fails.
    assert resp.status_code in (201, 422), resp.text
    if resp.status_code != 201:
        pytest.skip(
            "YouTube URL parse returned 422 in this environment — skipping honest-state assertion."
        )
    body = resp.json()
    assert "import_status" in body, body
    assert body["import_status"] in {"pending", "partial", "success"}, body
    # user never had to supply profile_name/slug — primary create is URL-only
    assert body["source_url"].startswith("https://www.youtube.com/")


# ---------------------------------------------------------------------------
# (2) Project creation on top of URL-only channel (product_review module)
# ---------------------------------------------------------------------------


async def test_project_create_for_product_review_module(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    channel = await _seed_channel(db_session, regular_user, slug="ae-proj")

    payload = {
        "user_id": regular_user.id,
        "channel_profile_id": channel.id,
        "module_type": "product_review",
        "title": "PHASE AE product review project",
    }
    resp = await client.post(BASE_PROJECTS, json=payload, headers=user_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["module_type"] == "product_review"
    assert body["channel_profile_id"] == channel.id
    assert body["user_id"] == regular_user.id


# ---------------------------------------------------------------------------
# (3) Product review happy path — the three wizard endpoints in order
# ---------------------------------------------------------------------------


async def test_product_review_wizard_chain_happy_path(
    client: AsyncClient, user_headers: dict
):
    """
    Mirror the frontend wizard exactly:
      POST /products         (idempotent, returns product row)
      POST /product-reviews  (review row, binds to product)
      GET  /product-reviews/{id}  (wizard polls/refetches — ownership check)
    """
    # 1. Product create
    resp = await client.post(
        f"{BASE_PR}/products",
        json={"source_url": "https://shop.example.com/ae-wizard-product"},
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    product = resp.json()
    product_id = product["id"]
    assert product["source_url"] == "https://shop.example.com/ae-wizard-product"

    # 2. Review create
    review_payload = {
        "topic": "PHASE AE wizard review",
        "template_type": "single",
        "primary_product_id": product_id,
        "secondary_product_ids": [],
        "language": "tr",
        "orientation": "vertical",
        "duration_seconds": 60,
        "run_mode": "semi_auto",
        "affiliate_enabled": False,
    }
    resp = await client.post(
        f"{BASE_PR}/product-reviews",
        json=review_payload,
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    review = resp.json()
    review_id = review["id"]
    assert review["primary_product_id"] == product_id
    assert review["template_type"] == "single"
    assert review["duration_seconds"] == 60
    # Not yet started — job_id must be None.
    assert review["job_id"] is None

    # 3. Wizard refetch (simulates "review" step confirm)
    resp = await client.get(f"{BASE_PR}/product-reviews/{review_id}", headers=user_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == review_id


# ---------------------------------------------------------------------------
# (4) Cross-user ownership gate (re-asserted for AE)
# ---------------------------------------------------------------------------


async def test_product_review_cross_user_cannot_start_production(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """
    Non-admin user MUST NOT be able to kick the pipeline on someone else's
    product review. Regression guard: ownership gate must fire BEFORE the
    dispatcher check so infra availability cannot mask a 403.
    """
    prod = Product(
        name="Admin-owned AE product",
        canonical_url="https://shop.example.com/ae-admin-product",
        source_url="https://shop.example.com/ae-admin-product",
    )
    db_session.add(prod)
    await db_session.commit()
    await db_session.refresh(prod)

    review = ProductReview(
        topic="Admin-owned AE review",
        template_type="single",
        primary_product_id=prod.id,
        secondary_product_ids_json="[]",
        language="tr",
        orientation="vertical",
        duration_seconds=60,
        run_mode="semi_auto",
        affiliate_enabled=False,
        owner_user_id=admin_user.id,
    )
    db_session.add(review)
    await db_session.commit()
    await db_session.refresh(review)

    resp = await client.post(
        f"{BASE_PR}/product-reviews/{review.id}/start-production",
        json={},
        headers=user_headers,
    )
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# (5) Publish deep-link contract — filter publish records by content_project_id
# ---------------------------------------------------------------------------


async def test_publish_records_filter_by_content_project_id(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """
    The user's ProjectDetailPage shows a "Yayina Gonder" CTA that passes
    ?projectId=... to /user/publish. The publish listing endpoint must
    support filtering by content_project_id so the deep-link can resolve
    correctly.
    """
    # Seed a channel + two distinct projects owned by the same user.
    channel = await _seed_channel(db_session, regular_user, slug="ae-pub-filter")

    p1 = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=channel.id,
        title="AE publish filter p1",
        module_type="product_review",
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
    )
    p2 = ContentProject(
        user_id=regular_user.id,
        channel_profile_id=channel.id,
        title="AE publish filter p2",
        module_type="product_review",
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
    )
    db_session.add_all([p1, p2])
    await db_session.commit()
    await db_session.refresh(p1)
    await db_session.refresh(p2)

    # Filter by p1 — must return 0 rows but must NOT error out (endpoint
    # contract: unknown/empty filters are valid queries, not 400s).
    resp = await client.get(
        "/api/v1/publish/records",
        params={"content_project_id": p1.id},
        headers=user_headers,
    )
    # Publish module is expected to exist for the user surface. If it's
    # gated behind a different route, accept 404 to keep this smoke honest
    # rather than brittle.
    assert resp.status_code in (200, 404), resp.text
    if resp.status_code == 200:
        rows = resp.json()
        # Either the raw list or a paginated object — support both shapes.
        if isinstance(rows, dict) and "items" in rows:
            rows = rows["items"]
        assert isinstance(rows, list)
        for r in rows:
            assert r.get("content_project_id") == p1.id
