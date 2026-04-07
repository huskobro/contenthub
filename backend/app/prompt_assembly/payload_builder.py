"""Provider-specific payload construction.

Converts assembled prompt into provider-ready format.
Provider-specific logic stays here -- never leaks into assembly layer.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Fields that must NEVER appear in stored payloads
_SECRET_PATTERNS = {"authorization", "api_key", "api-key", "x-api-key", "token", "bearer", "secret"}


class ProviderPayloadBuilder:
    """Build provider-specific request payloads from assembled prompts."""

    def build(
        self,
        provider_name: str,
        system_prompt: str,
        user_content: str,
        model: str = "",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> dict:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        payload: dict = {"messages": messages}

        if model:
            payload["model"] = model
        payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        return payload

    @staticmethod
    def sanitize_for_storage(data: Any) -> Optional[str]:
        """Sanitize payload/response before persisting to trace.

        Removes any fields matching secret patterns.
        Returns JSON string ready for storage.
        """
        if data is None:
            return None

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except (json.JSONDecodeError, TypeError):
                return data

        sanitized = _redact_secrets(data)
        return json.dumps(sanitized, ensure_ascii=False)


def _redact_secrets(obj: Any) -> Any:
    """Recursively redact secret-bearing fields."""
    if isinstance(obj, dict):
        return {
            k: "[REDACTED]" if any(p in k.lower() for p in _SECRET_PATTERNS) else _redact_secrets(v)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact_secrets(item) for item in obj]
    return obj
