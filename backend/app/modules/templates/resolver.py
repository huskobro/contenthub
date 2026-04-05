"""
Template Runtime Resolver — M11.

Resolves template + style blueprint context for a job at execution time.

Flow:
  1. Job has template_id → load Template from DB
  2. Find active TemplateStyleLink for that template → load linked StyleBlueprint
  3. Build a TemplateContext dict with all relevant data
  4. Executors can read this context for style/content/publish decisions

If template_id is None or template not found, returns None (no template context).
This is backward-compatible: all existing jobs without template_id continue to work.

This module is read-only. It never writes templates, blueprints, or links.
"""

import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Template, StyleBlueprint, TemplateStyleLink

logger = logging.getLogger(__name__)


async def resolve_template_context(
    db: AsyncSession,
    template_id: Optional[str],
) -> Optional[dict]:
    """
    Resolve full template + style blueprint context for job execution.

    Returns None if template_id is None or template not found.
    Returns dict with structure:
      {
        "template_id": str,
        "template_name": str,
        "template_type": str,
        "template_version": int,
        "style_profile": dict or None,
        "content_rules": dict or None,
        "publish_profile": dict or None,
        "style_blueprint": {
            "id": str,
            "name": str,
            "visual_rules": dict or None,
            "motion_rules": dict or None,
            "layout_rules": dict or None,
            "subtitle_rules": dict or None,
            "thumbnail_rules": dict or None,
        } or None,
        "link_role": str or None,
      }
    """
    if not template_id:
        return None

    # Load template
    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        logger.warning(
            "Template not found for runtime resolution: template_id=%s",
            template_id,
        )
        return None

    context = {
        "template_id": template.id,
        "template_name": template.name,
        "template_type": template.template_type,
        "template_version": template.version,
        "style_profile": _parse_json(template.style_profile_json),
        "content_rules": _parse_json(template.content_rules_json),
        "publish_profile": _parse_json(template.publish_profile_json),
        "style_blueprint": None,
        "link_role": None,
    }

    # Find active style link (highest priority = first created active link)
    link_result = await db.execute(
        select(TemplateStyleLink)
        .where(
            TemplateStyleLink.template_id == template.id,
            TemplateStyleLink.status == "active",
        )
        .order_by(TemplateStyleLink.created_at.asc())
        .limit(1)
    )
    link = link_result.scalar_one_or_none()

    if link is not None:
        context["link_role"] = link.link_role

        # Load linked style blueprint
        bp_result = await db.execute(
            select(StyleBlueprint).where(
                StyleBlueprint.id == link.style_blueprint_id
            )
        )
        blueprint = bp_result.scalar_one_or_none()

        if blueprint is not None:
            context["style_blueprint"] = {
                "id": blueprint.id,
                "name": blueprint.name,
                "version": blueprint.version,
                "visual_rules": _parse_json(blueprint.visual_rules_json),
                "motion_rules": _parse_json(blueprint.motion_rules_json),
                "layout_rules": _parse_json(blueprint.layout_rules_json),
                "subtitle_rules": _parse_json(blueprint.subtitle_rules_json),
                "thumbnail_rules": _parse_json(blueprint.thumbnail_rules_json),
            }

    logger.info(
        "Template context resolved: template=%s (%s v%d), blueprint=%s, link_role=%s",
        template.name,
        template.template_type,
        template.version,
        context["style_blueprint"]["name"] if context["style_blueprint"] else "none",
        context["link_role"],
    )

    return context


def _parse_json(raw: Optional[str]) -> Optional[dict]:
    """Parse JSON string to dict. Returns None on null/empty/invalid."""
    if not raw or raw in ("null", ""):
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, TypeError):
        return None
