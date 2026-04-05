"""
M17-A — Source Impact Metrics testleri.

Kaynak bazlı etki metriklerinin doğruluğunu test eder.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.analytics.service import get_source_impact_metrics


def _make_row(**kwargs):
    """Mock SQLAlchemy row."""
    row = MagicMock()
    for k, v in kwargs.items():
        setattr(row, k, v)
    return row


def _make_result(row):
    """Mock execute result."""
    result = MagicMock()
    result.one.return_value = row
    result.all.return_value = [row] if hasattr(row, 'id') else []
    result.scalar.return_value = 0
    return result


@pytest.mark.asyncio
async def test_source_impact_empty_db():
    """Boş veritabanında tüm metrikler 0 döner."""
    session = AsyncMock()

    # 5 farklı sorgu çağrılıyor (src, scan, news, used, bulletin) + source_detail
    zero_row = _make_row(total=0, active=0, completed=0)
    session.execute.return_value = _make_result(zero_row)
    # source_detail .all() boş liste dönmeli
    mock_result = MagicMock()
    mock_result.one.return_value = zero_row
    mock_result.all.return_value = []
    session.execute.return_value = mock_result

    result = await get_source_impact_metrics(session, "all_time")

    assert result["window"] == "all_time"
    assert result["total_sources"] == 0
    assert result["active_sources"] == 0
    assert result["total_scans"] == 0
    assert result["total_news_items"] == 0
    assert result["used_news_count"] == 0
    assert result["bulletin_count"] == 0
    assert result["source_stats"] == []


@pytest.mark.asyncio
async def test_source_impact_with_data():
    """Kaynak verisi varken metriklerin doğru hesaplandığını kontrol eder."""
    session = AsyncMock()

    # Sıralı execute çağrıları
    src_row = _make_row(total=3, active=2)
    scan_row = _make_row(total=10, completed=8)
    news_row = _make_row(total=25)
    used_row = _make_row(total=5)
    bulletin_row = _make_row(total=2)

    # source_detail satırı
    detail_row = _make_row(
        id="src-1", name="Test RSS", source_type="rss",
        status="active", scan_count=5, news_count=10,
    )

    call_count = 0
    async def mock_execute(query):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        if call_count == 1:
            result.one.return_value = src_row
        elif call_count == 2:
            result.one.return_value = scan_row
        elif call_count == 3:
            result.one.return_value = news_row
        elif call_count == 4:
            result.one.return_value = used_row
        elif call_count == 5:
            result.one.return_value = bulletin_row
        elif call_count == 6:
            result.all.return_value = [detail_row]
        elif call_count == 7:
            # used_from_source scalar
            result.scalar.return_value = 3
        return result

    session.execute = mock_execute

    result = await get_source_impact_metrics(session, "last_30d")

    assert result["window"] == "last_30d"
    assert result["total_sources"] == 3
    assert result["active_sources"] == 2
    assert result["total_scans"] == 10
    assert result["successful_scans"] == 8
    assert result["total_news_items"] == 25
    assert result["used_news_count"] == 5
    assert result["bulletin_count"] == 2
    assert len(result["source_stats"]) == 1
    assert result["source_stats"][0]["source_name"] == "Test RSS"
    assert result["source_stats"][0]["used_news_count"] == 3


@pytest.mark.asyncio
async def test_source_impact_schema_fields():
    """SourceImpactMetrics schema'sının doğru alanları içerdiğini kontrol eder."""
    from app.analytics.schemas import SourceImpactMetrics, SourceStat

    # Schema'nın beklenen alanları var mı
    fields = set(SourceImpactMetrics.model_fields.keys())
    expected = {
        "window", "total_sources", "active_sources", "total_scans",
        "successful_scans", "total_news_items", "used_news_count",
        "bulletin_count", "source_stats",
    }
    assert expected.issubset(fields)

    # SourceStat alanları
    stat_fields = set(SourceStat.model_fields.keys())
    expected_stat = {
        "source_id", "source_name", "source_type", "status",
        "scan_count", "news_count", "used_news_count",
    }
    assert expected_stat.issubset(stat_fields)
