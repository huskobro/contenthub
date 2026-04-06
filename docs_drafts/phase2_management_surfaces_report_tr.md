# Phase 2: CM → CH Yönetim Yüzeyleri Transfer Raporu

**Tarih:** 2026-04-06
**Kapsam:** Faz A–H (Module Management, Provider Management, Master Prompt Editor, Keyboard Fix, Theme Fix, Job Archive, Settings Standard, Test)

---

## Özet

Phase 2, ContentManager'dan ContentHub'a kontrollü görsel transferin ikinci aşamasıdır. 8 alt faz tamamlanmıştır:

| Faz | Konu | Durum |
|-----|-------|-------|
| A | Module Management | Tamamlandı |
| B | Provider Management | Tamamlandı |
| C | Master Prompt Editor | Tamamlandı |
| D | Enter/Space Keyboard Fix | Tamamlandı |
| E | Job Archive UI | Tamamlandı |
| F | Theme Switch F5 Fix | Tamamlandı |
| G | Settings Surface Standard | Tamamlandı |
| H | Testing + Validation | Tamamlandı |

---

## Faz A: Module Management

**Backend:**
- `GET /modules` endpoint — tüm kayıtlı modülleri enabled durumu ile döner
- Settings Registry'de `module.standard_video.enabled` ve `module.news_bulletin.enabled` tanımları
- `check_module_enabled()` service fonksiyonu — disabled modülde job oluşturmayı engeller (403)
- `ModuleDisabledError` exception sınıfı

**Frontend:**
- `ModuleManagementPage` — modül kartları, toggle, step listesi, prompt/settings linkleri
- `modulesApi.ts` — fetchModules, setModuleEnabled

**Mimari not:** Modül etkinlik kontrolü service katmanında, router sadece HTTP mapping yapar (CLAUDE.md katmanlı mimari kuralı).

---

## Faz B: Provider Management

**Backend:**
- `CREDENTIAL_ENV_MAP` — provider başına .env key mapping
- Provider listesinde `credential_source`, `credential_status`, `credential_env_var` alanları
- `POST /providers/{id}/test` — test connection endpoint

**Frontend:**
- `ProviderManagementPage` — capability-grouped kartlar, credential durumu, test butonu, health stats
- `providersApi.ts` — typed interfaces ve API fonksiyonları

---

## Faz C: Master Prompt Editor

**Frontend:**
- `PromptEditorPage` — modül bazlı gruplu prompt düzenleme
- Textarea ile düzenleme, karakter sayacı, kaydet, varsayılana dön
- İlişkili Kurallar paneli (wired, non-prompt settings)
- `?module=X` URL param filtresi
- standard_video hardcoded prompt uyarı banner'ı

**Prompt kaynakları:**
- 4 prompt Settings Registry'de: `news_bulletin.prompt.narration_system`, `narration_style_rules`, `anti_clickbait_rules`, `metadata_title_rules`
- standard_video promptları `prompt_builder.py` içinde hardcoded (gelecek milestone'da taşınacak)

---

## Faz D: Enter/Space Keyboard Fix

- `useRovingTabindex` hook'a `onEnter` ve `onSpace` callback'ler eklendi
- `useScopedKeyboardNavigation` güncellendi
- Tüm tablo/liste sayfalarında: Enter → detail panel (Sheet), Space → QuickLook
- Interactive element guard: input/textarea/select/button içinde basıldığında atlanır

**Etkilenen sayfalar:** JobsRegistryPage, SourcesRegistryPage, TemplatesRegistryPage, ContentLibraryPage, AssetLibraryPage

---

## Faz E: Job Archive UI

- `markJobsAsTestData` ve `bulkArchiveTestData` API fonksiyonları
- İki aşamalı onay dialog'u ("Arşivle" terminolojisi, "Sil" değil)
- `includeArchived` toggle ile arşivlenmiş kayıtların gösterimi
- `useJobsList` hook'a `includeArchived` parametresi

---

## Faz F: Theme Switch F5 Fix

- `DynamicAdminLayout` ve `DynamicUserLayout`'a key-based remount eklendi
- `key="horizon"` / `key="classic"` ile tema değişikliğinde React tam unmount/remount
- F5 olmadan tema geçişi çalışır hale geldi

---

## Faz G: Settings Surface Standard

CLAUDE.md'ye eklenen kural:
> "Every new feature, module, behavior, or prompt must ship with its own settings management surface."

5 maddelik checklist: KNOWN_SETTINGS, admin Settings page, Master Prompt Editor, wizard governance, module toggle.

---

## Faz H: Test Sonuçları

### Backend
- **1067/1068 test geçti** (1 fail: M7 fresh DB migration — bilinen sorun, alembic modül uyumsuzluğu)
- 186 modül testi dahil tümü geçti
- Phase 2 değişikliklerinden kaynaklanan yeni hata yok

### Frontend
- TypeScript: 0 hata
- Vite build: Başarılı (2.48s)
- Tüm yeni sayfalar VisibilityGuard ile korunuyor

### Code Review Düzeltmeleri
- PromptEditorPage'de geçersiz renk tokenları düzeltildi (text-info-600 → text-info-text vb.)
- Modül etkinlik kontrolü router'dan service katmanına taşındı
- Yeni route'lara VisibilityGuard eklendi

---

## Bilinen Sınırlamalar ve Teknik Borç

1. **Command palette / sidebar filtreleme:** Disabled modüller sidebar ve command palette'te hala görünür. Gelecek milestone'da filtrelenecek.
2. **Archive butonu konumu:** Şu an tablo altında ayrı bir buton. İdeal olarak satır aksiyonlarına taşınmalı.
3. **standard_video promptları:** Hala `prompt_builder.py` içinde hardcoded. Settings Registry'ye taşınması planlanıyor.
4. **Wizard disabled modül filtreleme:** Disabled modüller wizard'da hala seçilebilir. Gelecek milestone'da engellenecek.

---

## Commit Geçmişi

| Commit | Açıklama |
|--------|----------|
| `48082a0` | fix(phase2): code review düzeltmeleri — renk token + katmanlı mimari |
| `93a93e7` | fix(phase2): yeni route'lara VisibilityGuard eklendi |
| `a7464e4` | fix(ui): tema-uyumlu renk düzeltmeleri, Horizon layout iyileştirmeleri |
| `c7a07ac` | docs: add settings surface standard to Non-Negotiable Rules |
| `7016686` | feat: integrate module/provider/prompt pages into router and navigation |
| `bc7aef6` | Merge branch 'worktree-agent-aace72df' |
| `2416346` | feat(phase2-faz-a): Module Management backend API + frontend page |
| `b612cab` | feat(providers-ui): ProviderManagementPage ve providersApi eklendi |
