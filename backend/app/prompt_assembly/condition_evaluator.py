"""Condition evaluator for prompt blocks.

Supports 6 condition types with no DSL -- simple, deterministic, traceable.
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class ConditionResult:
    """Result of evaluating a block's inclusion condition."""

    included: bool
    reason_code: str
    reason_text: str
    evaluated_condition_type: str
    evaluated_condition_key: Optional[str] = None
    evaluated_condition_value: Optional[str] = None


class ConditionEvaluator:
    """Evaluates whether a prompt block should be included in the assembly.

    Pure function -- no side effects, no DB access, no external calls.
    All inputs come from frozen snapshots.
    """

    def evaluate(
        self,
        block: dict,
        settings_snapshot: dict[str, Any],
        data_snapshot: dict[str, Any],
        module_scope: str,
        provider_name: str,
    ) -> ConditionResult:
        condition_type = block.get("condition_type", "always")
        status = block.get("status", "active")
        enabled_by_default = block.get("enabled_by_default", True)

        # Pre-check: disabled status always skips
        if status == "disabled":
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text=f"Blok status='{status}', devre disi",
                evaluated_condition_type=condition_type,
            )

        # Pre-check: enabled_by_default=False + always = disabled
        if not enabled_by_default and condition_type == "always":
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text="enabled_by_default=false ve condition=always, blok varsayilan kapali",
                evaluated_condition_type="always",
            )

        config = self._parse_config(block.get("condition_config_json"))

        handler = {
            "always": self._eval_always,
            "settings_boolean": self._eval_settings_boolean,
            "data_presence": self._eval_data_presence,
            "settings_value_equals": self._eval_settings_value_equals,
            "module_match": self._eval_module_match,
            "provider_match": self._eval_provider_match,
        }.get(condition_type)

        if handler is None:
            return ConditionResult(
                included=False,
                reason_code="skipped_disabled_block",
                reason_text=f"Bilinmeyen condition_type: '{condition_type}'",
                evaluated_condition_type=condition_type,
            )

        return handler(
            config=config,
            settings_snapshot=settings_snapshot,
            data_snapshot=data_snapshot,
            module_scope=module_scope,
            provider_name=provider_name,
            enabled_by_default=enabled_by_default,
        )

    def _eval_always(self, **kwargs) -> ConditionResult:
        return ConditionResult(
            included=True,
            reason_code="included_always",
            reason_text="Blok her zaman dahil edilir",
            evaluated_condition_type="always",
        )

    def _eval_settings_boolean(
        self, config: dict, settings_snapshot: dict, enabled_by_default: bool, **kwargs
    ) -> ConditionResult:
        key = config.get("settings_key", "")
        value = settings_snapshot.get(key)
        is_true = bool(value) if value is not None else False

        if is_true:
            return ConditionResult(
                included=True,
                reason_code="included_by_setting",
                reason_text=f"{key}=true oldugu icin eklendi",
                evaluated_condition_type="settings_boolean",
                evaluated_condition_key=key,
                evaluated_condition_value=str(value),
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_by_setting",
                reason_text=f"{key}={'false' if value is not None else 'yok'} oldugu icin atlandi",
                evaluated_condition_type="settings_boolean",
                evaluated_condition_key=key,
                evaluated_condition_value=str(value) if value is not None else None,
            )

    def _eval_data_presence(self, config: dict, data_snapshot: dict, **kwargs) -> ConditionResult:
        key = config.get("data_key", "")
        value = data_snapshot.get(key)
        is_present = bool(value)

        if is_present:
            return ConditionResult(
                included=True,
                reason_code="included_by_data_presence",
                reason_text=f"{key} verisi mevcut, blok eklendi",
                evaluated_condition_type="data_presence",
                evaluated_condition_key=key,
                evaluated_condition_value="present",
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_missing_data",
                reason_text=f"{key} verisi bos/yok, blok atlandi",
                evaluated_condition_type="data_presence",
                evaluated_condition_key=key,
                evaluated_condition_value="absent",
            )

    def _eval_settings_value_equals(
        self, config: dict, settings_snapshot: dict, **kwargs
    ) -> ConditionResult:
        key = config.get("settings_key", "")
        expected = config.get("expected_value")
        actual = settings_snapshot.get(key)

        if str(actual) == str(expected):
            return ConditionResult(
                included=True,
                reason_code="included_by_value_match",
                reason_text=f"{key}='{actual}' eslesir (beklenen: '{expected}')",
                evaluated_condition_type="settings_value_equals",
                evaluated_condition_key=key,
                evaluated_condition_value=str(actual),
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_value_mismatch",
                reason_text=f"{key}='{actual}' eslesmiyor (beklenen: '{expected}')",
                evaluated_condition_type="settings_value_equals",
                evaluated_condition_key=key,
                evaluated_condition_value=str(actual) if actual is not None else None,
            )

    def _eval_module_match(self, config: dict, module_scope: str, **kwargs) -> ConditionResult:
        expected = config.get("module", "")
        if module_scope == expected:
            return ConditionResult(
                included=True,
                reason_code="included_by_module_match",
                reason_text=f"Modul '{module_scope}' eslesiyor",
                evaluated_condition_type="module_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=module_scope,
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_module_mismatch",
                reason_text=f"Modul '{module_scope}' eslesmiyor (beklenen: '{expected}')",
                evaluated_condition_type="module_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=module_scope,
            )

    def _eval_provider_match(self, config: dict, provider_name: str, **kwargs) -> ConditionResult:
        expected = config.get("provider", "")
        if provider_name.startswith(expected):
            return ConditionResult(
                included=True,
                reason_code="included_by_provider_match",
                reason_text=f"Provider '{provider_name}' eslesiyor (prefix: '{expected}')",
                evaluated_condition_type="provider_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=provider_name,
            )
        else:
            return ConditionResult(
                included=False,
                reason_code="skipped_provider_mismatch",
                reason_text=f"Provider '{provider_name}' eslesmiyor (beklenen prefix: '{expected}')",
                evaluated_condition_type="provider_match",
                evaluated_condition_key=expected,
                evaluated_condition_value=provider_name,
            )

    @staticmethod
    def _parse_config(config_json: Optional[str]) -> dict:
        if not config_json:
            return {}
        try:
            return json.loads(config_json)
        except (json.JSONDecodeError, TypeError):
            return {}
