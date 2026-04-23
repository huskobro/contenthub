"""
Settings Seed — M10-C.

Startup'ta KNOWN_SETTINGS registry'sindeki tum ayarlari DB'ye seed eder.
Mevcut DB satirlarina dokunmaz — sadece eksik key'ler icin yeni satir olusturur.

Bu modul:
  - settings_resolver.KNOWN_SETTINGS'i kaynak olarak kullanir
  - Her key icin DB'de satir yoksa olusturur
  - Mevcut satirlari degistirmez (admin_value korunur)
  - Idempotent: tekrar calistirma guvenlidir
"""

import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Setting
from app.settings.settings_resolver import KNOWN_SETTINGS, KNOWN_VALIDATION_RULES

logger = logging.getLogger(__name__)


async def seed_known_settings(db: AsyncSession) -> int:
    """
    KNOWN_SETTINGS'teki tum key'ler icin DB'de satir yoksa olusturur.

    Returns:
        Olusturulan yeni satir sayisi.
    """
    created = 0

    for key, meta in KNOWN_SETTINGS.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        existing = result.scalar_one_or_none()

        if existing is not None:
            continue

        # Builtin default'u JSON olarak encode et
        builtin = meta.get("builtin_default")
        default_json = json.dumps(builtin) if builtin is not None else "null"

        # Group name — credential key'leri icin "credentials", digerleri meta'dan
        group_name = meta.get("group", "general")

        row = Setting(
            key=key,
            group_name=group_name,
            type=meta.get("type", "string"),
            default_value_json=default_json,
            admin_value_json="null",
            user_override_allowed=bool(meta.get("user_override_allowed", False)),
            visible_to_user=bool(meta.get("visible_to_user", False)),
            visible_in_wizard=bool(meta.get("visible_in_wizard", False)),
            read_only_for_user=bool(meta.get("read_only_for_user", True)),
            module_scope=meta.get("module_scope"),
            help_text=meta.get("help_text", ""),
            validation_rules_json=KNOWN_VALIDATION_RULES.get(key, "{}"),
            status="active",
        )
        db.add(row)
        created += 1
        logger.debug("Settings seed: yeni satir olusturuldu — %s", key)

    if created > 0:
        await db.commit()

    return created


async def sync_default_values_from_registry(db: AsyncSession) -> int:
    """
    KNOWN_SETTINGS meta'sindaki `builtin_default` degerini mevcut DB satirlarina
    yansitir. Urun evrildikce bir setting'in builtin default'u degisebilir
    (ornek: 'ui.surface.aurora.enabled' false iken Aurora-only gecisten
    sonra true olmali). Bu senkronizasyon mevcut kurulumlarin da yeni
    default'u gormesini saglar.

    Kural: admin_value_json (operator override) ASLA degistirilmez; yalnizca
    default_value_json guncellenir. Idempotent — sonraki cagrilarda fark
    yoksa hiçbir sey yazmaz.

    Returns:
        Guncellenen satir sayisi.
    """
    updated = 0

    for key, meta in KNOWN_SETTINGS.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        if row is None:
            continue

        builtin = meta.get("builtin_default")
        desired = json.dumps(builtin) if builtin is not None else "null"
        if row.default_value_json != desired:
            row.default_value_json = desired
            row.version = (row.version or 1) + 1
            updated += 1
            logger.info(
                "Settings sync: default_value guncellendi — %s -> %s",
                key,
                desired,
            )

    if updated > 0:
        await db.commit()

    return updated


async def mark_orphan_settings(db: AsyncSession) -> dict[str, int]:
    """
    Phase AM-4 drift repair — identify DB rows that are no longer present in
    KNOWN_SETTINGS and mark them ``status='orphan'`` so the resolver and the
    ``visible_to_user_only`` filter can exclude them.

    Why this exists:
        The earlier sync functions (``sync_default_values_from_registry`` and
        ``sync_visibility_flags_from_registry``) iterate KNOWN_SETTINGS and
        update matching rows. Rows whose key is no longer in the registry
        (renamed, deprecated, or leftover test seeds) were never touched and
        kept their original ``visible_to_user`` flag. Phase AL audit caught
        this: the UI was listing four stale ``workspace``/``execution`` keys
        that no longer exist in the registry, hiding the 16 keys the registry
        currently marks as user-visible.

    Contract:
        - non-destructive: rows keep their data and can be restored by simply
          re-adding the key to KNOWN_SETTINGS (the next startup's
          ``mark_orphan_settings`` run will revert them back to active only
          if the key reappears, via the reverse branch below).
        - admin-soft-deleted rows (``status='deleted'``) are left alone;
          orphan marker only rewrites rows currently in ``active`` status.
        - rows previously marked orphan are re-activated if the key reappears
          in KNOWN_SETTINGS.
        - returns a small telemetry dict the startup logger prints.

    Returns:
        {"marked_orphan": N, "reactivated": M}
    """
    result = await db.execute(select(Setting))
    rows = list(result.scalars().all())
    known_keys = set(KNOWN_SETTINGS.keys())

    marked_orphan = 0
    reactivated = 0

    for row in rows:
        if row.key in known_keys:
            # Key is back in the registry — if we had previously marked it
            # orphan, bring it back to active. We deliberately do NOT touch
            # rows admin-soft-deleted ('deleted').
            if row.status == "orphan":
                row.status = "active"
                reactivated += 1
            continue

        # Key is missing from registry.
        if row.status == "active":
            row.status = "orphan"
            marked_orphan += 1

    if marked_orphan or reactivated:
        await db.commit()
        logger.info(
            "Settings drift repair: marked_orphan=%d reactivated=%d",
            marked_orphan,
            reactivated,
        )

    return {"marked_orphan": marked_orphan, "reactivated": reactivated}


def compute_drift_report(rows: list[Setting]) -> dict:
    """
    Pure computation — take the current ``settings`` table rows and return the
    seven Phase AL audit counts plus the orphan/missing key lists, so the
    admin UI (and tests) can see drift live without guessing.

    All heavy lifting (DB I/O) is done by the caller; this function is a plain
    reducer, which makes it trivial to unit-test.
    """
    registry_total = len(KNOWN_SETTINGS)
    registry_visible = sum(
        1 for m in KNOWN_SETTINGS.values() if m.get("visible_to_user")
    )
    registry_visible_keys = {
        k for k, m in KNOWN_SETTINGS.items() if m.get("visible_to_user")
    }

    db_total = len(rows)
    db_keys = {row.key for row in rows}
    db_visible_rows = [r for r in rows if r.visible_to_user and r.status == "active"]
    db_visible_total = len(db_visible_rows)
    db_visible_keys = {r.key for r in db_visible_rows}

    orphan_keys = sorted(k for k in db_keys if k not in KNOWN_SETTINGS)
    missing_keys = sorted(k for k in KNOWN_SETTINGS if k not in db_keys)

    # Keys the registry says should be visible, but which are either missing
    # from DB or currently hidden for some reason. These are the most
    # actionable items for an admin to inspect.
    visible_but_hidden_keys = sorted(
        k
        for k in registry_visible_keys
        if k not in db_visible_keys
    )

    return {
        "registry_total": registry_total,
        "registry_visible": registry_visible,
        "db_total": db_total,
        "db_active_total": sum(1 for r in rows if r.status == "active"),
        "db_visible_total": db_visible_total,
        "orphan_count": len(orphan_keys),
        "missing_count": len(missing_keys),
        "orphan_keys": orphan_keys,
        "missing_keys": missing_keys,
        "visible_but_hidden_keys": visible_but_hidden_keys,
    }


async def sync_visibility_flags_from_registry(db: AsyncSession) -> int:
    """
    KNOWN_SETTINGS meta'sindaki visibility bayraklarini (visible_to_user,
    user_override_allowed, visible_in_wizard, read_only_for_user) mevcut DB
    satirlarina senkronize eder.

    Kural: admin override'i (admin_value_json) ASLA degistirilmez; sadece
    visibility metadatalari guncellenir. Idempotent.

    Returns:
        Guncellenen satir sayisi.
    """
    updated = 0

    for key, meta in KNOWN_SETTINGS.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        row = result.scalar_one_or_none()
        if row is None:
            continue

        desired = {
            "visible_to_user": bool(meta.get("visible_to_user", False)),
            "user_override_allowed": bool(meta.get("user_override_allowed", False)),
            "visible_in_wizard": bool(meta.get("visible_in_wizard", False)),
            "read_only_for_user": bool(meta.get("read_only_for_user", True)),
        }
        changed = False
        for attr, target in desired.items():
            if getattr(row, attr) != target:
                setattr(row, attr, target)
                changed = True
        if changed:
            updated += 1
            logger.debug(
                "Settings sync: visibility metadata guncellendi — %s", key
            )

    if updated > 0:
        await db.commit()

    return updated
