# Sprint 2 — Integration Polish + Auth UX + Logging Hardening Report

**Tarih:** 2026-04-09
**Scope:** Release-blocker seviyesindeki entegrasyon/polish açıkları

---

## 1. Executive Summary

Sprint 1 auth hardening sonrası oluşan kırılmaları temizledik, frontend 401 auto-refresh mekanizması kurduk, hata UX'ini farklılaştırdık, sessiz exception yutmayı loglamaya çevirdik ve queued job recovery ekledik.

**Sonuç:** 96 failing test → 1 (pre-existing), tüm Sprint 2 hedefleri tamamlandı.

---

## 2. Router Auth Coverage Sonucu

### Guard Dağılımı (43 router)

| Seviye | Router Sayısı | Örnekler |
|--------|---------------|----------|
| `require_admin` | 3 | users, fs, prompt_assembly |
| `require_user` | 15 | comments, playlists, posts, calendar, notifications, automation, channels, platform_connections, content_projects, engagement, brand_profiles, operations_inbox, wizard_configs |
| `require_visible` | 21 | settings, jobs, templates, sources, publish, analytics, audit_logs, modules, news_bulletin, style_blueprints, vb. |
| Public (tasarım gereği) | 4 | health, auth, sse (localhost-only), youtube_oauth |

### Kalan Bilinen Limitasyonlar
- **SSE router:** Auth yok — localhost-only MVP kararı, dokümante edildi
- **YouTube OAuth router:** Admin-only kısıtlama henüz eklenmedi — Publish Center hardening'de ele alınacak
- **Visibility `/resolve` endpoint:** Router-level guard yok, endpoint-level `require_visible` kullanıyor

---

## 3. Test Fix'leri Nasıl Yapıldı

### Strateji
1. `conftest.py`'ye merkezi auth fixture'ları eklendi:
   - `admin_user` / `regular_user` — DB'de test kullanıcısı oluşturur
   - `admin_headers` / `user_headers` — JWT Bearer token içeren header dict döner
2. Tüm API test dosyaları fixture parametresi + `headers=` parametresi ile güncellendi

### Kategori Bazında Fix'ler

| Kategori | Dosya Sayısı | Yapılan |
|----------|-------------|---------|
| sqlite3 → test_engine (table_exists) | 11 | SQLAlchemy inspector'a geçirildi |
| Production engine → test_engine | 6 | `test_engine` fixture parametresi eklendi |
| Auth header eksik (user) | 12 | `user_headers` fixture + headers eklendi |
| Auth header eksik (admin) | 3 | `admin_headers` fixture + headers eklendi |
| Settings role header | 2 | `X-ContentHub-Role: admin` header eklendi |
| JWT auth migration (faz17/17a) | 2 | `X-ContentHub-User-Id` → JWT Bearer |
| Recovery test mock update | 6 | 3. execute call (queued) için empty mock eklendi |

---

## 4. 401 Auto-Refresh Nasıl Kuruldu

**Dosya:** `frontend/src/api/client.ts`

### Mekanizma
1. `request()` ve `requestNullable()` fonksiyonlarında 401 response interceptor
2. 401 gelince `tryRefreshAndRetry()` çağrılır:
   - localStorage'dan refresh token alınır
   - `/api/v1/auth/refresh` endpoint'ine POST yapılır
   - Başarılıysa: yeni access/refresh token localStorage'a yazılır, orijinal request retry edilir
   - Başarısızsa: `forceLogout()` — tüm auth storage temizlenir, `/login`'e redirect
3. Concurrent refresh prevention: `_isRefreshing` flag + shared `_refreshPromise`
4. Max 1 retry per request — sonsuz loop koruması

### Edge Case'ler
- Refresh token yoksa → direkt logout
- Refresh sırasında ikinci 401 → bekle, retry
- Login sayfasındayken redirect yapma

---

## 5. Error UX Differentiation Nasıl Yapıldı

### Yeni Dosyalar
- `frontend/src/lib/errorUtils.ts` — Error classification utility
- `frontend/src/hooks/useApiError.ts` — React hook for classified error toasts

### Hata Kategorileri

| Status | Kategori | Başlık (TR) | Retryable |
|--------|----------|-------------|-----------|
| 401 | auth | Oturum süresi doldu | ✗ |
| 403 | forbidden | Yetki hatası | ✗ |
| 404 | not_found | Bulunamadı | ✗ |
| 409 | conflict | İşlem çakışması | ✗ |
| 422 | validation | Geçersiz veri | ✗ |
| 503 | provider | Servis kullanılamıyor | ✓ |
| 500+ | system | Sistem hatası | ✓ |
| Network | system | Bağlantı hatası | ✓ |

### Kullanım
```tsx
const handleError = useApiError();
useMutation({ onError: handleError });
```

---

## 6. Logging Hardening Nasıl Yapıldı

### Değişiklik Özeti

| Dosya | Instance | Eski | Yeni |
|-------|----------|------|------|
| `jobs/pipeline.py` | 8 | `except Exception: pass` | `logger.warning("Audit log write failed (%s): %s", action, exc)` |
| `publish/service.py` | 1 | `except Exception: pass` | `logger.warning(...)` |
| `publish/scheduler.py` | 1 | `except Exception: pass` | `logger.warning(...)` |
| `source_scans/scheduler.py` | 1 | `except Exception: pass` | `logger.warning(...)` |
| `jobs/router.py` | 1 | `except Exception: pass` | `logger.warning(...)` |
| `jobs/retry_scheduler.py` | 1 | `except Exception: pass` | `logger.warning(...)` |
| `publish/youtube/adapter.py` | 1 | `except Exception: return "unknown"` | `logger.warning(...); return "unknown"` |
| `providers/tts/edge_tts_provider.py` | 1 | `except Exception: pass` | `logger.debug(...)` (beklenen fallback) |
| `modules/shared_helpers.py` | 1 | `except Exception: pass` | `logger.debug(...)` (beklenen fallback) |
| `discovery/service.py` | 1 | `except Exception: pass` | `logger.warning(...)` |

**Toplam:** 17 sessiz exception → anlamlı log'a dönüştürüldü

---

## 7. Queued/Stuck Job Recovery Nasıl Gelişti

### Önceki Durum
- Sadece `status='running'` job'lar taranıyordu
- `status='queued'` job'lar sonsuza kadar bekleyebiliyordu

### Yeni Durum
- `run_startup_recovery()` artık queued job'ları da tarıyor
- Queued stale threshold: 30 dakika (running'den ayrı, daha uzun grace period)
- Stale queued job'lar **fail edilmiyor** — sadece loglanıyor ve RecoverySummary'de raporlanıyor
- Operator'a "manual retry or cancellation" önerisi

### RecoverySummary Yeni Alanları
```python
stale_queued_jobs: int = 0
stale_queued_job_ids: list[str] = field(default_factory=list)
```

---

## 8. Değişen Dosyalar

### Backend
- `tests/conftest.py` — Auth fixtures eklendi
- `tests/test_sprint2_integration_polish.py` — 10 Sprint 2 test (YENİ)
- `tests/test_m1_c4_timing_recovery.py` — Mock side_effects güncellendi
- `tests/test_faz7_comments.py` — Auth headers eklendi
- `tests/test_faz8_playlists.py` — Auth headers eklendi
- `tests/test_faz9_posts.py` — Auth headers eklendi
- `tests/test_faz13_automation_policy_inbox.py` — Auth headers eklendi
- `tests/test_faz14_calendar.py` — Auth headers eklendi
- `tests/test_faz15_event_hooks.py` — Auth headers eklendi
- `tests/test_faz16_notifications.py` — Auth headers eklendi
- `tests/test_faz16a_notification_closure.py` — Auth headers eklendi
- `tests/test_faz17_connection_center.py` — JWT auth'a geçirildi
- `tests/test_faz17a_capability_guard.py` — JWT auth'a geçirildi
- `tests/test_sprint1_hardening.py` — DB isolation fix
- `tests/test_prompt_assembly_api.py` — Admin headers eklendi
- `tests/test_settings_api.py` — Admin role header eklendi
- `tests/test_m10_settings_resolver.py` — Admin role header eklendi
- 16x `test_*_api.py` — table_exists test'leri test_engine'e geçirildi
- `app/jobs/pipeline.py` — 8 audit log `pass` → `logger.warning`
- `app/jobs/router.py` — Logger eklendi, audit `pass` → `logger.warning`
- `app/jobs/retry_scheduler.py` — Audit `pass` → `logger.warning`
- `app/jobs/recovery.py` — Queued job staleness check eklendi
- `app/publish/service.py` — JSON parse `pass` → `logger.warning`
- `app/publish/scheduler.py` — Audit `pass` → `logger.warning`
- `app/publish/youtube/adapter.py` — Error parse `pass` → `logger.warning`
- `app/source_scans/scheduler.py` — Audit `pass` → `logger.warning`
- `app/providers/tts/edge_tts_provider.py` — `pass` → `logger.debug`
- `app/modules/shared_helpers.py` — `pass` → `logger.debug`
- `app/discovery/service.py` — `pass` → `logger.warning`

### Frontend
- `src/api/client.ts` — 401 auto-refresh interceptor
- `src/lib/errorUtils.ts` — Error classification utility (YENİ)
- `src/hooks/useApiError.ts` — Error toast hook (YENİ)

---

## 9. Test Sonuçları

| Kontrol | Sonuç |
|---------|-------|
| Sprint 2 dedicated tests | 10/10 ✅ |
| Full backend test suite | 1676 passed, 1 failed (pre-existing) ✅ |
| TypeScript (`tsc --noEmit`) | Clean ✅ |
| Vite build | Clean ✅ |
| Pre-existing failure | `test_create_rss_source` — schema validation mismatch, Sprint 2 scope dışı |

---

## 10. Kalan Riskler

| Risk | Seviye | Not |
|------|--------|-----|
| SSE router auth yok | Düşük | Localhost-only MVP kararı |
| YouTube OAuth admin guard yok | Orta | Publish Center hardening'de ele alınacak |
| `test_create_rss_source` pre-existing fail | Düşük | Schema uyumsuzluğu, ayrı fix gerekli |
| `test_db_bootstrap` pre-existing fail | Düşük | In-memory DB'de migration chain test — scope dışı |
| Frontend error toast henüz tüm mutation'lara bağlanmadı | Orta | `useApiError` hook hazır, component bazında adoption gerekli |
| Queued job recovery sadece log — otomatik retry/fail yok | Tasarım gereği | Operator müdahalesi tercih edildi |

---

## 11. Commit ve Push

Commit hash ve push durumu bu raporla birlikte teslim edilecektir.
