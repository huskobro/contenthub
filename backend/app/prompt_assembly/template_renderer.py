"""Template renderer for prompt blocks.

Simple {{variable}} substitution -- no Jinja2, no block-level conditions.
All conditional logic stays at the block selection level.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_VAR_PATTERN = re.compile(r"\{\{(\w+)\}\}")


@dataclass
class RenderResult:
    """Result of rendering a template with data."""

    rendered_text: str
    used_variables: List[str] = field(default_factory=list)
    missing_variables: List[str] = field(default_factory=list)
    is_empty: bool = False
    has_critical_missing: bool = False


class TemplateRenderer:
    """Renders prompt block templates with {{variable}} substitution.

    Pure function -- no side effects. Deterministic: same template + same data
    always produces the same output.
    """

    def render(
        self,
        template: str,
        data: Dict[str, Any],
        critical_keys: Optional[List[str]] = None,
    ) -> RenderResult:
        critical_keys = critical_keys or []

        all_vars = list(dict.fromkeys(_VAR_PATTERN.findall(template)))

        used: List[str] = []
        missing: List[str] = []

        def _replace(match: re.Match) -> str:
            var_name = match.group(1)
            value = data.get(var_name)

            if value is not None and str(value) != "":
                if var_name not in used:
                    used.append(var_name)
                return str(value)
            else:
                if var_name not in missing:
                    missing.append(var_name)
                return ""

        rendered = _VAR_PATTERN.sub(_replace, template)

        has_critical = False
        for key in critical_keys:
            if key in missing:
                has_critical = True

        is_empty = rendered.strip() == ""

        return RenderResult(
            rendered_text=rendered,
            used_variables=used,
            missing_variables=missing,
            is_empty=is_empty,
            has_critical_missing=has_critical,
        )

    @staticmethod
    def extract_data_dependencies(template: str) -> List[str]:
        """Extract all variable names from a template (for trace metadata)."""
        return list(dict.fromkeys(_VAR_PATTERN.findall(template)))
