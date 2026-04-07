"""Tests for ConditionEvaluator -- 6 condition types."""

import json
import pytest

from app.prompt_assembly.condition_evaluator import ConditionEvaluator, ConditionResult


from typing import Optional


def _block(
    condition_type: str = "always",
    condition_config: Optional[dict] = None,
    enabled_by_default: bool = True,
    status: str = "active",
) -> dict:
    """Minimal block snapshot dict for testing."""
    return {
        "key": "test.block",
        "title": "Test Block",
        "kind": "behavior_block",
        "enabled_by_default": enabled_by_default,
        "condition_type": condition_type,
        "condition_config_json": json.dumps(condition_config) if condition_config else None,
        "status": status,
    }


@pytest.fixture
def evaluator() -> ConditionEvaluator:
    return ConditionEvaluator()


# -- always --

def test_always_included(evaluator):
    result = evaluator.evaluate(
        block=_block("always"),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_always"


def test_always_disabled_by_default(evaluator):
    result = evaluator.evaluate(
        block=_block("always", enabled_by_default=False),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_disabled_block"


# -- settings_boolean --

def test_settings_boolean_true(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={"normalize_enabled": True},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_setting"
    assert result.evaluated_condition_key == "normalize_enabled"


def test_settings_boolean_false(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={"normalize_enabled": False},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_by_setting"


def test_settings_boolean_missing_key(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_boolean", {"settings_key": "normalize_enabled"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_by_setting"


# -- data_presence --

def test_data_presence_exists(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={"summary": "Some text"},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_data_presence"


def test_data_presence_missing(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_missing_data"


def test_data_presence_empty_string(evaluator):
    result = evaluator.evaluate(
        block=_block("data_presence", {"data_key": "summary"}),
        settings_snapshot={},
        data_snapshot={"summary": ""},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_missing_data"


# -- settings_value_equals --

def test_value_equals_match(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_value_equals", {"settings_key": "mode", "expected_value": "broadcast"}),
        settings_snapshot={"mode": "broadcast"},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_value_match"


def test_value_equals_mismatch(evaluator):
    result = evaluator.evaluate(
        block=_block("settings_value_equals", {"settings_key": "mode", "expected_value": "broadcast"}),
        settings_snapshot={"mode": "conversational"},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_value_mismatch"


# -- module_match --

def test_module_match_correct(evaluator):
    result = evaluator.evaluate(
        block=_block("module_match", {"module": "news_bulletin"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is True
    assert result.reason_code == "included_by_module_match"


def test_module_match_wrong(evaluator):
    result = evaluator.evaluate(
        block=_block("module_match", {"module": "standard_video"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_module_mismatch"


# -- provider_match --

def test_provider_match_correct(evaluator):
    result = evaluator.evaluate(
        block=_block("provider_match", {"provider": "kie_ai"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai_gemini_flash",
    )
    assert result.included is True
    assert result.reason_code == "included_by_provider_match"


def test_provider_match_wrong(evaluator):
    result = evaluator.evaluate(
        block=_block("provider_match", {"provider": "openai"}),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai_gemini_flash",
    )
    assert result.included is False
    assert result.reason_code == "skipped_provider_mismatch"


# -- disabled block status --

def test_disabled_status_block(evaluator):
    result = evaluator.evaluate(
        block=_block("always", status="disabled"),
        settings_snapshot={},
        data_snapshot={},
        module_scope="news_bulletin",
        provider_name="kie_ai",
    )
    assert result.included is False
    assert result.reason_code == "skipped_disabled_block"
