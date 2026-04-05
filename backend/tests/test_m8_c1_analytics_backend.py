"""
Tests — M8-C1 Hardening: Analytics Backend + Platform Overview

İzolasyon stratejisi:
  Paylaşılan test DB'si boş değil. Testler "past_anchor" fikri üzerine kurulu:
  Bu test dosyasının oluşturduğu veri recent=True (created_at=now),
  diğer testlerin yarattığı eski veriler last_7d/last_30d filtresiyle dışarıda kalır.
  Her test kendi Job/Step/PublishRecord'larını oluşturur ve bunları last_7d penceresiyle
  sorgular. Böylece sayımlar exact olur: tam bu testin oluşturduğu kayıt sayısı kadar.

  Önemli: created_at override gerektiren DB sorgularında model seviyesinde override
  yapılamaz (SQLAlchemy default=_now her flush'ta çalışır). Bu nedenle flush sonrası
  UPDATE ile override uyguluyoruz.

Canonical kaynaklar:
  avg_render_duration_seconds → step_key='composition' (standard_video pipeline step 6)
  RenderStepExecutor.step_key='render' pipeline'a bağlı değil; composition kullanılır.

Kapsam (A–X, 24 test):
  A)  get_overview_metrics yapı — tüm anahtarlar, tipler
  B)  total_job_count exact: last_7d içinde N job oluştur, N döner
  C)  completed_job_count exact
  D)  failed_job_count exact
  E)  job_success_rate exact: 2 completed / 4 total = 0.5
  F)  retry_rate exact: 1 retried / 4 total = 0.25
  G)  avg_production_duration_seconds exact: bilinen süre
  H)  total_publish_count exact
  I)  published_count exact
  J)  failed_publish_count exact
  K)  publish_success_rate exact: 1 published / 3 total
  L)  window=last_7d eski kaydı dışlar (exact exclusion)
  M)  window=all_time eski kaydı kapsar (exact inclusion)
  N)  get_operations_metrics yapı
  O)  avg_render_duration_seconds exact: composition step
  P)  step_stats count exact: bilinen step sayısı
  Q)  step_stats failed_count exact
  R)  provider_error_rate None or float (M11 provider step computation)
  S)  window filtresi step'leri exact dışlar
  T)  GET /api/v1/analytics/overview 200 + şema
  U)  GET /api/v1/analytics/operations 200 + şema
  V)  GET /api/v1/analytics/overview?window=last_7d 200
  W)  GET /api/v1/analytics/overview?window=bad 400
  X)  _cutoff geçersiz window ValueError
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.db.models import Job, JobStep, PublishRecord
from app.analytics import service as analytics_service
from app.analytics.service import _cutoff

# ---------------------------------------------------------------------------
# Sabitler
# ---------------------------------------------------------------------------

# Bu test dosyasının created_at'ını "recent" sayılacak kadar yakın tutmak için
# now - 1 saat kullanıyoruz (last_7d filtresine girer, last_30d'ye de girer)
_RECENT = datetime.now(timezone.utc) - timedelta(hours=1)
# Kesinlikle tüm pencereler dışında kalacak eski tarih
_OLD = datetime.now(timezone.utc) - timedelta(days=120)


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _make_job(
    session,
    status: str = "queued",
    retry_count: int = 0,
    started_at=None,
    finished_at=None,
    ts=None,
) -> Job:
    job = Job(module_type="standard_video", status=status, retry_count=retry_count)
    if started_at is not None:
        job.started_at = started_at
    if finished_at is not None:
        job.finished_at = finished_at
    session.add(job)
    await session.flush()
    # created_at override (SQLAlchemy server default'ı UPDATE ile geçiyoruz)
    anchor = ts if ts is not None else _RECENT
    await session.execute(
        text("UPDATE jobs SET created_at = :ts WHERE id = :id"),
        {"ts": anchor.isoformat(), "id": job.id},
    )
    await session.refresh(job)
    return job


async def _make_step(
    session,
    job_id: str,
    step_key: str = "script",
    status: str = "completed",
    elapsed_seconds=None,
    ts=None,
) -> JobStep:
    step = JobStep(
        job_id=job_id,
        step_key=step_key,
        step_order=1,
        status=status,
        elapsed_seconds=elapsed_seconds,
    )
    session.add(step)
    await session.flush()
    anchor = ts if ts is not None else _RECENT
    await session.execute(
        text("UPDATE job_steps SET created_at = :ts WHERE id = :id"),
        {"ts": anchor.isoformat(), "id": step.id},
    )
    await session.refresh(step)
    return step


async def _make_publish(
    session,
    job_id: str,
    status: str = "draft",
    ts=None,
) -> PublishRecord:
    record = PublishRecord(
        job_id=job_id,
        content_ref_type="standard_video",
        content_ref_id="sv-analytics-hardening",
        platform="youtube",
        status=status,
    )
    session.add(record)
    await session.flush()
    anchor = ts if ts is not None else _RECENT
    await session.execute(
        text("UPDATE publish_records SET created_at = :ts WHERE id = :id"),
        {"ts": anchor.isoformat(), "id": record.id},
    )
    await session.refresh(record)
    return record


# ---------------------------------------------------------------------------
# A) get_overview_metrics yapı — tüm anahtarlar, tipler
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_a_overview_schema_shape():
    async with AsyncSessionLocal() as session:
        result = await analytics_service.get_overview_metrics(session=session, window="all_time")
    assert result["window"] == "all_time"
    assert isinstance(result["total_job_count"], int)
    assert isinstance(result["completed_job_count"], int)
    assert isinstance(result["failed_job_count"], int)
    assert result["job_success_rate"] is None or isinstance(result["job_success_rate"], float)
    assert isinstance(result["total_publish_count"], int)
    assert isinstance(result["published_count"], int)
    assert isinstance(result["failed_publish_count"], int)
    assert result["publish_success_rate"] is None or isinstance(result["publish_success_rate"], float)
    assert result["avg_production_duration_seconds"] is None or isinstance(result["avg_production_duration_seconds"], float)
    assert result["retry_rate"] is None or isinstance(result["retry_rate"], float)


# ---------------------------------------------------------------------------
# B) total_job_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_b_total_job_count_exact():
    """last_7d içinde 3 job oluştur; penceredeki artış tam 3 olmalı."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["total_job_count"]

        await _make_job(session, status="queued")
        await _make_job(session, status="queued")
        await _make_job(session, status="queued")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["total_job_count"] == base + 3


# ---------------------------------------------------------------------------
# C) completed_job_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_c_completed_job_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["completed_job_count"]

        await _make_job(session, status="completed")
        await _make_job(session, status="completed")
        await _make_job(session, status="queued")  # sayılmamalı
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["completed_job_count"] == base + 2


# ---------------------------------------------------------------------------
# D) failed_job_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_d_failed_job_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["failed_job_count"]

        await _make_job(session, status="failed")
        await _make_job(session, status="queued")  # sayılmamalı
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["failed_job_count"] == base + 1


# ---------------------------------------------------------------------------
# E) job_success_rate exact: 2 completed / 4 total
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_e_job_success_rate_exact():
    """
    Bilinen toplam üzerinde exact oran testi.
    Önceki sayılarla birlikte 2 completed + 2 other ekliyoruz ve
    önceki baz değerleri ile birlikte oranın formülünü doğruluyoruz.
    """
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base_total = before["total_job_count"]
        base_completed = before["completed_job_count"]

        await _make_job(session, status="completed")
        await _make_job(session, status="completed")
        await _make_job(session, status="failed")
        await _make_job(session, status="queued")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    expected_total = base_total + 4
    expected_completed = base_completed + 2
    expected_rate = round(expected_completed / expected_total, 4)

    assert after["total_job_count"] == expected_total
    assert after["completed_job_count"] == expected_completed
    assert after["job_success_rate"] == expected_rate


# ---------------------------------------------------------------------------
# F) retry_rate exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_f_retry_rate_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base_total = before["total_job_count"]
        base_retried = round((before["retry_rate"] or 0) * base_total) if base_total > 0 else 0

        await _make_job(session, status="completed", retry_count=2)  # retried
        await _make_job(session, status="completed", retry_count=0)  # not retried
        await _make_job(session, status="failed", retry_count=0)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    expected_total = base_total + 3
    expected_retried = base_retried + 1
    expected_rate = round(expected_retried / expected_total, 4)

    assert after["retry_rate"] == expected_rate


# ---------------------------------------------------------------------------
# G) avg_production_duration_seconds exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_g_avg_production_duration_exact():
    """
    3 job, bilinen süreler: 60s, 120s, 180s → ortalama 120s.
    last_7d penceresiyle önceki ortalamayı dışlamak için base hesabı yapılır.
    """
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base_total = before["total_job_count"]
        base_avg = before["avg_production_duration_seconds"] or 0.0
        # Önceki toplam süre: base_avg * base_total (yaklaşık, rounded)
        base_duration_sum = base_avg * base_total

        for secs in (60, 120, 180):
            await _make_job(
                session,
                status="completed",
                started_at=now - timedelta(seconds=secs),
                finished_at=now,
            )
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    # Yeni toplam süre = base + (60+120+180) = base + 360
    # Yeni total = base_total + 3
    # Beklenen ortalama = (base_duration_sum + 360) / (base_total + 3)
    new_total = base_total + 3
    new_duration_sum = base_duration_sum + 360.0
    expected_avg = round(new_duration_sum / new_total, 2)

    assert after["avg_production_duration_seconds"] is not None
    # SQLite julianday hassasiyeti nedeniyle ±1 saniye tolerans
    assert abs(after["avg_production_duration_seconds"] - expected_avg) < 1.0


# ---------------------------------------------------------------------------
# H) total_publish_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_h_total_publish_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["total_publish_count"]

        job = await _make_job(session, status="completed")
        await _make_publish(session, job_id=job.id, status="draft")
        await _make_publish(session, job_id=job.id, status="published")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["total_publish_count"] == base + 2


# ---------------------------------------------------------------------------
# I) published_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_i_published_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["published_count"]

        job = await _make_job(session, status="completed")
        await _make_publish(session, job_id=job.id, status="published")
        await _make_publish(session, job_id=job.id, status="draft")  # sayılmamalı
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["published_count"] == base + 1


# ---------------------------------------------------------------------------
# J) failed_publish_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_j_failed_publish_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base = before["failed_publish_count"]

        job = await _make_job(session, status="failed")
        await _make_publish(session, job_id=job.id, status="failed")
        await _make_publish(session, job_id=job.id, status="failed")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    assert after["failed_publish_count"] == base + 2


# ---------------------------------------------------------------------------
# K) publish_success_rate exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_k_publish_success_rate_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base_total = before["total_publish_count"]
        base_published = before["published_count"]

        job = await _make_job(session, status="completed")
        await _make_publish(session, job_id=job.id, status="published")
        await _make_publish(session, job_id=job.id, status="failed")
        await _make_publish(session, job_id=job.id, status="draft")
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    expected_total = base_total + 3
    expected_published = base_published + 1
    expected_rate = round(expected_published / expected_total, 4)

    assert after["publish_success_rate"] == expected_rate


# ---------------------------------------------------------------------------
# L) window=last_7d eski kaydı dışlar — exact exclusion
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_l_window_last_7d_excludes_old_exact():
    """Eski job last_7d penceresinde görünmemeli."""
    async with AsyncSessionLocal() as session:
        before_7d = await analytics_service.get_overview_metrics(session=session, window="last_7d")
        base_7d = before_7d["total_job_count"]

        # Eski kayıt: last_7d dışında
        await _make_job(session, status="completed", ts=_OLD)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after_7d = await analytics_service.get_overview_metrics(session=session, window="last_7d")

    # last_7d sayısı değişmemeli
    assert after_7d["total_job_count"] == base_7d


# ---------------------------------------------------------------------------
# M) window=all_time eski kaydı kapsar — exact inclusion
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_m_window_all_time_includes_old_exact():
    """Eski job all_time penceresinde görünmeli."""
    async with AsyncSessionLocal() as session:
        before_all = await analytics_service.get_overview_metrics(session=session, window="all_time")
        base_all = before_all["total_job_count"]

        await _make_job(session, status="completed", ts=_OLD)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after_all = await analytics_service.get_overview_metrics(session=session, window="all_time")

    assert after_all["total_job_count"] == base_all + 1


# ---------------------------------------------------------------------------
# N) get_operations_metrics yapı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_n_operations_schema_shape():
    async with AsyncSessionLocal() as session:
        result = await analytics_service.get_operations_metrics(session=session, window="all_time")
    assert result["window"] == "all_time"
    assert "avg_render_duration_seconds" in result
    assert "step_stats" in result
    assert "provider_error_rate" in result
    assert isinstance(result["step_stats"], list)
    assert result["avg_render_duration_seconds"] is None or isinstance(
        result["avg_render_duration_seconds"], float
    )


# ---------------------------------------------------------------------------
# O) avg_render_duration_seconds exact (canonical: composition step)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_o_avg_render_duration_exact():
    """
    Canonical kaynak: step_key='composition' (standard_video step_order=6).
    2 composition step: 40s + 80s → ortalama 60s.
    last_7d penceresiyle önceki değerden delta alınır.
    """
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_operations_metrics(session=session, window="last_7d")
        # composition step sayısı ve mevcut ortalama
        comp_stat = next(
            (s for s in before["step_stats"] if s["step_key"] == "composition"), None
        )
        base_count = comp_stat["count"] if comp_stat else 0
        base_avg = comp_stat["avg_elapsed_seconds"] if comp_stat else None

        job = await _make_job(session, status="completed")
        await _make_step(session, job_id=job.id, step_key="composition", elapsed_seconds=40.0)
        await _make_step(session, job_id=job.id, step_key="composition", elapsed_seconds=80.0)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_operations_metrics(session=session, window="last_7d")

    # avg_render_duration_seconds = composition avg
    assert after["avg_render_duration_seconds"] is not None

    # step_stats içindeki composition satırı doğru
    comp_after = next(
        (s for s in after["step_stats"] if s["step_key"] == "composition"), None
    )
    assert comp_after is not None
    assert comp_after["count"] == base_count + 2

    # Yeni ortalama: (base_avg * base_count + 40 + 80) / (base_count + 2)
    if base_avg is not None:
        expected_avg = round((base_avg * base_count + 120.0) / (base_count + 2), 2)
    else:
        expected_avg = round(120.0 / 2, 2)  # 60.0

    assert abs(comp_after["avg_elapsed_seconds"] - expected_avg) < 0.1


# ---------------------------------------------------------------------------
# P) step_stats count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_p_step_stats_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_operations_metrics(session=session, window="last_7d")
        script_stat = next(
            (s for s in before["step_stats"] if s["step_key"] == "script"), None
        )
        base_count = script_stat["count"] if script_stat else 0

        job = await _make_job(session, status="completed")
        await _make_step(session, job_id=job.id, step_key="script", elapsed_seconds=5.0)
        await _make_step(session, job_id=job.id, step_key="script", elapsed_seconds=7.0)
        await _make_step(session, job_id=job.id, step_key="script", elapsed_seconds=9.0)
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_operations_metrics(session=session, window="last_7d")

    script_after = next(
        (s for s in after["step_stats"] if s["step_key"] == "script"), None
    )
    assert script_after is not None
    assert script_after["count"] == base_count + 3


# ---------------------------------------------------------------------------
# Q) step_stats failed_count exact
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_q_step_stats_failed_count_exact():
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_operations_metrics(session=session, window="last_7d")
        tts_stat = next(
            (s for s in before["step_stats"] if s["step_key"] == "tts"), None
        )
        base_failed = tts_stat["failed_count"] if tts_stat else 0

        job = await _make_job(session, status="failed")
        await _make_step(session, job_id=job.id, step_key="tts", status="failed")
        await _make_step(session, job_id=job.id, step_key="tts", status="failed")
        await _make_step(session, job_id=job.id, step_key="tts", status="completed")  # sayılmamalı
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_operations_metrics(session=session, window="last_7d")

    tts_after = next(
        (s for s in after["step_stats"] if s["step_key"] == "tts"), None
    )
    assert tts_after is not None
    assert tts_after["failed_count"] == base_failed + 2


# ---------------------------------------------------------------------------
# R) provider_error_rate — None when no provider steps, float otherwise
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_r_provider_error_rate_none_or_float():
    async with AsyncSessionLocal() as session:
        result = await analytics_service.get_operations_metrics(session=session, window="all_time")
    rate = result["provider_error_rate"]
    assert rate is None or isinstance(rate, float)


# ---------------------------------------------------------------------------
# S) window filtresi step'leri exact dışlar
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_s_operations_window_excludes_old_exact():
    """Eski step last_7d step_stats'a dahil edilmemeli."""
    async with AsyncSessionLocal() as session:
        before = await analytics_service.get_operations_metrics(session=session, window="last_7d")
        visuals_stat = next(
            (s for s in before["step_stats"] if s["step_key"] == "visuals"), None
        )
        base_count = visuals_stat["count"] if visuals_stat else 0

        job = await _make_job(session, status="completed", ts=_OLD)
        # Eski step — last_7d dışında
        await _make_step(
            session, job_id=job.id, step_key="visuals",
            elapsed_seconds=99.0, ts=_OLD
        )
        await session.commit()

    async with AsyncSessionLocal() as session:
        after = await analytics_service.get_operations_metrics(session=session, window="last_7d")

    visuals_after = next(
        (s for s in after["step_stats"] if s["step_key"] == "visuals"), None
    )
    after_count = visuals_after["count"] if visuals_after else 0
    assert after_count == base_count  # eski step sayılmadı


# ---------------------------------------------------------------------------
# T) GET /api/v1/analytics/overview 200 + şema doğrulama
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_t_route_overview_200(client):
    resp = await client.get("/api/v1/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()
    required_keys = {
        "window", "total_job_count", "completed_job_count", "failed_job_count",
        "job_success_rate", "total_publish_count", "published_count",
        "failed_publish_count", "publish_success_rate",
        "avg_production_duration_seconds", "retry_rate",
    }
    assert required_keys <= set(data.keys())
    assert data["window"] == "all_time"


# ---------------------------------------------------------------------------
# U) GET /api/v1/analytics/operations 200 + şema doğrulama
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_u_route_operations_200(client):
    resp = await client.get("/api/v1/analytics/operations")
    assert resp.status_code == 200
    data = resp.json()
    assert "avg_render_duration_seconds" in data
    assert "step_stats" in data
    assert "provider_error_rate" in data
    assert data["provider_error_rate"] is None or isinstance(data["provider_error_rate"], float)
    assert isinstance(data["step_stats"], list)


# ---------------------------------------------------------------------------
# V) GET /api/v1/analytics/overview?window=last_7d 200
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_v_route_overview_window_last_7d(client):
    resp = await client.get("/api/v1/analytics/overview?window=last_7d")
    assert resp.status_code == 200
    assert resp.json()["window"] == "last_7d"


# ---------------------------------------------------------------------------
# W) GET /api/v1/analytics/overview?window=bad 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_w_route_overview_invalid_window_400(client):
    resp = await client.get("/api/v1/analytics/overview?window=last_999d")
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# X) _cutoff geçersiz window ValueError
# ---------------------------------------------------------------------------

def test_x_cutoff_invalid_window_raises():
    with pytest.raises(ValueError, match="Geçersiz zaman penceresi"):
        _cutoff("weekly")
