"""Unit tests for the mini cron parser used by Full-Auto scheduler."""

from datetime import datetime, timezone

import pytest

from app.full_auto.cron import (
    CronError,
    compute_next_run,
    is_valid_cron,
    parse_cron,
)


def test_parse_valid_star():
    fields = parse_cron("* * * * *")
    assert fields[0] == set(range(0, 60))
    assert fields[1] == set(range(0, 24))


def test_parse_step_minute():
    fields = parse_cron("*/15 * * * *")
    assert fields[0] == {0, 15, 30, 45}


def test_parse_range():
    fields = parse_cron("0 9-17 * * 1-5")
    assert fields[1] == set(range(9, 18))
    assert fields[4] == {1, 2, 3, 4, 5}


def test_parse_list():
    fields = parse_cron("0,15,30,45 * * * *")
    assert fields[0] == {0, 15, 30, 45}


def test_parse_dow_seven_is_sunday():
    fields = parse_cron("0 0 * * 7")
    assert fields[4] == {0}


def test_parse_invalid_field_count():
    with pytest.raises(CronError):
        parse_cron("0 9")


def test_parse_invalid_bounds():
    with pytest.raises(CronError):
        parse_cron("99 * * * *")


def test_is_valid_cron_forgiving():
    assert is_valid_cron("*/5 * * * *") is True
    assert is_valid_cron("bad") is False
    assert is_valid_cron("") is False


def test_compute_next_run_every_minute():
    base = datetime(2026, 4, 12, 10, 30, 15, tzinfo=timezone.utc)
    nxt = compute_next_run("* * * * *", now=base)
    assert nxt == datetime(2026, 4, 12, 10, 31, 0, tzinfo=timezone.utc)


def test_compute_next_run_nine_am_weekdays():
    # Sun Apr 12 2026
    base = datetime(2026, 4, 12, 12, 0, 0, tzinfo=timezone.utc)
    nxt = compute_next_run("0 9 * * 1-5", now=base)
    # Next weekday 9:00 UTC — Monday Apr 13
    assert nxt == datetime(2026, 4, 13, 9, 0, 0, tzinfo=timezone.utc)


def test_compute_next_run_every_15_minutes():
    base = datetime(2026, 4, 12, 10, 7, 0, tzinfo=timezone.utc)
    nxt = compute_next_run("*/15 * * * *", now=base)
    assert nxt == datetime(2026, 4, 12, 10, 15, 0, tzinfo=timezone.utc)


def test_compute_next_run_preserves_utc():
    nxt = compute_next_run("0 0 1 1 *")  # Jan 1 at 00:00
    assert nxt is not None
    assert nxt.tzinfo is not None
