"""
Analytics SQL helpers — Gate 5 D2.

Abstraction point for dialect-specific SQL functions used in analytics
aggregations. Currently SQLite-only (julianday). When Postgres support
is added, add dialect detection here and emit EXTRACT(EPOCH FROM ...)
instead.

Why abstracted now: service.py had 7 inlined julianday() calls — a single
change point made future migration a one-file edit instead of a 7-site edit.
"""

from sqlalchemy import func


def epoch_diff_seconds(start_col, end_col):
    """
    Return an SQL expression for (end_col - start_col) in seconds.

    Currently emits:
        julianday(end_col) * 86400.0 - julianday(start_col) * 86400.0

    SQLite-specific. For Postgres, replace with:
        EXTRACT(EPOCH FROM (end_col - start_col))

    Both columns must be DATETIME/TIMESTAMP. NULL in either column yields
    NULL — callers typically wrap in a `case((both IS NOT NULL, ...))`.
    """
    return func.julianday(end_col) * 86400.0 - func.julianday(start_col) * 86400.0
