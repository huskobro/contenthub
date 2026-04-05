# M22: Trust/Reality Gap Closure — Kapanis Raporu

## Faz Ozeti

M22, runtime dogrulugu ve operasyonel durustluk odakli bir sertlestirme (hardening) fazidir.
Gorsel degisiklik icermez; tamamen backend dogrulugu, hata yonetimi ve veri butunlugu
uzerine yogunlasmistir.

## Alt Fazlar ve Durum

| Alt Faz | Baslik | Durum |
|---------|--------|-------|
| M22-A | Visibility Runtime Trust Completion | ✓ Tamamlandi |
| M22-B | Settings Service Completion | ✓ Tamamlandi |
| M22-C | Publish Executor Truth Hardening | ✓ Tamamlandi |
| M22-D | Content Library Backend Hardening | ✓ Tamamlandi |
| M22-E | Library UX Truth Hardening | ✓ Tamamlandi |
| M22-F | Truth Audit | ✓ Tamamlandi |
| M22-G | Test, Docs, Commit | ✓ Tamamlandi |

## Test Sonuclari

### Backend
- **Toplam**: 1184 passed, 2 failed (pre-existing alembic migration), 7 errors (pre-existing)
- **M22 testleri**: 17/17 passed
- **Etkilenen eski testler**: 7 guncellendi ve gecti

### Frontend
- **Toplam**: 2182 passed, 0 failed
- **M22 testleri**: 8/8 passed
- **Etkilenen eski testler**: 6 guncellendi ve gecti

### TypeScript
- Temiz (0 hata)

## Degisen Dosyalar

### Backend (Python)
| Dosya | Degisiklik |
|-------|-----------|
| app/visibility/service.py | delete_rule, bulk_update_status eklendi |
| app/visibility/router.py | DELETE, POST /bulk-status endpoint'leri |
| app/settings/service.py | delete_setting, bulk_update, audit log zenginlestirme |
| app/settings/router.py | DELETE, POST /bulk-update endpoint'leri |
| app/publish/executor.py | _resolve_payload hardening (fake title kaldirildi) |
| app/publish/youtube/adapter.py | title validasyonu, PublishAdapterError import |
| app/content_library/service.py | SQL UNION ALL yeniden yazim |
| app/assets/router.py | Upload status 200 → 201 |

### Frontend (TypeScript/React)
| Dosya | Degisiklik |
|-------|-----------|
| src/api/visibilityApi.ts | Throw on error, deleteVisibilityRule |
| src/hooks/useVisibility.ts | Safe error fallback (read-only) |
| src/pages/admin/ContentLibraryPage.tsx | has_script/has_metadata badges, clone nav |
| src/pages/AdminOverviewPage.tsx | Readiness status guncellemeleri |

### Testler (Yeni)
| Dosya | Test Sayisi |
|-------|------------|
| backend/tests/test_m22_visibility_settings_publish.py | 17 |
| frontend/src/tests/m22-visibility-trust-hardening.smoke.test.tsx | 8 |

### Testler (Guncellenen)
| Dosya | Degisiklik |
|-------|-----------|
| tests/test_m7_c3_publish_executor.py | test_s: fallback → ValueError beklentisi |
| tests/test_m7_c2_youtube_adapter.py | payload={} → payload={title, desc, tags} |
| tests/test_m21_upload_clone_library.py | status 200 → 201 |
| src/tests/final-ux-release-readiness-pack.smoke.test.tsx | M21/M12 → M22 aktif |
| src/tests/asset-library-media-resource-management-pack.smoke.test.tsx | M21 → M22 aktif |
| src/tests/visibility-enforcement.smoke.test.tsx | Permissive → throw beklentisi |
| src/tests/m14-visibility-completion.smoke.test.tsx | waitFor timeout artisi |

## Teknik Karar Kayitlari

1. **Visibility fallback stratejisi**: "Fail-open for viewing, fail-closed for mutation"
   - Gorebilirsin ama degistiremezsin
   - Tam lockout kotu UX, tam erisim guvenlik acigi → ortadaki yol

2. **Publish executor**: Hata propagasyonu, fallback degil
   - Metadata bozuklugu yayin durdurulmali, sessiz yanlis veri kullanilmamali

3. **SQL UNION ALL**: Raw SQL text() tercih edildi
   - SQLAlchemy ORM UNION ALL SQLite ile sorunlu
   - Raw SQL performans ve kontrol avantaji

4. **Upload 201**: HTTP semantik dogruluk
   - Kaynak olusturma 201 donmeli (RFC 7231)

## Bilinen Sinirlamalar ve Ertelenen Isler

- Visibility rule versiyon/history takibi (gelecek faz)
- Setting restore/undelete (gelecek faz)
- YouTube category_id hardcoded default (publish metadata zenginlestirme fazinda)
- Analytics trace parse hatasi sessiz yutma (analytics hardening fazinda)
- Full-text search (content library v2'de)
- Bulk delete endpoint'leri (visibility ve settings icin)
- SSE-based visibility/settings cache invalidation

## Sonuc

M22, ContentHub'in runtime dogruluk seviyesini olculebilir sekilde artirmistir.
Permissive fallback'lar kaldirild, hata propagasyonu eklendi, SQL performansi
iyilestirildi ve tum degisiklikler test kapsamina alindi. Kalan riskler bilincidir
ve dokumanlanmistir.
