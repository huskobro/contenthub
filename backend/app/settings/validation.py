"""
Settings value validation engine.

Parses validation_rules_json from a Setting row and validates
incoming values against those rules.

Supported rule types:
  - {"min": N} — numeric minimum
  - {"max": N} — numeric maximum
  - {"enum": [...]} — value must be one of the listed options
  - {"regex": "..."} — string must match regex pattern
  - {"required": true} — value cannot be null/empty
  - {"type": "integer|float|boolean|string"} — type check

Rules are combined with AND logic — all rules must pass.
"""

import json
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SettingValidationError(Exception):
    """Raised when a setting value fails validation."""
    def __init__(self, key: str, message: str):
        self.key = key
        self.message = message
        super().__init__(f"Validation failed for '{key}': {message}")


def validate_setting_value(
    key: str,
    value_json: str,
    rules_json: str,
    setting_type: str = "string",
) -> None:
    """
    Validate a setting value against its rules.

    Args:
        key: Setting key (for error messages)
        value_json: The JSON-encoded value to validate
        rules_json: The JSON-encoded validation rules
        setting_type: The setting's declared type

    Raises:
        SettingValidationError if validation fails
    """
    # Parse rules
    try:
        rules = json.loads(rules_json) if rules_json else {}
    except (json.JSONDecodeError, TypeError):
        return  # Invalid rules JSON — skip validation (don't block updates)

    if not rules or not isinstance(rules, dict):
        return  # No rules to validate against

    # Parse value
    try:
        value = json.loads(value_json) if value_json else None
    except (json.JSONDecodeError, TypeError):
        value = None

    # Required check
    if rules.get("required") and (value is None or value == ""):
        raise SettingValidationError(key, "Bu ayar zorunludur, bos birakilamaz.")

    # If value is None and not required, skip remaining checks
    if value is None:
        return

    # Type check
    expected_type = rules.get("type", setting_type)
    if expected_type == "integer":
        if not isinstance(value, int) or isinstance(value, bool):
            raise SettingValidationError(key, f"Deger tamsayi (integer) olmalidir, gelen: {type(value).__name__}")
    elif expected_type == "float":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise SettingValidationError(key, f"Deger sayi (float) olmalidir, gelen: {type(value).__name__}")
    elif expected_type == "boolean":
        if not isinstance(value, bool):
            raise SettingValidationError(key, f"Deger boolean olmalidir, gelen: {type(value).__name__}")

    # Min check (numeric)
    if "min" in rules:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if value < rules["min"]:
                raise SettingValidationError(key, f"Deger en az {rules['min']} olmalidir, gelen: {value}")

    # Max check (numeric)
    if "max" in rules:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if value > rules["max"]:
                raise SettingValidationError(key, f"Deger en fazla {rules['max']} olmalidir, gelen: {value}")

    # Enum check
    if "enum" in rules:
        allowed = rules["enum"]
        if isinstance(allowed, list) and value not in allowed:
            raise SettingValidationError(key, f"Deger su seceneklerden biri olmalidir: {allowed}, gelen: {value}")

    # Regex check (string values only)
    if "regex" in rules:
        if isinstance(value, str):
            pattern = rules["regex"]
            try:
                if not re.match(pattern, value):
                    raise SettingValidationError(key, f"Deger '{pattern}' desenine uymalidir.")
            except re.error:
                pass  # Invalid regex in rules — skip, don't block
