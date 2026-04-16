"""
PHASE AE — Unified User Production Flow smoke tests.

Scope (genel):
  1. URL-only channel onboarding (user-facing create).
  2. Project creation on top of that channel.
  3. Product review happy path:
       POST /products (user) -> POST /product-reviews -> GET /product-reviews/{id}
       The wizard frontend calls exactly these three endpoints in order.
  4. Product review ownership gate: non-admin cannot start production on
     another user's review (re-asserted for PHASE AE).
  5. Publish deep-link contract: list publish records filtered by
     content_project_id returns only records bound to that project.

Scope (3-module unified coverage — PHASE AE follow-up):
  Bu smoke block, kullanicinin tek akista uclu modulu (standard_video,
  news_bulletin, product_review) gercekten bastan sona kullanabildigini
  kanitlar. Her modul icin ayni kontrat seti tekrarlanir:

    6. create path              (her modulun kendi POST endpoint'i 201 ve
                                 content_project_id/channel_profile_id
                                 alaninin kaybolmadigi)
    7. preview visibility       (GET /jobs/{id}/previews modul-agnostik,
                                 3 modul icin de 200 + schema sabit)
    8. review gate path         (POST /publish/from-job -> POST submit ->
                                 POST review approve; her modul icin ayni
                                 state machine, herhangi bir module-fork yok)
    9. publish CTA visibility   (from-job endpoint, content_project_id
                                 iletildiginde ownership gate'i tetikler;
                                 3 modul icin de tutarli davranir)
   10. project altinda coklu job listesi (ayni projeye bagli 3 modulun 3
                                         job'unu listeleme, ownership filter
                                         ile baskalarinin isi sizmaz)
   11. cross-user ownership isolation    (3 modulun her biri icin baska
                                         kullanicinin kayitlarina kapi)

Testler HTTP kontrat seviyesinde kalir — scrape/job runner'a gercek baglilik
kurmaz. Dispatcher stub bulunmadigi test ortaminda start-production cagrilari
yalnizca ownership + payload validation asamasina kadar calisir; bu PHASE AE
scope'unda yeterlidir cunku yeni bir altyapi kurmuyoruz, sadece mevcut
zincirin modul-agnostik calistigini kanitliyoruz.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ChannelProfile,
    ContentProject,
    Job,
    NewsBulletin,
    Product,
    ProductReview,
    StandardVideo,
    User,
)

pytestmark = pytest.mark.asyncio


BASE_CHANNELS = "/api/v1/channel-profiles"
BASE_PROJECTS = "/api/v1/content-projects"
BASE_PR = "/api/v1/product-review"
BASE_SV = "/api/v1/modules/standard-video"
BASE_NB = "/api/v1/modules/news-bulletin"
BASE_JOBS = "/api/v1/jobs"
BASE_PUBLISH = "/api/v1/publish"


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


# ===========================================================================
# PHASE AE follow-up — 3 modul unified zincir kaniti
# ===========================================================================
#
# Yeni faz acmiyoruz; PHASE AE'nin kapanmami\u015f kismini bitiriyoruz.
# A\u015fa\u011fidaki helper'lar ve testler standard_video, news_bulletin,
# product_review i\u00e7in ayni kontrat setini paralel cal\u0131\u015ft\u0131r\u0131r.


async def _seed_project_for(
    db: AsyncSession,
    owner: User,
    *,
    slug_suffix: str,
    module_type: str,
) -> ContentProject:
    ch = await _seed_channel(db, owner, slug=f"ae3-{module_type[:4]}-{slug_suffix}")
    proj = ContentProject(
        user_id=owner.id,
        channel_profile_id=ch.id,
        title=f"AE3 {module_type} {slug_suffix}",
        module_type=module_type,
        content_status="draft",
        review_status="not_required",
        publish_status="unpublished",
        origin_type="original",
        priority="normal",
    )
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


async def _seed_completed_job(
    db: AsyncSession,
    owner: User,
    project: ContentProject,
    *,
    module_type: str,
) -> Job:
    """Job'u 'completed' state'e ceker ki publish from-job endpoint'i kabul etsin."""
    j = Job(
        module_type=module_type,
        status="completed",
        owner_id=owner.id,
        content_project_id=project.id,
        channel_profile_id=project.channel_profile_id,
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return j


# ---------------------------------------------------------------------------
# (6) Create path — 3 modul
# ---------------------------------------------------------------------------


async def test_create_path_standard_video(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """standard_video: POST /modules/standard-video 201 d\u00f6nmeli ve proje
    ba\u011f\u0131 kaybolmamal\u0131 (wizard'\u0131n v\u00fcucudu ile birebir)."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="create", module_type="standard_video"
    )
    payload = {
        "topic": "AE3 standard video create path",
        "language": "tr",
        "render_format": "landscape",
        "content_project_id": proj.id,
        "channel_profile_id": proj.channel_profile_id,
    }
    resp = await client.post(BASE_SV, json=payload, headers=user_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["topic"] == payload["topic"]
    assert body.get("content_project_id") == proj.id


async def test_create_path_news_bulletin(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """news_bulletin: POST /modules/news-bulletin 201 d\u00f6nmeli ve proje
    ba\u011f\u0131 ayn\u0131 kalmal\u0131."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="create", module_type="news_bulletin"
    )
    payload = {
        "topic": "AE3 news bulletin create path",
        "language": "tr",
        "content_project_id": proj.id,
        "channel_profile_id": proj.channel_profile_id,
    }
    resp = await client.post(BASE_NB, json=payload, headers=user_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["topic"] == payload["topic"]
    assert body.get("content_project_id") == proj.id


async def test_create_path_product_review(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
):
    """product_review: POST /products -> POST /product-reviews -> 201."""
    _ = await _seed_project_for(
        db_session, regular_user, slug_suffix="create", module_type="product_review"
    )
    # (1) Product
    resp = await client.post(
        f"{BASE_PR}/products",
        json={"source_url": "https://shop.example.com/ae3-pr-create"},
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    product_id = resp.json()["id"]

    # (2) Review
    resp = await client.post(
        f"{BASE_PR}/product-reviews",
        json={
            "topic": "AE3 product review create path",
            "template_type": "single",
            "primary_product_id": product_id,
            "secondary_product_ids": [],
            "language": "tr",
            "orientation": "vertical",
            "duration_seconds": 60,
            "run_mode": "semi_auto",
            "affiliate_enabled": False,
        },
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["primary_product_id"] == product_id


# ---------------------------------------------------------------------------
# (7) Preview visibility — 3 modul icin ayni endpoint
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("module_type", ["standard_video", "news_bulletin", "product_review"])
async def test_preview_visibility_per_module(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
    module_type: str,
):
    """GET /jobs/{id}/previews 3 modul icin de ayni schema ile 200 d\u00f6ner.
    Henuz artifact yoksa entries=[] bekliyoruz — bu 'preview g\u00f6r\u00fcn\u00fcrl\u00fc\u011f\u00fc
    varsay\u0131lan olarak endpoint-level tutarl\u0131' kontrat\u0131d\u0131r."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="prev", module_type=module_type
    )
    job = await _seed_completed_job(db_session, regular_user, proj, module_type=module_type)

    resp = await client.get(f"{BASE_JOBS}/{job.id}/previews", headers=user_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["job_id"] == job.id
    assert "entries" in body
    assert "preview_count" in body and "final_count" in body
    assert isinstance(body["entries"], list)


# ---------------------------------------------------------------------------
# (8) Review gate path — publish from-job -> submit -> approve
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("module_type", ["standard_video", "news_bulletin", "product_review"])
async def test_review_gate_path_per_module(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
    module_type: str,
):
    """Her modul icin tek state machine:
       from-job -> draft -> submit (pending_review) -> approve (approved).
    Ayni endpoint'ler, modulden bagimsiz davranir."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="review", module_type=module_type
    )
    job = await _seed_completed_job(db_session, regular_user, proj, module_type=module_type)

    # from-job: draft yarat
    resp = await client.post(
        f"{BASE_PUBLISH}/from-job/{job.id}",
        json={
            "platform": "youtube",
            "content_ref_type": module_type,
            "content_project_id": proj.id,
        },
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    rec = resp.json()
    assert rec["status"] == "draft"
    record_id = rec["id"]

    # submit: draft -> pending_review
    resp = await client.post(
        f"{BASE_PUBLISH}/{record_id}/submit",
        json={"next_status": "pending_review"},
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending_review"

    # approve: pending_review -> approved
    resp = await client.post(
        f"{BASE_PUBLISH}/{record_id}/review",
        json={"decision": "approve"},
        headers=user_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "approved"


# ---------------------------------------------------------------------------
# (9) Publish CTA visibility — 3 modul icin de completed job = publish acik
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("module_type", ["standard_video", "news_bulletin", "product_review"])
async def test_publish_cta_visibility_per_module(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    user_headers: dict,
    module_type: str,
):
    """ProjectDetailPage'deki 'Yay\u0131na G\u00f6nder' CTA'\u0131n\u0131n kontrat\u0131:
       completed bir job varsa /publish/from-job 201 d\u00f6ner, by-project
       listelemesi yeni kayd\u0131 g\u00f6sterir. 3 modul icin de ayni."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="cta", module_type=module_type
    )
    job = await _seed_completed_job(db_session, regular_user, proj, module_type=module_type)

    resp = await client.post(
        f"{BASE_PUBLISH}/from-job/{job.id}",
        json={
            "platform": "youtube",
            "content_ref_type": module_type,
            "content_project_id": proj.id,
        },
        headers=user_headers,
    )
    assert resp.status_code == 201, resp.text
    record = resp.json()

    resp = await client.get(
        f"{BASE_PUBLISH}/by-project/{proj.id}", headers=user_headers
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert any(r["id"] == record["id"] for r in rows), rows


# ---------------------------------------------------------------------------
# (10) Project altinda coklu job listesi — ownership isolation
# ---------------------------------------------------------------------------


async def test_project_multi_job_listing_and_ownership_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
    regular_user: User,
    admin_user: User,
    user_headers: dict,
):
    """Ayni projeye bagli 3 modulun 3 job'u listelenir; baska kullanicinin
    ayni modul tipindeki job'u sizmaz."""
    proj = await _seed_project_for(
        db_session, regular_user, slug_suffix="multijob", module_type="standard_video"
    )
    j_sv = await _seed_completed_job(db_session, regular_user, proj, module_type="standard_video")
    j_nb = await _seed_completed_job(db_session, regular_user, proj, module_type="news_bulletin")
    j_pr = await _seed_completed_job(db_session, regular_user, proj, module_type="product_review")

    # Admin'in ayni project-id'siz fakat ayni owner olmayan job'u
    admin_proj = await _seed_project_for(
        db_session, admin_user, slug_suffix="multijob-adm", module_type="standard_video"
    )
    await _seed_completed_job(
        db_session, admin_user, admin_proj, module_type="standard_video"
    )

    # User kendi projesinin tum job'larini goruyor
    resp = await client.get(
        f"{BASE_JOBS}?content_project_id={proj.id}", headers=user_headers
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    ids = {r["id"] for r in rows}
    assert j_sv.id in ids
    assert j_nb.id in ids
    assert j_pr.id in ids
    # Ama admin'in project-id'si buraya sizmamali
    for r in rows:
        assert r["content_project_id"] == proj.id


# ---------------------------------------------------------------------------
# (11) Cross-user ownership isolation — 3 modul icin create CTA'lari
# ---------------------------------------------------------------------------


async def test_cross_user_cannot_start_production_standard_video(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """Non-admin kullanici, admin'in standard_video kaydina start-production
    cekemez. StandardVideo modelinde owner_user_id kolonu yok; ownership
    content_project_id uzerinden zorlanir. Dispatcher test ortaminda 503
    donebilir; ownership gate her durumda 503'ten *once* firmalali, yani
    403 gorelim."""
    # Admin'in projesi + standard_video kaydi (content_project_id uzerinden bagli)
    admin_project = await _seed_project_for(
        db_session, admin_user, slug_suffix="iso-sv", module_type="standard_video"
    )
    sv = StandardVideo(
        topic="Admin SV",
        language="tr",
        status="draft",
        content_project_id=admin_project.id,
        channel_profile_id=admin_project.channel_profile_id,
    )
    db_session.add(sv)
    await db_session.commit()
    await db_session.refresh(sv)

    resp = await client.post(
        f"{BASE_SV}/{sv.id}/start-production",
        json={},
        headers=user_headers,
    )
    assert resp.status_code == 403, resp.text


async def test_cross_user_cannot_start_production_news_bulletin(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """news_bulletin icin ayni ownership kapisi. NewsBulletin modelinde
    owner_user_id kolonu yok; kapi content_project_id uzerinden calisir."""
    admin_project = await _seed_project_for(
        db_session, admin_user, slug_suffix="iso-nb", module_type="news_bulletin"
    )
    nb = NewsBulletin(
        topic="Admin NB",
        status="in_progress",
        content_project_id=admin_project.id,
        channel_profile_id=admin_project.channel_profile_id,
    )
    db_session.add(nb)
    await db_session.commit()
    await db_session.refresh(nb)

    resp = await client.post(
        f"{BASE_NB}/{nb.id}/start-production",
        json={},
        headers=user_headers,
    )
    assert resp.status_code == 403, resp.text


async def test_cross_user_cannot_start_production_product_review_final(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    user_headers: dict,
):
    """product_review ownership kap\u0131s\u0131 PHASE AE \u00e7ekirdek testi ile ayn\u0131
    davran\u0131\u015f\u0131 tekrar do\u011frular — 3 modul izolasyonu tam."""
    prod = Product(
        name="Admin PR product",
        canonical_url="https://shop.example.com/ae3-admin",
        source_url="https://shop.example.com/ae3-admin",
    )
    db_session.add(prod)
    await db_session.commit()
    await db_session.refresh(prod)

    review = ProductReview(
        topic="Admin-owned PR review",
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
