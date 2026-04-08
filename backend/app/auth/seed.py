"""
Admin seed — Faz 3.

Creates the initial admin user if no admin exists in the database.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.auth.password import hash_password
from app.users.slugify import slugify, make_unique_slug

logger = logging.getLogger(__name__)


async def seed_admin_user(db: AsyncSession) -> None:
    """Create initial admin user if no admin exists."""
    stmt = select(User).where(User.role == "admin")
    existing_admin = (await db.execute(stmt)).scalar_one_or_none()

    if existing_admin:
        logger.debug("Admin user already exists: id=%s", existing_admin.id)
        return

    # Generate unique slug
    base_slug = slugify("Admin")
    existing_slugs = set(
        row[0]
        for row in (await db.execute(select(User.slug))).all()
        if row[0] is not None
    )
    slug = make_unique_slug(base_slug, existing_slugs)

    admin = User(
        email="admin@contenthub.local",
        display_name="Admin",
        slug=slug,
        role="admin",
        status="active",
        password_hash=hash_password("admin123"),
    )
    db.add(admin)
    await db.commit()

    logger.info(
        "Initial admin user created: email=admin@contenthub.local, password=admin123"
    )
