# Ownership — PHASE X

> Her kullanıcı yalnız kendi kanallarını, projelerini, işlerini, yayın kayıtlarını ve
> analitiklerini görür. Admin her şeyi görür. Sahiplik **sunucu tarafında** zorlanır;
> istemci tarafında sahte gizleme tek başına yeterli değildir.

Bu doküman PHASE X kapsamında getirilen ownership sisteminin **tek otoritesini**
ve yeni route'ların nasıl entegre olacağını anlatır.

---

## 1. Tek Otorite

Tüm ownership kontrolü şu modülden gelir:

```
backend/app/auth/ownership.py
```

### Temel parçalar

| Parça | Görev |
|---|---|
| `UserContext` | `@dataclass(frozen=True)` — `user_id`, `role`, `is_admin_role` |
| `get_current_user_context` | FastAPI `Depends` — `get_current_user` üzerine `UserContext` sarmalayıcı |
| `is_admin(user)` / `is_admin_context(ctx)` | Rol kontrolü (sadece `role=="admin"`) |
| `ensure_owner_or_admin(user, resource_owner_id, ...)` | Detail/write endpoint'leri için 403 kapısı |
| `apply_user_scope(stmt, Model, *, user_context)` | List endpoint'leri için SELECT filtresi |
| `apply_user_scope_multi(stmt, pairs, *, user_context)` | JOIN'li list sorguları için çoklu filtre |

### Kurallar

1. **Admin her zaman geçer.** `allow_admin=False` parametresiyle default-deny istenebilir
   (şu an kullanılmıyor).
2. **Non-admin için sahiplik zorunludur.** `resource_owner_id != ctx.user_id` → 403.
3. **Owner ID yoksa** (`resource_owner_id is None`) fonksiyon **fail-fast**: ya 404
   (`not_found_on_missing=True`) ya 403. Sessizce bypass YOK.
4. **Apply-scope admin için filtre eklemez**; admin tüm kayıtları görür.

---

## 2. Route Entegrasyonu — Pattern

Her router endpoint'i `get_current_user_context`'i dependency olarak alır:

```python
from fastapi import APIRouter, Depends
from app.auth.ownership import (
    UserContext, get_current_user_context, ensure_owner_or_admin, apply_user_scope,
)

@router.get("/content-projects")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user_context),
):
    stmt = select(ContentProject)
    stmt = apply_user_scope(stmt, ContentProject, user_context=ctx)
    rows = (await db.execute(stmt)).scalars().all()
    return [to_read_model(r) for r in rows]


@router.get("/content-projects/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    ctx: UserContext = Depends(get_current_user_context),
):
    proj = await service.get_project(db, project_id)
    if proj is None:
        raise HTTPException(404, "Proje bulunamadi")
    ensure_owner_or_admin(ctx, proj.user_id, resource_label="content_project")
    return to_read_model(proj)
```

Write endpoint'leri (PATCH/PUT/DELETE) aynı `ensure_owner_or_admin` kontrolünden
geçer; create endpoint'leri `ctx.user_id`'yi `owner_id` olarak kaydeder.

---

## 3. Domain-Spesifik Yardımcılar

### 3.1 Publish ownership — `backend/app/publish/ownership.py`

`PublishRecord`'un kendi `owner_id` kolonu yoktur; sahiplik
`PublishRecord.job_id → Job.owner_id` üzerinden türetilir. Bu modül:

- `resolve_publish_record_owner_id(db, record)` — record + job join
- `ensure_publish_record_ownership(db, record, ctx)` — 403 kapısı
- `ensure_job_ownership / ensure_channel_profile_ownership / ensure_content_project_ownership / ensure_platform_connection_ownership`
- `apply_publish_user_scope(stmt, *, ctx)` — `Publish list` için `Job` join'li scope

Neden domain içinde: generic `apply_user_scope` bir kolon bekler. Publish için
ise JOIN gerekir. Kopya kod yerine domain-spesifik yardımcı tek yerde tutulur.

### 3.2 Analytics scope

Analytics sorguları `apply_user_scope`'u şu modeller üzerinden uygular:

- `Job.owner_id` (jobs, steps, publish_attempts üzerinden JOIN)
- `ContentProject.user_id` (project-level metrics)
- `ChannelProfile.user_id` (channel overview)

`/api/v1/analytics/*` endpoint'leri: admin → global; user → sadece kendi verisi.

---

## 4. Migration — `phase_x_001`

**Dosya:** `backend/alembic/versions/phase_x_001_ownership_channel_url_only.py`

- Additive-only (kolon ekleme).
- `Job.owner_id` `NULL` olan satırlar için backfill:
  `content_project_id → ContentProject.user_id` mapping.
- Backfill sonrası hâlâ `NULL` kalan orphan job'lar **non-admin için 403 döner**
  (kod katmanında enforce). Admin görmeye devam eder; manuel temizlik ayrı bir
  operator görevidir.
- Downgrade: kolon/index/constraint geri alınır (data kaybı yalnız yeni
  kolonlarda olur).

---

## 5. Test Katmanı

- `backend/tests/test_phase_x_ownership.py` — birim testler (context, ensure,
  apply_scope, cross-user 403, admin bypass, orphan job davranışı).
- Tüm mevcut `faz*` / `sprint*` test dosyaları PHASE X sonrası düzenlendi:
  - `admin_headers` / `user_headers` fixture'ları conftest'ten
  - Auth zorunlu endpoint'ler için explicit Bearer token
  - Anonim erişim beklenen testler `raw_client` fixture'ı (auto-admin fallback bypass)

---

## 6. Frontend Beklentisi

- Server-side filtreleme tek doğruluk. Frontend ayrıca "sadece benimkini göster"
  toggle'ı **KULLANMAZ**; veri zaten scope'lu gelir.
- Admin panel ve user panel ayrı route'lar: `/admin/*` vs `/user/*`. Panel
  switcher admin için görünür; rol claim'i üzerinden.

---

## 7. Nelerden Kaçındık

- **Client-side hiding** (sadece UI gizleme) — kabul edilmez. Server enforcement
  olmadan hiçbir gizleme yeterli değildir.
- **Paralel ownership pattern'leri** — her domain kendi `is_owner` helper'ını
  yazarsa drift başlar. Tek `auth/ownership.py` + bir publish yardımcısı.
- **Refactor-later kestirmeleri** — PHASE X'te ownership doğrudan tüm list/
  detail/write endpoint'lerinde uygulandı; "sonra eklerim" yok.
- **Hidden magic flags** — `allow_admin=False` explicit. Sessiz bypass yok.
