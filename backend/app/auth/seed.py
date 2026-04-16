"""
Admin seed — Faz 3 + phase_ac drift recovery.

Responsibilities:
- Create the initial admin user if no admin exists (fresh DB path).
- Backfill `password_hash` for any existing user whose hash is NULL. This
  protects against the `phase_ac_001` drift scenario where the column was
  added to live users without a value, locking everyone out of login.

Backfill policy (dürüst ve görünür):
- Admin rows get a well-known dev password `admin123`.
- Non-admin rows get a well-known dev password `user123`.
- In both cases we log the email + which default password was applied so
  the operator can change it through the admin panel afterwards.
- We never overwrite an existing non-null hash.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.auth.password import hash_password
from app.users.slugify import slugify, make_unique_slug

logger = logging.getLogger(__name__)


# Dev-time default passwords applied only to users with NULL password_hash.
# These are intentionally weak and must be rotated via the admin panel.
_DEFAULT_ADMIN_PASSWORD = "admin123"
_DEFAULT_USER_PASSWORD = "user123"


async def _backfill_missing_password_hashes(db: AsyncSession) -> int:
    """Set password_hash for every user that currently has NULL.

    Returns the number of rows backfilled.
    """
    stmt = select(User).where(User.password_hash.is_(None))
    rows = (await db.execute(stmt)).scalars().all()
    if not rows:
        return 0
    for u in rows:
        default_pw = (
            _DEFAULT_ADMIN_PASSWORD if u.role == "admin" else _DEFAULT_USER_PASSWORD
        )
        u.password_hash = hash_password(default_pw)
        logger.warning(
            "Auth recovery: backfilled password_hash for user email=%s role=%s "
            "with default password=%s (rotate via admin panel).",
            u.email,
            u.role,
            default_pw,
        )
    await db.commit()
    return len(rows)


async def seed_admin_user(db: AsyncSession) -> None:
    """Create initial admin user if no admin exists + backfill missing hashes."""
    # Step 1 — fresh DB path: create the initial admin if needed.
    stmt = select(User).where(User.role == "admin")
    existing_admin = (await db.execute(stmt)).scalars().first()

    if existing_admin is None:
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
            password_hash=hash_password(_DEFAULT_ADMIN_PASSWORD),
        )
        db.add(admin)
        await db.commit()
        logger.info(
            "Initial admin user created: email=admin@contenthub.local, password=%s",
            _DEFAULT_ADMIN_PASSWORD,
        )
    else:
        logger.debug("Admin user already exists: id=%s", existing_admin.id)

    # Step 2 — always run the backfill so phase_ac drift (or any future
    # migration that adds password_hash without backfilling) self-heals on
    # startup instead of locking the operator out.
    backfilled = await _backfill_missing_password_hashes(db)
    if backfilled > 0:
        logger.info(
            "Auth recovery: %d user(s) had NULL password_hash and were "
            "backfilled with default passwords.",
            backfilled,
        )
