"""
Module Management API router (Phase 2 — Faz A).

Endpoints:
  GET /modules — List all registered modules with enabled status
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.registry import module_registry
from app.settings.settings_resolver import resolve
from app.visibility.dependencies import require_visible

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/modules",
    tags=["modules"],
    dependencies=[Depends(require_visible("panel:settings"))],
)

@router.get("")
async def list_modules(db: AsyncSession = Depends(get_db)):
    modules = module_registry.list_all()
    result = []
    for mod in modules:
        enabled_key = f"module.{mod.module_id}.enabled"
        enabled = await resolve(enabled_key, db)
        if enabled is None:
            enabled = True
        steps = [
            {
                "step_key": s.step_key,
                "step_order": s.step_order,
                "display_name": s.display_name or s.step_key,
                "description": s.description or "",
                "idempotency_type": s.idempotency_type,
            }
            for s in sorted(mod.steps, key=lambda s: s.step_order)
        ]
        result.append({
            "module_id": mod.module_id,
            "display_name": mod.display_name,
            "enabled": bool(enabled),
            "steps": steps,
            "input_schema": mod.input_schema,
            "gate_defaults": mod.gate_defaults,
            "template_compat": mod.template_compat,
        })
    return result
