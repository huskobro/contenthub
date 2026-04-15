"""
Analytics Export Service — Gate 5 C1.

Flattens analytics metric dicts into multi-section CSV strings.

Design:
  - Each report kind is a pure dict (from service.py).
  - We emit:
      [scalar section]
      key,value
      ...
      (blank line)
      [list section: name]
      col1,col2,...
      ...
  - Multi-section format is OK in Excel/Sheets — they parse blank-line-
    separated blocks as one sheet.
  - Non-scalar values at top level (lists) become their own section.

Supported kinds (matches /analytics/* endpoints):
  overview, operations, content, source-impact, channel, template-impact,
  prompt-assembly, dashboard, publish, channel-performance
"""

from __future__ import annotations

import csv
import io
from typing import Any

VALID_KINDS = {
    "overview",
    "operations",
    "content",
    "source-impact",
    "channel",
    "template-impact",
    "prompt-assembly",
    "dashboard",
    "publish",
    "channel-performance",
}


def _write_scalar_section(writer: "csv.writer", data: dict[str, Any]) -> None:
    """Write top-level scalar fields as a two-column table."""
    writer.writerow(["field", "value"])
    for key, value in data.items():
        if isinstance(value, (dict, list)):
            continue
        writer.writerow([key, "" if value is None else value])


def _write_list_section(
    writer: "csv.writer", name: str, rows: list[Any]
) -> None:
    """Write a list of dicts as its own titled section."""
    if not rows:
        writer.writerow([])
        writer.writerow([f"[{name}]"])
        writer.writerow(["(empty)"])
        return

    if not isinstance(rows[0], dict):
        writer.writerow([])
        writer.writerow([f"[{name}]"])
        for item in rows:
            writer.writerow([item])
        return

    columns = list(rows[0].keys())
    writer.writerow([])
    writer.writerow([f"[{name}]"])
    writer.writerow(columns)
    for row in rows:
        writer.writerow([_fmt(row.get(c)) for c in columns])


def _write_dict_section(
    writer: "csv.writer", name: str, obj: dict[str, Any]
) -> None:
    """Write a nested dict as its own titled key/value section."""
    writer.writerow([])
    writer.writerow([f"[{name}]"])
    writer.writerow(["field", "value"])
    for key, value in obj.items():
        if isinstance(value, (dict, list)):
            # One level deep only — nested deeper gets JSON-stringified for sanity.
            writer.writerow([key, _fmt(value)])
        else:
            writer.writerow([key, _fmt(value)])


def _fmt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, dict)):
        import json

        return json.dumps(value, ensure_ascii=False, default=str)
    return str(value)


def to_csv(data: dict[str, Any], kind: str) -> str:
    """
    Flatten an analytics metric dict into a multi-section CSV string.

    Args:
        data: Dict returned by one of the service.py get_* functions.
        kind: One of VALID_KINDS. Used only for the header comment line.

    Returns: UTF-8 text; multi-section CSV.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown analytics export kind: {kind}")

    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")

    # Header
    writer.writerow([f"# analytics export kind={kind}"])
    writer.writerow([])

    # Scalar section first
    _write_scalar_section(writer, data)

    # Then each non-scalar top-level field as its own section.
    for key, value in data.items():
        if isinstance(value, list):
            _write_list_section(writer, key, value)
        elif isinstance(value, dict):
            _write_dict_section(writer, key, value)

    return buf.getvalue()
