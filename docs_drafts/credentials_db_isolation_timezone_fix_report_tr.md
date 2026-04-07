# Credential DB Izolasyonu, YouTube Client ID Normalize ve UTC+3 Raporu

## 1. Root Cause Analizi

### YouTube Client ID Suffix Sorunu
- `_normalize_credential_value()` fonksiyonu `.apps.googleusercontent.com` suffix'ini **save sırasında siliyordu**
- Ancak **read/display tarafında** normalize uygulanmıyordu
- `get_credential_status()` maskeleme yaparken ham DB değerini kullanıyordu
- Sonuc: UI'da suffix gorunmeye devam ediyordu

### Test → Production DB Sızıntısı
- `app/db/session.py` modül yüklenme zamanında production engine oluşturuyordu
- Test dosyaları `from app.db.session import AsyncSessionLocal` ile bu referansı doğrudan alıyordu
- `conftest.py`'deki `dependency_overrides[get_db]` sadece FastAPI endpoint'leri için çalışıyordu
- Kendi `client` fixture'ını tanımlayan test dosyaları override'ı bypass ediyordu
- `AsyncSessionLocal` doğrudan kullanan testler (16+ dosya) her zaman production DB'ye yazıyordu
- Python'da `from module import name` ile alınan referans, modül attribute değiştiğinde güncellenmez — bu yüzden monkeypatch işe yaramıyordu

### UTC+3 Timezone
- `KNOWN_SETTINGS` zaten `Europe/Istanbul` builtin_default içeriyordu
- `formatDate.ts` helper zaten localStorage fallback olarak `Europe/Istanbul` kullanıyordu
- Ancak 10+ dosya inline `toLocaleDateString("tr-TR")` kullanıyordu — bu çağrılar `timeZone` parametresi içermiyordu, tarayıcı yerel saatini kullanıyordu

## 2. YouTube Client ID Neden Hala Suffix'li Gorunuyordu

`get_credential_status()` fonksiyonu `_parse_admin_value()` ile ham değeri okuyup doğrudan `_mask_value()` çağırıyordu. Normalize sadece `save_credential()` içinde uygulanıyordu. Eğer DB'de eski suffix'li değer varsa veya `.env`'den suffix'li geliyorsa, maskeleme ve API yanıtı eski değeri gösteriyordu.

## 3. Testler Production DB'ye Nasıl Sızıyordu

`app/db/session.py`:
```python
# Modül yüklenme zamanında production engine oluşturulur
engine = create_async_engine(settings.database_url, ...)
AsyncSessionLocal = async_sessionmaker(engine, ...)
```

Test dosyaları:
```python
# Bu referans doğrudan production engine'e bağlı
from app.db.session import AsyncSessionLocal

async with AsyncSessionLocal() as session:
    session.add(...)  # Production DB'ye yazıyor!
    await session.commit()
```

16+ test dosyası bu pattern'ı kullanıyordu:
- test_m10_settings_resolver.py (kendi client fixture + create_tables)
- test_m16_provider_analytics.py (kendi client + AsyncSessionLocal)
- test_m15_audit_log.py, test_m16_audit_hardening.py
- test_m7_c1_publish_state_machine.py
- test_m8_c1_analytics_backend.py
- test_m14_youtube_analytics.py
- ve diğerleri

## 4. Değişen Dosyalar

### Backend
| Dosya | Değişiklik |
|-------|-----------|
| `app/db/session.py` | **Tamamen yeniden yazıldı**: `_EngineHolder` container + `_SessionLocalProxy` proxy pattern. `override_engine()` fonksiyonu eklendi. `from app.db.session import AsyncSessionLocal` ile alınan referanslar bile override'ı görür. |
| `app/settings/credential_resolver.py` | `_normalize_credential_value()`: suffix silme korundu. `expand_youtube_client_id()`: OAuth çağrıları için suffix geri ekler. `get_credential_status()`: read tarafında da normalize uygulanır. |
| `app/publish/youtube/router.py` | `expand_youtube_client_id` import edildi. auth-url ve auth-callback endpoint'lerinde client_id'ye suffix ekleniyor. Scope kontrolü ve uyarı mesajları. |
| `app/publish/youtube/token_store.py` | `has_required_scope()`: split-based scope kontrolü (substring match yerine). Token exchange loglama eklendi. |
| `tests/conftest.py` | `override_engine(test_engine)` çağrısı ile tüm testleri in-memory DB'ye zorlar. |
| `tests/test_m7_c2_youtube_adapter.py` | Scope assertion güncellendi: `youtube.upload` → `auth%2Fyoutube` |
| `tests/test_m14_youtube_analytics.py` | `db_session` fixture kullanımı |

### Frontend
| Dosya | Değişiklik |
|-------|-----------|
| `src/lib/formatDate.ts` | Değişiklik yok — zaten Europe/Istanbul fallback |
| `src/api/credentialsApi.ts` | `scope_ok: boolean` eklendi |
| `src/components/settings/YouTubeOAuthSection.tsx` | Scope uyarı badge ve mesaj |
| `src/pages/admin/YouTubeAnalyticsPage.tsx` | Scope kontrolü, `formatDateShort` kullanımı |
| `src/pages/admin/YouTubeCallbackPage.tsx` | `scope_warning` status kontrolü |
| `src/pages/admin/ContentLibraryPage.tsx` | `formatDateShort` kullanımı |
| `src/pages/admin/PublishCenterPage.tsx` | `formatDateShort` kullanımı |
| `src/pages/admin/PublishDetailPage.tsx` | `formatDateTime` kullanımı |
| `src/pages/admin/AssetLibraryPage.tsx` | `formatDateShort` kullanımı |
| `src/pages/admin/AnalyticsOverviewPage.tsx` | `formatDateShort` kullanımı |
| `src/pages/admin/NewsBulletinDetailPage.tsx` | `formatDateShort` kullanımı |
| `src/components/quicklook/ContentQuickLookContent.tsx` | `formatDateShort` |
| `src/components/quicklook/AssetQuickLookContent.tsx` | `formatDateShort` |
| `src/components/design-system/NotificationCenter.tsx` | `formatDateShort` |
| `src/components/settings/ApiKeyField.tsx` | `formatDateShort` |

## 5. Eski Bozuk Veriler Nasıl Temizlendi

- DB'deki `credential.youtube_client_id` zaten kısa formda (önceki düzeltmede temizlenmişti)
- `get_credential_status()` read tarafında da `_normalize_credential_value()` çağırıyor — eski suffix'li değer olsa bile UI'da temiz görünür
- `resolve_credential()` ham değer döner, OAuth router `expand_youtube_client_id()` ile suffix ekler — Google API her zaman tam format alır

## 6. UTC+3 Varsayılan Davranışı

- Backend: `KNOWN_SETTINGS["ui.timezone"].builtin_default = "Europe/Istanbul"` (zaten mevcuttu)
- Frontend: `formatDate.ts` → `getTimezone()` → localStorage `"ui.timezone"` || `"Europe/Istanbul"`
- Tüm tarih/saat yüzeyleri merkezi `formatDateShort`/`formatDateTime` helper'ına yönlendirildi
- 11 dosyadaki inline `toLocaleDateString("tr-TR")` çağrıları kaldırıldı
- Artık tüm tarih gösterimleri `timeZone: "Europe/Istanbul"` parametresi ile çalışır

## 7. Çalıştırılan Testler

```
Backend: 1429 passed, 0 failed, 1 warning (migration testi hariç — Alembic'e özel)
Frontend: tsc --noEmit → temiz (0 hata)
```

## 8. Production DB Koruması Doğrulaması

Full test suite öncesi ve sonrası credential fingerprint karşılaştırması:
```
BEFORE: 7e61d8eaab5bb48be55442054dbd4804
AFTER:  7e61d8eaab5bb48be55442054dbd4804
```
Hiçbir credential değeri değişmedi.

### Koruma mekanizması
- `session.py` → `_SessionLocalProxy`: tüm `AsyncSessionLocal()` çağrıları `_holder.session_factory` üzerinden geçer
- `conftest.py` → `override_engine(test_engine)`: session-scoped autouse fixture
- Herhangi bir test dosyası `from app.db.session import AsyncSessionLocal` yapsa bile in-memory engine kullanılır
- Kendi client fixture tanımlayan testler de etkilenir — çünkü override modül düzeyinde

## 9. Kalan Riskler

- `test_m7_c1_migration_fresh_db.py`: Alembic migration testleri kendi dosya tabanlı SQLite kullanıyor. Bu testler hâlâ ERROR veriyor — ayrı bir sorun, DB izolasyonuyla ilgisi yok.
- Kullanıcının test sırasında sıfırlanan gerçek API key'leri (pexels, kie_ai, openai) → kullanıcının kendisi yeniden girmeli.

## 10. Commit ve Push

Commit oluşturulacak.
