"""
User slug generation utility — M40.

Generates filesystem-safe slugs from display names.
Used for workspace paths: workspace/users/{slug}/jobs/
"""

import re
import unicodedata


def slugify(name: str) -> str:
    """Convert a display name to a filesystem-safe slug.

    Examples:
        "Hüseyin Coşkun"  → "huseyin-coskun"
        "Admin User"       → "admin-user"
        "José García"      → "jose-garcia"
        "  spaces  "       → "spaces"
        ""                 → "user"
    """
    # Normalize unicode → ASCII
    slug = unicodedata.normalize("NFKD", name.lower())
    slug = slug.encode("ascii", "ignore").decode("ascii")
    # Replace non-alphanumeric with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug or "user"


def make_unique_slug(base_slug: str, existing_slugs: set[str]) -> str:
    """Ensure slug uniqueness by appending a number if needed.

    Examples:
        ("admin", {"admin"})           → "admin-2"
        ("admin", {"admin", "admin-2"}) → "admin-3"
    """
    if base_slug not in existing_slugs:
        return base_slug
    counter = 2
    while f"{base_slug}-{counter}" in existing_slugs:
        counter += 1
    return f"{base_slug}-{counter}"
