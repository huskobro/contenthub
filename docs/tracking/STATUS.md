# DURUM

## Mevcut Faz
Phase 26 — Source Scans Backend Foundation ✓ TAMAMLANDI

## Mevcut Hedef
Source scans backend: SourceScan modeli, migration, schemas, service, router, 14 yeni test, 111 toplam backend test.

## Devam Eden
— (devam eden çalışma yok)

## Son Tamamlananlar
- Phase 1: backend + frontend + renderer iskeleti tamamlandı (2026-04-01)
- Phase 2 panel shell + DB temeli tamamlandı (2026-04-01)
- Phase 3 settings backend: Setting modeli, CRUD API, 17 test (2026-04-01)
- Phase 4 visibility backend: VisibilityRule modeli, CRUD API, 28 backend test (2026-04-01)
- Doküman Türkçeleştirme (2026-04-01)
- Phase 5 settings frontend: API katmanı, React Query hooks, SettingsRegistryPage, 9 frontend test (2026-04-01)
- Phase 6 visibility frontend: API katmanı, React Query hooks, VisibilityRegistryPage, 14 frontend test toplam (2026-04-01)
- Phase 6 integration check: Vite proxy eklendi, endpoint uyumu doğrulandı, curl ile manuel test geçti (2026-04-01)
- Phase 7 jobs backend: Job + JobStep modeli, migration, CRUD API, 8 yeni test, 36 toplam backend test (2026-04-01)
- Phase 8 jobs frontend: API katmanı, hooks, JobsTable, JobDetailPanel, JobStepsList, JobsRegistryPage, 19 toplam frontend test (2026-04-01)
- Phase 9 elapsed/ETA frontend: formatDuration, DurationBadge, jobs UI güncellendi, 28 toplam frontend test (2026-04-01)
- Phase 10 job detail page: JobDetailPage, JobOverviewPanel, JobTimelinePanel, JobSystemPanels, /admin/jobs/:jobId, 33 toplam frontend test (2026-04-01)
- Phase 11 standard video backend: StandardVideo modeli, migration, CRUD API, 8 yeni test, 44 toplam backend test (2026-04-01)
- Phase 12 standard video script backend: StandardVideoScript modeli, script CRUD API, 8 yeni test, 52 toplam backend test (2026-04-01)
- Phase 13 standard video metadata backend: StandardVideoMetadata modeli, metadata CRUD API, 8 yeni test, 60 toplam backend test (2026-04-01)
- Phase 14 standard video admin frontend: API katmanı, hooks, tablo, overview/artifacts panelleri, 11 yeni frontend test, 44 toplam frontend test (2026-04-01)
- Phase 15 standard video create/edit frontend: StandardVideoForm, CreatePage, edit modu, /new route, Yeni butonu, 6 yeni test, 50 toplam frontend test (2026-04-01)
- Phase 16 admin standard video script frontend: StandardVideoScriptPanel, create/update mutation hook'ları, API fonksiyonları, 13 yeni test, 63 toplam frontend test (2026-04-01)
- Phase 17 admin standard video metadata frontend: StandardVideoMetadataPanel, create/update mutation hook'ları, API fonksiyonları, 12 yeni test, 75 toplam frontend test (2026-04-01)
- Phase 18 template engine backend: Template modeli, migration, schemas, service, router, 11 yeni test, 71 toplam backend test (2026-04-02)
- Phase 19 admin templates registry frontend: API katmanı, hooks, TemplatesTable, TemplateDetailPanel, TemplatesRegistryPage, sidebar, 9 yeni test, 84 toplam frontend test (2026-04-02)
- Phase 20 template create/edit form frontend: TemplateForm, TemplateCreatePage, edit mode, useCreateTemplate, useUpdateTemplate, 10 yeni test, 94 toplam frontend test (2026-04-02)
- Phase 21 style blueprint backend: StyleBlueprint modeli, migration, schemas, service, router, 11 yeni test, 82 toplam backend test (2026-04-02)
- Phase 22 admin style blueprints registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 103 toplam frontend test (2026-04-02)
- Phase 23 news source registry backend: NewsSource modeli, migration, schemas, service, router, 15 yeni test, 97 toplam backend test (2026-04-02)
- Phase 24 admin sources registry frontend: API, hooks, table, detail panel, registry page, sidebar, 9 yeni test, 112 toplam frontend test (2026-04-02)
- Phase 25 admin sources create/edit frontend: SourceForm, SourceCreatePage, edit mode, useCreateSource, useUpdateSource, 9 yeni test, 121 toplam frontend test (2026-04-02)
- Phase 26 source scans backend: SourceScan modeli, migration, schemas, service, router, 14 yeni test, 111 toplam backend test (2026-04-02)

## Mevcut Riskler
- Henüz auth / rol zorlama yok (kasıtlı)
- Node varsayılan shell PATH'inde değil
- Port 8000 başka bir uygulama tarafından kullanılıyorsa dev proxy çalışmaz
- Testlerde React Router v7 future flag uyarısı — kozmetik

## GitHub Yedek Durumu
✓ Aktif. `git@github.com:huskobro/contenthub.git` — main branch upstream ayarlandı ve güncel.
