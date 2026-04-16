# ContentProject Model Update (PHASE AG)

Durum: **Aktif**. `module_type` zorunluluğu kaldırıldı.

## Değişiklikler

### Tablo

```sql
-- ÖNCE (pre-PHASE AG)
content_projects.module_type  VARCHAR(100)  NOT NULL

-- SONRA (PHASE AG)
content_projects.module_type  VARCHAR(100)  NULL
```

### Migration

`backend/alembic/versions/phase_ag_001_content_project_multi_module.py`

```python
revision = "phase_ag_001"
down_revision = "phase_ac_001"

def upgrade():
    with op.batch_alter_table("content_projects") as batch:
        batch.alter_column(
            "module_type",
            existing_type=sa.String(length=100),
            nullable=True,
        )

def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE content_projects SET module_type = 'legacy' "
        "WHERE module_type IS NULL"
    ))
    with op.batch_alter_table("content_projects") as batch:
        batch.alter_column(
            "module_type",
            existing_type=sa.String(length=100),
            nullable=False,
        )
```

Migration reversible:
- forward: NOT NULL → NULL
- backward: NULL kayıtları `'legacy'` olarak doldur, sonra NOT NULL geri getir

### SQLAlchemy Model

```python
# backend/app/db/models.py
class ContentProject(Base):
    ...
    module_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
```

Önceden `Mapped[str]` + `nullable=False`. Test harness'i
`Base.metadata.create_all` üzerinden DB kurduğu için model
metadata'sının migration ile tutarlı olması zorunlu.

### Pydantic Şeması

```python
# backend/app/content_projects/schemas.py
MIXED_PROJECT_MODULE_TYPE = "mixed"

class ContentProjectCreate(BaseModel):
    ...
    module_type: Optional[str] = Field(None, max_length=100)

class ContentProjectResponse(BaseModel):
    ...
    module_type: Optional[str] = None
```

Service katmanında fallback:
```python
# backend/app/content_projects/service.py
effective_module_type = (
    payload.module_type or MIXED_PROJECT_MODULE_TYPE
).strip()
```

Bu sayede `null`, `""`, `"  "` hepsinin sonunda DB'ye `"mixed"` yazılır;
ama response katmanı saf değeri (null/somut) aynen döner — frontend'de
null-safe helper'lar karma/legacy ayrımı yapar.

## Veri Migrasyonu

Mevcut prod/dev DB kayıtları **değişmez**. Eski projelerin `module_type`
değeri (somut modül ismi) aynı kalır. Migrasyon tamamen şema düzeyinde:
sadece NOT NULL constraint kaldırılır. Uzun vadede admin eliyle eski
projeler `"mixed"` olarak güncellenebilir, ama zorunlu değil.

## Örnekler

### Yeni karma proje
```json
POST /api/v1/content-projects
{
  "user_id": "...",
  "channel_profile_id": "...",
  "title": "Kanal ana konteyneri"
  // module_type yok
}

// Response
{
  "id": "...",
  "module_type": "mixed",
  ...
}
```

### Legacy proje (eski kayıt)
```json
GET /api/v1/content-projects/<id>

{
  "id": "...",
  "module_type": "standard_video",  // değişmedi
  ...
}
```

### Frontend görünüm

- Karma: "Karma (modül-üstü)"
- Legacy: "Standart Video (legacy)"

## İlgili Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `backend/alembic/versions/phase_ag_001_...py` | Yeni migration |
| `backend/app/db/models.py` | `Optional[str]` + `nullable=True` |
| `backend/app/content_projects/schemas.py` | `Optional` + `MIXED_PROJECT_MODULE_TYPE` |
| `backend/app/content_projects/service.py` | Fallback `"mixed"` |
| `backend/app/full_auto/service.py` | Karma proje violation |
| `backend/app/jobs/router.py` | Orphan job 422 guard |
| `backend/tests/test_phase_ag_multi_module_project.py` | 11 test |
| `backend/tests/test_m7_c1_migration_fresh_db.py` | `ALEMBIC_TARGET = "phase_ag_001"` |
