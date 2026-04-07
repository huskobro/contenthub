"""
User service — M40.

Business logic for user CRUD and user setting overrides.
"""

import json
import logging
from typing import Optional

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, UserSettingOverride, Setting
from app.users.schemas import UserCreate, UserUpdate
from app.users.slugify import slugify, make_unique_slug

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

async def list_users(db: AsyncSession) -> list[dict]:
    """List all users with override counts."""
    # Subquery for override counts
    override_count_sq = (
        select(
            UserSettingOverride.user_id,
            func.count(UserSettingOverride.id).label("cnt"),
        )
        .group_by(UserSettingOverride.user_id)
        .subquery()
    )

    stmt = (
        select(User, func.coalesce(override_count_sq.c.cnt, 0).label("override_count"))
        .outerjoin(override_count_sq, User.id == override_count_sq.c.user_id)
        .order_by(User.created_at.asc())
    )
    rows = (await db.execute(stmt)).all()

    result = []
    for user, cnt in rows:
        d = _user_to_dict(user)
        d["override_count"] = cnt
        result.append(d)
    return result


async def get_user(db: AsyncSession, user_id: str) -> Optional[dict]:
    """Get a single user by ID."""
    user = await db.get(User, user_id)
    if not user:
        return None
    # Count overrides
    cnt_stmt = select(func.count(UserSettingOverride.id)).where(
        UserSettingOverride.user_id == user_id
    )
    cnt = (await db.execute(cnt_stmt)).scalar() or 0
    d = _user_to_dict(user)
    d["override_count"] = cnt
    return d


async def create_user(db: AsyncSession, payload: UserCreate) -> dict:
    """Create a new user with auto-generated slug."""
    # Generate unique slug
    base_slug = slugify(payload.display_name)
    existing = set(
        row[0]
        for row in (await db.execute(select(User.slug))).all()
        if row[0] is not None
    )
    slug = make_unique_slug(base_slug, existing)

    user = User(
        email=payload.email,
        display_name=payload.display_name,
        slug=slug,
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("User created: id=%s slug=%s email=%s", user.id, user.slug, user.email)

    d = _user_to_dict(user)
    d["override_count"] = 0
    return d


async def update_user(db: AsyncSession, user_id: str, payload: UserUpdate) -> Optional[dict]:
    """Partial update a user. Re-slugs if display_name changes."""
    user = await db.get(User, user_id)
    if not user:
        return None

    if payload.display_name is not None and payload.display_name != user.display_name:
        user.display_name = payload.display_name
        base_slug = slugify(payload.display_name)
        existing = set(
            row[0]
            for row in (await db.execute(select(User.slug).where(User.id != user_id))).all()
            if row[0] is not None
        )
        user.slug = make_unique_slug(base_slug, existing)

    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status

    await db.commit()
    await db.refresh(user)

    return await get_user(db, user_id)


async def delete_user(db: AsyncSession, user_id: str) -> Optional[dict]:
    """Soft-delete: set status='inactive'."""
    user = await db.get(User, user_id)
    if not user:
        return None
    user.status = "inactive"
    await db.commit()
    await db.refresh(user)
    return await get_user(db, user_id)


# ---------------------------------------------------------------------------
# User Setting Overrides
# ---------------------------------------------------------------------------

async def list_user_overrides(db: AsyncSession, user_id: str) -> list[dict]:
    """List all setting overrides for a user."""
    stmt = (
        select(UserSettingOverride)
        .where(UserSettingOverride.user_id == user_id)
        .order_by(UserSettingOverride.setting_key.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_override_to_dict(r) for r in rows]


async def set_user_override(
    db: AsyncSession, user_id: str, setting_key: str, value: object
) -> dict:
    """Set or update a user's override for a setting.

    Validates:
    - User exists and is active
    - Setting exists and has user_override_allowed=True
    """
    # Validate user
    user = await db.get(User, user_id)
    if not user or user.status != "active":
        raise ValueError("User not found or inactive.")

    # Validate setting allows override
    setting_stmt = select(Setting).where(Setting.key == setting_key)
    setting = (await db.execute(setting_stmt)).scalar_one_or_none()
    if not setting:
        raise ValueError(f"Setting '{setting_key}' not found.")
    if not setting.user_override_allowed:
        raise ValueError(f"Setting '{setting_key}' does not allow user overrides.")

    value_json = json.dumps(value)

    # Upsert
    stmt = select(UserSettingOverride).where(
        UserSettingOverride.user_id == user_id,
        UserSettingOverride.setting_key == setting_key,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()

    if existing:
        existing.value_json = value_json
        await db.commit()
        await db.refresh(existing)
        return _override_to_dict(existing)
    else:
        override = UserSettingOverride(
            user_id=user_id,
            setting_key=setting_key,
            value_json=value_json,
        )
        db.add(override)
        await db.commit()
        await db.refresh(override)
        return _override_to_dict(override)


async def delete_user_override(
    db: AsyncSession, user_id: str, setting_key: str
) -> bool:
    """Remove a user's override for a setting. Returns True if deleted."""
    stmt = delete(UserSettingOverride).where(
        UserSettingOverride.user_id == user_id,
        UserSettingOverride.setting_key == setting_key,
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "slug": user.slug or "",
        "role": user.role,
        "status": user.status,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _override_to_dict(o: UserSettingOverride) -> dict:
    return {
        "id": o.id,
        "user_id": o.user_id,
        "setting_key": o.setting_key,
        "value_json": o.value_json,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
    }
