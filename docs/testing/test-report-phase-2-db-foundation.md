# Test Raporu — Phase 2: Backend Veritabanı Temeli

**Tarih:** 2026-04-01
**Faz:** 2 — Backend Veritabanı Temeli (SQLite + WAL + SQLAlchemy + Alembic)

---

## Özet

8 testin tamamı geçti. Veritabanı temeli çalışıyor olarak doğrulandı:
- SQLite DB `backend/data/contenthub.db` konumunda oluşturuldu
- Her bağlantıda WAL modu ve yabancı anahtar zorlama aktif
- Üç bootstrap tablosu Alembic migration ile oluşturuldu ve doğrulandı
- `AppState` modeli üzerinde yazma/okuma round-trip doğrulandı

---

## Test Çalıştırma

```
cd backend
.venv/bin/pytest tests/test_db_bootstrap.py tests/test_health.py -v
```

### Sonuçlar

```
platform darwin -- Python 3.9.6, pytest-8.4.2
plugins: anyio-4.12.1, asyncio-1.2.0
asyncio: mode=auto

tests/test_db_bootstrap.py::test_engine_connects              PASSED
tests/test_db_bootstrap.py::test_wal_mode_enabled             PASSED
tests/test_db_bootstrap.py::test_foreign_keys_enabled         PASSED
tests/test_db_bootstrap.py::test_foundation_tables_exist      PASSED
tests/test_db_bootstrap.py::test_session_factory_yields_session PASSED
tests/test_db_bootstrap.py::test_app_state_crud               PASSED
tests/test_health.py::test_health_returns_200                 PASSED
tests/test_health.py::test_health_response_shape              PASSED

8 passed in 0.14s
```

---

## Doğrulanan Noktalar

| Test | Doğrulama |
|------|-----------|
| `test_engine_connects` | Async engine bağlantı açıyor ve `SELECT 1` çalıştırıyor |
| `test_wal_mode_enabled` | `PRAGMA journal_mode` `wal` döndürüyor |
| `test_foreign_keys_enabled` | `PRAGMA foreign_keys` `1` döndürüyor |
| `test_foundation_tables_exist` | `app_state`, `audit_logs`, `users` tabloları mevcut |
| `test_session_factory_yields_session` | `AsyncSessionLocal` geçerli `AsyncSession` veriyor |
| `test_app_state_crud` | `AppState` satırı ekleme + okuma + silme temiz tamamlanıyor |
| `test_health_returns_200` | `/api/v1/health` 200 döndürmeye devam ediyor |
| `test_health_response_shape` | Health yanıtı `status` ve `app_name` içeriyor |

---

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `backend/pyproject.toml` | `sqlalchemy`, `aiosqlite`, `alembic`, `greenlet` bağımlılıkları eklendi |
| `backend/app/core/config.py` | `database_url` ve `database_url_sync` özellikleri eklendi |
| `backend/app/db/base.py` | `DeclarativeBase` oluşturuldu |
| `backend/app/db/models.py` | `AppState`, `AuditLog`, `User` modelleri oluşturuldu |
| `backend/app/db/session.py` | Event listener ile WAL + FK pragma'lı tam async engine |
| `backend/alembic.ini` | `alembic init` ile başlatıldı |
| `backend/alembic/env.py` | Uygulama ayarları ve model metadata kullanacak şekilde yeniden yazıldı |
| `backend/alembic/versions/e7dc18c0bcfb_initial_foundation_tables.py` | İlk otomatik oluşturulan migration |
| `backend/data/contenthub.db` | Migration ile oluşturuldu (commit edilmedi — gitignored) |
| `backend/tests/test_db_bootstrap.py` | Yeni test dosyası (6 async test) |

---

## Karşılaşılan Sorunlar

| Sorun | Çözüm |
|-------|-------|
| Python 3.9'da `setuptools.backends.legacy` bulunamadı | `build-backend` `setuptools.build_meta` olarak değiştirildi |
| Python 3.9 çalışma zamanında `str \| None` sözdizimini desteklemiyor | `from typing import Optional` ve `Mapped[Optional[str]]` kullanıldı |
| `sqlite3.OperationalError: unable to open database file` | `backend/data/` dizini oluşturuldu (alembic `backend/` üzerinden çalışır, göreceli yol buraya çözümlenir) |
| `ModuleNotFoundError: No module named 'greenlet'` | `greenlet>=3.0.0` pyproject.toml bağımlılıklarına eklendi |
| Düz `sqlite3` bağlantısıyla WAL modu görünmüyor | Async SQLAlchemy engine üzerinden doğrulandı — pragma event listener her bağlantıda doğru çalışıyor |

---

## Bilinen Kısıtlamalar / Ertelenenler

- `backend/data/` dizini, `backend/` üzerinden alembic çalıştırmadan önce var olmalıdır. Fresh checkout'ları yönetmek için `backend/data/.gitkeep` commit edildi.
- `greenlet` artık bir çalışma zamanı bağımlılığıdır (yalnızca dev değil) — SQLAlchemy async import sırasında bunu gerektirir.
- `AuditLog` ve `User` için model düzeyinde birim testi yok — tablo varlık kontrolüyle dolaylı olarak kapsanıyor. Tam CRUD testleri servis katmanları inşa edildiğinde eklenecek.

---

## Karar İzi

- SQLite için WAL modu seçildi: daha iyi eşzamanlı okuma performansı, yerel öncelikli uygulamalar için standart.
- Yabancı anahtar zorlama: SQLite'da varsayılan olarak devre dışı — her bağlantıda açıkça etkinleştirilmelidir.
- `aiosqlite` sürücüsü: SQLAlchemy 2.0 async API ile uyumlu tek async SQLite sürücüsü.
- Yalnızca üç bootstrap tablosu: domain modelleri (settings, jobs, templates vb.) `CLAUDE.md` fazlı teslim sırasına göre kendi fazlarına ertelendi.
