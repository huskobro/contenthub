"""
Timing helpers for job and step elapsed time and ETA estimation (Phase M1-C4).

All functions are pure — no DB access, no side effects.
Timezone-aware: naive datetimes are normalised to UTC before any arithmetic.
"""

from datetime import datetime, timezone


def _to_utc(dt: datetime) -> datetime:
    """Return dt in UTC, converting naive datetimes by assuming they are UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def elapsed_seconds(started_at: datetime | None) -> float | None:
    """
    Return elapsed wall-clock seconds since *started_at*.

    Returns None if started_at is None (job/step not yet started).
    """
    if started_at is None:
        return None
    now = datetime.now(timezone.utc)
    started = _to_utc(started_at)
    delta = (now - started).total_seconds()
    return max(0.0, delta)


def format_elapsed(seconds: float) -> str:
    """
    Return a human-readable elapsed string.

    Examples:
        45.0   → '45s'
        154.0  → '2m 34s'
        4320.0 → '1h 12m'
    """
    total = int(seconds)
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)

    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def estimate_remaining_seconds(
    elapsed: float,
    progress_fraction: float,
) -> float | None:
    """
    Simple linear ETA estimate.

    Args:
        elapsed           : seconds already spent
        progress_fraction : fraction of work done, in [0.0, 1.0]

    Returns:
        None  if progress_fraction == 0 (no basis for estimate)
        0.0   if progress_fraction >= 1 (work is done)
        float : estimated remaining seconds (linear projection)
    """
    if progress_fraction <= 0.0:
        return None
    if progress_fraction >= 1.0:
        return 0.0
    total_estimated = elapsed / progress_fraction
    remaining = total_estimated - elapsed
    return max(0.0, remaining)


def step_progress_fraction(
    completed_steps: int,
    total_steps: int,
) -> float:
    """
    Return completed_steps / total_steps, clamped to [0.0, 1.0].

    Returns 0.0 if total_steps is 0.
    """
    if total_steps <= 0:
        return 0.0
    fraction = completed_steps / total_steps
    return max(0.0, min(1.0, fraction))
