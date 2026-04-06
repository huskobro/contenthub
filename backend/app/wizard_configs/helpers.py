"""
Wizard Configuration helpers — M32.

JSON serialization/deserialization between DB model and response schemas.
"""

import json
from app.db.models import WizardConfig
from app.wizard_configs.schemas import WizardConfigResponse, WizardStepConfig


def config_to_response(row: WizardConfig) -> WizardConfigResponse:
    """DB WizardConfig -> WizardConfigResponse with parsed JSON."""
    try:
        steps_raw = json.loads(row.steps_config_json or "[]")
        steps = [WizardStepConfig(**s) for s in steps_raw]
    except (json.JSONDecodeError, TypeError, ValueError):
        steps = []

    try:
        field_defaults = json.loads(row.field_defaults_json or "{}") if row.field_defaults_json else None
    except (json.JSONDecodeError, TypeError):
        field_defaults = None

    return WizardConfigResponse(
        id=row.id,
        wizard_type=row.wizard_type,
        display_name=row.display_name,
        enabled=row.enabled,
        steps_config=steps,
        field_defaults=field_defaults,
        module_scope=row.module_scope,
        status=row.status,
        version=row.version,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
