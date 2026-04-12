"""
Minimal cron parser for Full-Auto scheduler — zero external deps.

Supports 5-field cron expressions: ``minute hour day_of_month month day_of_week``

Each field supports:
  - ``*``                    wildcard
  - ``N``                    single value
  - ``N,M,...``              comma list
  - ``A-B``                  range
  - ``*/N`` / ``A-B/N``      step
  - mixed                    e.g. ``0,15,30,45`` or ``9-17/2``

Day-of-week:
  - ``0`` = Sunday ... ``6`` = Saturday (cron style)
  - ``7`` is treated as Sunday too

This is intentionally small — croniter handles far more (L / # / @weekly /
etc.), but we do not ship those for v1. ``compute_next_run`` searches forward
minute-by-minute up to a hard cap so malformed or never-matching expressions
cannot loop forever.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional


_FIELD_BOUNDS = (
    (0, 59),   # minute
    (0, 23),   # hour
    (1, 31),   # day_of_month
    (1, 12),   # month
    (0, 7),    # day_of_week (0 and 7 = sunday)
)

_FIELD_NAMES = ("minute", "hour", "day_of_month", "month", "day_of_week")


class CronError(ValueError):
    """Raised when the cron expression is malformed."""


def _parse_field(token: str, lo: int, hi: int, name: str) -> set[int]:
    """Parse a single field into an explicit set of allowed values."""
    if not token:
        raise CronError(f"{name}: bos alan")
    out: set[int] = set()

    for part in token.split(","):
        if not part:
            raise CronError(f"{name}: gecersiz ','")

        step = 1
        if "/" in part:
            base, step_s = part.split("/", 1)
            try:
                step = int(step_s)
            except ValueError:
                raise CronError(f"{name}: gecersiz step '{step_s}'")
            if step <= 0:
                raise CronError(f"{name}: step sifirdan buyuk olmali")
        else:
            base = part

        if base == "*":
            start, end = lo, hi
        elif "-" in base:
            a, b = base.split("-", 1)
            try:
                start, end = int(a), int(b)
            except ValueError:
                raise CronError(f"{name}: gecersiz aralik '{base}'")
        else:
            try:
                start = int(base)
            except ValueError:
                raise CronError(f"{name}: gecersiz deger '{base}'")
            end = start

        if start < lo or end > hi or start > end:
            raise CronError(
                f"{name}: {start}-{end} sinirlar disinda ({lo}-{hi})"
            )

        for v in range(start, end + 1, step):
            out.add(v)

    return out


def parse_cron(expr: str) -> tuple[set[int], ...]:
    """Parse a 5-field cron expression into sets per field."""
    if not expr or not isinstance(expr, str):
        raise CronError("bos cron ifadesi")
    parts = expr.strip().split()
    if len(parts) != 5:
        raise CronError(
            f"5 alan beklendi, {len(parts)} bulundu: '{expr}'"
        )

    fields: list[set[int]] = []
    for tok, (lo, hi), name in zip(parts, _FIELD_BOUNDS, _FIELD_NAMES):
        fields.append(_parse_field(tok, lo, hi, name))

    # Normalize day-of-week: 7 == 0
    dow = fields[4]
    if 7 in dow:
        dow.discard(7)
        dow.add(0)
    return tuple(fields)


def _matches(dt: datetime, fields: tuple[set[int], ...]) -> bool:
    minute, hour, dom, month, dow = fields
    # Python weekday(): Monday=0..Sunday=6; cron: Sunday=0..Saturday=6.
    cron_dow = (dt.weekday() + 1) % 7
    return (
        dt.minute in minute
        and dt.hour in hour
        and dt.day in dom
        and dt.month in month
        and cron_dow in dow
    )


def compute_next_run(
    expr: str,
    *,
    now: Optional[datetime] = None,
    search_limit_minutes: int = 60 * 24 * 366,  # one year
) -> Optional[datetime]:
    """Return the next datetime (UTC) at which the cron expression matches.

    Searches forward minute-by-minute from ``now + 1min``. Returns None if
    nothing matched within ``search_limit_minutes``.
    """
    fields = parse_cron(expr)
    base = now or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)

    # Start from next full minute so "* * * * *" doesn't fire instantly.
    start = base.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for i in range(search_limit_minutes):
        candidate = start + timedelta(minutes=i)
        if _matches(candidate, fields):
            return candidate
    return None


def is_valid_cron(expr: str) -> bool:
    """Non-raising helper for validation."""
    try:
        parse_cron(expr)
        return True
    except CronError:
        return False
