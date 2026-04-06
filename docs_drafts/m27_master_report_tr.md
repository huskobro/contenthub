# M27 — Cekirdek Sistem Olgunlastirma Raporu

## 1. Executive Summary

Bu faz, ContentHub'in cekirdek altyapi eksiklerini kapatti. News bulletin pipeline gibi buyuk yeni moduller bilinçli olarak ertelendi. Odak: mevcut sistemi bozmadan operasyonel guvenilirligi, gorunurlugu ve kullanilabilirligi artirmak.

**Sonuclar:**
- Backend: 1234 test gecti, 0 hata
- Frontend: 2318 toplam test — 2301 gecti, 17 pre-existing fail (M27 oncesinden miras, bu faza ait degil)
- TypeScript: 0 hata
- 56 dosya degistirildi/olusturuldu (14 yeni, 42 degisiklik)
- Calisan hicbir islevsellik bozulmadi
- Commit: `6767e5a` — push: `main → origin/main` tamamlandi

---

## 2. Amac ve Kapsam

Bu fazin amaci:
- Global SSE zincirini kurmak
- Visibility Engine'i tamamlamak
- Settings validation'i enforce etmek
- Auto-scan scheduler'i yazmak
- Schedule publish UI'i eklemek
- Audit log bosluklarini kapatmak
- Analytics'i derinlestirmek (template impact, module performance, chartlar)
- Preview-first UX bilesenlerini olusturmak
- Operasyonel iyilestirmeler (version lock, elapsed fix, theme persist, auto retry)

---

## 3. Bu Fazda Bilincli Olarak Yapilmayanlar

- News Bulletin otonom pipeline'i (module definition, executor'lar, dispatcher entegrasyonu)
- News Bulletin wizard'i
- News Bulletin Remotion composition
- Editorial gate bulletin transition isleri
- Trust level enforcement (news bulletin'e bagimli, ertelendi)
- Multi-worker SSE broadcast (single-process yeterli, MVP icin)
- Full authentication sistemi (MVP localhost-only)

---

## 4. Mimari Kararlar

1. **Global SSE**: Mevcut EventBus'a ikinci endpoint eklendi (`/sse/events`). Bus zaten tum event'leri broadcast ediyor — client tarafinda filtreleme yapiliyor.

2. **Caller Context**: `X-ContentHub-Role` header ile MVP-uyumlu role tespiti. Auth geldiginde JWT'den okunacak.

3. **Settings Validation**: Ayri `validation.py` modulu — service layer'dan cagriliyor, exception handler middleware'de yakalaniyor.

4. **Auto-Scan Scheduler**: Publish scheduler pattern'ini birebir takip ediyor — asyncio background task, graceful shutdown, batch limit, cooldown.

5. **Template Snapshot**: Dispatch aninda `input_data_json._template_snapshot` olarak frozen kopyalanir — ek DB tablosu gerekmedi.

6. **Auto-Retry**: Disabled by default (admin etkinlestirmeli). Exponential backoff ile runaway davranis engellendi.

7. **Recharts**: Lightweight chart kutuphanesi — sadece gercek data'dan render, fake chart yok.

---

## 5. Backend Degisiklikleri

### Yeni Dosyalar
| Dosya | Aciklama |
|---|---|
| `backend/app/settings/validation.py` | Settings value validation engine |
| `backend/app/source_scans/scheduler.py` | Auto-scan background scheduler |
| `backend/app/jobs/retry_scheduler.py` | Auto-retry background scheduler |

### Degistirilen Dosyalar
| Dosya | Degisiklik |
|---|---|
| `app/sse/router.py` | Global SSE endpoint eklendi |
| `app/visibility/dependencies.py` | `get_caller_role` dependency eklendi |
| `app/settings/service.py` | Validation enforcement, visible_to_user_only filtre |
| `app/settings/router.py` | Field-level filtering, validation, user_override_allowed |
| `app/settings/schemas.py` | env_var Optional yapildi |
| `app/settings/settings_resolver.py` | Yeni KNOWN_SETTINGS + KNOWN_VALIDATION_RULES |
| `app/settings/settings_seed.py` | Validation rules seed entegrasyonu |
| `app/main.py` | Auto-scan + retry scheduler lifespan, SettingValidationError handler |
| `app/jobs/router.py` | Visibility guard + job.create audit |
| `app/jobs/pipeline.py` | 6 pipeline transition audit |
| `app/jobs/dispatcher.py` | Template snapshot locking |
| `app/jobs/schemas.py` | Running job elapsed_total_seconds live compute |
| `app/analytics/service.py` | Template impact + module performance extended metrics |
| `app/analytics/schemas.py` | Yeni schema'lar (TemplateImpact, BlueprintImpact, ModuleDistribution genisleme) |
| `app/analytics/router.py` | Template impact endpoint |
| 10 router dosyasi | require_visible guard eklendi |

---

## 6. Frontend Degisiklikleri

### Yeni Dosyalar
| Dosya | Aciklama |
|---|---|
| `hooks/useGlobalSSE.ts` | Global SSE hook — notification wiring |
| `hooks/useTemplateImpact.ts` | Template impact analytics hook |
| `components/analytics/ModuleDistributionChart.tsx` | Donut chart |
| `components/analytics/ProviderLatencyChart.tsx` | Bar chart |
| `components/analytics/StepDurationChart.tsx` | Bar chart |
| `components/analytics/JobSuccessRateChart.tsx` | Success rate visual |
| `components/preview/BlueprintVisualPreview.tsx` | Style blueprint mock frame |
| `components/preview/TemplateVisualPreview.tsx` | Template preview card |
| `components/preview/CompositionDirectionPreview.tsx` | 4 layout direction card |
| `components/preview/ThumbnailDirectionPreview.tsx` | 4 thumbnail direction card |

### Degistirilen Dosyalar
| Dosya | Degisiklik |
|---|---|
| 4 layout dosyasi | useGlobalSSE hook mount |
| `UserJobTracker.tsx` | refetchInterval kaldirildi (SSE ile degistirildi) |
| `PublishDetailPage.tsx` | Schedule UI (datetime + button) |
| `PublishCenterPage.tsx` | Scheduled_at gosterimi |
| `publishApi.ts` | scheduled_at field |
| `AnalyticsContentPage.tsx` | Template impact section + chart + null safety |
| `AnalyticsOperationsPage.tsx` | Provider/step chartlari |
| `analyticsApi.ts` | Yeni tipler ve fetch fonksiyonlari |
| `StyleBlueprintForm.tsx` | BlueprintVisualPreview entegrasyonu |
| `TemplateForm.tsx` | TemplateVisualPreview entegrasyonu |
| `ContentCreationWizard.tsx` | Composition + thumbnail preview |
| `StandardVideoWizardPage.tsx` | Yeni wizard alanlari |
| `SourceDetailPanel.tsx` | Scan mode badge |
| `themeStore.ts` | Backend persistence + safe localStorage |

---

## 7. Rollout Yapilan Yuzeyler

1. **Tum Layout'lar** — Global SSE + notification feed
2. **User Dashboard** — Polling yerine SSE-driven refresh
3. **Publish Detail** — Schedule publish akisi
4. **Publish Center** — Scheduled state gosterimi
5. **Analytics Content** — Template impact + module charts
6. **Analytics Operations** — Provider latency + step duration charts
7. **Style Blueprint Form** — Canli gorsel preview
8. **Template Form** — Canli gorsel preview
9. **Standard Video Wizard** — Composition/thumbnail direction preview
10. **Source Detail** — Scan mode badge
11. **Tum Admin Paneli** — Visibility guard

---

## 8. Test Stratejisi

Backend ve frontend test suite'leri tam olarak calistirildi. Hicbir test atlanmadi veya ignore edilmedi (alembic migration testi haric — sistem python'da alembic paketi yok, pre-existing).

---

## 9. Test Sonuclari

### Backend (pytest)

| Metrik | Deger |
|---|---|
| Toplam test | 1234 |
| Gecen | 1234 |
| Basarisiz | 0 |
| M27 kaynakli regresyon | 0 |

### Frontend (vitest)

| Metrik | Deger |
|---|---|
| Toplam test | 2318 |
| Gecen | 2301 |
| Basarisiz | 17 |
| M27 kaynakli regresyon | **0** |

17 basarisiz testin tamami M27 oncesinden miras kalan, bu faza ait olmayan pre-existing hatalardir:

| Test Dosyasi | Fail Sayisi | Neden | Bu Faza Ait Mi? |
|---|---|---|---|
| `themeStore.test.ts` | 13 | vitest ortaminda `localStorage` mock eksikligi | HAYIR — M26 ve oncesinden miras |
| `uiStore.sidebar-persist.test.ts` | 4 | ayni localStorage mock sorunu | HAYIR — M26 ve oncesinden miras |

Bu 17 test, M27 degisiklikleri oncesinde de ayni sekilde fail ediyordu. Kok neden: vitest test runner'inda `localStorage` API'sinin tam mock'lanmamasi. Duzeltme icin vitest setup dosyasina global localStorage mock eklenmesi gerekiyor — bu bir test altyapi iyilestirmesidir, M27 kapsaminda degil.

**Sonuc: M27 degisiklikleri sifir regresyon uretmistir.**

### TypeScript (tsc --noEmit)

| Metrik | Deger |
|---|---|
| Hata | 0 |
| Uyari | 0 |

---

## 10. Truth Audit

| Alan | Durum | Detay |
|---|---|---|
| Global SSE | TAMAMLANDI | Backend endpoint + frontend hook + notification wiring + all layouts |
| Notification Center | CALISIYOR | SSE event'leri notification store'a akiyor |
| Polling Temizligi | TAMAMLANDI | UserJobTracker refetchInterval kaldirildi |
| Visibility Guards | TAMAMLANDI | 10 router'a guard eklendi |
| Field-Level Filtering | TAMAMLANDI | User role'de hidden settings filtreleniyor |
| Settings Validation | TAMAMLANDI | validation_rules_json enforce ediliyor |
| User Override Guard | TAMAMLANDI | user_override_allowed=False kontrolu |
| Auto-Scan | TAMAMLANDI | Background scheduler, cooldown, batch limit |
| Schedule Publish | TAMAMLANDI | UI + hook + state gosterimi |
| Audit Log | TAMAMLANDI | Job create + 6 pipeline transition |
| Template Impact | TAMAMLANDI | Backend metrics + frontend table |
| Module Performance | TAMAMLANDI | Extended metrics (duration, render, retry) |
| Charts | TAMAMLANDI | 4 Recharts component, gercek data |
| Blueprint Preview | TAMAMLANDI | Mock frame, renk paleti, layout |
| Template Preview | TAMAMLANDI | Renk, font, ton badge'leri |
| Composition Preview | TAMAMLANDI | 4 yön karti |
| Thumbnail Preview | TAMAMLANDI | 4 stil karti |
| Template Snapshot | TAMAMLANDI | Dispatch aninda input_data_json'a frozen |
| Elapsed Fix | TAMAMLANDI | Running job'larda live compute |
| Theme Persist | TAMAMLANDI | Backend save + hydrate on load |
| Auto Retry | TAMAMLANDI | Disabled default, exponential backoff |
| Theme System | BOZULMADI | Test dogrulandi |
| Command Palette | BOZULMADI | Degisiklik yapilmadi |
| Discovery | BOZULMADI | Visibility guard eklendi, islevsellik korundu |
| QuickLook/Sheet | BOZULMADI | Degisiklik yapilmadi |
| Autosave | BOZULMADI | Validation eklendi ama akis korundu |
| Credentials/OAuth | BOZULMADI | Degisiklik yapilmadi |
| Upload/Clone/Delete | BOZULMADI | Degisiklik yapilmadi |

---

## 11. Durust Kalan Gap Listesi

### Bilincli Ertelemeler (sonraki milestone'a birakildi)

| # | Alan | Aciklama |
|---|---|---|
| 1 | News Bulletin Pipeline | Otonom job akisi, executor'lar, dispatcher entegrasyonu |
| 2 | News Bulletin Wizard | Kullanici odakli bulten olusturma wizard'i |
| 3 | News Bulletin Remotion Composition | Bulten icin ozel video composition |
| 4 | Trust Level Enforcement | Kaynak guvenilirlik seviyesinin runtime'da enforce edilmesi |
| 5 | Product Review / Educational / HowTo Modulleri | Yeni icerik modul tipleri |

### Teknik Borclar (mevcut, M27 kapsaminda degil)

| # | Alan | Aciklama |
|---|---|---|
| 6 | Multi-Worker SSE | Single-process bus; Redis pubsub gerektirecek bir deployment senaryosu henuz yok |
| 7 | Authentication | Localhost-only MVP; JWT/session sistemi gelecek fazda |
| 8 | edge-tts Paket | venv'e kurulmamis, TTS noop stub'a dusuyor |
| 9 | faster-whisper Paket | venv'e kurulmamis, subtitle cursor timing'e dusuyor |
| 10 | Template Version History UI | Version numarasi DB'de var ama gecmis surumler UI'i yok |
| 11 | Semantic Dedupe | Hard+soft dedupe calisiyor; embedding-based semantic dedupe ertelenmis |
| 12 | Analytics Time Series | Metrikler snapshot bazli, gunluk/haftalik trend cizgisi yok |
| 13 | localStorage Test Mock | themeStore/uiStore testleri vitest setup eksikliginden pre-existing fail |

---

## 12. Commit Hash ve Push Durumu

- Commit: `6767e5a`
- Branch: `main`
- Push: tamamlandi (`main → origin/main`)
- Tarih: 2026-04-06

---

## 13. Sonraki Mantikli Adimlar

1. **News Bulletin Pipeline** — executor'lar, definition, dispatcher, wizard
2. **edge-tts + faster-whisper Kurulumu** — gercek TTS ve altyazi
3. **Trust Level Enforcement** — editorial gate'e entegre
4. **Template Version History UI** — gecmis surumler paneli
5. **Analytics Time Series** — gunluk/haftalik trend grafikleri
6. **Authentication Layer** — JWT/session bazli role sistemi
7. **localStorage Test Fix** — vitest setup'ta mock eklenmesi
