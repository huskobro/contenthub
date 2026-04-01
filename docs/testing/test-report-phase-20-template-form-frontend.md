# Test Report — Phase 20: Template Create/Edit Form Frontend

**Date:** 2026-04-02
**Phase:** 20

## Amaç

Admin panelden template create ve edit işlemlerini destekleyen frontend katmanını kurmak:
- `TemplateForm` ortak form bileşeni (create + edit)
- `TemplateCreatePage` (`/admin/templates/new`)
- `TemplateDetailPanel` içinde edit mode
- `useCreateTemplate`, `useUpdateTemplate` mutation hook'ları
- `templatesApi.ts` create/update fonksiyonları

## Çalıştırılan Komutlar

```
npm test           # 94/94 passed
npm run build      # ✅ 318.37 kB (gzip: 91.21 kB)
```

## Test Sonuçları

### template-form.smoke.test.tsx (10 yeni test)

| Test | Sonuç |
|------|-------|
| renders the create page heading | ✅ |
| shows the name field | ✅ |
| shows name validation error when name is empty | ✅ |
| shows name validation error when name is only whitespace | ✅ |
| rejects negative version | ✅ |
| rejects invalid JSON in style_profile_json | ✅ |
| calls create mutation on valid submit (fetch called with POST) | ✅ |
| cancel button is present and clickable | ✅ |
| registry page shows '+ Yeni Template' button | ✅ |
| edit mode opens when Düzenle is clicked in detail panel | ✅ |

**Toplam: 94/94 frontend test geçti (13 test dosyası)**

## Eklenen / Değiştirilen Dosyalar

- `frontend/src/api/templatesApi.ts` — `TemplateCreatePayload`, `TemplateUpdatePayload`, `createTemplate`, `updateTemplate` eklendi
- `frontend/src/hooks/useCreateTemplate.ts` — yeni
- `frontend/src/hooks/useUpdateTemplate.ts` — yeni
- `frontend/src/components/templates/TemplateForm.tsx` — yeni (create+edit ortak form)
- `frontend/src/pages/admin/TemplateCreatePage.tsx` — yeni (`/admin/templates/new`)
- `frontend/src/components/templates/TemplateDetailPanel.tsx` — edit mode eklendi
- `frontend/src/pages/admin/TemplatesRegistryPage.tsx` — "+ Yeni Template" butonu eklendi
- `frontend/src/app/router.tsx` — `templates/new` route eklendi
- `frontend/src/tests/template-form.smoke.test.tsx` — 10 yeni test

## Validation Kuralları

- `name` zorunlu, boş/sadece whitespace kabul edilmez
- `template_type` zorunlu (style / content / publish)
- `owner_scope` zorunlu (system / admin / user)
- `version` negatif olamaz
- JSON alanları boş olabilir; içerik varsa parse edilebilir olmalı

## Bilerek Yapılmayanlar

- Silme (delete) endpoint veya UI
- Template family / clone / version compare
- User override UI
- Preview-first UI
- Template resolve motoru
- Module binding otomasyonu
- Visibility entegrasyonu

## Riskler

- Navigation-after-mutation testleri jsdom'da AbortSignal uyumsuzluğu nedeniyle fetch-call doğrulamasına indirgendi (bilinen kısıtlama)
- Auth/authorization yok (kasıtlı)
