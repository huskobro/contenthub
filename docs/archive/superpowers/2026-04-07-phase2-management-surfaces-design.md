# Phase 2: Yönetim Yüzeyleri, UI Düzeltmeleri ve Standartlar

**Tarih:** 2026-04-07
**Durum:** Onaylandı
**Kapsam:** 8 alt faz (A–H)

---

## Amaç

Eksik yönetim yüzeylerini eklemek, kritik UI bug'larını kapatmak, tema değişimini F5 gerektirmeden çalışır hale getirmek ve bundan sonra eklenen her modül/davranış/özelliğin kendi ayar yüzeyine sahip olmasını standart hale getirmek.

---

## Uygulama Sırası

1. Faz D — Detail Panel + Keyboard Fix
2. Faz F — Theme F5 Fix
3. Faz E — Job Archive UI
4. Faz A — Module Management
5. Faz B — Provider Management
6. Faz C — Master Prompt Editor
7. Faz G — Settings Surface Standard
8. Faz H — Testing

---

## Faz D: Detail Panel + Keyboard Fix

### Problem
`useRovingTabindex.ts`'de hem Enter hem Space aynı `onSelect` callback'i tetikliyor. Detail panel (Sheet) ve QuickLook ayrımı yok.

### Çözüm
- `useRovingTabindex` hook'unda Enter ve Space'i ayrı callback'lere bağla:
  - **Enter** → `onDetailOpen` (Sheet açar)
  - **Space** → `onQuickLook` (QuickLook açar)
- Form elemanları (input/textarea/select/button) üzerindeyken native davranış korunsun — bu elemanlar odaktayken Enter/Space override edilmez
- `useScopedKeyboardNavigation` wrapper'ı da iki ayrı callback kabul edecek şekilde güncellenir

### Kapsam
Tüm tablo/liste sayfalarında ortak standart:
- Jobs, Sources, Templates, News Items, News Bulletins, Used News, Style Blueprints, vb.

### İstisnalar
- Odak bir input/textarea/select/button üzerindeyse bu kural çalışmaz
- Satır içinde ayrı bir primary action butonu varsa o butonla çakışma önlenir

### Etkilenen Dosyalar
- `frontend/src/hooks/useRovingTabindex.ts` — Enter/Space ayrımı
- `frontend/src/hooks/useScopedKeyboardNavigation.ts` — callback ayrımı
- Tüm tablo/liste sayfaları — `onDetailOpen` ve `onQuickLook` prop'ları

---

## Faz F: Theme F5 Fix

### Problem
`DynamicAdminLayout` render anında `layoutMode` okuyor. Tema değiştiğinde layoutMode değişse bile React component tree'si aynı kaldığı için layout güncellenmiyor — F5 gerekiyor.

### Çözüm
- `DynamicAdminLayout` component'ine `key={layoutMode}` ekle
- layoutMode değişince React tüm component tree'yi unmount/remount eder
- Kullanıcı F5'e basmadan tema/layout geçişi çalışır hale gelir

### Fallback
Eğer `key` yaklaşımı yan etki yaratırsa (state kaybı vb.), kontrollü `window.location.reload()` ile fallback yapılır.

### State Kaybı Kontrol Listesi
`key={layoutMode}` remount sırasında şu yüzeylerde state kaybı olup olmadığı test edilmeli:
- Açık Sheet/detail panel
- Command Palette
- QuickLook
- Tablo kolon tercihleri (localStorage'da ise sorun yok)
- Wizard yarım state
- Notification Center durumu
- Sidebar expand/collapse durumu

### Etkilenen Dosyalar
- `frontend/src/app/layouts/DynamicAdminLayout.tsx` — key prop eklenmesi
- Varsa `DynamicUserLayout.tsx` — aynı pattern

---

## Faz E: Job Archive UI

### Problem
Job silme/arşivleme için UI yok. Backend'de `is_test_data` soft-delete ve `bulk-archive-test-data` endpoint mevcut ama frontend'de tetikleyici yok.

### Çözüm
- "Arşivle" butonu (kelime: "Sil" değil, "Arşivle" veya "Görünümden Kaldır")
- İki aşamalı onay: ilk tıklama → kırmızı onay butonu ("Emin misiniz? Arşivle")
- Bulk archive desteği (mevcut endpoint kullanılır)
- Her archive işlemi audit log'a yazılır (mevcut altyapı)
- Hard delete yok — sadece soft-delete (`is_test_data` flag)

### UI Detayları
- Tekil arşiv: satır action menüsünde "Arşivle" seçeneği
- Toplu arşiv: toolbar'da "Seçilenleri Arşivle" butonu
- Arşivlenmiş job'lar varsayılan listede görünmez, "Arşivlenmiş" filtresiyle gösterilebilir

### Semantik Netlik
- "Arşivle" = `is_test_data=True` set edilir (mevcut soft-delete mekanizması)
- UI metni ile backend etkisi birebir eşleşmeli
- Kullanıcıya tooltip/açıklama: "Bu job arşivlenir ve varsayılan listeden kaldırılır. Veriler silinmez, 'Arşivlenmiş' filtresiyle erişilebilir."

### Etkilenen Dosyalar
- Job listesi sayfası — arşiv butonu ve onay UI
- Job API hooks — archive mutation eklenmesi

---

## Faz A: Module Management

### Yaklaşım
Settings Registry üzerinden `module.{id}.enabled` flag. Ayrı tablo açılmaz.

### Settings Tanımları
```
module.standard_video.enabled  → type: boolean, default: true
module.news_bulletin.enabled   → type: boolean, default: true
```

### `enabled=false` Semantiği (UI'da açıkça gösterilecek)
- Sidebar menüde o modülün sayfaları **gizlenir**
- Yeni job/üretim başlatma **engellenir** (wizard girişi kapanır)
- Command palette'te o modüle ait komutlar **filtrelenir**
- Mevcut kayıtlar (eski job'lar, content item'lar) **etkilenmez** — görüntülenebilir ama yeni oluşturulamaz

### Backend
- `GET /api/admin/modules` — ModuleRegistry + Settings merge
  - Her modül için: module_id, display_name, description, steps, enabled durumu, ilgili settings listesi, ilgili prompt listesi
- Modül enable/disable → mevcut settings update API (`PUT /api/admin/settings/{key}`)

### Frontend — Module Management Sayfası
- Route: `/admin/modules`
- Her modül için kart/accordion:
  - Modül adı + açıklama
  - Enabled toggle + etkisinin açık yazılı açıklaması
  - İlgili prompt'lar (Master Prompt Editor'e link)
  - İlgili ayarlar (Settings sayfasına link)
  - İlgili wizard/özellik linkleri
  - Adım listesi (steps)

### Backend Enforcement
- `module.{id}.enabled=false` sadece UI gizleme değil, **backend'de de** yeni üretim engellenir
- Job oluşturma endpoint'i modül enabled kontrolü yapar; disabled modül için 403 döner
- Wizard API'si modül enabled kontrolü yapar
- Bu kontrol service katmanında yapılır (router'da değil)

### Entegrasyonlar
- Sidebar filtreleme: enabled=false modül sayfaları gizlenir
- Command palette: enabled=false modül komutları filtrelenir
- Wizard: enabled=false modül wizard girişi kapanır

### Etkilenen Dosyalar
- `backend/app/settings/settings_resolver.py` — KNOWN_SETTINGS'e module enabled key'leri
- `backend/app/modules/router.py` (yeni) — modules API endpoint
- `frontend/src/pages/admin/ModuleManagementPage.tsx` (yeni)
- Sidebar, command palette, wizard — enabled filtresi

---

## Faz B: Provider Management

### Yaklaşım
`.env` kaynaklı read-only görüntüleme + test connection. Credential'lar DB'ye taşınmaz.

### Backend
- `GET /api/admin/providers` — ProviderRegistry'den:
  - Her provider: provider_id, display_name, capability türü (llm/tts/image_gen/publish)
  - Aktif mi, credential var mı (`.env` key mevcut mu), health durumu
  - Fallback/priority sırası
  - `credential_source`: "env" | "missing"
- `POST /api/admin/providers/{id}/test` — test connection endpoint

### Frontend — Provider Management Sayfası
- Route: `/admin/providers`
- Capability bazlı gruplu liste (LLM, TTS, Görsel, Yayın)
- Her provider kartı:
  - Provider adı + capability türü
  - Aktif/pasif durumu
  - Credential durumu: "`.env` ile yönetiliyor" (read-only) veya "Eksik credential" (kırmızı uyarı)
  - Health/test durumu (son başarılı/başarısız)
  - "Test Connection" butonu
  - Fallback/priority bilgisi
  - Hangi modüller tarafından kullanıldığı

### Etkilenen Dosyalar
- `backend/app/providers/router.py` (yeni veya genişletme) — providers API
- `frontend/src/pages/admin/ProviderManagementPage.tsx` (yeni)

---

## Faz C: Master Prompt Editor

### Yaklaşım
Ayrı admin sayfası. Settings Registry'den `type:"prompt"` olanları çeker.

### Prompt Kapsamı
- Bilinen 4 prompt (hepsi news_bulletin):
  - `news_bulletin.prompt.narration_system`
  - `news_bulletin.prompt.narration_user`
  - `news_bulletin.prompt.headline_system`
  - `news_bulletin.prompt.headline_user`
- Implementasyon sırasında tüm codebase taranarak **gerçekte mevcut tüm prompt kaynakları** tespit edilecek
- Sadece KNOWN_SETTINGS'teki 4 key ile sınırlı kalınmayacak; başka prompt kaynağı varsa dahil edilecek
- Raporda "bulunan prompt kaynakları / eksik olanlar" dürüst listesi verilecek

### Frontend — Master Prompt Editor Sayfası
- Route: `/admin/prompts`
- Modüle göre gruplu prompt listesi
- Her prompt için:
  - Büyük textarea editör
  - Karakter sayacı
  - "Varsayılana Dön" butonu (builtin_default'a reset)
  - Kaydet butonu → settings update API
- **İlişkili Kurallar bölümü** (ayrı section):
  - Prompt etkisi yaratan behavior settings'ler gösterilir
  - Prompt'larla karıştırılmaz, ayrı bölümde listelenir
  - Örnek: `news_bulletin.narration_tone`, `news_bulletin.max_word_count` gibi

### Backend
- Mevcut `GET /api/admin/settings?type=prompt` filtresi yeterli (yoksa eklenir)
- Mevcut `PUT /api/admin/settings/{key}` ile kayıt

### Etkilenen Dosyalar
- `frontend/src/pages/admin/PromptEditorPage.tsx` (yeni)
- Backend settings router — type filtresi (varsa mevcut, yoksa eklenir)

---

## Faz G: Settings Surface Standard

### Kural (CLAUDE.md'ye eklenecek)

> **Her yeni özellik, modül, davranış veya prompt kendi ayar yüzeyiyle birlikte gelmelidir.**
>
> Checklist:
> - Settings key tanımlı mı?
> - Admin UI'da gösteriliyor mu?
> - Prompt ise Master Prompt Editor kapsamında mı?
> - Wizard parametresi ise wizard governance yüzeyinde görünür mü?
> - Module enabled/disabled davranışı settings registry üzerinden mi yönetiliyor?

### Uygulama
- CLAUDE.md'nin "Non-Negotiable Rules" bölümüne eklenir
- Bu kural code review ve yeni faz planlamalarında referans alınır

---

## Faz H: Testing

### Strateji
Her faz sonrası incremental test + final sweep.

### Test Kapsamı
- **Keyboard**: Enter → Sheet, Space → QuickLook, form elemanlarında native davranış
- **Theme switch**: F5'siz layout geçişi, state korunumu
- **Module toggle**: enabled/disabled durumunda menü, palette, wizard davranışı
- **Provider test**: test connection, health gösterimi, eksik credential uyarısı
- **Prompt editor**: kaydet, varsayılana dön, karakter sayacı
- **Job archive**: tekil arşiv, toplu arşiv, iki aşamalı onay, audit log kaydı
- **Regression**: mevcut Sheet/QuickLook, settings, visibility, command palette

---

## Korunan Mevcut Altyapı
- Route yapısı ve router konfigürasyonu
- Visibility Engine
- Audit log sistemi
- Settings Registry ve resolver chain
- Wizard altyapısı
- Theme engine ve mevcut temalar
- Notification Center
- Command Palette
- Publish state machine
- Template/Style Blueprint sistemi
- SSE realtime altyapısı

---

## Kısıtlamalar
- CM'den kod kopyalanmaz
- Fake data/prompt/config oluşturulmaz
- Hard delete yok, sadece soft-delete
- Credential'lar DB'ye taşınmaz
- Mevcut temalar ve layout'lar silinmez
