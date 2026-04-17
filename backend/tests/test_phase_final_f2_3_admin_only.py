"""
Phase Final F2.3 — P2 admin-only global modules regresyon testleri.

Kapsam:
  - sources: global news source registry; tum router admin-only.
  - news_items: news pipeline havuzu; tum router admin-only.
  - used_news: dedupe registry; tum router admin-only.
  - onboarding: platform setup akislari; tum router admin-only.

Her modul icin non-admin tipik okuma (list/status) endpoint'i 403 donmeli,
admin ayni endpoint'e 200 donmeli. Yazma ayri ayri yapilmamistir —
router-level require_admin her endpoint'i kapsadigi icin list 403 =>
POST/DELETE/PATCH de zorunlu olarak 403.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# sources
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sources_list_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/sources", headers=user_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_sources_list_allows_admin(
    raw_client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/sources", headers=admin_headers)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# news_items
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_news_items_list_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/news-items", headers=user_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_news_items_list_allows_admin(
    raw_client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/news-items", headers=admin_headers)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# used_news
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_used_news_list_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/used-news", headers=user_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_used_news_list_allows_admin(
    raw_client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/used-news", headers=admin_headers)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# onboarding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_onboarding_status_denies_non_admin(
    raw_client: AsyncClient, user_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/onboarding/status", headers=user_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_onboarding_status_allows_admin(
    raw_client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    r = await raw_client.get("/api/v1/onboarding/status", headers=admin_headers)
    assert r.status_code == 200, r.text
