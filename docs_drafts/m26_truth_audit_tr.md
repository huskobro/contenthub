# M26 — Truth Audit

## Ozet
M26 fazi sonunda tum degisikliklerin dogrulugu, butunlugu ve tutarliligi denetlendi.

## Faz Tamamlanma Durumu

| Faz | Durum | Notlar |
|-----|-------|--------|
| A: Server-Backed Discovery | ✅ Tamamlandi | Backend + frontend entegre |
| B: Contextual Command System | ✅ Tamamlandi | 10 contextual komut, pub/sub sistemi |
| C: Control Surfaces Deepening | ✅ Tamamlandi | CredentialsPanel, Analytics, ContentLibrary |
| D: Registry Maturation | ✅ Tamamlandi | Token duzeltmeleri, tarama raporu |
| E: Theme + Shell Polish | ✅ Tamamlandi | Token tutarliligi, dark mode bilerek eklenmedi |
| F: Test + Docs + Commit | ✅ Tamamlandi | 25 yeni test, 8 dokuman |

## Kod Kalitesi

### TypeScript
- 0 hata (`npx tsc --noEmit`)

### Testler
- 181 dosya, 2316 test, %100 basari
- Backend: 872 test basarili

### Yeni Dosyalar
| Dosya | Tip | Amac |
|-------|-----|------|
| backend/app/discovery/__init__.py | Backend | Discovery modulu init |
| backend/app/discovery/router.py | Backend | Birlesik arama endpoint'i |
| backend/app/discovery/service.py | Backend | Coklu entity arama servisi |
| backend/app/discovery/schemas.py | Backend | Pydantic modelleri |
| frontend/src/commands/contextualCommands.ts | Frontend | Sayfa-bazli komutlar |
| frontend/src/hooks/useContextualActions.ts | Frontend | Pub/sub action sistemi |
| frontend/src/hooks/useDiscoverySearch.ts | Frontend | Server discovery hook |
| frontend/src/tests/commands/contextualCommands.test.ts | Test | 13 test |
| frontend/src/tests/hooks/useDiscoverySearch.test.ts | Test | 5 test |

### Degisiklik Yapilan Dosyalar
| Dosya | Degisiklik |
|-------|------------|
| backend/app/api/router.py | Discovery router kaydi |
| backend/app/jobs/router.py + service.py | search parametresi |
| backend/app/sources/router.py + service.py | search parametresi |
| backend/app/modules/templates/router.py + service.py | search parametresi |
| backend/app/modules/style_blueprints/router.py + service.py | search parametresi |
| backend/app/news_items/router.py + service.py | search parametresi |
| frontend/src/stores/commandPaletteStore.ts | Context, contextRoutes, setContext |
| frontend/src/components/design-system/CommandPalette.tsx | Discovery + context entegrasyonu |
| frontend/src/components/settings/CredentialsPanel.tsx | Full tokenizasyon |
| frontend/src/pages/admin/AnalyticsContentPage.tsx | PageShell, breadcrumb, back-link |
| frontend/src/pages/admin/ContentLibraryPage.tsx | radius.lg token duzeltmesi |
| frontend/src/pages/admin/AnalyticsOverviewPage.tsx | radius.lg token duzeltmesi |
| frontend/src/app/layouts/AdminLayout.tsx | Context takibi, contextual komut kaydi |
| frontend/src/tests/stores/commandPaletteStore.test.ts | +7 context testi |

## Kirilmayan Parcalar
- Mevcut 2291 test hala gecerli
- Wave 1 ve Wave 2 tum ozellikleri calismaya devam ediyor
- Mevcut API endpoint'leri geriye donuk uyumlu (search parametresi opsiyonel)
- Command palette mevcut komutlar korunuyor

## Bilerek Yapilmayanlar
- Dark mode: Tam yapilmadigi icin eklenmedi (planlanan risk karari)
- Publish registry sayfasi: Scope disi (henuz yok)
- Badge bilesenlerinde `"0.375rem"` → `radius.sm`: Dusuk risk/fayda, korundu
- Settings wiring degisikligi: Mevcut autosave/effective sistem korunuyor

## Bilinen Teknik Borc
- Badge bilesenlerinde (~20 dosya) hardcoded `borderRadius: "0.375rem"` — gelecek sprintte toplu token donusumu yapilabilir
- UserContentEntryPage / UserPublishEntryPage: `borderRadius: "10px"` — kullanici sayfalarinda ileride duzeltilecek
- Backend Alembic test'i: python3 path uyumsuzlugu ortam sorunu
