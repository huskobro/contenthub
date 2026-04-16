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
    (ornek: 'ui.surface.canvas.enabled' false iken Faz 3 teslim edildikten
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
