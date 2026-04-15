"""
Ownership enforcement helpers — PHASE X (Ownership / Channel Auto-Import /
Project-Job Hierarchy Pack).

Tek otorite:
  - get_current_user_context(user) -> UserContext
  - is_admin(user) / is_admin_context(ctx)
  - ensure_owner_or_admin(user, resource_owner_id) -> 403 raise or return
  - apply_user_scope(stmt, model_cls, *, user_context, owner_field="user_id")

Tasarim kurallari:
  - Admin her zaman gecer; default deny icin `allow_admin=False` parametresi kullan.
  - Ownership her zaman backend'de enforce edilir. Client-side gizleme tek basina
    yeterli degildir.
  - `require_user` + `require_admin` ile paralel pattern degil, ustune ince bir
    sarmalayici; route seviyesinde FastAPI DI ile kullanilir.

Reuse:
  - `require_user` / `require_admin` / `get_current_user` zaten
    `app.auth.dependencies`'de. Bu modul onlarin uzerine ownership kapilarini
    ekler.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Sequence, TypeVar

from fastapi import Depends, HTTPException, status
from sqlalchemy import Select

from app.auth.dependencies import get_current_user, require_admin, require_user
from app.db.models import User

__all__ = [
    "UserContext",
    "is_admin",
    "is_admin_context",
    "get_current_user_context",
    "ensure_owner_or_admin",
    "apply_user_scope",
    "AdminOr",
    "OwnershipError",
]


# ---------------------------------------------------------------------------
# UserContext — ince immutable wrapper
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class UserContext:
    """Kimlik + yetki ozeti. Route/service katmaninda gecirilir."""

    user_id: str
    role: str
    is_admin_role: bool

    @property
    def is_admin(self) -> bool:  # convenience
        return self.is_admin_role


def _to_context(user: User) -> UserContext:
    role = (user.role or "user").strip().lower()
    return UserContext(
        user_id=str(user.id),
        role=role,
        is_admin_role=(role == "admin"),
    )


# ---------------------------------------------------------------------------
# FastAPI dependency — "authenticated + context" tek adres
# ---------------------------------------------------------------------------


async def get_current_user_context(
    user: User = Depends(get_current_user),
) -> UserContext:
    """Authenticated User -> UserContext (immutable)."""
    return _to_context(user)


def is_admin(user: User) -> bool:
    return (user.role or "user").strip().lower() == "admin"


def is_admin_context(ctx: UserContext) -> bool:
    return ctx.is_admin_role


# ---------------------------------------------------------------------------
# Ownership kapisi
# ---------------------------------------------------------------------------


class OwnershipError(HTTPException):
    """403 Forbidden — ownership ihlali."""

    def __init__(self, detail: str = "Bu kaynaga erisim yetkiniz yok"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def ensure_owner_or_admin(
    user: User | UserContext,
    resource_owner_id: Optional[str],
    *,
    allow_admin: bool = True,
    not_found_on_missing: bool = False,
    resource_label: str = "kaynak",
) -> None:
    """
    `resource_owner_id` None ise ve `not_found_on_missing=True` ise 404 firlatir
    (route kendi 404 uretecekse False birakilir; bu fonksiyon sadece
    ownership kapisidir).

    Admin (role=admin) `allow_admin=True` iken dogrudan gecer.
    """
    if resource_owner_id is None:
        if not_found_on_missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{resource_label} bulunamadi",
            )
        # owner_id bilinmiyorsa — caller bunu ele almali; enforce edemeyiz
        raise OwnershipError(
            f"{resource_label} icin sahiplik bilgisi yok; erisim reddedildi"
        )

    ctx = user if isinstance(user, UserContext) else _to_context(user)

    if allow_admin and ctx.is_admin_role:
        return

    if str(resource_owner_id) != ctx.user_id:
        raise OwnershipError(f"{resource_label}: baska kullanicinin kaynagi")

    return


# ---------------------------------------------------------------------------
# Query scoping
# ---------------------------------------------------------------------------

_T = TypeVar("_T")


def apply_user_scope(
    stmt: Select[_T],
    model_cls: Any,
    *,
    user_context: UserContext,
    owner_field: str = "user_id",
    bypass_for_admin: bool = True,
) -> Select[_T]:
    """
    Listeleme query'lerine ownership filtresi uygular.

    - Admin `bypass_for_admin=True` ise filtre EKLENMEZ (tum kayitlari gorur).
    - Non-admin icin `model_cls.<owner_field> == user_context.user_id` esitligi
      AND'lenir.
    - `owner_field` kolonu modelde yoksa AttributeError firlatilir (hata fail-fast;
      sessizce bypass edilmez).

    Kullanim:
        stmt = select(ContentProject)
        stmt = apply_user_scope(stmt, ContentProject, user_context=ctx)
    """
    if bypass_for_admin and user_context.is_admin_role:
        return stmt

    column = getattr(model_cls, owner_field, None)
    if column is None:
        raise AttributeError(
            f"apply_user_scope: {model_cls.__name__} icinde '{owner_field}' kolonu yok"
        )
    return stmt.where(column == user_context.user_id)


def apply_user_scope_multi(
    stmt: Select[_T],
    pairs: Sequence[tuple[Any, str]],
    *,
    user_context: UserContext,
    bypass_for_admin: bool = True,
) -> Select[_T]:
    """
    Birden cok model/owner_field cifti uygulanir (JOIN'li sorgularda).
    """
    if bypass_for_admin and user_context.is_admin_role:
        return stmt
    for model_cls, owner_field in pairs:
        column = getattr(model_cls, owner_field, None)
        if column is None:
            raise AttributeError(
                f"apply_user_scope_multi: {model_cls.__name__}.{owner_field} yok"
            )
        stmt = stmt.where(column == user_context.user_id)
    return stmt


# ---------------------------------------------------------------------------
# Compatibility export — "AdminOr(user)" syntactic sugar
# ---------------------------------------------------------------------------


class AdminOr:
    """Route decorator helper: AdminOr(require_user) pattern icin sentinel."""

    # Kullanim yeri yok su an; ileride genisletmek icin rezerv.
    pass


# Re-export for caller convenience
__all_deps__ = ("require_user", "require_admin", "get_current_user")
