# M39-B: News Bulletin Branding/Stil Kullanım Haritası

**Tarih:** 2026-04-07
**Kapsam:** Mevcut durum tespiti — branding studio öncesi kullanım haritası
**Yöntem:** Gerçek dosya ve kod okuma. Tahmin yok.

---

## 1. Executive Summary

News bulletin modülünde şu an **5 adet stil/branding parametresi** tanımlı ve veri akışında yer alıyor:
`bulletin_style`, `lower_third_style`, `subtitle_style`, `network_name`, `show_ticker`.

Bunların **3'ü kullanıcı tarafından wizard'da seçilebilir** (`lower_third_style`, `subtitle_style`, `render_mode`).
**2'si sadece settings-default**, UI'da kullanıcı kontrolü yok (`network_name`, `show_ticker`).
**1'i DB'de kayıtlı ama UI kontrol bileşeni eski ve renderer'a bağlantısı kopuk** (`bulletin_style`).

Şu an sistemde **branding sistemi yok** — sadece render-time stil parametreleri var.
Reusable brand asset, logo, font ailesi, kimlik kaydı, versiyonlama, preview artifact gibi hiçbir şey mevcut değil.

---

## 2. Şu An Gerçekten Kullanılan Branding/Stil Materyalleri

| Materyal | Sınıf | Aktiflik |
|---|---|---|
| `bulletin_style` | Renderer stil parametresi | **Yarı bağlı** — DB'de var, renderer'a ulaşıyor, UI kontrolü eski/kopuk |
| `lower_third_style` | Renderer stil parametresi | **Aktif** — wizard'dan seçilebiliyor, renderer'a ulaşıyor |
| `subtitle_style` | Renderer stil parametresi | **Aktif** — wizard'dan seçilebiliyor, renderer'a ulaşıyor |
| `network_name` | Settings-only config | **Aktif (settings-default)** — UI yok, admin settings'ten geliyor |
| `show_ticker` | Settings-only config | **Aktif (settings-default)** — UI yok, admin settings'ten geliyor |
| `render_mode` | Pipeline parametresi | **Aktif** — wizard'dan seçilebiliyor, ama renderer bileşenini etkilemiyor |
| `BULLETIN_ACCENT` paleti | Internal renderer helper | **Aktif internal** — kullanıcı görmüyor |
| `CATEGORY_TO_STYLE` eşlemesi | Internal renderer helper | **Aktif internal** — kullanıcı görmüyor |
| `CategoryFlash` | Renderer bileşeni | **Aktif internal** — her haber geçişinde otomatik çalışıyor |
| `StudioBackground` | Renderer bileşeni | **Aktif internal** — bulletin stil ile otomatik değişiyor |
| `BreakingNewsOverlay` | Renderer bileşeni | **Koşullu aktif** — yalnızca `breaking` stilinde |
| `CATEGORY_STYLE_HINTS` | Backend öneri motoru | **Yarı aktif** — wizard'da öneri gösteriyor, `bulletin_style` önermiyior |
| `BulletinLowerThird` | Renderer bileşeni | **Aktif** — `lowerThirdStyle` prop'u varsa render ediyor |
| `NewsTicker` | Renderer bileşeni | **Aktif** — `showTicker=true` ise çalışıyor |

---

## 3. Materyal Kullanım Tabloları

### 3.1 `bulletin_style`

| Alan | Değer |
|---|---|
| **Dosyalar** | `db/models.py:665`, `schemas.py:13,49,86`, `service.py:612`, `composition.py:356`, `NewsBulletinComposition.tsx:125,222` |
| **Veri kaynağı** | DB kolonu (`NewsBulletin.bulletin_style`) — settings fallback var (`news_bulletin.config.default_bulletin_style`, default: `"breaking"`) |
| **UI'dan seçilebilir mi?** | **Kısmen** — `NewsBulletinForm.tsx:151` içinde `<select>` var ama seçenekler yanlış: `studio`, `futuristic`, `traditional` — renderer beklediği değerler: `breaking`, `tech`, `finance`, vb. **Uyumsuzluk var.** |
| **Settings default mu?** | Evet — `news_bulletin.config.default_bulletin_style = "breaking"` |
| **Bulletin override var mı?** | Evet — DB'de kaydediliyor, bulletin bazlı farklı olabilir |
| **Job snapshot'a giriyor mu?** | Evet — `service.py:612`: `"bulletin_style": bulletin.bulletin_style or settings_snapshot.get(...)` |
| **Composition props'a giriyor mu?** | Evet — `composition.py:356`: `"bulletinStyle": bulletin_style` |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:222` — `defaultStyle` hesaplanıyor, `BULLETIN_ACCENT` palet seçiminde, `StudioBackground`, `BreakingNewsOverlay`, `NewsTicker`'a aktarılıyor |

---

### 3.2 `lower_third_style`

| Alan | Değer |
|---|---|
| **Dosyalar** | `db/models.py:676`, `schemas.py:24,60,97`, `service.py:609`, `composition.py:351,105`, `NewsBulletinComposition.tsx:133,334`, `BulletinLowerThird.tsx:17-34` |
| **Veri kaynağı** | DB kolonu (`NewsBulletin.lower_third_style`) — settings fallback: `news_bulletin.config.default_lower_third_style = "broadcast"` |
| **UI'dan seçilebilir mi?** | **Evet** — `NewsBulletinWizardPage.tsx:794`: `<LowerThirdStylePreview>` picker bileşeni, seçim kaydediliyor |
| **Settings default mu?** | Evet — `news_bulletin.config.default_lower_third_style = "broadcast"` |
| **Bulletin override var mı?** | Evet — her bulletin kendi değerini taşıyor |
| **Job snapshot'a giriyor mu?** | Evet — `service.py:609` |
| **Composition props'a giriyor mu?** | Evet — `composition.py:351`: `"lowerThirdStyle": lower_third_style` |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:333-340` — `lowerThirdStyle != null` ise `BulletinLowerThird` render ediyor; `broadcast`/`minimal`/`modern` variant seçiliyor |

---

### 3.3 `subtitle_style`

| Alan | Değer |
|---|---|
| **Dosyalar** | `db/models.py:675`, `schemas.py:23,59,96`, `service.py:608`, `composition.py:350`, `NewsBulletinComposition.tsx:121,96-112` |
| **Veri kaynağı** | DB kolonu (`NewsBulletin.subtitle_style`) — settings fallback: `news_bulletin.config.default_subtitle_style = "clean_white"` |
| **UI'dan seçilebilir mi?** | **Evet** — `NewsBulletinWizardPage.tsx:782`: `<SubtitleStylePicker>` bileşeni |
| **Settings default mu?** | Evet — `news_bulletin.config.default_subtitle_style = "clean_white"` |
| **Bulletin override var mı?** | Evet |
| **Job snapshot'a giriyor mu?** | Evet — `service.py:608` |
| **Composition props'a giriyor mu?** | Evet — `composition.py:350`: `"subtitleStyle": resolved_subtitle_style` (`get_preset_for_composition()` aracılığıyla çözümleniyor) |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:121` — `subtitleStyle: SubtitleStyle` prop'u; `HeadlineCard` altyazı render için aktarılıyor |

---

### 3.4 `network_name`

| Alan | Değer |
|---|---|
| **Dosyalar** | `settings_resolver.py:751-760`, `service.py:613`, `composition.py:357`, `NewsBulletinComposition.tsx:127,226` |
| **Veri kaynağı** | **Sadece KNOWN_SETTINGS** — `news_bulletin.config.network_name = "ContentHub Haber"`. DB kolonu yok. |
| **UI'dan seçilebilir mi?** | **Hayır** — hiçbir frontend bileşeninde referans yok |
| **Settings default mu?** | Evet — tek kaynak |
| **Bulletin override var mı?** | **Hayır** |
| **Job snapshot'a giriyor mu?** | Evet — `service.py:613` |
| **Composition props'a giriyor mu?** | Evet — `composition.py:357`: `"networkName": network_name` |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:226-283` — üst bar kanal adı metni olarak gösteriliyor |

---

### 3.5 `show_ticker`

| Alan | Değer |
|---|---|
| **Dosyalar** | `settings_resolver.py:762-771`, `service.py:614`, `composition.py:358`, `NewsBulletinComposition.tsx:129,348` |
| **Veri kaynağı** | **Sadece KNOWN_SETTINGS** — `news_bulletin.config.show_ticker = true`. DB kolonu yok. |
| **UI'dan seçilebilir mi?** | **Hayır** |
| **Settings default mu?** | Evet — tek kaynak |
| **Bulletin override var mı?** | **Hayır** |
| **Job snapshot'a giriyor mu?** | Evet — `service.py:614` |
| **Composition props'a giriyor mu?** | Evet — `composition.py:358`: `"showTicker": show_ticker` |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:348` — `showTicker !== false` koşulu; `NewsTicker` bileşeni gösteriliyor |

---

### 3.6 `render_mode`

| Alan | Değer |
|---|---|
| **Dosyalar** | `db/models.py:674`, `schemas.py:22,58,95`, `service.py:607`, `composition.py:341,352`, `NewsBulletinComposition.tsx:135` |
| **Veri kaynağı** | DB kolonu, default: `"combined"` |
| **UI'dan seçilebilir mi?** | **Evet** — wizard step 2'de dropdown var |
| **Settings default mu?** | Evet — `news_bulletin.config.render_mode = "combined"` (wired=False) |
| **Bulletin override var mı?** | Evet |
| **Job snapshot'a giriyor mu?** | Evet |
| **Composition props'a giriyor mu?** | Evet — `renderMode` alanı |
| **Renderer'da nasıl kullanılıyor?** | `NewsBulletinComposition.tsx:135` prop olarak tanımlı ama **composition bileşeni içinde render mantığını etkilemiyor**; sadece metadata olarak taşınıyor |

---

## 4. Mimari Akış Haritası

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SETTINGS REGISTRY                               │
│  news_bulletin.config.default_bulletin_style  = "breaking"              │
│  news_bulletin.config.default_lower_third_style = "broadcast"           │
│  news_bulletin.config.default_subtitle_style  = "clean_white"           │
│  news_bulletin.config.network_name            = "ContentHub Haber"      │
│  news_bulletin.config.show_ticker             = true                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ snapshot_keys filter (news_bulletin.*)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NewsBulletin DB KAYDI                                 │
│  bulletin_style   ← NewsBulletinForm <select> (yanlış değerler!)        │
│  lower_third_style ← LowerThirdStylePreview picker (aktif)              │
│  subtitle_style   ← SubtitleStylePicker picker (aktif)                  │
│  render_mode      ← Wizard step 2 dropdown (aktif)                      │
│  network_name     ← YOK (DB kolonu yok)                                 │
│  show_ticker      ← YOK (DB kolonu yok)                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ start_production()
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       JOB input_data_json                                │
│  bulletin_style   ← bulletin.bulletin_style OR settings_snapshot        │
│  lower_third_style ← bulletin.lower_third_style                         │
│  subtitle_style   ← bulletin.subtitle_style                             │
│  render_mode      ← bulletin.render_mode OR "combined"                  │
│  network_name     ← settings_snapshot["news_bulletin.config.network_name"] │
│  show_ticker      ← settings_snapshot["news_bulletin.config.show_ticker"] │
│  ticker_items     ← None (hardcoded)                                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ BulletinCompositionExecutor.execute()
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    composition_props.json → props{}                      │
│  bulletinStyle    ← bulletin_style                                       │
│  lowerThirdStyle  ← lower_third_style                                    │
│  subtitleStyle    ← resolved_subtitle_style (preset lookup)             │
│  renderMode       ← render_mode                                          │
│  networkName      ← network_name                                         │
│  showTicker       ← show_ticker                                          │
│  tickerItems      ← None                                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Remotion render
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               NewsBulletinComposition.tsx (RENDERER)                    │
│                                                                          │
│  bulletinStyle  → defaultStyle  → StudioBackground(style)               │
│                               → BreakingNewsOverlay (koşullu)           │
│                               → NewsTicker(style)                       │
│                               → CategoryFlash(accent rengi)             │
│                               → üst bar gradient rengi                  │
│                                                                          │
│  item.category  → resolveBulletinStyle() → per-item stil override       │
│                                                                          │
│  networkName    → üst bar kanal adı metni                               │
│  showTicker     → NewsTicker göster/gizle                               │
│  lowerThirdStyle → BulletinLowerThird(style) — null ise render yok      │
│  subtitleStyle  → HeadlineCard subtitle preset                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. UI Kullanım Haritası

### 5.1 Kullanıcı Şu An Seçebiliyor

| Parametre | UI Bileşeni | Nerede | Notlar |
|---|---|---|---|
| `subtitle_style` | `<SubtitleStylePicker>` | Wizard Step 2 | Aktif, kaydediliyor |
| `lower_third_style` | `<LowerThirdStylePreview>` | Wizard Step 2 | Aktif, kaydediliyor |
| `render_mode` | `<select>` dropdown | Wizard Step 2 | Aktif, ama renderer bileşenini etkilemiyor |
| `bulletin_style` | `<select>` dropdown | `NewsBulletinForm` (detail panel) | **Seçenekler yanlış**: `studio`, `futuristic`, `traditional` — renderer değerleri: `breaking`, `tech`, vs. |

### 5.2 Kullanıcı Seçemiyor, Default ile Geliyor

| Parametre | Default Değer | Nereden | Değiştirme Yolu |
|---|---|---|---|
| `network_name` | `"ContentHub Haber"` | KNOWN_SETTINGS | Sadece admin settings panelinden |
| `show_ticker` | `true` | KNOWN_SETTINGS | Sadece admin settings panelinden |
| `ticker_items` | `null` (başlıklardan otomatik) | Hardcoded — `service.py:615` | Değiştirme yolu yok |

### 5.3 Kategori Öneri Motoru (Wizard)

`NewsBulletinWizardPage.tsx:172` — seçili haberlerin baskın kategorisine göre backend'den öneri çekiyor:
- `categoryStyleSuggestion.suggested_subtitle_style` → `setSubtitleStyle()`
- `categoryStyleSuggestion.suggested_lower_third_style` → `setLowerThirdStyle()`
- `categoryStyleSuggestion.suggested_composition_direction` → `setCompositionDirection()`

**Önemli:** Bu motor `bulletin_style` önermiyior. `CATEGORY_STYLE_HINTS` (service.py:880) sadece `subtitle_style`, `lower_third_style`, `composition_direction` öneriyor.

---

## 6. Internal Helper Listesi (Kullanıcı Görmez)

Bunlar renderer içindeki yardımcı modüller — reusable asset değil, internal implementation detail:

| Dosya | Rol | Kullanıcı kontrolü |
|---|---|---|
| `shared/palette.ts` — `BULLETIN_ACCENT`, `BULLETIN_DARK_ACCENT` | Kategori → renk eşlemesi | Yok |
| `shared/subtitle-renderer.tsx` — `renderSubtitleWords()` | Kelime vurgulu altyazı render | Yok |
| `templates/news-bulletin/utils/localization.ts` — `getLabel()`, `getCommonLabel()` | TR/EN kategori etiketleri | Yok |
| `NewsBulletinComposition.tsx` — `CATEGORY_TO_STYLE` | category string → BulletinStyle eşlemesi | Yok |
| `NewsBulletinComposition.tsx` — `resolveBulletinStyle()` | Category → stil çözümleme fonksiyonu | Yok |
| `StudioBackground.tsx` | Animasyonlu arka plan | Yok |
| `CategoryFlash.tsx` | Kategori geçiş badge animasyonu | Yok |
| `BreakingNewsOverlay.tsx` | Breaking stili overlay animasyonu | Yok |
| `HeadlineCard.tsx` | Haber kartı animasyonlu bileşen | Yok |
| `NewsTicker.tsx` | Alt ticker bileşeni | Sadece show_ticker toggle |

---

## 7. "Branding Sistemi" mi, "Bulletin Stil Parametresi" mi?

### Şu anki yapı: Bulletin Stil Parametresi

Mevcut sistemde olan:
- Her bulletin kaydına bağlı birkaç stil parametresi (`lower_third_style`, `subtitle_style`)
- Settings'ten gelen global config değerleri (`network_name`, `show_ticker`)
- Renderer'ın kendi içinde hardcoded renk paleti ve animasyonlar
- Kategori → stil öneri motoru (wizard'da öneri olarak)

Mevcut sistemde **olmayan**:
- Reusable brand asset kaydı (logo, font ailesi, renk paleti kaydı)
- Brand kimlik versiyonlama
- Brand preview artifact
- Brand'in birden fazla bulletin'e atanması
- Admin tarafından yönetilen görsel kimlik şablonu
- Stil seçiminin preview'ı (stil seçmeden önce nasıl görüneceği)

### Sonuç

> Şu an **branding sistemi yok**. Var olan, her bulletin render'ına ayrı ayrı atanabilen **render-time stil parametreleri**. Bunlar bulletin kaydına bağlı, versiyonlanmıyor, reuse edilemiyor, logosu yok, font ailesi yok, kimlik şablonu yok.

---

## 8. Branding Studio Öncesi Eksik Modelleme Noktaları

Bu bölüm mevcut açıkları tespit eder — öneri değil, gap analizi.

### Gap 1: `bulletin_style` UI/renderer uyumsuzluğu
- Form'daki seçenekler (`studio`, `futuristic`, `traditional`) renderer'ın beklediği değerlerle (`breaking`, `tech`, `finance`, vb.) eşleşmiyor
- Kullanıcı `studio` seçse renderer'da `"breaking"` default'a düşüyor

### Gap 2: `bulletin_style` için wizard'da picker yok
- `lower_third_style` ve `subtitle_style` için wizard'da preview'lu picker var
- `bulletin_style` için eşdeğer kontrol wizard'da yok — sadece detail form'unda ham `<select>`

### Gap 3: `network_name` per-bulletin ayarlanamıyor
- DB kolonu yok, schema'da yok, UI'da yok
- Her bulletin aynı kanal adını kullanmak zorunda

### Gap 4: `ticker_items` hiç kontrol edilemiyor
- `ticker_items = None` hardcoded (`service.py:615`)
- Kullanıcı özel ticker metni giremez
- DB kolonu yok, schema'da yok

### Gap 5: `show_ticker` per-bulletin ayarlanamıyor
- Sadece global settings toggle
- Bazı bulletin'lerde ticker istememe senaryosu desteklenmiyor

### Gap 6: Kategori öneri motoru `bulletin_style` önermiyior
- `CATEGORY_STYLE_HINTS` → `subtitle_style`, `lower_third_style`, `composition_direction` öneriyor
- `bulletin_style` (renderer'ın en etkili parametresi) öneri kapsamı dışında

### Gap 7: Reusable brand asset modeli yok
- Bir "brand profili" kaydı yok
- Birden fazla bulletin aynı network kimliğini paylaşmak istese tekrar ayarlamak gerekiyor
- Versiyonlama yok

---

## 9. Taranan Dosyalar

**Renderer (11 dosya):**
- `renderer/src/compositions/NewsBulletinComposition.tsx`
- `renderer/src/components/BulletinLowerThird.tsx`
- `renderer/src/templates/news-bulletin/components/StudioBackground.tsx`
- `renderer/src/templates/news-bulletin/components/BreakingNewsOverlay.tsx`
- `renderer/src/templates/news-bulletin/components/CategoryFlash.tsx`
- `renderer/src/templates/news-bulletin/components/HeadlineCard.tsx`
- `renderer/src/templates/news-bulletin/components/NewsTicker.tsx`
- `renderer/src/templates/news-bulletin/shared/palette.ts`
- `renderer/src/templates/news-bulletin/shared/subtitle-renderer.tsx`
- `renderer/src/templates/news-bulletin/utils/localization.ts`
- `renderer/src/Root.tsx`

**Backend (4 dosya):**
- `backend/app/modules/news_bulletin/executors/composition.py`
- `backend/app/modules/news_bulletin/service.py` (tüm dosya)
- `backend/app/db/models.py` (NewsBulletin modeli)
- `backend/app/modules/news_bulletin/schemas.py`

**Settings (1 dosya):**
- `backend/app/settings/settings_resolver.py` (news_bulletin bölümü)

**Frontend (grep + dosya okuma):**
- `frontend/src/pages/admin/NewsBulletinWizardPage.tsx`
- `frontend/src/components/news-bulletin/NewsBulletinForm.tsx`
- `frontend/src/components/news-bulletin/NewsBulletinDetailPanel.tsx`
- `frontend/src/api/newsBulletinApi.ts`
- Tüm frontend'de `bulletin_style`, `lower_third_style`, `networkName`, `showTicker`, `tickerItems` grep taraması

---

## 10. Net Sonuç

### Şu an gerçekten kullandıklarımız

| Parametre | Aktif mi | Tam zincir var mı |
|---|---|---|
| `lower_third_style` | ✅ | UI → DB → job → composition → renderer |
| `subtitle_style` | ✅ | UI → DB → job → composition → renderer |
| `network_name` | ✅ (settings-only) | Settings → job → composition → renderer |
| `show_ticker` | ✅ (settings-only) | Settings → job → composition → renderer |
| `bulletin_style` | ⚠️ Yarı bağlı | DB → job → composition → renderer (UI seçenekleri yanlış) |

### Sadece hazırladıklarımız

| Parametre | Sorun |
|---|---|
| `ticker_items` | Hardcoded `None` — kullanıcı kontrolü yok |
| `render_mode` | Zincir tam ama renderer bileşenini etkilemiyor |

### Hiç kullanmadıklarımız

| Materyal | Durum |
|---|---|
| Per-bulletin `network_name` override | DB kolonu yok, UI yok |
| Per-bulletin `show_ticker` override | DB kolonu yok, UI yok |
| Renderer `bulletin_style` için wizard picker | Mevcut picker'ın seçenekleri yanlış |
| Kategori öneri motorunun `bulletin_style` önerisi | Motor bunu önermiyior |
| Herhangi bir reusable brand asset | Hiç yok |
